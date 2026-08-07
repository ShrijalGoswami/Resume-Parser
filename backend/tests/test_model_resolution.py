"""
Phase 1, task 5 — Default Model Resolution. Guards for C4 and C5.

WHAT WAS WRONG
--------------
The model was chosen in two places that did not know about each other, and both
ends of the precedence were inverted.

C4 — `gateway._role_model()` ended with `return settings.AI_DEFAULT_MODEL`, and
that setting held a **Groq** model name. Any provider with an incomplete
`role_models` map was handed a Llama. Verified before the fix: a provider
declaring no models at all resolved to `llama-3.3-70b-versatile`. The request
then reached a real vendor carrying a model it has never heard of, so the error
came back as *their* error rather than our misconfiguration.

C5 — `orchestrator._attempt()` did `model_name = pcfg.default_model or
selection.model`, so a config file silently beat an explicit call-site `model=`.
Verified before the fix: a caller asking for `CALLER-ASKED-FOR-THIS` had
`provider-default` sent instead, and `execution.model` recorded `provider-default`
— so the override was invisible in the record as well as ignored in the call.

WHAT THESE TESTS ASSERT
-----------------------
`TestPrecedence` walks the full ladder one rung at a time, most specific first.
`TestNoCrossProviderLeak` is C4: a provider is never handed another vendor's
model, and a missing model raises rather than resolving to something plausible.
`TestTheCallerIsObeyed` is C5, asserted on the model the provider actually
RECEIVED — not on the selection object, because the whole defect was that the
two disagreed.

`TestEveryDecisionIsObservable` covers the half of C5 that was invisible.

Offline: no key, no network, no vendor is contacted.
"""

from __future__ import annotations

import importlib

import pytest
from pydantic import BaseModel

from app.ai.gateway.gateway import (
    ModelSource,
    config_snapshot,
    resolve,
    routable_providers,
)
from app.ai.gateway.provider_registry import ProviderSpec, register_provider_spec
from app.ai.gateway.roles import ModelRole
from app.ai.prompts.base import PromptTemplate
from app.ai.providers.base import LLMProvider
from app.ai.providers.registry import register_provider
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings

orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")

DECLARED = "declared-role-model"       # what the provider itself declares
PROVIDER_NAME = "c45prov"
BARE_NAME = "c45bare"                  # a spec that declares NO models
NOSPEC_NAME = "c45nospec"              # a real class with NO gateway spec at all


class _Reply(BaseModel):
    answer: str = ""


@pytest.fixture
def env(monkeypatch):
    """One provider that declares a model, one that declares none, and a clean
    configuration to move a single rung at a time."""
    received: dict[str, str] = {}

    class _P(LLMProvider):
        def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds):
            received["model"] = model
            return ProviderResponse(text='{"answer":"ok"}', model=model,
                                    provider=self.name, usage=TokenUsage(1, 1, 2))

    _P.name = PROVIDER_NAME
    _P.display_name = PROVIDER_NAME
    _P.api_key_setting = ""
    _P.role_models = {ModelRole.DEFAULT_REASONING: DECLARED,
                      ModelRole.LONG_CONTEXT: "declared-long-context"}
    register_provider(PROVIDER_NAME, _P)
    register_provider_spec(ProviderSpec(
        PROVIDER_NAME, PROVIDER_NAME, frozenset({"reasoning"}), "",
        role_models=dict(_P.role_models),
    ))
    # Registered, reasoning-capable, and declares no model for any role — the
    # exact shape C4 described as "a new provider with an incomplete role map".
    register_provider_spec(ProviderSpec(
        BARE_NAME, BARE_NAME, frozenset({"reasoning"}), "", role_models={},
    ))

    # A constructible provider with NO ProviderSpec — so the gateway cannot
    # resolve a model for it, but a caller pinning one explicitly can still use
    # it. This is the shape the provider-contract suite exercises.
    class _NoSpec(_P):
        pass

    _NoSpec.name = NOSPEC_NAME
    _NoSpec.role_models = {}
    register_provider(NOSPEC_NAME, _NoSpec)

    defaults = {
        "AI_PROVIDER": PROVIDER_NAME,
        "AI_FALLBACK_PROVIDERS": "",
        "AI_DISABLED_PROVIDERS": "",
        "AI_ENABLE_FALLBACK": True,
        "AI_PROVIDERS": {},
        "AI_CAPABILITY_MODELS": {},
        "AI_ENABLE_CAPABILITY_ROUTING": False,
        "DEFAULT_REASONING_MODEL": "",
        "LONG_CONTEXT_MODEL": "",
    }
    monkeypatch.setattr(
        orch_mod, "get_prompt",
        lambda cap: PromptTemplate(id="t", version="1", system="s", render=lambda **v: "u", untrusted=frozenset()),
    )

    def _set(**overrides):
        for key, value in {**defaults, **overrides}.items():
            monkeypatch.setattr(settings, key, value)

    _set()
    yield _set, received


