"""
AI Gateway — the single decision point for "which provider + model".

Think of it as Stripe for AI providers: a feature asks for a logical role
("I need reasoning") and the gateway decides the provider, model, and fallback
chain from configuration. No feature knows or cares which vendor answered.

Selection precedence (reasoning):
  1. runtime admin override (in-memory) — one switch updates the whole platform
  2. AI_PROVIDER / AI_DEFAULT_PROVIDER (env)
Model precedence for a role:
  1. per-role env override (e.g. DEFAULT_REASONING_MODEL)
  2. the provider's registered default model for that role
  3. AI_DEFAULT_MODEL (last-resort back-compat)

Nothing here holds secrets; only the NAME of the key setting is surfaced.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.ai.gateway.model_registry import estimate_cost, get_model
from app.ai.gateway.provider_registry import available_provider_specs, get_provider_spec
from app.ai.gateway.roles import ROLE_MODEL_SETTING, ModelRole
from app.ai.utils.errors import AIConfigError
from app.core.config import settings

logger = logging.getLogger("app.ai")

# In-memory admin override (server-side only). None → use configured provider.
_provider_override: Optional[str] = None


@dataclass(frozen=True)
class ModelSelection:
    provider: str
    model: str
    role: ModelRole


def active_provider() -> str:
    """The provider all reasoning currently routes to."""
    return (_provider_override or settings.reasoning_provider).lower()


def set_active_provider(name: str) -> str:
    """Runtime switch (admin) — immediately affects every AI feature. Server-side.

    Refuses a provider that is disabled by configuration. The admin switch is an
    in-memory override and `AI_DISABLED_PROVIDERS` is a deployment decision; if
    the switch could win, an operator who took a provider out during an incident
    could have it put back by anyone with the Settings screen open — and the
    chain would silently refuse to route there anyway, so the switch would appear
    to succeed and change nothing.
    """
    global _provider_override
    from app.ai.gateway.health import health_manager

    key = (name or "").strip().lower()
    if get_provider_spec(key) is None:
        raise AIConfigError(f"Unknown provider '{name}'.")
    if health_manager.is_disabled(key):
        raise AIConfigError(
            f"Provider '{key}' is disabled by AI_DISABLED_PROVIDERS and cannot be "
            f"made active. Remove it from that list to route to it again."
        )
    _provider_override = key
    logger.info("AI gateway: active reasoning provider switched to '%s'", key)
    return key


def clear_override() -> None:
    global _provider_override
    _provider_override = None


def _role_model(provider: str, role: ModelRole) -> str:
    setting = ROLE_MODEL_SETTING.get(role)
    if setting:
        override = (getattr(settings, setting, "") or "").strip()
        if override:
            return override
    spec = get_provider_spec(provider)
    if spec:
        model = spec.default_model(role)
        if model:
            return model
    return settings.AI_DEFAULT_MODEL


def resolve(role: ModelRole = ModelRole.DEFAULT_REASONING, *, provider: Optional[str] = None) -> ModelSelection:
    """Resolve a logical role to a concrete (provider, model)."""
    prov = (provider or active_provider()).lower()
    return ModelSelection(provider=prov, model=_role_model(prov, role), role=role)


def fallback_chain(role: ModelRole = ModelRole.DEFAULT_REASONING) -> list[ModelSelection]:
    """The ordered [primary, ...fallbacks] selections for a role (configurable).

    **Providers in `AI_DISABLED_PROVIDERS` are excluded, including the primary.**
    Disabling is the lever an operator pulls during an incident, so it has to
    outrank the configured order — otherwise the one setting that exists to take
    a provider out of rotation is the one setting that cannot (C3).

    The list can therefore be EMPTY: disabling every provider in the chain is a
    configuration with no answer, and the orchestrator says so rather than
    routing to a provider it was told not to.
    """
    from app.ai.gateway.health import health_manager

    chain = [p for p in [active_provider()] if not health_manager.is_disabled(p)]
    if settings.AI_ENABLE_FALLBACK:
        for p in settings.fallback_providers:
            if p not in chain and get_provider_spec(p) is not None \
                    and not health_manager.is_disabled(p):
                chain.append(p)
    return [resolve(role, provider=p) for p in chain]


def configured_reasoning_providers(
    role: ModelRole = ModelRole.DEFAULT_REASONING,
) -> list[str]:
    """The providers in the active chain that have what they need to run.

    "Configured" is each provider's own answer (`LLMProvider.is_configured`),
    read from its declared key setting — never inferred from a provider's name
    (§9A rule 10). A provider that cannot even be constructed (the fake, in
    production) is not configured, which is the honest reading.
    """
    from app.ai.providers.registry import get_provider

    configured: list[str] = []
    for selection in fallback_chain(role):
        try:
            provider = get_provider(selection.provider)
        except AIConfigError:
            continue
        if provider.is_configured():
            configured.append(selection.provider)
    return configured


def is_reasoning_configured() -> bool:
    """True when SOMETHING in the active chain can serve a reasoning request.

    This is what `/health` and the startup log mean by "the LLM is configured".
    It used to be `bool(GROQ_API_KEY)` (C8), so an OpenAI-only deployment
    reported `llm: not_configured` while answering every AI request correctly —
    a health signal that is wrong in the direction that gets a working service
    rolled back.
    """
    return bool(configured_reasoning_providers())


def resolve_embedding() -> tuple[str, str, int]:
    """(provider, model, dimensions) for the configured embedding provider."""
    provider = (settings.EMBEDDING_PROVIDER or "hashing").lower()
    model = (settings.EMBEDDING_MODEL or "").strip()
    if not model or model == "hashing-v1":
        spec = get_provider_spec(provider)
        if spec:
            model = spec.default_model(ModelRole.EMBEDDINGS) or model
    m = get_model(model)
    dims = (m.dimensions if m and m.dimensions else settings.EMBEDDING_DIMENSIONS)
    return provider, model or "hashing-v1", dims


def cost_of(model: str, prompt_tokens: int, completion_tokens: int) -> Optional[float]:
    return estimate_cost(model, prompt_tokens, completion_tokens)


def config_snapshot() -> dict:
    """Admin-safe view of the active configuration (NO secrets)."""
    prov = active_provider()
    roles = {
        role.value: {"provider": sel.provider, "model": sel.model}
        for role in ModelRole if role is not ModelRole.EMBEDDINGS
        for sel in [resolve(role)]
    }
    emb_provider, emb_model, emb_dims = resolve_embedding()
    from app.ai.gateway.health import health_manager
    health = health_manager.snapshot()
    providers = []
    for spec in available_provider_specs():
        key_setting = spec.api_key_setting
        configured = bool(getattr(settings, key_setting, "")) if key_setting else True
        providers.append({
            "name": spec.name,
            "display_name": spec.display_name,
            "capabilities": sorted(spec.capabilities),
            "context_window": spec.context_window,
            "max_output_tokens": spec.max_output_tokens,
            "key_configured": configured,   # bool only — never the key itself
            "health": (health.get(spec.name, {}).get("state") or "healthy"),
        })
    return {
        "active_provider": prov,
        "override_active": _provider_override is not None,
        "fallback_enabled": settings.AI_ENABLE_FALLBACK,
        "fallback_chain": [s.provider for s in fallback_chain()],
        "disabled_providers": sorted(settings.disabled_providers),
        "roles": roles,
        "embeddings": {"provider": emb_provider, "model": emb_model, "dimensions": emb_dims},
        "providers": providers,
        "provider_health": health,
    }
