"""
Multi-Provider AI Gateway test suite.

Covers the provider abstraction, normalized response, health management,
health-aware routing, automatic fallback, retry policy, provider-agnostic cache,
and usage metrics — WITHOUT requiring real OpenAI/Anthropic/Gemini API keys
(routing/fallback/health are exercised with in-process fake providers).

Runnable without pytest:  python -m tests.test_ai_gateway
(from backend/, with the project venv active)
"""
from __future__ import annotations

import importlib

from pydantic import BaseModel

from app.ai.gateway.gateway import ModelSelection
from app.ai.gateway.roles import ModelRole
from app.ai.gateway.health import ProviderHealthManager, HealthState, kind_for_error, health_manager
from app.ai.gateway import usage_tracker
from app.ai.prompts.base import PromptTemplate
from app.ai.providers.base import LLMProvider
from app.ai.providers.registry import register_provider, get_provider, available_providers
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.errors import AIError, AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings

om = importlib.import_module("app.ai.orchestrator.orchestrator")  # the module (for monkeypatching)

_R = []
def check(name, cond, extra=""):
    _R.append((name, cond)); print(f"  [{'PASS' if cond else 'FAIL'}] {name}{(' — ' + extra) if extra else ''}")


class _Reply(BaseModel):
    answer: str = ""


def _prompt_patch():
    return lambda cap: PromptTemplate(id="t", version="1", system="sys", render=lambda **v: "user")


def _fake(name, *, error=None, counter=None):
    """A fake provider that either raises `error()` or returns a valid response."""
    class _P(LLMProvider):
        pass
    _P.name = name
    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds):
        if counter is not None:
            counter["n"] += 1
        if error is not None:
            raise error()
        return ProviderResponse(text='{"answer":"ok"}', model=model, provider=name,
                                usage=TokenUsage(3, 2, 5), finish_reason="stop")
    _P.complete = complete
    _P.__abstractmethods__ = frozenset()  # complete is now provided
    return _P


def _run(cap=Capability.RECRUITER_COPILOT):
    return om.orchestrator.run(capability=cap, variables={}, schema=_Reply)


def _with_chain(selections):
    """Context: force the orchestrator's fallback chain + trivial prompt."""
    orig_chain, orig_prompt = om.fallback_chain, om.get_prompt
    om.fallback_chain = lambda role=ModelRole.DEFAULT_REASONING: selections
    om.get_prompt = _prompt_patch()
    def restore():
        om.fallback_chain, om.get_prompt = orig_chain, orig_prompt
    return restore


def test_provider_conformance():
    print("== provider interface conformance ==")
    for name in ("groq", "openai", "anthropic", "gemini"):
        check(f"{name} registered", name in available_providers())
        p = get_provider(name)
        check(f"{name} is LLMProvider", isinstance(p, LLMProvider) and p.name == name)
        check(f"{name} has complete()", callable(getattr(p, "complete", None)))


