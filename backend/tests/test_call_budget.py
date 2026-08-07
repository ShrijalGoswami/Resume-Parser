"""
AI Security Sprint 1, task 5 — S-5. One budget for paid model invocations.

WHAT WAS WRONG
--------------
The retry ladder is three nested loops and their bounds MULTIPLY:
3 network x 3 JSON x 2 schema = **18 provider calls for one logical request** —
and the failover loop wraps all of it, so N providers cost 18N. Nothing counted
the total. Each loop knew its own bound; none knew the product.

`/batch-analysis` takes 100 files at 20 POSTs/min/IP, so the arithmetic reaches
tens of thousands of calls per minute from one client. Against Groq's free tier
(~100k tokens/day for the whole platform) a request that reliably fails schema
validation is a *cheaper* denial-of-service than one that succeeds.

THE FIX
-------
`CallBudget` — one counter with a ceiling, consulted immediately before every
paid call, created once per `orchestrator.run()` so it spans the failover loop
as well as the ladders inside it.

WHAT THESE TESTS ASSERT
-----------------------
`TestEveryLadderSpendsTheSameBudget` is the finding: network retries, JSON
repair, schema retries and failover all draw on one allowance, so their bounds
can no longer multiply.

`TestExhaustionFailsCleanly` covers the requirement that it stop rather than
degrade: non-retryable, no failover, a message naming both numbers.

`TestNothingIsDoubleCounted` is the structural half — the request total and the
per-attempt count must be two readings of one counter, never two counters.

Offline: no key, no network, no wall clock.
"""

from __future__ import annotations

import importlib

import pytest
from pydantic import BaseModel

