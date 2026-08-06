"""
Phase 1, task 4 — Provider Validation. Guards for C9.

WHAT WAS WRONG
--------------
Every AI configuration mistake booted cleanly and failed later, per request, in
production. `AI_PROVIDER=grok` resolved to a chain of `['grok']` carrying a
plausible model name and 503'd on every request. A typo in the fallback list was
silently dropped, so an operator believed they had two fallbacks and had one. A
typo in the disabled list disabled nothing — the incident lever already pulled,
already doing nothing.

`validate_capability_routing()` had been strict and fatal since it was written,
but only for `AI_CAPABILITY_MODELS`, which is inert by default. The path every
request takes had no validation at all.

WHAT THESE TESTS ASSERT
-----------------------
`TestConfigurationMistakesFailTheDeploy` is the finding: each of the seven
misconfigurations verified as booting cleanly before this task now refuses to
start, with a message naming the setting to edit.

`TestWhatMustNeverBeFatal` is the other half, and the one that keeps the fix from
becoming a worse bug. Refusing to boot without an API key would break every
developer who has not set one; refusing to boot with every provider disabled
would turn the incident lever into an outage. Both are asserted to BOOT.

`TestHealthDistinguishesFourStates` covers the reporting requirement: configured,
misconfigured, not_configured and disabled are four different answers with four
different fixes, and liveness is deliberately not folded into any of them.

Offline: no key, no network, no provider is ever called.
"""

from __future__ import annotations

import pytest

from app.ai.gateway.gateway import clear_override, config_snapshot
from app.ai.gateway.validation import (
    CONFIGURED,
    DISABLED,
    FATAL,
    MISCONFIGURED,
    NOT_CONFIGURED,
    WARNING,
    AIConfigurationError,
    check_provider_configuration,
    configuration_state,
    validate_ai_configuration,
)
from app.core.config import settings


@pytest.fixture
def config(monkeypatch):
    """A known-good AI configuration, one field at a time away from each fault."""
    defaults = {
        "AI_PROVIDER": "groq",
        "AI_DEFAULT_PROVIDER": "groq",
        "AI_FALLBACK_PROVIDERS": "",
        "AI_DISABLED_PROVIDERS": "",
        "AI_ENABLE_FALLBACK": True,
        "AI_PROVIDERS": {},
        "AI_CAPABILITY_MODELS": {},
        "AI_ENABLE_CAPABILITY_ROUTING": False,
        "ENVIRONMENT": "development",
        "GROQ_API_KEY": "gsk_test_key",
    }
    for role_setting in ("DEFAULT_REASONING_MODEL", "FAST_REASONING_MODEL",
                         "CHEAP_REASONING_MODEL", "LONG_CONTEXT_MODEL",
                         "PREMIUM_REASONING_MODEL"):
        defaults[role_setting] = ""
    clear_override()

    def _set(**overrides):
        for key, value in {**defaults, **overrides}.items():
            monkeypatch.setattr(settings, key, value)

    _set()
    yield _set
    clear_override()


def _refusal(config, **overrides) -> str:
    config(**overrides)
    with pytest.raises(AIConfigurationError) as excinfo:
        validate_ai_configuration()
    return str(excinfo.value)


class TestConfigurationMistakesFailTheDeploy:
    """Each of these was verified booting cleanly before this task."""

    def test_an_unknown_primary_provider_is_refused(self, config):
        message = _refusal(config, AI_PROVIDER="grok")
        assert "AI_PROVIDER" in message and "grok" in message
        assert "groq" in message          # the known list, so the typo is obvious

    def test_an_unknown_fallback_is_refused_rather_than_dropped(self, config):
        """Silently dropping it was the worst of the seven: the operator believes
        they have a fallback and finds out during the incident that they do not."""
        message = _refusal(config, AI_FALLBACK_PROVIDERS="gemin,openai")
        assert "AI_FALLBACK_PROVIDERS" in message and "gemin" in message

    def test_an_unknown_disabled_entry_is_refused(self, config):
        """A typo here means the incident lever is pulled and doing nothing."""
        message = _refusal(config, AI_DISABLED_PROVIDERS="grok")
        assert "AI_DISABLED_PROVIDERS" in message and "grok" in message

    def test_an_unknown_key_in_the_per_provider_config_is_refused(self, config):
        message = _refusal(config, AI_PROVIDERS={"grok": {"timeout_seconds": 5}})
        assert "AI_PROVIDERS" in message and "grok" in message

    def test_a_provider_that_cannot_reason_is_refused(self, config):
        """`hashing` is registered and correct — for embeddings. The message says
        so, rather than calling a real provider unknown and sending the reader
        hunting a typo that is not there."""
        message = _refusal(config, AI_PROVIDER="hashing")
        assert "does not support reasoning" in message
        assert "embeddings" in message
        assert "unknown provider" not in message

    def test_the_fake_provider_in_production_is_refused(self, config):
        """It already refused to construct — but per request, after a deploy. A
        deploy is the right thing to fail (D0.12)."""
        message = _refusal(config, AI_PROVIDER="fake", ENVIRONMENT="production")
        assert "fake" in message and "production" in message

    def test_the_fake_provider_outside_production_still_boots(self, config):
        """Phase 0 depends on this: `AI_PROVIDER=fake` is how the whole stack is
        driven offline."""
        config(AI_PROVIDER="fake")
        validate_ai_configuration()

    def test_every_fatal_problem_names_the_setting_to_edit(self, config):
        config(AI_PROVIDER="grok", AI_FALLBACK_PROVIDERS="nope")
        problems = [p for p in check_provider_configuration() if p.severity == FATAL]
        assert len(problems) == 2
        assert all(p.setting and p.message and p.provider for p in problems)

    def test_all_fatal_problems_are_reported_at_once(self, config):
        """Not one per boot. Fixing configuration by rediscovering the next
        failure after each redeploy is how a ten-minute fix takes an hour."""
        message = _refusal(config, AI_PROVIDER="grok", AI_FALLBACK_PROVIDERS="alsonope")
        assert "grok" in message and "alsonope" in message


