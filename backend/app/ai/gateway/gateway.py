"""
AI Gateway — the single decision point for "which provider + model".

Think of it as Stripe for AI providers: a feature asks for a logical role
("I need reasoning") and the gateway decides the provider, model, and fallback
chain from configuration. No feature knows or cares which vendor answered.

The reasoning provider comes from configuration alone: AI_PROVIDER, falling
back to AI_DEFAULT_PROVIDER. There is deliberately NO runtime switch — see
`active_provider()`.

MODEL RESOLUTION HAS EXACTLY ONE AUTHORITATIVE DECISION PATH (§9A rule 16)
---------------------------------------------------------------------------
**Providers expose facts. Model resolution decides precedence. Providers never
decide precedence.** A provider declares the models it serves per role;
`_role_model()` below decides which declaration — or which piece of
configuration — actually wins. No provider, and no caller, gets to re-order that
ladder.

Three properties this must never lose:

  * **Unknown models fail loudly.** A model is never invented and never
    substituted. When no rule applies, resolution raises rather than reaching for
    something plausible — a guessed name arrives at a real vendor as *their*
    error, which is the hardest kind to trace back to our configuration.
  * **Provider defaults never leak across providers.** A model declared by one
    provider is that provider's, and a provider with an incomplete role map gets
    a refusal, never a neighbour's model name. This is C4, and the global
    `AI_DEFAULT_MODEL` that caused it has been removed rather than repointed.
  * **Call-site intent has the highest precedence.** When a caller pins both
    provider and model, that is the most specific instruction in the system: it
    wins outright, and nothing is resolved on its behalf. This is C5 — a config
    file used to beat an explicit `model=`, and the record then showed the
    config's answer, so the override was invisible as well as ignored.

**If a future provider cannot fit this precedence ladder, review the abstraction
before adding provider-specific routing.** The ladder is deliberately short and
provider-neutral; a vendor that seems to need its own rung is nearly always
asking for a *fact* it has not declared yet. Add the fact. A branch keyed on a
provider's name is forbidden by §9A rule 3.

MODEL PRECEDENCE — ONE DECISION PATH (C4/C5)
--------------------------------------------
`_role_model()` is the only place a model is chosen. Most specific wins:

  1. explicit call-site `model=`          → `ModelSource.CALL_SITE`
  2. capability→model routing             → `ModelSource.CAPABILITY_ROUTING`
  3. per-provider `AI_PROVIDERS[p].default_model` → `ModelSource.PROVIDER_DEFAULT`
  4. per-role env override (DEFAULT_REASONING_MODEL, …) → `ModelSource.ROLE_OVERRIDE`
  5. the provider's own declared `role_models[role]`    → `ModelSource.PROVIDER_ROLE`
  6. nothing — `AIConfigError`, naming the provider and the role

1 and 2 are resolved by the orchestrator before it calls in here, because only
the caller knows it pinned something; 3–5 are decided here. Every selection
records WHICH of these applied, so "why did it use that model" is answerable
from `config_snapshot()` rather than by reading this docstring.

Two things this ordering is deliberate about:

* **The per-provider default outranks the per-role override** (3 above 4). The
  role override is provider-agnostic and can easily name a model the provider
  cannot serve; the per-provider default names its provider explicitly. This
  also preserves the relative order those two already had.
* **There is no cross-provider last resort.** `AI_DEFAULT_MODEL` used to sit at
  the bottom and was a Groq model name, so any provider with an incomplete
  `role_models` map was handed a Llama (C4). Guessing a model is worse than
  refusing: the request reaches a real vendor with a model it has never heard of,
  and the error comes back as the vendor's, not ours.

Nothing here holds secrets; only the NAME of the key setting is surfaced.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from app.ai.gateway.model_registry import estimate_cost, get_model
from app.ai.gateway.provider_registry import available_provider_specs, get_provider_spec
from app.ai.gateway.roles import ROLE_MODEL_SETTING, ModelRole
from app.ai.utils.errors import AIConfigError
from app.core.config import settings

logger = logging.getLogger("app.ai")


class ModelSource(str, Enum):
    """Why this model was chosen. The five inputs kept distinct on purpose —
    they are edited in different places by different people, and "the model is
    wrong" is unanswerable without knowing which one applied."""

    CALL_SITE = "call_site"                    # an explicit `model=` argument
    CAPABILITY_ROUTING = "capability_routing"  # AI_CAPABILITY_MODELS
    PROVIDER_DEFAULT = "provider_default"      # AI_PROVIDERS[provider].default_model
    ROLE_OVERRIDE = "role_override"            # DEFAULT_REASONING_MODEL, …
    PROVIDER_ROLE = "provider_role"            # the provider's own role_models


@dataclass(frozen=True)
class ModelSelection:
    provider: str
    model: str
    role: ModelRole
    #: Which rule produced `model`. Defaulted so existing construction sites
    #: stay valid; the orchestrator sets it explicitly when it pins a model.
    source: ModelSource = ModelSource.PROVIDER_ROLE


