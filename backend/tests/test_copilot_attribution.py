"""
Source attribution contract for every AI answer.

Two properties the product depends on and neither was expressible before:

  1. `sources_used` is attributed SERVER-SIDE from the context resolver, never
     by the model, so citations cannot be fabricated.
  2. An answer states whether it was grounded at all. An empty `sources_used`
     used to be ambiguous — "grounded, attribution missing" and "not grounded,
     nothing to attribute" both rendered as no sources, so the UI could not
     distinguish an unevidenced answer from an evidenced one that lost its
     citations. `grounded` is now COMPUTED from `sources_used`, so the two can
     never disagree and no call site can forget to set it.

Organizational Memory is deliberately excluded from grounding: it is the
copilot's own earlier output replayed, so counting it would let an answer cite
itself. That is not hypothetical — five stored copies of a wrong answer were
being re-injected as "organizational knowledge" (see
test_copilot_workspace_context.py).

Runnable without pytest:  python -m tests.test_copilot_attribution
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from app.schemas.copilot import (
    MEMORY_SOURCE,
    CopilotSource,
    CopilotStructuredResponse,
    is_grounded,
)


def test_grounded_is_true_when_a_platform_source_contributed():
    r = CopilotStructuredResponse(
        answer="…",
        sources_used=[
            CopilotSource(source="Current Campaign", detail="Senior Backend Engineer"),
            CopilotSource(source="Candidate Roster", detail="8 candidate(s)"),
        ],
    )
    assert r.grounded is True


def test_grounded_is_false_with_no_sources():
    assert CopilotStructuredResponse(answer="general advice").grounded is False


def test_memory_alone_is_not_grounding():
    """Otherwise recalled output becomes its own evidence."""
    r = CopilotStructuredResponse(
        answer="…", sources_used=[CopilotSource(source=MEMORY_SOURCE, detail="3 facts")]
    )
    assert r.grounded is False


def test_memory_plus_real_data_is_grounded():
    r = CopilotStructuredResponse(
        answer="…",
        sources_used=[
            CopilotSource(source=MEMORY_SOURCE, detail="3 facts"),
            CopilotSource(source="Workspace", detail="4 role(s)"),
        ],
    )
    assert r.grounded is True


def test_grounded_is_serialized_to_the_client():
    """A computed field is useless if it does not cross the wire."""
    payload = CopilotStructuredResponse(
        answer="…", sources_used=[CopilotSource(source="Workspace", detail="4 role(s)")]
    ).model_dump()
    assert "grounded" in payload, payload.keys()
    assert payload["grounded"] is True


def test_grounded_cannot_be_forged_by_a_caller():
    """
    It is derived, so a caller passing `grounded=True` with no sources cannot
    make an unevidenced answer claim evidence.
    """
    r = CopilotStructuredResponse(answer="…", grounded=True)  # type: ignore[call-arg]
    assert r.grounded is False


def test_is_grounded_accepts_names_or_objects():
    """The route gates memory writes on names; the schema on objects."""
    assert is_grounded(["Current Campaign"]) is True
    assert is_grounded([MEMORY_SOURCE]) is False
    assert is_grounded([]) is False
    assert is_grounded(None) is False  # type: ignore[arg-type]


def test_degraded_answers_are_not_grounded():
    """An LLM-unavailable fallback has no evidence behind it."""
    r = CopilotStructuredResponse(answer="temporarily unavailable", degraded=True)
    assert r.grounded is False


TESTS = [v for k, v in sorted(globals().items()) if k.startswith("test_")]

if __name__ == "__main__":
    failures = 0
    for fn in TESTS:
        try:
            fn()
            print(f"  ok   {fn.__name__}")
        except AssertionError as exc:
            failures += 1
            print(f"  FAIL {fn.__name__}: {exc}")
    print(f"\n{len(TESTS) - failures}/{len(TESTS)} passed")
    sys.exit(1 if failures else 0)
