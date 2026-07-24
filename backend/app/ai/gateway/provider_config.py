"""
Per-provider runtime configuration (M2).

Each provider can override the global AI_* defaults (timeout, retry policy,
default model) via the `AI_PROVIDERS` settings map. Anything a provider does not
specify falls back to the global default, so behaviour is unchanged until a
provider is explicitly tuned. API keys are NOT here — they stay in their dedicated
env vars for clarity; this is timeout/retry/model policy only.

The field names deliberately match `AIConfig`'s so a `ProviderConfig` is a drop-in
for the orchestrator's retry/backoff helpers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import settings

# Friendly aliases → canonical registry names.
_ALIASES = {"claude": "anthropic", "moonshot": "kimi"}


def canonical_provider(name: str) -> str:
    n = (name or "").strip().lower()
    return _ALIASES.get(n, n)


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    timeout_seconds: int
    max_network_retries: int
    max_rate_limit_retries: int
    retry_base_delay_ms: int
    retry_max_delay_ms: int
    default_model: str  # "" → let the gateway resolve the model from the role


def get_provider_config(name: str) -> ProviderConfig:
    """Resolve a provider's config: per-provider override → global default."""
    canonical = canonical_provider(name)
    raw: Any = settings.AI_PROVIDERS or {}
    overrides = {}
    if isinstance(raw, dict):
        cand = raw.get(canonical)
        if cand is None:
            cand = raw.get((name or "").strip().lower())
        if isinstance(cand, dict):
            overrides = cand

    def pick(default: Any, *keys: str) -> Any:
        for k in keys:
            v = overrides.get(k)
            if v is not None:
                return v
        return default

    return ProviderConfig(
        name=canonical,
        timeout_seconds=int(pick(settings.AI_TIMEOUT_SECONDS, "timeout_seconds", "timeout")),
        max_network_retries=int(pick(settings.AI_MAX_NETWORK_RETRIES, "max_network_retries", "retries")),
        max_rate_limit_retries=int(pick(settings.AI_MAX_RATE_LIMIT_RETRIES, "max_rate_limit_retries", "rate_limit_retries")),
        retry_base_delay_ms=int(pick(settings.AI_RETRY_BASE_DELAY_MS, "retry_base_delay_ms")),
        retry_max_delay_ms=int(pick(settings.AI_RETRY_MAX_DELAY_MS, "retry_max_delay_ms")),
        default_model=str(pick("", "default_model", "model") or ""),
    )
