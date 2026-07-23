"""
Usage, cost, and provider-health tracking.

An in-memory, thread-safe aggregator the gateway/orchestrator feed after every
call. It powers future cost dashboards and provider-health monitoring without any
new dependency or datastore. Snapshots are safe to expose to an authenticated
admin (they contain NO secrets — provider/model names and counters only).
"""

from __future__ import annotations

import threading
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Optional


@dataclass
class _Counter:
    requests: int = 0
    successes: int = 0
    failures: int = 0
    timeouts: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_latency_ms: int = 0
    estimated_cost: float = 0.0

    def as_dict(self) -> dict:
        req = self.requests or 1
        return {
            "requests": self.requests,
            "successes": self.successes,
            "failures": self.failures,
            "timeouts": self.timeouts,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "estimated_cost_usd": round(self.estimated_cost, 6),
            "avg_latency_ms": round(self.total_latency_ms / req),
            "success_rate": round(self.successes / req, 4),
            "error_rate": round(self.failures / req, 4),
        }


@dataclass
class _CapCounter:
    """Per-capability rollup. `runs` = logical orchestrator.run() calls;
    `provider_calls` = raw provider.complete() calls (includes retries)."""
    runs: int = 0
    provider_calls: int = 0
    successes: int = 0
    failures: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost: float = 0.0

    def as_dict(self) -> dict:
        return {
            "runs": self.runs,
            "provider_calls": self.provider_calls,
            "retries": max(0, self.provider_calls - self.runs),
            "successes": self.successes,
            "failures": self.failures,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.prompt_tokens + self.completion_tokens,
            "estimated_cost_usd": round(self.estimated_cost, 6),
        }


class UsageTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_model: dict[str, _Counter] = defaultdict(_Counter)
        self._by_provider: dict[str, _Counter] = defaultdict(_Counter)
        self._by_capability: dict[str, _CapCounter] = defaultdict(_CapCounter)
        # QA/instrumentation: duplicate-prompt detection (bounded fingerprint
        # counts). Only populated when QA mode is on, so production never grows
        # this dict.
        self._qa_mode: bool = False
        self._prompt_counts: dict[str, int] = {}
        self._duplicate_calls: int = 0
        # QA-mode response cache: fingerprint -> parsed JSON dict. Lets identical
        # LLM requests reuse the prior output (0 API calls) during a QA session.
        # Never populated in production (qa_mode off), so no memory growth there.
        self._qa_cache: dict[str, dict] = {}
        self._cache_hits: int = 0
        # Fallback events (provider A failed → provider B answered). Bounded ring.
        self._fallback_count: int = 0
        self._fallback_events: deque = deque(maxlen=50)
        # Optional hook so the enterprise layer can roll usage up per organization
        # without app.ai depending on app.enterprise (inversion-free).
        self._org_hook = None

    def set_org_hook(self, hook) -> None:
        self._org_hook = hook

    # -- QA instrumentation controls ---------------------------------------
    def enable_qa_mode(self) -> None:
        with self._lock:
            self._qa_mode = True

    def disable_qa_mode(self) -> None:
        with self._lock:
            self._qa_mode = False

    def note_prompt(self, fingerprint: str) -> None:
        """Record that a prompt fingerprint was sent (QA-mode duplicate detection)."""
        if not self._qa_mode or not fingerprint:
            return
        with self._lock:
            seen = self._prompt_counts.get(fingerprint, 0)
            if seen:
                self._duplicate_calls += 1
            self._prompt_counts[fingerprint] = seen + 1

    # -- QA response cache (identical-request reuse) -----------------------
    def qa_cache_enabled(self) -> bool:
        return self._qa_mode

    def qa_cache_get(self, fingerprint: str) -> Optional[dict]:
        if not self._qa_mode:
            return None
        with self._lock:
            hit = self._qa_cache.get(fingerprint)
            if hit is not None:
                self._cache_hits += 1
            return hit

    def qa_cache_put(self, fingerprint: str, parsed: dict) -> None:
        if not self._qa_mode or not isinstance(parsed, dict):
            return
        with self._lock:
            self._qa_cache[fingerprint] = parsed

    # -- fallback events (provider A failed → provider B answered) ----------
    def record_fallback(
        self,
        *,
        capability: str,
        from_provider: str,
        to_provider: str,
        reason: str,
        latency_ms: int = 0,
        request_id: str = "-",
    ) -> None:
        with self._lock:
            self._fallback_count += 1
            self._fallback_events.append({
                "capability": capability,
                "from": from_provider,
                "to": to_provider,
                "reason": reason,
                "latency_ms": latency_ms,
                "request_id": request_id,
            })

    def record(
        self,
        *,
        provider: str,
        model: str,
        success: bool,
        latency_ms: int,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        estimated_cost: Optional[float] = None,
        timeout: bool = False,
        capability: Optional[str] = None,
        provider_calls: int = 1,
    ) -> None:
        with self._lock:
            for key, table in ((f"{provider}:{model}", self._by_model), (provider, self._by_provider)):
                c = table[key]
                c.requests += 1
                c.successes += 1 if success else 0
                c.failures += 0 if success else 1
                c.timeouts += 1 if timeout else 0
                c.prompt_tokens += prompt_tokens or 0
                c.completion_tokens += completion_tokens or 0
                c.total_latency_ms += max(0, latency_ms)
                c.estimated_cost += estimated_cost or 0.0
            if capability:
                cap = self._by_capability[capability]
                cap.runs += 1
                cap.provider_calls += max(1, provider_calls)
                cap.successes += 1 if success else 0
                cap.failures += 0 if success else 1
                cap.prompt_tokens += prompt_tokens or 0
                cap.completion_tokens += completion_tokens or 0
                cap.estimated_cost += estimated_cost or 0.0
        if self._org_hook is not None:
            try:
                self._org_hook(prompt_tokens or 0, completion_tokens or 0)
            except Exception:  # pragma: no cover — org rollup is best-effort
                pass

    def snapshot(self) -> dict:
        with self._lock:
            models = {k: v.as_dict() for k, v in self._by_model.items()}
            providers = {k: v.as_dict() for k, v in self._by_provider.items()}
            capabilities = {k: v.as_dict() for k, v in self._by_capability.items()}
            dup_calls = self._duplicate_calls
            unique_prompts = len(self._prompt_counts)
            cache_hits = self._cache_hits
            cache_size = len(self._qa_cache)
            fallback_count = self._fallback_count
            fallback_events = list(self._fallback_events)
        total_cost = round(sum(m["estimated_cost_usd"] for m in models.values()), 6)
        total_requests = sum(m["requests"] for m in models.values())
        total_provider_calls = sum(c["provider_calls"] for c in capabilities.values())
        total_retries = sum(c["retries"] for c in capabilities.values())
        total_tokens = sum(m["prompt_tokens"] + m["completion_tokens"] for m in models.values())
        return {
            "total_requests": total_requests,
            "total_provider_calls": total_provider_calls,
            "total_retries": total_retries,
            "total_fallbacks": fallback_count,
            "recent_fallbacks": fallback_events[-10:],
            "total_tokens": total_tokens,
            "total_estimated_cost_usd": total_cost,
            "by_capability": capabilities,
            "by_model": models,
            "by_provider": providers,
            "provider_health": self._health(providers),
            "qa": {
                "duplicate_prompt_calls": dup_calls,
                "unique_prompts": unique_prompts,
                "cache_hits": cache_hits,
                "cache_size": cache_size,
                "calls_saved_by_cache": cache_hits,
            },
        }

    @staticmethod
    def _health(providers: dict[str, dict]) -> dict:
        out = {}
        for name, p in providers.items():
            rate = p["success_rate"]
            status = "healthy" if rate >= 0.95 else "degraded" if rate >= 0.5 else "unhealthy"
            out[name] = {
                "status": status,
                "success_rate": rate,
                "error_rate": p["error_rate"],
                "avg_latency_ms": p["avg_latency_ms"],
                "timeouts": p["timeouts"],
            }
        return out

    def reset(self) -> None:  # pragma: no cover — test/admin helper
        with self._lock:
            self._by_model.clear()
            self._by_provider.clear()
            self._by_capability.clear()
            self._prompt_counts.clear()
            self._duplicate_calls = 0
            self._qa_cache.clear()
            self._cache_hits = 0
            self._fallback_count = 0
            self._fallback_events.clear()


#: Module-level singleton.
usage_tracker = UsageTracker()