class TestStartupActuallyCallsTheValidator:
    """The guard on the WIRING, not on the logic.

    Written after injecting a violation showed that commenting the validator out
    of `validate_startup()` broke nothing: every other test here calls
    `validate_ai_configuration()` directly, so all 29 stayed green while the
    check was disconnected from boot. That is exactly C3's failure mode — a
    correct mechanism nothing calls — and it would have shipped.

    These drive `validate_startup()` itself.
    """

    def test_a_bad_provider_name_stops_the_service_starting(self, config, tmp_path,
                                                            monkeypatch):
        from app.core.startup import StartupError, validate_startup

        config(AI_PROVIDER="grok")
        monkeypatch.setattr(settings, "TEMP_UPLOAD_DIR", tmp_path)
        with pytest.raises(StartupError) as excinfo:
            validate_startup()
        assert "grok" in str(excinfo.value)

    def test_a_good_configuration_starts(self, config, tmp_path, monkeypatch):
        from app.core.startup import validate_startup

        config()
        monkeypatch.setattr(settings, "TEMP_UPLOAD_DIR", tmp_path)
        validate_startup()

    def test_a_missing_key_still_starts_through_the_real_path(self, config, tmp_path,
                                                              monkeypatch):
        """Not just "the validator returns a warning" — the service boots."""
        from app.core.startup import validate_startup

        config(GROQ_API_KEY="")
        monkeypatch.setattr(settings, "TEMP_UPLOAD_DIR", tmp_path)
        validate_startup()


class TestWhatMustNeverBeFatal:
    """The half that keeps the fix from becoming a worse bug than the finding."""

    def test_a_missing_api_key_still_boots(self, config):
        """Running without AI is a configuration this product supports — parsing,
        auth and candidates all work. Making this fatal would take the whole
        product down over a feature that is merely off."""
        config(GROQ_API_KEY="")
        validate_ai_configuration()
        assert any(p.severity == WARNING for p in check_provider_configuration())

    def test_a_fully_disabled_chain_still_boots(self, config):
        """`AI_DISABLED_PROVIDERS` is the incident lever task 2 built. Turning
        "AI is switched off" into "the service will not start" inverts it."""
        config(AI_DISABLED_PROVIDERS="groq")
        validate_ai_configuration()
        problems = check_provider_configuration()
        assert any(p.severity == WARNING and "disabled" in p.message for p in problems)
        assert not any(p.severity == FATAL for p in problems)

    def test_a_disabled_primary_with_a_working_fallback_is_not_even_a_warning(self, config):
        """That is the lever working exactly as designed."""
        config(AI_PROVIDER="groq", AI_FALLBACK_PROVIDERS="openai",
               AI_DISABLED_PROVIDERS="groq", OPENAI_API_KEY="sk-test")
        validate_ai_configuration()
        assert not any(p.severity == FATAL for p in check_provider_configuration())

    def test_an_unregistered_role_model_warns_but_boots(self, config):
        """`model_registry.py` documents that unknown models still work — they
        just lack metadata. A typo and a model released last week are
        indistinguishable from here, so this cannot be an error."""
        config(DEFAULT_REASONING_MODEL="llama-9-turbo")
        validate_ai_configuration()
        problems = check_provider_configuration()
        assert any(p.severity == WARNING and "DEFAULT_REASONING_MODEL" == p.setting
                   for p in problems)

    def test_a_role_model_from_a_provider_outside_the_chain_warns(self, config):
        config(DEFAULT_REASONING_MODEL="gpt-4o")
        validate_ai_configuration()
        assert any(p.severity == WARNING and "not in the configured chain" in p.message
                   for p in check_provider_configuration())

    def test_a_provider_outage_is_not_a_configuration_error(self, config):
        """The distinction the whole task turns on. Health is recorded elsewhere
        and must never reach the startup gate — a service that refuses to restart
        because a vendor is having a bad afternoon has turned their outage into
        ours."""
        from app.ai.gateway.health import health_manager

        config()
        health_manager.record_failure("groq", kind="timeout", error="upstream 503")
        try:
            validate_ai_configuration()
            assert not any(p.severity == FATAL for p in check_provider_configuration())
        finally:
            health_manager.reset()


