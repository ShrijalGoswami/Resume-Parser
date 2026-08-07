"""
Phase 1, task 6 — Native JSON Support. Guards for C6.

WHAT WAS WRONG
--------------
`can_json` / `supports_json` were declared on every provider and read by
**nothing** — a decoration, which is exactly what §9A rule 10 forbids. Structured
output was prompt-instructed only, and a parse failure was retried up to six
times (3 JSON × 2 schema) with a **byte-identical prompt**: the model was asked
the same question the same way and expected to answer differently.

WHAT C6 CHANGED
---------------
Two things, and the second is the one that costs money:

  1. The orchestrator asks Groq for `response_format={"type": "json_object"}`
     when — and only when — the **provider** declares `can_json` AND the resolved
     **model** declares `supports_json`. Both declarations, never inferred.
  2. A JSON re-attempt appends a short repair instruction. The FIRST attempt is
     byte-identical to what it was before C6, which is what keeps deterministic
     evaluation intact.

WHAT THESE TESTS ASSERT
-----------------------
`TestJsonModeIsRequestedOnlyWhenDeclared` is the C6 fix and its safety rail: a
provider that has not implemented the parameter never receives it, and neither
does an unregistered model.

`TestTheFirstAttemptIsUnchanged` is the regression guard that matters most. If
the repair instruction ever leaks into attempt 1, prompt text has changed
(§9A rule 6), every golden fingerprint moves, and deterministic evaluation is
silently broken.

`TestPromptsSatisfyTheApiPrecondition` pins the reason C6 needed no prompt
changes: Groq rejects `json_object` unless the messages contain the word "JSON".
Every registered prompt already does. A future prompt that drops it would 400 in
production; here it fails a test instead.

Offline: no key, no network, no vendor is contacted.
"""

from __future__ import annotations

import importlib

import pytest
from pydantic import BaseModel

from app.ai.gateway.model_registry import ModelSpec, get_model, register_model
from app.ai.gateway.provider_registry import ProviderSpec, register_provider_spec
from app.ai.gateway.roles import ModelRole
from app.ai.prompts.base import PromptTemplate
from app.ai.prompts.registry import _REGISTRY as PROMPT_REGISTRY
from app.ai.providers.base import LLMProvider
from app.ai.providers.fake_provider import FAKE_MODEL, Behaviour, FakeProvider, behaviour, fake_script
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.registry import get_provider, register_provider
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.json import JSON_REPAIR_INSTRUCTION, with_repair_instruction
from app.core.config import settings

orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")

DECLARES = "c6_declares"        # can_json=True, model registered as supporting JSON
SILENT = "c6_silent"            # can_json=False — must never see the parameter
UNREGISTERED = "c6_unregistered"  # can_json=True but its model is not in the registry


class _Reply(BaseModel):
    answer: str = ""


def _make(name: str, *, can_json: bool, model: str, seen: list):
    class _P(LLMProvider):
        def complete(self, *, system, user, model, temperature, max_tokens,
                     timeout_seconds, **kwargs):
            # `**kwargs` on purpose: this fake accepts whatever it is sent so the
            # test can assert on what it RECEIVED. A provider that declared
            # nothing and was sent `json_mode` would TypeError in production —
            # which is the failure `test_a_silent_provider_is_never_sent_it`
            # exists to prevent.
            seen.append({"user": user, "kwargs": kwargs})
            return ProviderResponse(text='{"answer":"ok"}', model=model,
                                    provider=self.name, usage=TokenUsage(1, 1, 2))

    _P.name = name
    _P.display_name = name
    _P.api_key_setting = ""
    _P.can_json = can_json
    _P.role_models = {ModelRole.DEFAULT_REASONING: model}
    register_provider(name, _P)
    register_provider_spec(ProviderSpec(
        name, name, frozenset({"reasoning"}), "",
        role_models={ModelRole.DEFAULT_REASONING: model},
    ))
    return _P