def _run(**kwargs):
    return orch_mod.orchestrator.run(
        capability=Capability.RECRUITER_COPILOT, variables={}, schema=_Reply, **kwargs,
    )


class TestPrecedence:
    """Most specific wins, one rung at a time."""

    def test_5_the_provider_declares_it(self, env):
        configure, _ = env
        configure()
        selection = resolve()
        assert selection.model == DECLARED
        assert selection.source is ModelSource.PROVIDER_ROLE

    def test_4_a_role_override_beats_the_provider_declaration(self, env):
        configure, _ = env
        configure(DEFAULT_REASONING_MODEL="role-model")
        selection = resolve()
        assert selection.model == "role-model"
        assert selection.source is ModelSource.ROLE_OVERRIDE

    def test_3_a_per_provider_default_beats_the_role_override(self, env):
        """Deliberate, and it preserves the order these two already had: the role
        override is provider-agnostic and can name a model the provider cannot
        serve, while the per-provider default names its provider explicitly."""
        configure, _ = env
        configure(DEFAULT_REASONING_MODEL="role-model",
                  AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        selection = resolve()
        assert selection.model == "provider-default"
        assert selection.source is ModelSource.PROVIDER_DEFAULT

    def test_2_capability_routing_beats_the_per_provider_default(self, env, monkeypatch):
        configure, received = env
        from app.ai.gateway.model_registry import ModelSpec, register_model

        register_model(ModelSpec("routed-model", PROVIDER_NAME))
        configure(AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}},
                  AI_ENABLE_CAPABILITY_ROUTING=True,
                  AI_CAPABILITY_MODELS={"recruiter_copilot": "routed-model"})
        _run()
        assert received["model"] == "routed-model"

    def test_1_an_explicit_call_site_model_beats_everything(self, env):
        configure, received = env
        configure(DEFAULT_REASONING_MODEL="role-model",
                  AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        _run(model="caller-asked-for-this")
        assert received["model"] == "caller-asked-for-this"

    def test_a_role_without_its_own_declaration_uses_the_providers_default_role(self, env):
        """Provider-INTERNAL fallback, which is correct: a provider's own
        DEFAULT_REASONING model, never another provider's."""
        configure, _ = env
        configure()
        assert resolve(ModelRole.FAST_REASONING).model == DECLARED


class TestNoCrossProviderLeak:
    """C4. A model is never borrowed from a vendor that is not serving the call."""

    def test_a_provider_declaring_no_models_raises_instead_of_borrowing_one(self, env):
        """Before the fix this returned `llama-3.3-70b-versatile` — one vendor's
        model handed to another, which fails as the VENDOR's error."""
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        with pytest.raises(AIConfigError) as excinfo:
            resolve()
        message = str(excinfo.value)
        assert BARE_NAME in message and "default_reasoning" in message

    def test_the_refusal_says_how_to_fix_it(self, env):
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        with pytest.raises(AIConfigError) as excinfo:
            resolve()
        message = str(excinfo.value)
        assert "role_models" in message
        assert "DEFAULT_REASONING_MODEL" in message
        assert "AI_PROVIDERS" in message

    def test_the_removed_global_default_is_gone_from_settings(self):
        """`AI_DEFAULT_MODEL` was the leak. It is not merely unread — it is
        removed, so it cannot be reintroduced by someone wiring it back up."""
        assert not hasattr(settings, "AI_DEFAULT_MODEL")

    def test_a_deployment_still_setting_it_is_warned(self, env, monkeypatch):
        """Silently ignoring a variable an operator deliberately set is exactly
        the failure C9 exists to prevent."""
        from app.ai.gateway.validation import WARNING, check_provider_configuration

        configure, _ = env
        configure()
        monkeypatch.setenv("AI_DEFAULT_MODEL", "llama-3.3-70b-versatile")
        problems = check_provider_configuration()
        assert any(p.severity == WARNING and p.setting == "AI_DEFAULT_MODEL"
                   for p in problems)

    def test_a_bare_provider_can_still_be_given_a_model_explicitly(self, env):
        """Refusing is about the ABSENCE of a declaration, not about the
        provider — configure it and it resolves."""
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME,
                  AI_PROVIDERS={BARE_NAME: {"default_model": "chosen-on-purpose"}})
        assert resolve().model == "chosen-on-purpose"


