"""
Provider health management.

Tracks the live health of every LLM provider so the router can **skip providers
that are known to be down** instead of re-calling them on every request, and
**auto-recover** them after a cooldown. This is the piece that turns the fallback
chain from "always try each in order" into intelligent, health-aware routing.

States
------
- HEALTHY            — normal; route freely.
- RATE_LIMITED       — hit a 429/quota; skip until the (longer) cooldown elapses.
- TEMPORARY_FAILURE  — timeout / 5xx / transient error; skip until cooldown.
- UNAVAILABLE        — misconfigured (missing key) or hard-unreachable; skip until cooldown.
- DISABLED           — turned off via `AI_DISABLED_PROVIDERS`; never routed to.

All non-DISABLED states auto-recover: once the cooldown window passes (or a call
succeeds) the provider returns to HEALTHY. In-memory + thread-safe, mirroring the
usage tracker. No secrets, safe to snapshot for an admin endpoint.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from enum import Enum

from app.core.config import settings


class HealthState(str, Enum):
    HEALTHY = "healthy"
    RATE_LIMITED = "rate_limited"
    TEMPORARY_FAILURE = "temporary_failure"
    UNAVAILABLE = "unavailable"
    DISABLED = "disabled"


# Map a failure "kind" (derived from the AI error type) to (state, cooldown-setting-name).
_FAILURE_MAP: dict[str, tuple[HealthState, str]] = {
    "rate_limit": (HealthState.RATE_LIMITED, "AI_RATE_LIMIT_COOLDOWN_SECONDS"),
    "timeout": (HealthState.TEMPORARY_FAILURE, "AI_HEALTH_COOLDOWN_SECONDS"),
    "unavailable": (HealthState.UNAVAILABLE, "AI_UNAVAILABLE_COOLDOWN_SECONDS"),
    "error": (HealthState.TEMPORARY_FAILURE, "AI_HEALTH_COOLDOWN_SECONDS"),
}


@dataclass
class _Health:
    state: HealthState = HealthState.HEALTHY
    reason: str = ""
    cooldown_until: float = 0.0       # epoch seconds; 0 = available now
    consecutive_failures: int = 0
    last_error: str = ""


class ProviderHealthManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._health: dict[str, _Health] = {}

    def _now(self) -> float:
        return time.time()

    def _entry(self, provider: str) -> _Health:
        return self._health.setdefault(provider, _Health())

    # -- reads --------------------------------------------------------------
    def is_disabled(self, provider: str) -> bool:
        return provider.lower() in settings.disabled_providers

    def is_available(self, provider: str) -> bool:
        """True when the provider may be routed to right now."""
        p = provider.lower()
        if self.is_disabled(p):
            return False
        with self._lock:
            h = self._health.get(p)
            if h is None:
                return True
            if h.state is HealthState.HEALTHY:
                return True
            # In a cooldown window? Skip. Past it? Auto-recover to HEALTHY.
            if h.cooldown_until and self._now() < h.cooldown_until:
                return False
            h.state = HealthState.HEALTHY
            h.reason = ""
            h.cooldown_until = 0.0
            return True

    def state_of(self, provider: str) -> HealthState:
        p = provider.lower()
        if self.is_disabled(p):
            return HealthState.DISABLED
        # is_available() has the auto-recovery side effect; call it first.
        available = self.is_available(p)
        with self._lock:
            h = self._health.get(p)
            if available or h is None:
                return HealthState.HEALTHY
            return h.state

    # -- writes -------------------------------------------------------------
    def record_success(self, provider: str) -> None:
        p = provider.lower()
        with self._lock:
            h = self._entry(p)
            h.state = HealthState.HEALTHY
            h.reason = ""
            h.cooldown_until = 0.0
            h.consecutive_failures = 0
            h.last_error = ""

    def record_failure(self, provider: str, *, kind: str, error: str = "") -> HealthState:
        """Mark a provider unhealthy. `kind` ∈ rate_limit|timeout|unavailable|error."""
        p = provider.lower()
        state, setting = _FAILURE_MAP.get(kind, _FAILURE_MAP["error"])
        cooldown = max(1, int(getattr(settings, setting, 30)))
        with self._lock:
            h = self._entry(p)
            h.state = state
            h.reason = kind
            h.last_error = (error or "")[:200]
            h.consecutive_failures += 1
            h.cooldown_until = self._now() + cooldown
        return state

    # -- observability ------------------------------------------------------
    def snapshot(self) -> dict:
        now = self._now()
        out: dict[str, dict] = {}
        with self._lock:
            names = set(self._health) | set(settings.disabled_providers)
            for p in sorted(names):
                if p in settings.disabled_providers:
                    out[p] = {"state": HealthState.DISABLED.value, "reason": "disabled", "cooldown_remaining_s": 0}
                    continue
                h = self._health.get(p, _Health())
                remaining = max(0, round(h.cooldown_until - now)) if h.cooldown_until else 0
                effective = h.state.value if remaining else HealthState.HEALTHY.value
                out[p] = {
                    "state": effective,
                    "reason": h.reason if remaining else "",
                    "cooldown_remaining_s": remaining,
                    "consecutive_failures": h.consecutive_failures,
                    "last_error": h.last_error if remaining else "",
                }
        return out

    def reset(self) -> None:  # pragma: no cover — test/admin helper
        with self._lock:
            self._health.clear()


def kind_for_error(exc: Exception) -> str:
    """Classify an AI error into a health 'kind' without importing at module top
    (avoids a cycle: errors → health is fine, but keep it local)."""
    from app.ai.utils.errors import AIConfigError, AIRateLimitError, AITimeoutError
    if isinstance(exc, AIRateLimitError):
        return "rate_limit"
    if isinstance(exc, AITimeoutError):
        return "timeout"
    if isinstance(exc, AIConfigError):
        return "unavailable"
    return "error"


#: Module-level singleton — mirrors usage_tracker.
health_manager = ProviderHealthManager()