def test_normalized_response():
    print("== normalized response shape ==")
    r = ProviderResponse(text="hi", model="m", provider="p", usage=TokenUsage(1, 2, 3),
                         finish_reason="stop", latency_ms=12, cost_usd=0.001)
    check("has all normalized fields",
          r.content == "hi" and r.text == "hi" and r.model == "m" and r.provider == "p"
          and r.finish_reason == "stop" and r.latency_ms == 12 and r.cost_usd == 0.001
          and r.usage.prompt_tokens == 1 and r.usage.completion_tokens == 2 and r.usage.total_tokens == 3)
    u = TokenUsage.from_raw({"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12})
    check("TokenUsage.from_raw dict", u.prompt_tokens == 5 and u.total_tokens == 12)


def test_health_manager():
    print("== health manager state machine ==")
    h = ProviderHealthManager()
    check("default healthy", h.is_available("x") and h.state_of("x") is HealthState.HEALTHY)
    h.record_failure("x", kind="timeout")
    check("timeout -> temporary_failure + unavailable",
          not h.is_available("x") and h.state_of("x") is HealthState.TEMPORARY_FAILURE)
    h._health["x"].cooldown_until = 0  # simulate cooldown elapsed
    check("auto-recovers after cooldown", h.is_available("x") and h.state_of("x") is HealthState.HEALTHY)
    h.record_failure("y", kind="rate_limit")
    check("rate_limit -> rate_limited", h.state_of("y") is HealthState.RATE_LIMITED)
    h.record_success("y")
    check("record_success -> healthy", h.is_available("y") and h.state_of("y") is HealthState.HEALTHY)
    # disabled via config
    orig = settings.AI_DISABLED_PROVIDERS
    try:
        settings.AI_DISABLED_PROVIDERS = "z"
        check("disabled via config", not h.is_available("z") and h.state_of("z") is HealthState.DISABLED)
    finally:
        settings.AI_DISABLED_PROVIDERS = orig
    check("kind_for_error(rate)", kind_for_error(AIRateLimitError("x")) == "rate_limit")
    check("kind_for_error(timeout)", kind_for_error(AITimeoutError("x")) == "timeout")
    check("kind_for_error(other)", kind_for_error(AIProviderError("x")) == "error")


def test_fallback_and_skip_unhealthy():
    print("== automatic fallback + skip-unhealthy + event ==")
    fail_calls, ok_calls = {"n": 0}, {"n": 0}
    register_provider("t_fail", _fake("t_fail", error=lambda: AITimeoutError("boom"), counter=fail_calls))
    register_provider("t_ok", _fake("t_ok", counter=ok_calls))
    restore = _with_chain([ModelSelection("t_fail", "m", ModelRole.DEFAULT_REASONING),
                           ModelSelection("t_ok", "m", ModelRole.DEFAULT_REASONING)])
    try:
        usage_tracker.reset(); health_manager.reset()
        r1 = _run()
        s1 = usage_tracker.snapshot()
        check("failed over to healthy provider", r1.execution.provider == "t_ok" and r1.data.answer == "ok")
        check("fallback event recorded", s1["total_fallbacks"] >= 1
              and s1["recent_fallbacks"][-1]["from"] == "t_fail" and s1["recent_fallbacks"][-1]["to"] == "t_ok")
        check("primary marked unhealthy", not health_manager.is_available("t_fail"))
        fail_before = fail_calls["n"]
        _run()  # 2nd run: unhealthy primary must be SKIPPED, not re-called
        check("unhealthy primary NOT re-called", fail_calls["n"] == fail_before and ok_calls["n"] >= 2)
    finally:
        restore()


def test_retry_policy():
    print("== retry policy (rate-limit not retried; timeout retried) ==")
    # rate limit -> exactly 1 provider call (no retry)
    rl = {"n": 0}
    register_provider("t_rl", _fake("t_rl", error=lambda: AIRateLimitError("429"), counter=rl))
    restore = _with_chain([ModelSelection("t_rl", "m", ModelRole.DEFAULT_REASONING)])
    try:
        usage_tracker.reset(); health_manager.reset()
        try:
            _run()
        except AIError:
            pass
        check("rate-limit NOT retried (1 call)", rl["n"] == 1, f"calls={rl['n']}")
    finally:
        restore()
    # timeout -> retried up to AI_MAX_NETWORK_RETRIES
    to = {"n": 0}
    register_provider("t_to", _fake("t_to", error=lambda: AITimeoutError("timeout"), counter=to))
    restore = _with_chain([ModelSelection("t_to", "m", ModelRole.DEFAULT_REASONING)])
    try:
        usage_tracker.reset(); health_manager.reset()
        try:
            _run()
        except AIError:
            pass
        check("timeout retried (network_retries calls)", to["n"] == settings.AI_MAX_NETWORK_RETRIES, f"calls={to['n']}")
    finally:
        restore()


def test_cache_provider_agnostic():
    print("== QA cache is provider-agnostic ==")
    calls = {"n": 0}
    register_provider("t_cache", _fake("t_cache", counter=calls))
    restore = _with_chain([ModelSelection("t_cache", "m", ModelRole.DEFAULT_REASONING)])
    try:
        usage_tracker.reset(); health_manager.reset()
        usage_tracker.enable_qa_mode()
        _run(); _run()  # identical request twice
        s = usage_tracker.snapshot()
        check("2nd identical request served from cache (1 provider call)", calls["n"] == 1, f"calls={calls['n']}")
        check("cache_hit counted", s["qa"]["cache_hits"] == 1)
    finally:
        usage_tracker.disable_qa_mode()
        usage_tracker.reset()
        restore()


def test_usage_metrics():
    print("== usage metrics ==")
    register_provider("t_ok2", _fake("t_ok2"))
    restore = _with_chain([ModelSelection("t_ok2", "m", ModelRole.DEFAULT_REASONING)])
    try:
        usage_tracker.reset(); health_manager.reset()
        _run(Capability.CANDIDATE_COMPARISON)
        s = usage_tracker.snapshot()
        cap = s["by_capability"].get("candidate_comparison", {})
        check("per-capability tracked", cap.get("runs") == 1 and cap.get("provider_calls") == 1)
        check("tokens recorded", s["total_tokens"] == 5)
        check("snapshot has fallback + retry fields",
              "total_fallbacks" in s and "total_retries" in s and "total_provider_calls" in s)
    finally:
        restore()


def run():
    for t in (test_provider_conformance, test_normalized_response, test_health_manager,
              test_fallback_and_skip_unhealthy, test_retry_policy, test_cache_provider_agnostic,
              test_usage_metrics):
        t()
    fails = sum(1 for _, c in _R if not c)
    print(f"\n{'ALL PASSED (' + str(len(_R)) + ' checks)' if fails == 0 else str(fails) + ' FAILED'}")
    return fails


if __name__ == "__main__":
    import sys
    sys.exit(1 if run() else 0)