class TestTheCallerIsObeyed:
    """C5, asserted on what the provider RECEIVED. The defect was that the
    selection and the call disagreed, so asserting on the selection alone would
    have passed against the broken code."""

    def test_an_explicit_model_reaches_the_provider(self, env):
        configure, received = env
        configure(AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        _run(model="CALLER-ASKED-FOR-THIS")
        assert received["model"] == "CALLER-ASKED-FOR-THIS"

    def test_the_execution_record_agrees_with_the_call(self, env):
        """`usage records the model actually used, so the override is invisible`
        — the record must now show what was really sent."""
        configure, received = env
        configure(AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        result = _run(model="CALLER-ASKED-FOR-THIS")
        assert result.execution.model == received["model"] == "CALLER-ASKED-FOR-THIS"

    def test_without_an_explicit_model_the_provider_default_still_applies(self, env):
        """The per-provider default is not broken by C5's fix — it just stops
        outranking the caller."""
        configure, received = env
        configure(AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        _run()
        assert received["model"] == "provider-default"

    def test_pinning_both_provider_and_model_resolves_nothing(self, env):
        """Found by the provider-contract suite, not by unit tests: the
        orchestrator used to resolve a base model it then discarded. Harmless
        while resolution always returned something — but C4 made it able to
        RAISE, so a pinned call started failing over a role the pinned provider
        happens not to declare. Do not compute what you will not use."""
        configure, received = env
        configure()
        _run(provider=NOSPEC_NAME, model="pinned-both")
        assert received["model"] == "pinned-both"

    def test_the_model_is_decided_in_exactly_one_place(self, env):
        """The orchestrator must not re-derive a model. If it ever reintroduces
        its own resolution, the selection and the call diverge again — which is
        the shape of C5."""
        configure, received = env
        configure(AI_PROVIDERS={PROVIDER_NAME: {"default_model": "provider-default"}})
        result = _run()
        assert result.execution.model == received["model"]


class TestEveryDecisionIsObservable:
    def test_the_snapshot_reports_why_each_role_resolved(self, env):
        configure, _ = env
        configure(DEFAULT_REASONING_MODEL="role-model")
        roles = config_snapshot()["roles"]
        assert roles["default_reasoning"]["model"] == "role-model"
        assert roles["default_reasoning"]["source"] == ModelSource.ROLE_OVERRIDE.value

    def test_the_snapshot_survives_a_role_that_cannot_resolve(self, env):
        """This is an admin surface — the page that would tell you the model is
        missing must not be the page that crashes because it is."""
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        roles = config_snapshot()["roles"]
        assert roles["default_reasoning"]["model"] is None
        assert "error" in roles["default_reasoning"]

    def test_each_source_is_distinguishable(self, env):
        configure, _ = env
        configure()
        assert resolve().source is ModelSource.PROVIDER_ROLE
        configure(DEFAULT_REASONING_MODEL="role-model")
        assert resolve().source is ModelSource.ROLE_OVERRIDE
        configure(DEFAULT_REASONING_MODEL="role-model",
                  AI_PROVIDERS={PROVIDER_NAME: {"default_model": "pd"}})
        assert resolve().source is ModelSource.PROVIDER_DEFAULT


class TestResolutionFailureDoesNotBreakHealthSurfaces:
    """Since a model can now fail to resolve, everything that asks a
    chain-shaped question without needing a model must ask it by NAME.
    §9A rule 15: the validator may never raise."""

    def test_routable_providers_needs_no_model(self, env):
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        assert routable_providers() == [BARE_NAME]

    def test_the_validator_still_returns_findings(self, env):
        from app.ai.gateway.validation import check_provider_configuration

        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        check_provider_configuration()  # must not raise

    def test_is_llm_configured_does_not_raise(self, env):
        configure, _ = env
        configure(AI_PROVIDER=BARE_NAME)
        assert settings.is_llm_configured in (True, False)
