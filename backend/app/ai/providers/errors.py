"""
Vendor exception → AI error hierarchy. One classifier, used by every provider.

THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR PROVIDER ERROR SEMANTICS
--------------------------------------------------------------------
**No provider implementation may classify errors directly.** Groq, OpenAI,
Gemini, Anthropic, OpenRouter, Kimi, the local provider and every provider added
after them supply only their own *vocabulary* — status mapping, Retry-After
extraction, quota detection — and delegate the decision to
`classify_vendor_error` here. What a failure MEANS is decided in one place; what
a vendor CALLS it is the vendor's business.

That split is not tidiness. The four `_classify` copies this file replaced were
the same ladder written four times, and they had already drifted into four
different word lists — which is how one of them came to report every message
containing "generate" as a rate limit (C2). A rule that lives in four places is
a rule that is true in three.

**If a future provider cannot fit this abstraction, review the abstraction
before adding provider-specific branching.** A provider that seems to need its
own classifier is nearly always a signal that this one is missing a vocabulary
hook — add the hook here and every provider gets it. Branching per vendor is how
provider-specific abstraction creeps back in after the work of removing it, and
it is forbidden by §9A rule 3. This mirrors the standing rule §9A rule 12 already
applies to `LLMProvider` and `FakeProvider`: review the contract first, not the
implementation that strains against it.

WHY THIS FILE EXISTS
--------------------
Each provider used to carry its own `_classify` staticmethod: the same ladder
(timeout? rate limit? otherwise transient) written four times over four
different word lists, matched with `in` against `str(exc).lower()`. Two things
were wrong with that, and only one of them is the duplication:

  1. **`"rate" in msg` also matches "generate"** — a word that appears in the
     error text of almost every generation failure. `anthropic_provider.py`
     therefore reported ordinary upstream failures as rate limits, which the
     orchestrator then treats as a rate-limit ladder with its own retry budget
     and its own log reason. The diagnosis is wrong before anyone reads it.
  2. **The SDKs already say what happened, in types**, and nothing looked.
     `groq`, `openai` and `anthropic` are all httpx-based and raise
     `APITimeoutError` / `RateLimitError` / `APIStatusError` carrying a real HTTP
     `status_code`; `google-generativeai` surfaces `google.api_core.exceptions`
     (`DeadlineExceeded`, `ResourceExhausted`). Guessing from prose while the
     answer is on the object is how a provider ends up classified by its
     copywriting.

So classification is now, in order: **the exception's type**, then **its HTTP
status code**, then — only for an exception that is neither typed nor
status-carrying — **its text**, matched on word boundaries rather than
substrings.

NO SDK IS IMPORTED HERE
-----------------------
`app/ai/providers/` is the only package allowed to import a vendor SDK (§9A rule
2), and even here the imports stay lazy so an unconfigured provider costs
nothing. This module imports none at all: a vendor exception can only exist if
its module is already imported, so the classes are looked up in `sys.modules`
and matched with a real `isinstance`. An SDK that is not installed simply has no
entry, and classification falls through to the status code and then the text.

WHAT THIS FILE DELIBERATELY DOES NOT DECIDE
-------------------------------------------
**Whether a rate limit is daily-quota exhaustion.** That is C1 (Retry
Classification), a separate task. `is_quota` and `retry_after` are passed IN by
the caller, so every provider keeps exactly the quota behaviour it has today —
Groq and the OpenAI-compatible family detect quota, Anthropic and Gemini do not.
Closing C1 means passing those two arguments from two more providers, and
nothing here has to change to allow it.
"""

from __future__ import annotations

import re
import sys
from typing import Optional

from app.ai.utils.errors import AIProviderError, AIRateLimitError, AITimeoutError

#: Where each provider's exception types live. A module that has never been
#: imported cannot have raised anything, so a missing entry is not an error.
_SDK_EXCEPTION_MODULES: dict[str, tuple[str, ...]] = {
    "groq": ("groq",),
    "openai": ("openai",),
    "anthropic": ("anthropic",),
    # google-generativeai raises through google.api_core, not its own namespace.
    "google": ("google.api_core.exceptions",),
}

#: Public exception class names, per vendor SDK. Names — but resolved to classes
#: and matched with isinstance, so a rename fails to match rather than matching
#: something else by accident.
_TIMEOUT_CLASSES = ("APITimeoutError", "DeadlineExceeded")
_RATE_LIMIT_CLASSES = ("RateLimitError", "ResourceExhausted", "TooManyRequests")

