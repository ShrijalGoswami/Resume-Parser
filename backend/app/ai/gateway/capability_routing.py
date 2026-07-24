"""
Capability→MODEL routing (model-first) — the single routing mechanism.

    Capability → Model → Provider (inferred) → SDK

A capability is pinned to a MODEL; the provider is inferred from the model
registry (a model already declares its provider), so there is exactly one routing
system — never a separate capability→provider table. INERT by default: routing is
off unless `AI_ENABLE_CAPABILITY_ROUTING` is true and the capability is mapped, so
today every capability continues to use the single configured provider.

Fallback is NOT implemented yet, but the config already accepts a LIST of models
(primary first) so a future fallback chain needs no config-schema change — only the
primary model is consulted today.

Configuration is validated strictly at startup (see `validate_capability_routing`):
unknown model, un-inferable/unregistered provider, missing API key, or an invalid
capability key becomes a fatal startup error rather than a silent runtime surprise.
"""

from __future__ import annotations

from typing import Optional

from app.ai.gateway.model_registry import get_model
from app.ai.schemas.base import Capability
from app.core.config import settings


def _model_chain(entry: object) -> list[str]:
    """Normalize a routing entry (str | list) to an ordered model list (primary
    first). Only the primary is used today; the rest is reserved for fallback."""
    if isinstance(entry, str):
        m = entry.strip()
        return [m] if m else []
    if isinstance(entry, (list, tuple)):
        return [x.strip() for x in entry if isinstance(x, str) and x.strip()]
    return []


def primary_model_for(capability: str) -> Optional[str]:
    """The configured primary model for a capability, or None. Ignores the enable
    flag (used by validation, which inspects config regardless of activation)."""
    table = settings.AI_CAPABILITY_MODELS or {}
    if not isinstance(table, dict):
        return None
    chain = _model_chain(table.get(capability))
    return chain[0] if chain else None


def model_route_for(capability: str) -> Optional[tuple[str, str]]:
    """Resolve a capability to (provider, model), inferring the provider from the
    model registry. Returns None when routing is disabled, the capability is
    unmapped, or the model/provider cannot be resolved (→ default routing)."""
    if not settings.AI_ENABLE_CAPABILITY_ROUTING:
        return None
    model = primary_model_for(capability)
    if not model:
        return None
    spec = get_model(model)
    provider = spec.provider if spec else None
    if not provider:
        return None  # unknown model — caught at startup; inert here
    return provider, model


# ── Strict startup validation ────────────────────────────────────────────────
class RoutingConfigError(RuntimeError):
    """Invalid capability→model routing configuration (fatal at startup)."""


def validate_capability_routing() -> None:
    """Fail fast on a bad routing table. Structure (valid capability + known model
    + inferable provider) is always checked when a table is present; runtime
    readiness (provider registered + API key configured) is enforced only when
    routing is ENABLED, since a disabled table is never consulted."""
    table = settings.AI_CAPABILITY_MODELS or {}
    if not table:
        return
    if not isinstance(table, dict):
        raise RoutingConfigError(
            f"AI_CAPABILITY_MODELS must be a map of capability→model, got {type(table).__name__}."
        )

    from app.ai.providers.registry import available_providers, get_provider

    valid_caps = {c.value for c in Capability}
    enabled = settings.AI_ENABLE_CAPABILITY_ROUTING
    providers = set(available_providers())

    for cap, entry in table.items():
        if cap not in valid_caps:
            raise RoutingConfigError(
                f"AI_CAPABILITY_MODELS: unknown capability '{cap}'. "
                f"Valid: {sorted(valid_caps)}."
            )
        chain = _model_chain(entry)
        if not chain:
            raise RoutingConfigError(
                f"AI_CAPABILITY_MODELS['{cap}']: no model configured (got {entry!r})."
            )
        for model in chain:
            spec = get_model(model)
            if spec is None:
                raise RoutingConfigError(
                    f"AI_CAPABILITY_MODELS['{cap}']: unknown model '{model}' — register it "
                    f"in the model registry so its provider can be inferred."
                )
            provider = spec.provider
            if provider not in providers:
                raise RoutingConfigError(
                    f"AI_CAPABILITY_MODELS['{cap}']: model '{model}' maps to provider "
                    f"'{provider}', which is not registered. Available: {sorted(providers)}."
                )
            if enabled and not get_provider(provider).is_configured():
                raise RoutingConfigError(
                    f"AI_CAPABILITY_MODELS['{cap}']: model '{model}' requires provider "
                    f"'{provider}', whose API key is not configured."
                )