def active_provider() -> str:
    """The provider all reasoning routes to. Configuration only.

    **There is no runtime switch, by product decision (§11.0): V1 is Groq-only,
    so there is nothing to switch to.** A `set_active_provider()` used to exist
    and mutated a module-level global, which made it worse than redundant: the
    route checked `ORG_MANAGE` inside the caller's own organization and then
    changed the provider for **every** organization served by the process. It was
    removed with the feature rather than gated, because a switch with one option
    is not a feature to gate.

    Changing the provider is a deployment decision — set `AI_PROVIDER` and
    restart — which is validated at boot (`validation.py`) rather than accepted
    from a request.
    """
    return settings.reasoning_provider.lower()


def _role_model(provider: str, role: ModelRole) -> tuple[str, ModelSource]:
    """The one decision path for "which model". See the module docstring.

    Returns the model AND the rule that chose it. Raises `AIConfigError` when no
    rule applies — a model is never invented, because a guessed name reaches a
    real vendor and comes back as their error rather than our misconfiguration.
    """
    from app.ai.gateway.provider_config import get_provider_config

    # 3. Per-provider default: names its provider explicitly, so it outranks the
    #    provider-agnostic role override below.
    provider_default = (get_provider_config(provider).default_model or "").strip()
    if provider_default:
        return provider_default, ModelSource.PROVIDER_DEFAULT

    # 4. Per-role env override, global across providers.
    setting = ROLE_MODEL_SETTING.get(role)
    if setting:
        override = (getattr(settings, setting, "") or "").strip()
        if override:
            return override, ModelSource.ROLE_OVERRIDE

    # 5. What the provider itself declares for this role (its own DEFAULT_REASONING
    #    is the internal fallback — a provider's own default, never another's).
    spec = get_provider_spec(provider)
    if spec:
        model = spec.default_model(role)
        if model:
            return model, ModelSource.PROVIDER_ROLE

    # 6. Nothing applies. Say so, name both, and stop.
    raise AIConfigError(
        f"No model configured for provider '{provider}' in role '{role.value}'. "
        f"Declare it in the provider's `role_models`, set "
        f"{ROLE_MODEL_SETTING.get(role, 'the role override')}, or give the "
        f"provider a `default_model` in AI_PROVIDERS."
    )


def resolve(role: ModelRole = ModelRole.DEFAULT_REASONING, *, provider: Optional[str] = None) -> ModelSelection:
    """Resolve a logical role to a concrete (provider, model, source)."""
    prov = (provider or active_provider()).lower()
    model, source = _role_model(prov, role)
    return ModelSelection(provider=prov, model=model, role=role, source=source)


def routable_providers() -> list[str]:
    """The ordered provider NAMES a request may be routed to — no model resolved.

    Split out from `fallback_chain()` because two callers need the chain without
    needing a model: `configured_reasoning_providers()` (which asks about keys)
    and the configuration validator (which must never raise — §9A rule 15).
    Since C4 removed the cross-provider last resort, resolving a model can fail,
    and a health surface asking "which providers are in play" must not inherit
    that failure.
    """
    from app.ai.gateway.health import health_manager

    chain = [p for p in [active_provider()] if not health_manager.is_disabled(p)]
    if settings.AI_ENABLE_FALLBACK:
        for p in settings.fallback_providers:
            if p not in chain and get_provider_spec(p) is not None \
                    and not health_manager.is_disabled(p):
                chain.append(p)
    return chain


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
    return [resolve(role, provider=p) for p in routable_providers()]


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
    for name in routable_providers():
        try:
            provider = get_provider(name)
        except AIConfigError:
            continue
        if provider.is_configured():
            configured.append(name)
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
    # `source` answers "why this model", which is the half of C5 that was
    # invisible: usage recorded the model actually used and nothing recorded the
    # rule that picked it. A role that cannot resolve reports the reason rather
    # than taking the whole snapshot down — this is an admin surface.
    roles = {}
    for role in ModelRole:
        if role is ModelRole.EMBEDDINGS:
            continue
        try:
            sel = resolve(role)
            roles[role.value] = {"provider": sel.provider, "model": sel.model,
                                 "source": sel.source.value}
        except AIConfigError as exc:
            roles[role.value] = {"provider": prov, "model": None,
                                 "source": None, "error": str(exc)}
    emb_provider, emb_model, emb_dims = resolve_embedding()
    from app.ai.gateway.health import health_manager
    from app.ai.gateway.validation import check_provider_configuration, configuration_state
    health = health_manager.snapshot()
    # Two independent axes, reported separately on purpose (C9). `configuration`
    # answers "could this ever work as configured"; `health` answers "is it
    # answering right now". Collapsing them is how a temporary outage gets
    # diagnosed as a config error, and a config error gets waited out.
    problems = check_provider_configuration()
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
            "configuration": configuration_state(spec.name, problems),
            "health": (health.get(spec.name, {}).get("state") or "healthy"),
        })
    return {
        "active_provider": prov,
        "fallback_enabled": settings.AI_ENABLE_FALLBACK,
        # Names only: this line never needed a model, and resolving one can now
        # fail (C4). An admin surface must not break on the configuration it exists
        # to display.
        "fallback_chain": routable_providers(),
        "disabled_providers": sorted(settings.disabled_providers),
        "roles": roles,
        "embeddings": {"provider": emb_provider, "model": emb_model, "dimensions": emb_dims},
        "providers": providers,
        "provider_health": health,
        # Findings, not a verdict — severity included so an operator can see what
        # would have stopped a deploy and what merely needs a look.
        "configuration_problems": [
            {"severity": p.severity, "setting": p.setting, "message": p.message}
            for p in problems
        ],
    }