from app.ai.gateway import health_manager
from app.ai.gateway.provider_registry import ProviderSpec, register_provider_spec
from app.ai.gateway.roles import ModelRole
from app.ai.prompts.base import PromptTemplate
from app.ai.providers.base import LLMProvider
from app.ai.providers.registry import register_provider
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.budget import CallBudget
from app.ai.utils.errors import (
    AIBudgetExhaustedError,
    AIError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.core.config import settings

orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")

GOOD = '{"answer":"ok"}'
BAD_JSON = "not json at all"
WRONG_SHAPE = '{"unexpected":"shape"}'


class _Reply(BaseModel):
    answer: str


def _provider(name: str, script, calls: dict):
    """A provider that replays `script` — one entry per call, last entry repeats."""

    class _P(LLMProvider):
        def complete(self, *, system, user, model, temperature, max_tokens,
                     timeout_seconds, **kwargs):
            calls[name] = calls.get(name, 0) + 1
            index = min(calls[name] - 1, len(script) - 1)
            outcome = script[index]
            if isinstance(outcome, Exception):
                raise outcome
            return ProviderResponse(text=outcome, model=model, provider=name,
                                    usage=TokenUsage(1, 1, 2))

    _P.name = name
    _P.display_name = name
    _P.api_key_setting = ""
    _P.role_models = {ModelRole.DEFAULT_REASONING: f"{name}-model"}
    register_provider(name, _P)
    register_provider_spec(ProviderSpec(
        name, name, frozenset({"reasoning"}), "",
        role_models={ModelRole.DEFAULT_REASONING: f"{name}-model"},
    ))
    return _P


@pytest.fixture
def run(monkeypatch):
    calls: dict[str, int] = {}
    monkeypatch.setattr(orch_mod.time, "sleep", lambda _s: None)
    monkeypatch.setattr(
        orch_mod, "get_prompt",
        lambda cap: PromptTemplate(id="t", version="1", system="s",
                                   render=lambda **v: "u", untrusted=frozenset()),
    )
    for key, value in {
        "AI_FALLBACK_PROVIDERS": "", "AI_DISABLED_PROVIDERS": "",
        "AI_ENABLE_FALLBACK": True, "AI_PROVIDERS": {},
        "AI_CAPABILITY_MODELS": {}, "AI_ENABLE_CAPABILITY_ROUTING": False,
        "DEFAULT_REASONING_MODEL": "",
    }.items():
        monkeypatch.setattr(settings, key, value)
    health_manager.reset()

    def _go(script, *, budget=None, fallback_script=None, name="b5"):
        _provider(name, script, calls)
        monkeypatch.setattr(settings, "AI_PROVIDER", name)
        if fallback_script is not None:
            _provider(f"{name}_fb", fallback_script, calls)
            monkeypatch.setattr(settings, "AI_FALLBACK_PROVIDERS", f"{name}_fb")
        if budget is not None:
            monkeypatch.setattr(settings, "AI_MAX_PROVIDER_CALLS_PER_REQUEST", budget)
        return orch_mod.orchestrator.run(
            capability=Capability.RECRUITER_COPILOT, variables={}, schema=_Reply,
        )

    yield _go, calls
    health_manager.reset()


class TestNormalBehaviourIsUnchanged:
    def test_a_successful_request_costs_one_call(self, run):
        go, calls = run
        result = go([GOOD], name="b5_ok")
        assert calls["b5_ok"] == 1
        assert result.data.answer == "ok"

    def test_the_execution_record_still_reports_one_attempt(self, run):
        go, _ = run
        assert go([GOOD], name="b5_ok2").execution.network_attempts == 1

    def test_the_default_budget_permits_every_existing_ladder(self):
        """Any single ladder exhausting must still be affordable, or the budget
        has broken a legitimate path instead of an abusive one."""
        limit = settings.AI_MAX_PROVIDER_CALLS_PER_REQUEST
        assert limit >= max(settings.AI_MAX_NETWORK_RETRIES,
                            settings.AI_MAX_JSON_RETRIES,
                            settings.AI_MAX_SCHEMA_RETRIES)

    def test_the_default_budget_is_below_the_multiplicative_worst_case(self):
        """The whole point: 3 x 3 x 2 = 18 was reachable and unbounded across
        failover."""
        worst = (settings.AI_MAX_NETWORK_RETRIES
                 * settings.AI_MAX_JSON_RETRIES
                 * settings.AI_MAX_SCHEMA_RETRIES)
        assert settings.AI_MAX_PROVIDER_CALLS_PER_REQUEST < worst


class TestEveryLadderSpendsTheSameBudget:
    """THE FINDING. Four different retry paths, one allowance."""

    def test_provider_retries_spend_it(self, run):
        go, calls = run
        with pytest.raises(AIError):
            go([AITimeoutError("t")], budget=2, name="b5_net")
        assert calls["b5_net"] == 2

    def test_json_repair_spends_it(self, run):
        go, calls = run
        with pytest.raises(AIError):
            go([BAD_JSON], budget=2, name="b5_json")
        assert calls["b5_json"] == 2

    def test_schema_retries_spend_it(self, run):
        go, calls = run
        with pytest.raises(AIError):
            go([WRONG_SHAPE], budget=1, name="b5_schema")
        assert calls["b5_schema"] == 1

    def test_rate_limit_retries_spend_it(self, run):
        go, calls = run
        with pytest.raises(AIError):
            go([AIRateLimitError("rpm", is_quota=False)], budget=2, name="b5_rl")
        assert calls["b5_rl"] == 2

    def test_failover_spends_the_same_budget(self, run):
        """The multiplier that mattered most: N providers used to cost N ladders.
        The primary exhausts the shared allowance, so the fallback is never
        reached — one request, one ceiling."""
        go, calls = run
        with pytest.raises(AIError):
            go([AIProviderError("down")], budget=3,
               fallback_script=[GOOD], name="b5_fo")
        assert calls["b5_fo"] == 3
        assert calls.get("b5_fo_fb", 0) == 0

    def test_a_generous_budget_still_allows_failover_to_succeed(self, run):
        """The budget must bound cost, not break resilience."""
        go, calls = run
        result = go([AIProviderError("down")], budget=8,
                    fallback_script=[GOOD], name="b5_fo2")
        assert result.data.answer == "ok"
        assert calls["b5_fo2_fb"] == 1


class TestExhaustionFailsCleanly:
    def test_it_raises_a_named_error(self, run):
        go, _ = run
        with pytest.raises(AIBudgetExhaustedError):
            go([AITimeoutError("t")], budget=1, name="b5_named")

    def test_the_message_names_both_numbers(self, run):
        go, _ = run
        with pytest.raises(AIBudgetExhaustedError) as excinfo:
            go([AITimeoutError("t")], budget=2, name="b5_msg")
        message = str(excinfo.value)
        assert "2" in message and "budget" in message.lower()

    def test_it_is_not_retryable(self):
        """Retrying a spent budget is the spending it exists to prevent."""
        assert AIBudgetExhaustedError("x").retryable is False

    def test_it_is_not_a_provider_error(self):
        """No provider failed. Classifying it as one would blame a vendor for a
        ceiling the request hit, and would make it eligible for failover."""
        assert not isinstance(AIBudgetExhaustedError("x"), AIProviderError)

    def test_exhaustion_does_not_penalise_provider_health(self, run):
        """A provider marked unhealthy because a request ran out of allowance
        would be skipped for real traffic afterwards."""
        go, _ = run
        health_manager.reset()
        with pytest.raises(AIBudgetExhaustedError):
            go([AITimeoutError("t")], budget=1, name="b5_health")
        assert health_manager.is_available("b5_health") is True

    def test_the_public_message_leaks_nothing(self):
        message = AIBudgetExhaustedError("x").public_message
        assert "budget" not in message.lower() and "provider" not in message.lower()


class TestNothingIsDoubleCounted:
    """One counter, read two ways — never two counters that can disagree."""

    def test_the_orchestrator_keeps_no_second_counter(self):
        """`provider_calls` was a local variable incremented alongside the loops.
        It is a reading of the budget now; a re-introduced counter is how the
        request total and the per-attempt count start to drift."""
        source = (
            importlib.import_module("app.ai.orchestrator.orchestrator")
            .__file__
        )
        text = open(source, encoding="utf-8").read()
        assert "provider_calls += 1" not in text

    def test_the_per_attempt_count_comes_from_a_mark(self, run):
        go, calls = run
        result = go([AITimeoutError("t"), AITimeoutError("t"), GOOD], name="b5_mark")
        assert result.execution.network_attempts == calls["b5_mark"] == 3

    def test_marks_measure_only_the_current_attempt(self):
        budget = CallBudget(limit=10)
        budget.spend()
        mark = budget.mark()
        budget.spend()
        budget.spend()
        assert budget.spent_since(mark) == 2
        assert budget.spent == 3

    def test_after_failover_the_record_reports_the_second_attempt_only(self, run):
        """Otherwise the fallback would be reported as having made the primary's
        calls too, and the harness reads this field."""
        go, _ = run
        result = go([AIProviderError("down")], budget=8,
                    fallback_script=[GOOD], name="b5_rec")
        assert result.execution.network_attempts == 1


class TestTheBudgetItself:
    def test_it_refuses_before_spending(self):
        """An exhausted budget must cost nothing, not be noticed afterwards."""
        budget = CallBudget(limit=1)
        budget.spend()
        with pytest.raises(AIBudgetExhaustedError):
            budget.spend()
        assert budget.spent == 1

    def test_remaining_never_goes_negative(self):
        budget = CallBudget(limit=1)
        budget.spend()
        assert budget.remaining == 0

    def test_it_defaults_to_the_configured_limit(self):
        assert CallBudget().limit == settings.AI_MAX_PROVIDER_CALLS_PER_REQUEST

    def test_it_is_deterministic(self):
        """No sampling, no clock: the same sequence always spends the same."""
        for _ in range(5):
            budget = CallBudget(limit=3)
            spent = 0
            try:
                while True:
                    budget.spend()
                    spent += 1
            except AIBudgetExhaustedError:
                pass
            assert spent == 3

    def test_there_is_no_provider_specific_logic(self):
        """The provider name is only ever a label in a message."""
        for name in ("groq", "openai", "", "anything"):
            budget = CallBudget(limit=1)
            budget.spend(provider=name)
            assert budget.spent == 1


class TestDeterministicEvaluationIsPreserved:
    def test_the_golden_dataset_still_answers(self):
        from app.ai.evaluation.golden import load_and_register

        assert len(load_and_register()) == 6

    def test_a_budgeted_run_is_repeatable(self, run):
        go, calls = run
        for name in ("b5_det_a", "b5_det_b"):
            with pytest.raises(AIError):
                go([BAD_JSON], budget=2, name=name)
        assert calls["b5_det_a"] == calls["b5_det_b"] == 2
