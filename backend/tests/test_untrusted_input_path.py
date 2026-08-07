"""
AI Security Sprint 1, task 1 — S-1. One mandatory path for untrusted input.

WHAT WAS WRONG
--------------
`app/ai/utils/untrusted.py` is a serious three-layer defence, written after a
demonstrated exploit: a one-year frontend résumé carrying instructions scored
63/100 against a senior distributed-systems role, with five skills fabricated.

`fence()` was then used by **one of eight** capabilities. The other seven
interpolated candidate-authored text behind plain `=== MARKER ===` separators —
which `untrusted.py` names, in its own docstring, as the thing that is not a
boundary, "just text the document can also contain".

That is not seven bugs. It is one architectural gap that produced seven
instances, so the fix is shaped to make the eighth impossible rather than
unlikely.

THE MECHANISM
-------------
`PromptTemplate.untrusted` is a **required constructor argument**. A capability
cannot be registered without deciding what is attacker-controlled — omitting it
is a `TypeError` at import, not a review someone might wave through.
`build_user()` fences every declared variable before the render function sees
it, and the guardrail is appended to `system` by the same class.

So a prompt builder never touches untrusted text and cannot: there is one
implementation of the boundary, in one file, applied from one place.

WHAT THESE TESTS ASSERT
-----------------------
`TestEveryCapabilityGoesThroughTheMandatoryPath` — the coverage that was missing,
proven per capability with a canary rather than by reading the registry.

`TestProtectionCannotBeForgotten` — the load-bearing class. It proves the
*mechanism*, not today's configuration: a new template cannot be built without
the declaration, and a builder cannot re-implement the boundary itself.

`TestExistingBehaviourIsPreserved` — `batch_candidate` was already protected and
must be no less so after having its hand-rolled fencing removed.
"""

from __future__ import annotations

import ast
import inspect
import re
from pathlib import Path

import pytest

from app.ai.prompts.base import PromptTemplate
from app.ai.prompts.registry import _REGISTRY
from app.ai.schemas.base import Capability
from app.ai.utils.errors import AIConfigError
from app.ai.utils.untrusted import UNTRUSTED_INPUT_GUARDRAIL

#: What a payload would say. Chosen to survive `scrub()` so the test measures
#: FENCING and not scrubbing — the two layers are independent and S-1 is the
#: fencing one.
CANARY = "CANARY_PAYLOAD_TOKEN_7f3a"

#: Label-agnostic on purpose. Matching one specific label would let a NEW
#: untrusted source (S-2 added a job-description one) slip past the guard that
#: exists to notice exactly that.
_FENCE_OPEN = re.compile(r"<<<(UNTRUSTED_[A-Z_]+):([0-9a-f]{16})>>>")
_FENCE_CLOSE = re.compile(r"<<<END_(UNTRUSTED_[A-Z_]+):([0-9a-f]{16})>>>")


def _fenced_regions(rendered: str) -> list[tuple[int, int]]:
    """The (start, end) span of each fenced block, matched by nonce.

    Note `fence()` repeats both tags in its trailing explanation sentence, so a
    naive count of the opening tag is DOUBLE the number of blocks. Pairing on the
    nonce is what makes this count blocks rather than tag occurrences.
    """
    regions = []
    for opened in _FENCE_OPEN.finditer(rendered):
        label, nonce = opened.group(1), opened.group(2)
        closed = re.search(
            rf"<<<END_{label}:{nonce}>>>", rendered[opened.end():]
        )
        if closed:
            regions.append((opened.end(), opened.end() + closed.start()))
    return regions


def _fence_count(rendered: str) -> int:
    """Distinct fenced blocks, counted by distinct (label, nonce) pair."""
    return len(set(_FENCE_OPEN.findall(rendered)))

