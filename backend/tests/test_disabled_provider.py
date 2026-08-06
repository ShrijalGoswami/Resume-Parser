"""
Phase 1, task 2 — Disabled Provider Fix. Guards for C3.

WHAT WAS WRONG
--------------
`AI_DISABLED_PROVIDERS` disabled nothing. Every piece of the mechanism existed
and was correct — `health_manager.is_disabled()`, `HealthState.DISABLED`, the
admin snapshot rendering the provider as off, `docs/AI_GATEWAY.md` promising
"never routed" — and the request was served by the disabled provider anyway,
because nothing on the ROUTING path consulted any of it:

  * `fallback_chain()` never filtered the list, and
  * the orchestrator sorted candidates into `healthy + unhealthy` and kept the
    unhealthy ones "as a last resort". DISABLED is not available, so it landed in
    `unhealthy` — and got called.

That is the worst shape a lever can have: it reports success, the UI agrees with
it, and it does nothing. R8 rates it Low likelihood and HIGH impact for exactly
that reason — the belief that it works is held during an incident.

THE GUARD THAT MATTERS
----------------------
`calls["disabled"]` — a real provider, registered the normal way, whose
`complete()` increments a counter. **Every test here asserts that counter is
zero.** Not "the chain looks right", not "the state is DISABLED": that a provider
an operator switched off was never called. That is the whole finding, and it is
the assertion that fails against the pre-fix code.

Offline: no key, no network, no SDK. The providers are registered exactly as
§9A rule 3 describes (a subclass plus a registry entry), so what is proven here
is the production routing path and not a test-only shortcut.
"""

from __future__ import annotations

import importlib

import pytest
from pydantic import BaseModel

from app.ai.gateway import fallback_chain, health_manager
from app.ai.gateway.gateway import (
    active_provider,
    clear_override,
    config_snapshot,
    configured_reasoning_providers,
    set_active_provider,
)
from app.ai.gateway.health import HealthState
from app.ai.gateway.model_registry import ModelSpec, register_model
from app.ai.gateway.provider_registry import ProviderSpec, register_provider_spec
from app.ai.gateway.roles import ModelRole
from app.ai.prompts.base import PromptTemplate
from app.ai.providers.base import LLMProvider
from app.ai.providers.registry import register_provider
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings

orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")

OFF = "c3_off"       # the provider the operator switched off
ON = "c3_on"         # a healthy provider that should absorb the traffic


class _Reply(BaseModel):
    answer: str = ""


def _register(name: str, calls: dict) -> None:
    """Register a provider the ordinary way — class + registry entry + spec.

    `complete` is defined IN the class body, not attached afterwards: attaching
    it later leaves `LLMProvider`'s abstract method unimplemented as far as
    `ABCMeta` is concerned, and the provider cannot be constructed at all."""

    class _P(LLMProvider):
        def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds):
            calls[self.name] = calls.get(self.name, 0) + 1
            return ProviderResponse(
                text='{"answer":"%s"}' % self.name, model=model, provider=self.name,
                usage=TokenUsage(1, 1, 2),
            )

    _P.name = name
    _P.display_name = name
    _P.api_key_setting = ""
    _P.role_models = {ModelRole.DEFAULT_REASONING: f"{name}-model"}
    register_provider(name, _P)
    register_provider_spec(ProviderSpec(
        name, name, frozenset({"reasoning"}), "",
        role_models={ModelRole.DEFAULT_REASONING: f"{name}-model"},
    ))
    register_model(ModelSpec(f"{name}-model", name))


@pytest.fixture
def routing(monkeypatch):
    """A two-provider chain with the counter that every assertion here reads."""
    calls: dict[str, int] = {}
    _register(OFF, calls)
    _register(ON, calls)
    clear_override()
    health_manager.reset()
    monkeypatch.setattr(
        orch_mod, "get_prompt",
        lambda cap: PromptTemplate(id="t", version="1", system="s", render=lambda **v: "u"),
    )

    def _configure(primary: str, fallbacks: str = "", disabled: str = "",
                   enable_fallback: bool = True):
        monkeypatch.setattr(settings, "AI_PROVIDER", primary)
        monkeypatch.setattr(settings, "AI_FALLBACK_PROVIDERS", fallbacks)
        monkeypatch.setattr(settings, "AI_DISABLED_PROVIDERS", disabled)
        monkeypatch.setattr(settings, "AI_ENABLE_FALLBACK", enable_fallback)

    yield _configure, calls
    clear_override()
    health_manager.reset()


def _run():
    return orch_mod.orchestrator.run(
        capability=Capability.RECRUITER_COPILOT, variables={}, schema=_Reply,
    )


