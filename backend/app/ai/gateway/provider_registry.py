"""
Provider Registry (metadata).

Complements `app.ai.providers.registry` (which builds provider *instances*) with
declarative provider *metadata* the gateway uses to select and describe providers:
capabilities, default model per logical role, key requirements, context window,
etc. Nothing here holds secrets — only the NAME of the env var that supplies a key.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.ai.gateway.roles import ModelRole


@dataclass(frozen=True)
class ProviderSpec:
    name: str
    display_name: str
    capabilities: frozenset[str]              # {"reasoning","embeddings","streaming","vision","json_mode","tools"}
    api_key_setting: str                      # env/settings attribute holding the key ("" = none needed)
    #: Default model for each logical role this provider serves.
    role_models: dict[ModelRole, str] = field(default_factory=dict)
    context_window: int = 8192
    max_output_tokens: int = 4096

    def supports(self, capability: str) -> bool:
        return capability in self.capabilities

    def default_model(self, role: ModelRole) -> str:
        return self.role_models.get(role, self.role_models.get(ModelRole.DEFAULT_REASONING, ""))


_PROVIDERS: dict[str, ProviderSpec] = {}
_SEEDED = False


def register_provider_spec(spec: ProviderSpec) -> None:
    _PROVIDERS[spec.name] = spec


def _spec_from_class(cls) -> ProviderSpec:
    """Derive a ProviderSpec from a provider CLASS — the provider is the single
    source of truth for its own capabilities, models, and context window (M4)."""
    caps = set()
    if cls.can_reason:
        caps.add("reasoning")
    if cls.can_stream:
        caps.add("streaming")
    if cls.can_json:
        caps.add("json_mode")
    if cls.can_tools:
        caps.add("tools")
    if cls.can_vision:
        caps.add("vision")
    if cls.can_embeddings:
        caps.add("embeddings")
    return ProviderSpec(
        name=cls.name,
        display_name=cls.display_name or cls.name.title(),
        capabilities=frozenset(caps),
        api_key_setting=cls.api_key_setting,
        role_models=dict(cls.role_models),
        context_window=cls.ctx_window,
        max_output_tokens=cls.max_output,
    )


def _ensure_seeded() -> None:
    """Lazily derive specs from the provider classes on first access. Deferred to
    runtime (not module load) so importing provider classes here never risks an
    import cycle with the gateway package."""
    global _SEEDED
    if _SEEDED:
        return
    _SEEDED = True
    # Imported lazily — see docstring. The registry is the list of what exists.
    from app.ai.providers.groq_provider import GroqProvider
    from app.ai.providers.gemini_provider import GeminiProvider
    from app.ai.providers.anthropic_provider import AnthropicProvider
    from app.ai.providers.openai_compat import KimiProvider, OpenAIProvider, OpenRouterProvider

    for cls in (GroqProvider, GeminiProvider, AnthropicProvider,
                OpenAIProvider, OpenRouterProvider, KimiProvider):
        register_provider_spec(_spec_from_class(cls))
    # Non-LLM embeddings provider (no completion class) — declared inline.
    register_provider_spec(ProviderSpec(
        "hashing", "Local Hashing (embeddings)", frozenset({"embeddings"}), "",
        role_models={ModelRole.EMBEDDINGS: "hashing-v1"},
    ))


def get_provider_spec(name: str):
    _ensure_seeded()
    return _PROVIDERS.get((name or "").lower())


def available_provider_specs() -> list[ProviderSpec]:
    _ensure_seeded()
    return list(_PROVIDERS.values())