#: Every variable any registered render function reads, with a benign default.
#: Untrusted ones are overwritten with the canary per capability.
_ALL_VARIABLES = {
    "resume_json": "resume text",
    "ats_score": 72,
    "breakdown_json": "{}",
    "job_description": "job description",
    "context": "context block",
    "question": "a question",
    "roster": "roster",
    "candidate_line": "candidate line",
    "situations": "situations",
    "available_sources": [],
    "history_text": "",
    "intent": "general",
    "focus": "full",
    "instruction": "",
    "sections": None,
}


def _render(template: PromptTemplate, **overrides) -> str:
    return template.build_user(**{**_ALL_VARIABLES, **overrides})


CAPABILITIES = sorted(_REGISTRY, key=lambda c: c.value)


class TestEveryCapabilityGoesThroughTheMandatoryPath:
    """The coverage gap S-1 names, closed and measured per capability."""

    @pytest.mark.parametrize("capability", CAPABILITIES, ids=lambda c: c.value)
    def test_declares_what_is_untrusted(self, capability):
        """`frozenset()` is a valid answer — silence is not. Every capability has
        made the decision explicitly, which is the property that survives."""
        assert isinstance(_REGISTRY[capability].untrusted, frozenset)

    @pytest.mark.parametrize("capability", CAPABILITIES, ids=lambda c: c.value)
    def test_untrusted_text_is_fenced(self, capability):
        template = _REGISTRY[capability]
        if not template.untrusted:
            pytest.skip("declares no untrusted input")
        for name in sorted(template.untrusted):
            rendered = _render(template, **{name: CANARY})
            assert _FENCE_OPEN.search(rendered), f"{capability.value}/{name} not fenced"
            assert _FENCE_CLOSE.search(rendered), f"{capability.value}/{name} not closed"
            assert CANARY in rendered, "the value was lost rather than fenced"

    @pytest.mark.parametrize("capability", CAPABILITIES, ids=lambda c: c.value)
    def test_the_canary_sits_inside_the_fence(self, capability):
        """Fencing something ELSE while the payload stays outside would pass a
        naive check. This pins the payload's position."""
        template = _REGISTRY[capability]
        if not template.untrusted:
            pytest.skip("declares no untrusted input")
        for name in sorted(template.untrusted):
            rendered = _render(template, **{name: CANARY})
            at = rendered.index(CANARY)
            assert any(start <= at < end for start, end in _fenced_regions(rendered)), (
                f"{capability.value}/{name}: the payload rendered OUTSIDE every fence"
            )

    @pytest.mark.parametrize("capability", CAPABILITIES, ids=lambda c: c.value)
    def test_the_guardrail_is_in_the_system_prompt(self, capability):
        template = _REGISTRY[capability]
        if not template.untrusted:
            pytest.skip("declares no untrusted input")
        assert UNTRUSTED_INPUT_GUARDRAIL in template.system

    def test_all_eight_capabilities_are_covered(self):
        """The audit counted 1 of 8. If a capability is ever registered without
        untrusted input by mistake, this is where the count is noticed."""
        protected = [c for c in _REGISTRY if _REGISTRY[c].untrusted]
        assert len(protected) == 8, [c.value for c in _REGISTRY if not _REGISTRY[c].untrusted]

    def test_the_fence_nonce_differs_between_renders(self):
        """An attacker who can predict the delimiter can close it."""
        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        first = _FENCE_OPEN.search(_render(template, resume_json=CANARY)).group(2)
        second = _FENCE_OPEN.search(_render(template, resume_json=CANARY)).group(2)
        assert first != second