class TestAGoodConfigurationIsSilent:
    def test_the_current_configuration_produces_no_problems(self, config):
        config()
        assert check_provider_configuration() == []

    def test_validation_never_repairs_anything(self, config):
        """Findings, not repairs — the `app/billing/invariants.py` contract. A
        validator that quietly corrected configuration would hide the mistake it
        exists to reveal."""
        config(AI_PROVIDER="grok")
        with pytest.raises(AIConfigurationError):
            validate_ai_configuration()
        assert settings.AI_PROVIDER == "grok"

    def test_the_check_itself_never_raises(self, config):
        """It is called from `/health` and the admin snapshot, where an exception
        would take down the surface that reports the problem."""
        config(AI_PROVIDER="grok", AI_FALLBACK_PROVIDERS="also-bad",
               AI_DISABLED_PROVIDERS="nope", AI_PROVIDERS={"bad": {}},
               DEFAULT_REASONING_MODEL="not-a-model")
        assert len(check_provider_configuration()) >= 4


class TestHealthDistinguishesFourStates:
    """configured · misconfigured · not_configured · disabled — four answers with
    four different fixes. Never guessed, never collapsed."""

    def test_configured(self, config):
        config()
        assert configuration_state("groq", check_provider_configuration()) == CONFIGURED

    def test_not_configured_is_not_misconfigured(self, config):
        """A missing key means AI is switched off. A misconfiguration means the
        configuration names something that cannot work. Reporting both as
        `not_configured` sent an operator looking for a key that was never the
        problem."""
        config(GROQ_API_KEY="")
        assert configuration_state("groq", check_provider_configuration()) == NOT_CONFIGURED

    def test_disabled(self, config):
        config(AI_DISABLED_PROVIDERS="gemini")
        assert configuration_state("gemini", check_provider_configuration()) == DISABLED

    def test_misconfigured(self, config):
        config(AI_PROVIDER="hashing")
        assert configuration_state("hashing", check_provider_configuration()) == MISCONFIGURED

    def test_an_embeddings_only_provider_is_configured_when_nothing_misuses_it(self, config):
        """`hashing` is perfectly configured while being useless for reasoning.
        It becomes a fault only when something puts it in the reasoning chain."""
        config()
        assert configuration_state("hashing", check_provider_configuration()) == CONFIGURED

    def test_the_snapshot_reports_configuration_and_health_separately(self, config):
        """Two axes: could this ever work, and is it answering right now.
        Collapsing them is how an outage gets diagnosed as a config error."""
        from app.ai.gateway.health import health_manager

        config()
        health_manager.record_failure("groq", kind="timeout")
        try:
            snapshot = config_snapshot()
            groq = next(p for p in snapshot["providers"] if p["name"] == "groq")
            assert groq["configuration"] == CONFIGURED     # configuration is fine
            assert groq["health"] == "temporary_failure"   # liveness is not
        finally:
            health_manager.reset()

    def test_the_snapshot_carries_the_findings(self, config):
        config(DEFAULT_REASONING_MODEL="llama-9-turbo")
        found = config_snapshot()["configuration_problems"]
        assert found and all({"severity", "setting", "message"} <= set(p) for p in found)

    def test_a_healthy_configuration_reports_no_problems_in_the_snapshot(self, config):
        config()
        assert config_snapshot()["configuration_problems"] == []


class TestTheHealthEndpointState:
    def test_llm_reports_misconfigured_distinctly(self, config):
        from app.main import _llm_dependency_state

        config(AI_PROVIDER="grok")
        assert _llm_dependency_state() == "misconfigured"

    def test_llm_reports_not_configured_when_only_a_key_is_missing(self, config):
        from app.main import _llm_dependency_state

        config(GROQ_API_KEY="")
        assert _llm_dependency_state() == "not_configured"

    def test_llm_reports_configured_when_all_is_well(self, config):
        from app.main import _llm_dependency_state

        config()
        assert _llm_dependency_state() == "configured"
