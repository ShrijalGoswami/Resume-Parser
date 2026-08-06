"""
Input limits for everything that reaches the LLM. One owner, one place to edit.

WHY THIS EXISTS (S-4)
---------------------
Before this module the limits were scattered and inconsistent:

  * `/batch-analysis` rejected a job description over 20000 characters.
    `/match-analysis` did not bound it **at all**.
  * `_MAX_MESSAGE_CHARS` was defined three times, with two different values —
    4000 at the route, 1500 in the service and again in the context builder.
  * Extracted document text was bounded by **nothing**. The upload cap is 10MB of
    *file*, and a 10MB PDF can carry megabytes of text across hundreds of pages.

The last one is the finding. A single crafted upload passing every existing check
could expand into an enormous prompt, and Groq's free tier is ~100k tokens a day
for the whole platform — so one document could exhaust every customer's AI for
the rest of the day. That is a denial-of-service with a 10MB price tag.

REJECT OR TRUNCATE — the product already has a philosophy, and it is not uniform
--------------------------------------------------------------------------------
Both appear in this codebase, and the difference is deliberate:

  * **At a boundary the user controls, REJECT.** An oversized upload or job
    description is refused with a message naming the limit, because the person
    who supplied it can act on that. `save_upload_to_temp` already works this way.
  * **During assembly the user does not see, TRUNCATE — and say so.** The context
    builders already clip rosters, notes and history. Silence is what makes
    truncation dangerous: §8A's rule is that a bounded thing must never be
    presented as complete, which is why a clamped value carries a visible notice
    into the prompt rather than just ending early.

So: documents and job descriptions are refused; prompt variables are clamped with
a notice. A recruiter finds out at upload time, and the model is told when it is
reading a fragment.

TWO CEILINGS, TWO REASONS
-------------------------
`document_chars` and `prompt_variable_chars` are different numbers on purpose.
The first bounds memory and parsing work — a resource ceiling. The second bounds
what we pay a vendor to read — a cost ceiling, and much lower. Collapsing them
would either make parsing needlessly strict or make a single résumé able to spend
a meaningful share of the daily token budget.

There is no OCR path in this codebase (`app/parser/` is PDF and DOCX only), so
there is nothing to bound there. When one is added it extracts text through
`ParserFactory`, which is where these limits are enforced.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentTooLargeError(ValueError):
    """An extracted document exceeds a limit. Refused, never silently clipped."""


class ArchiveTooLargeError(ValueError):
    """A container file would decompress far beyond its on-disk size. Refused."""


@dataclass(frozen=True)
class InputLimits:
    """The active limits, resolved from settings.

    Read through `limits()` rather than captured at import, so a test or a
    deployment can change a value without reloading the module.
    """

    #: Characters of extracted text a single document may yield. Resource bound.
    document_chars: int
    #: Pages a single document may have. A page count is the cheaper signal — it
    #: is known before any text is concatenated.
    document_pages: int
    #: Characters a job description may contain. User-supplied, so refused.
    job_description_chars: int
    #: Characters any single untrusted prompt variable may contribute. Cost bound,
    #: enforced where every untrusted value converges (`PromptTemplate`).
    prompt_variable_chars: int
    #: Bytes a container file (DOCX is a ZIP) may decompress to. A MEMORY bound,
    #: and the only limit here that applies before any text exists.
    archive_uncompressed_bytes: int


def limits() -> InputLimits:
    return InputLimits(
        document_chars=settings.AI_MAX_DOCUMENT_CHARS,
        document_pages=settings.AI_MAX_DOCUMENT_PAGES,
        job_description_chars=settings.AI_MAX_JOB_DESCRIPTION_CHARS,
        prompt_variable_chars=settings.AI_MAX_PROMPT_VARIABLE_CHARS,
        archive_uncompressed_bytes=settings.AI_MAX_ARCHIVE_UNCOMPRESSED_MB * 1024 * 1024,
    )


#: Appended inside the fenced block when a value is clamped. The model must never
#: be handed a fragment that looks like a whole document (§8A).
TRUNCATION_NOTICE = "\n\n[truncated: {omitted} characters omitted to stay within the input limit]"


def enforce_document(text: str, page_count: int, *, name: str = "document") -> None:
    """Refuse a document that exceeds the resource ceiling.

    Raises `DocumentTooLargeError` naming the limit and the actual size, because
    "too large" without a number is not something an operator can act on.
    """
    active = limits()
    if page_count > active.document_pages:
        raise DocumentTooLargeError(
            f"{name} has {page_count} pages, above the limit of "
            f"{active.document_pages}. Split it or upload the relevant section."
        )
    if len(text or "") > active.document_chars:
        raise DocumentTooLargeError(
            f"{name} contains {len(text)} characters of text, above the limit of "
            f"{active.document_chars}. Split it or upload the relevant section."
        )


def enforce_archive(file_path, *, name: str = "document") -> None:
    """Refuse a container file that would decompress beyond the memory ceiling.

    WHY THIS IS SIZE-BASED AND NOT RATIO-BASED
    ------------------------------------------
    The obvious guard is a compression-ratio cap, and it is the wrong one. A
    DOCX of ordinary repeated prose — a real résumé with boilerplate — measured
    **300:1** in testing. A ratio threshold low enough to stop an attacker is
    therefore low enough to reject genuine documents, and the false positives
    land on the exact user who did nothing wrong.

    What actually matters is the absolute number this process is about to hold
    in memory, so that is what is checked. A résumé that decompresses past the
    ceiling is not a résumé.

    ORDERING — this runs BEFORE python-docx opens the file
    ------------------------------------------------------
    `enforce_document()` bounds extracted *text*, which is a cost ceiling for the
    LLM and cannot help here: by the time it runs, the archive has already been
    decompressed and the memory is already spent. This is the memory ceiling, and
    it has to come first.

    RESIDUAL, stated rather than implied
    ------------------------------------
    Sizes are read from the ZIP central directory, which is attacker-supplied. A
    forged header can understate the real size, and this check would pass it.
    Catching that needs bounded stream-decompression instead of letting
    python-docx open the file itself. Declared-size checking stops the practical
    bomb — which depends on honest headers to be cheap to build — and is a
    fraction of the cost; the streaming version is the follow-up if the threat
    ever justifies it.
    """
    import zipfile

    ceiling = limits().archive_uncompressed_bytes
    try:
        with zipfile.ZipFile(file_path) as archive:
            total = sum(entry.file_size for entry in archive.infolist())
    except zipfile.BadZipFile:
        # Not a readable container. Let the parser produce its own error — this
        # function's job is size, and diagnosing corruption is not it.
        return

    if total > ceiling:
        raise ArchiveTooLargeError(
            f"{name} expands to {total // (1024 * 1024)}MB, above the limit of "
            f"{ceiling // (1024 * 1024)}MB. The file is either corrupt or crafted; "
            f"a genuine document of this kind does not decompress this far."
        )


#: A recruiter's chat message. Was defined THREE times — 4000 at the route,
#: 1500 in the service, 1500 again in the context builder — so the route's
#: limit was decorative and nobody could say what the real one was.
CHAT_MESSAGE_MAX_CHARS = 4000


#: Import-time constant for the one place that needs a literal: a Pydantic
#: `Field(max_length=...)` is evaluated when the class is defined, so it cannot
#: call `limits()`. Same number, same owner.
JOB_DESCRIPTION_MAX_CHARS = settings.AI_MAX_JOB_DESCRIPTION_CHARS


def job_description_error(text: str) -> str | None:
    """The refusal message for an oversized job description, or None.

    Returned rather than raised so each route keeps its own HTTP semantics —
    routes are not the place to learn a new exception type for a length check.
    """
    ceiling = limits().job_description_chars
    if len(text or "") > ceiling:
        return f"Job description too long ({len(text)} characters, max {ceiling})."
    return None


def clamp_prompt_variable(value: str, *, name: str = "value") -> str:
    """Bound a single untrusted prompt variable, announcing any loss.

    Truncation is silent nowhere: the notice travels with the text into the
    prompt so the model knows it is reading a fragment, and a warning is logged
    so an operator can see it happening rather than inferring it from a bill.
    """
    ceiling = limits().prompt_variable_chars
    if len(value or "") <= ceiling:
        return value
    omitted = len(value) - ceiling
    logger.warning(
        "Clamped untrusted prompt variable '%s': %d chars -> %d (%d omitted).",
        name, len(value), ceiling, omitted,
    )
    return value[:ceiling] + TRUNCATION_NOTICE.format(omitted=omitted)