class TestProtectionCannotBeForgotten:
    """The load-bearing class: it tests the MECHANISM, not the configuration.

    Everything above would still pass if someone protected all eight by hand and
    the ninth by nothing. These are the assertions that make the ninth fail.
    """

    def test_a_template_cannot_be_built_without_the_declaration(self):
        """The whole design in one assertion. Adding a capability without saying
        what is attacker-controlled does not compile."""
        with pytest.raises(TypeError):
            PromptTemplate(  # type: ignore[call-arg]
                id="forgot", version="1", system="s", render=lambda **v: "u",
            )

    def test_the_declaration_must_be_a_set_not_a_string(self):
        """`untrusted="resume_json"` would silently iterate characters and fence
        nothing. Refused rather than half-applied."""
        with pytest.raises(AIConfigError):
            PromptTemplate(id="x", version="1", system="s",
                           render=lambda **v: "u", untrusted="resume_json")  # type: ignore[arg-type]

    def test_declaring_a_variable_that_is_never_supplied_fails_loudly(self):
        """The silent-failure shape: a declared name that never arrives means the
        protection did nothing and said nothing (§9A rule 9)."""
        template = PromptTemplate(id="x", version="1", system="s",
                                  render=lambda **v: "u", untrusted=frozenset({"missing"}))
        with pytest.raises(AIConfigError) as excinfo:
            template.build_user(other="value")
        assert "missing" in str(excinfo.value)

    def test_a_non_string_untrusted_value_is_refused(self):
        """Fencing a structure would hide its contents from the boundary."""
        template = PromptTemplate(id="x", version="1", system="s",
                                  render=lambda **v: "u", untrusted=frozenset({"blob"}))
        with pytest.raises(AIConfigError):
            template.build_user(blob={"nested": "payload"})

    def test_no_prompt_builder_implements_its_own_boundary(self):
        """No duplicated security logic — the requirement that stops this
        regressing into eight copies again.

        Checked over the **AST**, not the raw text, so the guard cannot fire on a
        docstring that merely discusses `fence()`. Two earlier guards in this
        repo were written as substring checks and fired on their own
        documentation (D0.17); a guard that flags prose gets deleted for noise.
        """
        roots = [Path("app/ai/prompts"), Path("app/llm")]
        offenders = []
        for root in roots:
            for path in root.rglob("*.py"):
                if path.name == "base.py" and "prompts" in str(path):
                    continue  # the one file that is ALLOWED to fence
                tree = ast.parse(path.read_text(encoding="utf-8"))
                for node in ast.walk(tree):
                    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                        if node.func.id in {"fence", "scrub"}:
                            offenders.append(f"{path}:{node.lineno} calls {node.func.id}()")
        assert not offenders, (
            "prompt builders must not apply the boundary themselves — declare the "
            "variable in the registry instead:\n  " + "\n  ".join(offenders)
        )

    def test_the_guardrail_is_applied_by_the_class_not_by_hand(self):
        """A prompt that does not state the guardrail still gets it, which is why
        no system prompt has to remember."""
        template = PromptTemplate(id="x", version="1", system="PLAIN",
                                  render=lambda **v: "u", untrusted=frozenset({"a"}))
        assert UNTRUSTED_INPUT_GUARDRAIL in template.system

    def test_it_is_not_applied_twice(self):
        """`batch_candidate` carried the guardrail by hand for months. A template
        that already states it must not get a second copy."""
        system = f"BASE\n\n{UNTRUSTED_INPUT_GUARDRAIL}"
        template = PromptTemplate(id="x", version="1", system=system,
                                  render=lambda **v: "u", untrusted=frozenset({"a"}))
        assert template.system.count(UNTRUSTED_INPUT_GUARDRAIL) == 1

    def test_a_capability_with_no_untrusted_input_gets_no_guardrail(self):
        """The clause costs tokens on every call. It is applied where it means
        something, not everywhere."""
        template = PromptTemplate(id="x", version="1", system="PLAIN",
                                  render=lambda **v: "u", untrusted=frozenset())
        assert template.system == "PLAIN"

    def test_render_receives_fenced_values_not_raw_ones(self):
        """The builders are unaware by design: whatever they interpolate is
        already bounded, so a new builder is protected without doing anything."""
        seen = {}

        def _render_fn(**v):
            seen.update(v)
            return "out"

        template = PromptTemplate(id="x", version="1", system="s",
                                  render=_render_fn, untrusted=frozenset({"doc"}))
        template.build_user(doc=CANARY, other="plain")
        assert seen["doc"] != CANARY and CANARY in seen["doc"]
        assert seen["other"] == "plain"