#: HTTP statuses that mean something specific. Everything else is a transient
#: provider failure, which is what it was before this file existed.
_TIMEOUT_STATUSES = frozenset({408, 504})
_RATE_LIMIT_STATUSES = frozenset({429})

#: Last resort, for an exception that is neither typed nor status-carrying.
#: Word-anchored: `\brate` does not match "generate", which is the bug in C2.
_TIMEOUT_TEXT = re.compile(r"\b(timeout|timed[ -]?out|deadline[ -]?exceeded)\b")
_RATE_LIMIT_TEXT = re.compile(
    r"\b(rate[ -]?limit\w*|too many requests|429|quota|overloaded"
    r"|resource has been exhausted)\b"
)


def classify_vendor_error(
    exc: Exception,
    *,
    sdk: str,
    is_quota: bool = False,
    retry_after: Optional[float] = None,
) -> AIProviderError:
    """Map a raw vendor exception onto the AI error hierarchy.

    `sdk` names which SDK's exception types to consider — it selects a lookup
    table, never a code path (§9A rule 3: no `if provider == …`).

    `is_quota` and `retry_after` are the caller's, not this function's: see the
    module docstring. They apply only when the result is a rate limit.
    """
    kind = _typed_kind(exc, sdk) or _status_kind(exc) or _text_kind(exc)
    message = str(exc)
    if kind == "timeout":
        return AITimeoutError(message)
    if kind == "rate_limit":
        return AIRateLimitError(message, retry_after=retry_after, is_quota=is_quota)
    return AIProviderError(message)


def retry_after_of(exc: Exception) -> Optional[float]:
    """Best-effort parse of a Retry-After (seconds) from the vendor exception's
    HTTP response headers. Returns None when absent or unparseable."""
    resp = getattr(exc, "response", None)
    headers = getattr(resp, "headers", None)
    if not headers:
        return None
    try:
        raw = headers.get("retry-after") or headers.get("Retry-After")
    except Exception:  # pragma: no cover — non-mapping headers
        return None
    if not raw:
        return None
    try:
        return max(0.0, float(raw))
    except (TypeError, ValueError):  # pragma: no cover — HTTP-date form, ignore
        return None


def is_quota_exhaustion(message: str) -> bool:
    """True when a rate-limit message names a DAILY ceiling rather than a
    per-minute one.

    Unchanged from the expression Groq and the OpenAI-compatible providers
    already shared; lifted here so the two copies cannot drift while C1 is still
    open. Nothing new reads it.
    """
    msg = (message or "").lower()
    return any(marker in msg for marker in ("per day", "tpd", "rpd", "daily", "quota"))


# ── internals ────────────────────────────────────────────────────────────────
def _typed_kind(exc: Exception, sdk: str) -> Optional[str]:
    """Classify from the exception's TYPE, without importing anything."""
    for module_name in _SDK_EXCEPTION_MODULES.get(sdk, ()):
        module = sys.modules.get(module_name)
        if module is None:
            continue
        if _isinstance_of_any(exc, module, _TIMEOUT_CLASSES):
            return "timeout"
        if _isinstance_of_any(exc, module, _RATE_LIMIT_CLASSES):
            return "rate_limit"
    return None


def _isinstance_of_any(exc: Exception, module, class_names: tuple[str, ...]) -> bool:
    for class_name in class_names:
        cls = getattr(module, class_name, None)
        if isinstance(cls, type) and isinstance(exc, cls):
            return True
    return False


def _status_kind(exc: Exception) -> Optional[str]:
    """Classify from the HTTP status the SDK attached, when it attached one.

    A status code is authoritative: when one is present the text is not
    consulted at all, so a 400 whose body happens to mention a quota is a
    provider error, not a rate limit.
    """
    status = getattr(exc, "status_code", None)
    if not isinstance(status, int) or isinstance(status, bool):
        return None
    if status in _TIMEOUT_STATUSES:
        return "timeout"
    if status in _RATE_LIMIT_STATUSES:
        return "rate_limit"
    return "provider_error"


def _text_kind(exc: Exception) -> Optional[str]:
    msg = str(exc).lower()
    if _TIMEOUT_TEXT.search(msg):
        return "timeout"
    if _RATE_LIMIT_TEXT.search(msg):
        return "rate_limit"
    return None