@pytest.fixture
def env(monkeypatch):
    seen: list = []
    _make(DECLARES, can_json=True, model="c6-json-model", seen=seen)
    _make(SILENT, can_json=False, model="c6-silent-model", seen=seen)
    _make(UNREGISTERED, can_json=True, model="c6-never-registered", seen=seen)
    register_model(ModelSpec("c6-json-model", DECLARES, supports_json=True))
    register_model(ModelSpec("c6-silent-model", SILENT, supports_json=True))
    # "c6-never-registered" is deliberately NOT registered.

    monkeypatch.setattr(
        orch_mod, "get_prompt",
        lambda cap: PromptTemplate(id="t", version="1", system="s", render=lambda **v: "ASK", untrusted=frozenset()),
    )
    monkeypatch.setattr(orch_mod.time, "sleep", lambda _s: None)
    for key, value in {
        "AI_FALLBACK_PROVIDERS": "", "AI_DISABLED_PROVIDERS": "",
        "AI_ENABLE_FALLBACK": True, "AI_PROVIDERS": {},
        "AI_CAPABILITY_MODELS": {}, "AI_ENABLE_CAPABILITY_ROUTING": False,
        "DEFAULT_REASONING_MODEL": "",
    }.items():
        monkeypatch.setattr(settings, key, value)

    def _use(provider: str):
        monkeypatch.setattr(settings, "AI_PROVIDER", provider)

    return _use, seen


def _run():
    return orch_mod.orchestrator.run(
        capability=Capability.RECRUITER_COPILOT, variables={}, schema=_Reply,
    )


class TestJsonModeIsRequestedOnlyWhenDeclared:
    def test_a_declaring_provider_and_model_get_json_mode(self, env):
        """THE C6 FIX. `can_json` finally does something."""
        use, seen = env
        use(DECLARES)
        _run()
        assert seen[-1]["kwargs"] == {"json_mode": True}

    def test_a_silent_provider_is_never_sent_it(self, env):
        """A provider that has not implemented the parameter must never receive
        it — its `complete()` would raise `TypeError`, which is not even an
        `AIError` and would escape the whole retry ladder."""
        use, seen = env
        use(SILENT)
        _run()
        assert seen[-1]["kwargs"] == {}

    def test_an_unregistered_model_is_unknown_not_yes(self, env):
        """The model registry documents that unknown models still work. Guessing
        "yes" would send a parameter the model might 400 on — and a 400 is a
        retryable provider error, so it would be paid for three times before
        failing."""
        use, seen = env
        use(UNREGISTERED)
        _run()
        assert seen[-1]["kwargs"] == {}

    def test_a_model_declaring_no_json_support_is_not_sent_it(self, env, monkeypatch):
        use, seen = env
        register_model(ModelSpec("c6-json-model", DECLARES, supports_json=False))
        try:
            use(DECLARES)
            _run()
            assert seen[-1]["kwargs"] == {}
        finally:
            register_model(ModelSpec("c6-json-model", DECLARES, supports_json=True))

    def test_groq_declares_json_mode_and_its_models_support_it(self):
        """The shipping path (§11.0). Both halves of the decision must be true
        for Groq, or C6 is inert where it matters."""
        assert GroqProvider.can_json is True
        for model in set(GroqProvider.role_models.values()):
            spec = get_model(model)
            assert spec is not None and spec.supports_json, model


class TestTheFirstAttemptIsUnchanged:
    """The regression guard that matters most. If the repair instruction leaks
    into attempt 1, prompt text has changed (§9A rule 6), every golden
    fingerprint moves, and deterministic evaluation breaks silently."""

    def test_attempt_one_carries_no_repair_instruction(self, env):
        use, seen = env
        use(DECLARES)
        _run()
        assert seen[0]["user"] == "ASK"

    def test_the_helper_is_identity_on_attempt_zero(self):
        assert with_repair_instruction("ASK", 0) == "ASK"

    def test_a_re_attempt_asks_for_a_repair(self):
        repaired = with_repair_instruction("ASK", 1)
        assert repaired.startswith("ASK")
        assert repaired.endswith(JSON_REPAIR_INSTRUCTION)

    def test_the_instruction_names_the_failure_and_adds_no_schema(self):
        """Short on purpose. A longer instruction carrying schema detail would be
        a prompt change in all but name."""
        assert "JSON" in JSON_REPAIR_INSTRUCTION
        assert len(JSON_REPAIR_INSTRUCTION) < 250