class TestADisabledProviderIsNeverCalled:
    """THE FINDING. Each of these fails against the pre-fix code, and each fails
    on the call counter rather than on a description of the routing."""

    def test_a_disabled_primary_never_serves_the_request(self, routing):
        configure, calls = routing
        configure(primary=OFF, fallbacks=ON, disabled=OFF)
        result = _run()
        assert calls.get(OFF, 0) == 0
        assert result.data.answer == ON

    def test_a_disabled_fallback_is_never_reached(self, routing):
        """The primary fails outright; the disabled fallback must not catch it.
        Falling back onto a provider that was switched off is the same defect
        arriving one step later."""
        configure, calls = routing
        configure(primary=ON, fallbacks=OFF, disabled=OFF)
        health_manager.record_failure(ON, kind="timeout")
        with pytest.raises(AIConfigError):
            set_active_provider(OFF)          # and it cannot be reached this way either
        assert calls.get(OFF, 0) == 0

    def test_disabling_every_provider_refuses_instead_of_serving(self, routing):
        configure, calls = routing
        configure(primary=OFF, fallbacks=ON, disabled=f"{OFF},{ON}")
        with pytest.raises(AIConfigError) as excinfo:
            _run()
        assert calls.get(OFF, 0) == 0 and calls.get(ON, 0) == 0
        assert "AI_DISABLED_PROVIDERS" in str(excinfo.value)

    def test_the_refusal_is_not_retryable(self, routing):
        """A configuration with no answer is not an outage. Retrying it burns a
        ladder that cannot succeed — and on a metered key, a budget."""
        configure, _ = routing
        configure(primary=OFF, disabled=OFF)
        with pytest.raises(AIConfigError) as excinfo:
            _run()
        assert excinfo.value.retryable is False

    def test_an_unhealthy_provider_is_still_a_last_resort(self, routing):
        """The fix must not turn 'unhealthy' into 'disabled'. Stale health must
        never hard-fail a request on its own — that behaviour predates C3 and is
        deliberate, so this is the test that stops the fix overreaching."""
        configure, calls = routing
        configure(primary=ON, disabled="")
        health_manager.record_failure(ON, kind="timeout")
        assert health_manager.is_available(ON) is False
        result = _run()
        assert result.data.answer == ON
        assert calls.get(ON, 0) == 1


class TestThePinnedPathsAreClosedToo:
    """`fallback_chain()` is not the only way in. An explicit call-site provider
    and capability→model routing both pin a selection and never touch the chain,
    so filtering only the chain would have left two open doors."""

    def test_an_explicit_call_site_provider_cannot_reach_a_disabled_one(self, routing):
        configure, calls = routing
        configure(primary=ON, disabled=OFF)
        with pytest.raises(AIConfigError):
            orch_mod.orchestrator.run(
                capability=Capability.RECRUITER_COPILOT, variables={},
                schema=_Reply, provider=OFF,
            )
        assert calls.get(OFF, 0) == 0

    def test_capability_routing_cannot_reach_a_disabled_provider(self, routing, monkeypatch):
        configure, calls = routing
        configure(primary=ON, disabled=OFF)
        monkeypatch.setattr(settings, "AI_ENABLE_CAPABILITY_ROUTING", True)
        monkeypatch.setattr(
            settings, "AI_CAPABILITY_MODELS", {"recruiter_copilot": f"{OFF}-model"},
        )
        with pytest.raises(AIConfigError):
            _run()
        assert calls.get(OFF, 0) == 0


class TestTheChainAndTheAdminSurfaceAgree:
    """The symptom C3 names is a disagreement: the admin UI showed a provider as
    off while it served traffic. These assert the two now describe one reality."""

    def test_fallback_chain_excludes_a_disabled_primary(self, routing):
        configure, _ = routing
        configure(primary=OFF, fallbacks=ON, disabled=OFF)
        assert [s.provider for s in fallback_chain()] == [ON]

    def test_fallback_chain_excludes_a_disabled_fallback(self, routing):
        configure, _ = routing
        configure(primary=ON, fallbacks=OFF, disabled=OFF)
        assert [s.provider for s in fallback_chain()] == [ON]

    def test_the_snapshot_chain_never_contains_a_disabled_provider(self, routing):
        configure, _ = routing
        configure(primary=OFF, fallbacks=ON, disabled=OFF)
        snap = config_snapshot()
        assert OFF in snap["disabled_providers"]
        assert OFF not in snap["fallback_chain"]
        assert snap["provider_health"][OFF]["state"] == HealthState.DISABLED.value

    def test_a_disabled_provider_is_not_counted_as_configured(self, routing):
        """Task 1's `is_llm_configured` walks the chain, so it inherits this fix:
        a deployment whose only provider is disabled cannot reason, and /health
        must not claim otherwise."""
        configure, _ = routing
        configure(primary=OFF, disabled=OFF)
        assert configured_reasoning_providers() == []
        assert settings.is_llm_configured is False


class TestTheAdminSwitchCannotUndoADisable:
    def test_switching_to_a_disabled_provider_is_refused(self, routing):
        configure, _ = routing
        configure(primary=ON, disabled=OFF)
        with pytest.raises(AIConfigError) as excinfo:
            set_active_provider(OFF)
        assert "AI_DISABLED_PROVIDERS" in str(excinfo.value)
        assert active_provider() == ON

    def test_switching_to_an_enabled_provider_still_works(self, routing):
        configure, _ = routing
        configure(primary=OFF, disabled=OFF)
        set_active_provider(ON)
        assert active_provider() == ON

    def test_an_unknown_provider_is_still_refused_by_its_own_message(self, routing):
        configure, _ = routing
        configure(primary=ON, disabled=OFF)
        with pytest.raises(AIConfigError) as excinfo:
            set_active_provider("no_such_provider")
        assert "Unknown provider" in str(excinfo.value)


class TestDisablingIsReversible:
    def test_removing_a_provider_from_the_list_restores_routing(self, routing):
        """Disabling is a lever, not a latch. If re-enabling did not work the
        operator would reach for a redeploy during the incident they are already
        managing."""
        configure, calls = routing
        configure(primary=OFF, fallbacks=ON, disabled=OFF)
        assert _run().data.answer == ON
        assert calls.get(OFF, 0) == 0

        configure(primary=OFF, fallbacks=ON, disabled="")
        health_manager.reset()
        assert _run().data.answer == OFF
        assert calls.get(OFF, 0) == 1

    def test_an_empty_disabled_list_changes_nothing(self, routing):
        """Production today. The fix must be inert when the lever is not pulled."""
        configure, calls = routing
        configure(primary=OFF, fallbacks=ON, disabled="")
        assert [s.provider for s in fallback_chain()] == [OFF, ON]
        assert _run().data.answer == OFF
        assert calls.get(ON, 0) == 0
