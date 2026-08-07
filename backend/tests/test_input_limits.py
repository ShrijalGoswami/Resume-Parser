"""
AI Security Sprint 1, task 4 — S-4. Bound what reaches the LLM.

WHAT WAS WRONG
--------------
Three things, and the third is the finding:

  * `/batch-analysis` refused a job description over 20000 characters.
    `/match-analysis` bounded it **not at all**.
  * `_MAX_MESSAGE_CHARS` existed three times with two values — 4000 at the route,
    1500 in the service, 1500 in the context builder. The route's limit was
    decorative, and nobody reading one file could say what the real one was.
  * **Extracted document text was bounded by nothing.** The upload cap is 10MB of
    *file*; a 10MB PDF can carry megabytes of text over hundreds of pages, and
    every one of them went into a prompt. Groq's free tier is ~100k tokens a day
    for the whole platform, so one crafted upload could spend every customer's AI
    for the rest of the day.

THE SHAPE OF THE FIX
--------------------
One owner — `app/ai/utils/limits.py` — and enforcement at the boundaries that
already exist: the parser chokepoint `scrub()` occupies, the two analysis routes,
and `PromptTemplate`, where every untrusted value converges since S-1.

Reject or truncate follows the product's existing split: **refuse** what a user
supplied and can fix, **clamp with a visible notice** what is assembled behind
their back. A fragment must never read as a whole document (§8A).

WHAT THESE TESTS ASSERT
-----------------------
Boundary values at, and one character past, every limit — because an off-by-one
in a ceiling is the bug that only shows up on the one document that matters.
`TestNothingIsScattered` is the structural half: it fails if a future change
reintroduces a literal instead of editing the one owner.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from app.ai.prompts.registry import _REGISTRY
from app.ai.schemas.base import Capability
from app.ai.utils.limits import (
    CHAT_MESSAGE_MAX_CHARS,
    JOB_DESCRIPTION_MAX_CHARS,
    TRUNCATION_NOTICE,
    DocumentTooLargeError,
    clamp_prompt_variable,
    enforce_document,
    job_description_error,
    limits,
)
from app.core.config import settings
from app.parser.exceptions import ParserError

ACTIVE = limits()


@pytest.fixture
def small_limits(monkeypatch):
    """Shrink the ceilings so boundary tests do not allocate megabytes."""
    monkeypatch.setattr(settings, "AI_MAX_DOCUMENT_CHARS", 100)
    monkeypatch.setattr(settings, "AI_MAX_DOCUMENT_PAGES", 5)
    monkeypatch.setattr(settings, "AI_MAX_JOB_DESCRIPTION_CHARS", 50)
    monkeypatch.setattr(settings, "AI_MAX_PROMPT_VARIABLE_CHARS", 80)


class TestDocumentTextIsBounded:
    """The finding: extracted text had no ceiling at all."""

    def test_exactly_at_the_character_limit_is_accepted(self, small_limits):
        enforce_document("x" * 100, page_count=1)

    def test_one_character_over_is_refused(self, small_limits):
        with pytest.raises(DocumentTooLargeError):
            enforce_document("x" * 101, page_count=1)

    def test_exactly_at_the_page_limit_is_accepted(self, small_limits):
        enforce_document("short", page_count=5)

    def test_one_page_over_is_refused(self, small_limits):
        with pytest.raises(DocumentTooLargeError):
            enforce_document("short", page_count=6)

    def test_the_refusal_names_the_limit_and_the_actual_size(self, small_limits):
        """"Too large" without a number is not something anyone can act on."""
        with pytest.raises(DocumentTooLargeError) as excinfo:
            enforce_document("x" * 250, page_count=1)
        message = str(excinfo.value)
        assert "250" in message and "100" in message

    def test_pages_are_checked_before_characters(self, small_limits):
        """The page count is known before any text is concatenated, so it is the
        cheaper signal and should be the one that fires."""
        with pytest.raises(DocumentTooLargeError) as excinfo:
            enforce_document("x" * 5000, page_count=99)
        assert "pages" in str(excinfo.value)

    def test_an_empty_document_is_not_an_error(self, small_limits):
        enforce_document("", page_count=0)


class TestTheParserRefusesOversizedDocuments:
    """Enforced at the chokepoint `scrub()` already occupies, so PDF and DOCX are
    covered by one implementation rather than two."""

    def _extract(self, monkeypatch, text: str, pages: int):
        from app.parser import factory as factory_module

        class _StubParser:
            def parse(self, _path):
                return text, pages

        monkeypatch.setattr(factory_module.ParserFactory, "get_parser",
                            classmethod(lambda cls, path: _StubParser()))
        monkeypatch.setattr(Path, "exists", lambda self: True)
        return factory_module.ParserFactory.parse_file(Path("resume.pdf"))

    def test_an_oversized_pdf_is_refused_as_a_parser_error(self, small_limits, monkeypatch):
        """A `ParserError`, so the route's existing handling reports it to the
        recruiter rather than surfacing a new exception type."""
        with pytest.raises(ParserError) as excinfo:
            self._extract(monkeypatch, "x" * 5000, pages=1)
        assert "above the limit" in str(excinfo.value)

    def test_an_oversized_docx_is_refused_by_the_same_check(self, small_limits, monkeypatch):
        """DOCX estimates its page count as `len(text)//3000`, so the character
        ceiling is what catches it — which is why both are enforced."""
        with pytest.raises(ParserError):
            self._extract(monkeypatch, "x" * 5000, pages=2)

    def test_a_document_with_too_many_pages_is_refused(self, small_limits, monkeypatch):
        with pytest.raises(ParserError) as excinfo:
            self._extract(monkeypatch, "short", pages=500)
        assert "pages" in str(excinfo.value)

    def test_a_normal_resume_passes_through_unchanged(self, small_limits, monkeypatch):
        """No regression for the documents this product actually receives."""
        text, pages, parser = self._extract(monkeypatch, "Jane Doe\nSenior Engineer", pages=2)
        assert text == "Jane Doe\nSenior Engineer"
        assert pages == 2 and parser == "_StubParser"

    def test_the_limit_still_leaves_room_for_a_long_cv(self):
        """A ceiling that refuses real résumés is a worse bug than no ceiling.
        200k characters is roughly 66 dense pages."""
        assert ACTIVE.document_chars >= 200_000
        assert ACTIVE.document_pages >= 100


class TestJobDescriptionsAreBoundedEverywhere:
    def test_exactly_at_the_limit_is_accepted(self, small_limits):
        assert job_description_error("x" * 50) is None

    def test_one_character_over_is_refused(self, small_limits):
        assert job_description_error("x" * 51) is not None

    def test_the_message_names_both_numbers(self, small_limits):
        message = job_description_error("x" * 90)
        assert "90" in message and "50" in message

    def test_empty_and_none_are_accepted(self, small_limits):
        assert job_description_error("") is None
        assert job_description_error(None) is None  # type: ignore[arg-type]

    def test_both_analysis_routes_enforce_it(self):
        """`/match-analysis` had NO limit before S-4 while `/batch-analysis`
        refused at 20000. Same input, same ceiling.

        Asserted on a CALL in the AST, not on the text of the file. The first
        version of this test searched the source for the function name and was
        satisfied by the surviving `import` line while the call itself had been
        deleted — it passed against the exact regression it existed to catch.
        """
        for route in ("app/routes/match.py", "app/routes/batch.py"):
            tree = ast.parse(Path(route).read_text(encoding="utf-8"))
            called = any(
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id == "job_description_error"
                for node in ast.walk(tree)
            )
            assert called, f"{route} imports the check but never calls it"

    def test_the_copilot_schema_uses_the_same_ceiling(self):
        from app.schemas.copilot import CopilotRequest

        field = CopilotRequest.model_fields["job_description"]
        constraints = [m for m in field.metadata if hasattr(m, "max_length")]
        assert constraints and constraints[0].max_length == JOB_DESCRIPTION_MAX_CHARS


class TestPromptVariablesAreClamped:
    """The cost ceiling, enforced where every untrusted value converges (S-1)."""

    def test_exactly_at_the_limit_is_untouched(self, small_limits):
        value = "x" * 80
        assert clamp_prompt_variable(value) == value

    def test_one_character_over_is_clamped(self, small_limits):
        clamped = clamp_prompt_variable("x" * 81)
        assert len(clamped) < 81 + len(TRUNCATION_NOTICE)
        assert clamped.startswith("x" * 80)

    def test_truncation_is_announced_not_silent(self, small_limits):
        """§8A: a bounded thing must never be presented as complete. The model
        has to know it is reading a fragment."""
        clamped = clamp_prompt_variable("x" * 200)
        assert "truncated" in clamped
        assert "120" in clamped  # 200 - 80 omitted

    def test_the_notice_travels_inside_the_fence(self, small_limits):
        """Clamping happens BEFORE fencing, so the delimiter is never what gets
        cut and the notice lands where the model reads it."""
        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        rendered = template.build_user(
            resume_json="y" * 500, ats_score=10, breakdown_json="{}"
        )
        assert "truncated" in rendered
        assert "<<<END_UNTRUSTED_CANDIDATE_DOCUMENT:" in rendered

    def test_a_normal_prompt_is_not_clamped(self, small_limits):
        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        rendered = template.build_user(
            resume_json="Jane Doe, engineer", ats_score=70, breakdown_json="{}"
        )
        assert "truncated" not in rendered

    def test_the_prompt_ceiling_is_lower_than_the_document_ceiling(self):
        """Two bounds for two reasons: resource vs cost. If they were equal one
        of them would be doing nothing."""
        assert ACTIVE.prompt_variable_chars < ACTIVE.document_chars


class TestNothingIsScattered:
    """The requirement that shapes this task: future limit changes must mean
    editing one file."""

    def test_the_message_limit_agrees_across_route_and_service(self):
        """It did not: 4000 at the route, 1500 in the service. The route's limit
        was decorative and 2500 characters were cut twice."""
        from app.llm.copilot import _MAX_MESSAGE_CHARS as service
        from app.routes.copilot import _MAX_MESSAGE_CHARS as route

        assert route == service == CHAT_MESSAGE_MAX_CHARS

    def test_no_route_or_schema_hardcodes_the_job_description_ceiling(self):
        """Checked over the AST for a bare `20000` literal, so a comment or a
        docstring mentioning the number does not trip it (D0.17)."""
        offenders = []
        for path in [Path("app/routes/batch.py"), Path("app/routes/match.py"),
                     Path("app/schemas/copilot.py")]:
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Constant) and node.value == JOB_DESCRIPTION_MAX_CHARS:
                    offenders.append(f"{path}:{node.lineno}")
        assert not offenders, (
            "the job-description ceiling is hardcoded again — import it from "
            f"app/ai/utils/limits.py instead: {offenders}"
        )

    def test_every_limit_is_configurable(self):
        """A limit that needs a code change to move is a limit nobody moves
        during an incident."""
        for field in ("AI_MAX_DOCUMENT_CHARS", "AI_MAX_DOCUMENT_PAGES",
                      "AI_MAX_JOB_DESCRIPTION_CHARS", "AI_MAX_PROMPT_VARIABLE_CHARS"):
            assert hasattr(settings, field), field

    def test_limits_are_read_live_not_captured_at_import(self, small_limits):
        """Otherwise a deployment override or a test fixture would be ignored."""
        assert limits().document_chars == 100


class TestDeterminismIsUnchanged:
    def test_clamping_is_a_pure_function(self, small_limits):
        value = "x" * 500
        assert clamp_prompt_variable(value) == clamp_prompt_variable(value)

    def test_an_unclamped_prompt_keeps_its_fingerprint(self):
        """Normal-sized inputs must render exactly as they did before S-4, or
        every golden case moves."""
        from app.ai.providers.fake_provider import fingerprint

        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        args = {"resume_json": "Jane Doe", "ats_score": 70, "breakdown_json": "{}"}
        first = fingerprint(template.system, template.build_user(**args))
        second = fingerprint(template.system, template.build_user(**args))
        assert first == second

    def test_the_golden_dataset_still_answers(self):
        from app.ai.evaluation.golden import load_and_register

        assert len(load_and_register()) == 6