class TestExistingBehaviourIsPreserved:
    def test_batch_candidate_is_no_less_protected_than_before(self):
        """It was the one capability that worked. Removing its hand-rolled
        `fence()` must not have removed its protection."""
        template = _REGISTRY[Capability.BATCH_CANDIDATE]
        rendered = _render(template, resume_json=CANARY)
        assert _FENCE_OPEN.search(rendered) and _FENCE_CLOSE.search(rendered)
        assert UNTRUSTED_INPUT_GUARDRAIL in template.system

    def test_batch_candidate_fences_each_variable_exactly_once(self):
        """Declaring a variable while the builder still called `fence()` would
        nest two boundaries around it — harmless in itself, but the sign that the
        duplication survived.

        Two blocks now, not one: S-2 added the job description. One block per
        declared untrusted variable, never two around the same one."""
        template = _REGISTRY[Capability.BATCH_CANDIDATE]
        rendered = _render(template, resume_json=CANARY)
        assert _fence_count(rendered) == len(template.untrusted) == 2

    def test_a_variable_declared_trusted_passes_through_untouched(self):
        """S-1 asserted here that the job description was NOT fenced, to prove it
        had not quietly done S-2. **S-2 has now been done and that assertion is
        inverted** — see `tests/test_job_description_untrusted.py`.

        The property S-1 actually needed is still worth keeping, so it is asserted
        on a variable that IS still trusted: a declared-trusted value reaches the
        builder byte-identically."""
        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        rendered = _render(template, breakdown_json="PLAIN_BREAKDOWN_MARKER")
        assert "PLAIN_BREAKDOWN_MARKER" in rendered
        assert not any(
            "PLAIN_BREAKDOWN_MARKER" in rendered[start:end]
            for start, end in _fenced_regions(rendered)
        )

    def test_every_registered_prompt_still_renders(self):
        for capability in CAPABILITIES:
            assert _render(_REGISTRY[capability])


class TestDeterministicEvaluationIsPreserved:
    """Fencing injects a per-call nonce, so a prompt's identity has to survive
    it — D0.15 already established that, and this confirms it still holds now
    that eight capabilities fence instead of one."""

    @pytest.mark.parametrize("capability", CAPABILITIES, ids=lambda c: c.value)
    def test_the_fingerprint_is_stable_across_renders(self, capability):
        from app.ai.providers.fake_provider import fingerprint

        template = _REGISTRY[capability]
        first = fingerprint(template.system, _render(template))
        second = fingerprint(template.system, _render(template))
        assert first == second, f"{capability.value} is no longer prompt-keyable"

    def test_a_different_document_still_changes_the_fingerprint(self):
        """Stability must come from normalising the nonce, not from ignoring the
        content."""
        from app.ai.providers.fake_provider import fingerprint

        template = _REGISTRY[Capability.RESUME_ANALYSIS]
        a = fingerprint(template.system, _render(template, resume_json="candidate A"))
        b = fingerprint(template.system, _render(template, resume_json="candidate B"))
        assert a != b


class TestFakeProviderCompatibility:
    def test_the_fake_contract_is_untouched_by_this_task(self):
        """S-1 changes prompt construction, not the provider contract."""
        from app.ai.providers.fake_provider import FakeProvider

        assert "json_mode" in inspect.signature(FakeProvider.complete).parameters
        assert FakeProvider.can_json is True

    def test_the_golden_dataset_still_registers_and_answers(self):
        """End to end through the real registry: if fencing had broken prompt
        keying, the fake would raise `AIConfigError` for every case."""
        from app.ai.evaluation.golden import load_and_register

        cases = load_and_register()
        assert len(cases) == 6