class TestTheRepairInstructionReachesTheProvider:
    """Driven through the real ladder with the real fake, so what is proven is
    the orchestrator's behaviour rather than a helper's."""

    @pytest.fixture(autouse=True)
    def _fake(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_PROVIDER", "fake")
        monkeypatch.setattr(settings, "AI_FALLBACK_PROVIDERS", "")
        monkeypatch.setattr(settings, "AI_DISABLED_PROVIDERS", "")
        monkeypatch.setattr(settings, "ENVIRONMENT", "development")
        monkeypatch.setattr(orch_mod.time, "sleep", lambda _s: None)
        monkeypatch.setattr(
            orch_mod, "get_prompt",
            lambda cap: PromptTemplate(id="t", version="1", system="s",
                                       render=lambda **v: "ASK", untrusted=frozenset()),
        )
        fake_script.reset()
        yield
        fake_script.reset()

    def test_the_second_json_attempt_asks_for_a_repair(self):
        from app.ai.utils.errors import AIError

        fake_script.set_default(behaviour(Behaviour.INVALID_JSON))
        with pytest.raises(AIError):
            _run()
        calls = fake_script.calls
        assert calls, "the fake was never called"
        assert calls[0]["repair_requested"] is False
        assert any(c["repair_requested"] for c in calls[1:]), (
            "every JSON re-attempt re-sent the identical prompt — the defect C6 fixed"
        )

    def test_the_fake_receives_json_mode(self):
        """`AI_PROVIDER=fake` must exercise the same C6 path as Groq, or the
        offline evidence is about a different code path (§9A rule 12)."""
        fake_script.set_default(behaviour(Behaviour.INVALID_JSON))
        from app.ai.utils.errors import AIError

        with pytest.raises(AIError):
            _run()
        assert all(c["json_mode"] is True for c in fake_script.calls)


class TestDeterministicEvaluationIsNotRegressed:
    """A retry must keep ONE prompt identity, or a scripted sequence never
    reaches its second entry and the golden dataset finds no registered answer
    for the attempt it exists to measure."""

    def test_the_repair_instruction_is_normalised_out_of_the_fingerprint(self):
        from app.ai.providers.fake_provider import fingerprint

        assert fingerprint("s", "ASK") == fingerprint("s", with_repair_instruction("ASK", 1))

    def test_a_genuine_prompt_change_still_moves_the_fingerprint(self):
        """The normalisation must not become a blanket suffix-stripper — §9A
        rule 6 stays detectable."""
        from app.ai.providers.fake_provider import fingerprint

        assert fingerprint("s", "ASK") != fingerprint("s", "ASK and one more thing")

    def test_the_fake_still_refuses_an_unregistered_prompt(self):
        """D0.14 — the false green that closed. Unchanged by C6."""
        from app.ai.utils.errors import AIConfigError

        fake_script.reset()
        with pytest.raises(AIConfigError):
            FakeProvider()._text_for(Behaviour.SUCCESS, "deadbeef", behaviour(Behaviour.SUCCESS),
                                     "s", "u")


class TestPromptsSatisfyTheApiPrecondition:
    """Groq rejects `response_format={"type":"json_object"}` unless the messages
    contain the word "JSON". Every registered prompt already does, which is the
    reason C6 needed no prompt changes — and this is what keeps it that way."""

    @pytest.mark.parametrize("capability", sorted(PROMPT_REGISTRY, key=lambda c: c.value))
    def test_every_prompt_mentions_json(self, capability):
        template = PROMPT_REGISTRY[capability]
        assert "JSON" in template.system.upper(), (
            f"{capability.value}'s system prompt no longer contains the word "
            f"'JSON'. Native JSON mode would be rejected by the API at runtime."
        )


class TestTheContractGrewForEveryone:
    """§9A rule 12: when the contract grows, `FakeProvider` grows with it in the
    same commit — otherwise the reference implementation stops being one."""

    def test_the_fake_declares_and_accepts_json_mode(self):
        assert FakeProvider.can_json is True
        import inspect

        assert "json_mode" in inspect.signature(FakeProvider.complete).parameters

    def test_the_base_default_is_off(self):
        """A provider that says nothing gets nothing. Before C6 this defaulted
        True, which is why it could be decorative without anyone noticing."""
        assert LLMProvider.can_json is False

    def test_the_fake_model_supports_json(self):
        spec = get_model(FAKE_MODEL)
        assert spec is not None and spec.supports_json is True
