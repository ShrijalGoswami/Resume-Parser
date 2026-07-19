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


def register_provider_spec(spec: ProviderSpec) -> None:
    _PROVIDERS[spec.name] = spec


def get_provider_spec(name: str):
    return _PROVIDERS.get((name or "").lower())


def available_provider_specs() -> list[ProviderSpec]:
    return list(_PROVIDERS.values())


def _seed() -> None:
    reasoning = frozenset({"reasoning", "streaming", "json_mode", "tools"})
    specs = [
        ProviderSpec(
            "groq", "Groq", reasoning, "GROQ_API_KEY",
            role_models={
                ModelRole.DEFAULT_REASONING: "llama-3.3-70b-versatile",
                ModelRole.FAST_REASONING: "llama-3.1-8b-instant",
                ModelRole.CHEAP_REASONING: "llama-3.1-8b-instant",
                ModelRole.LONG_CONTEXT: "llama-3.3-70b-versatile",
                ModelRole.PREMIUM_REASONING: "llama-3.3-70b-versatile",
            },
            context_window=131072, max_output_tokens=32768,
        ),
        ProviderSpec(
            "gemini", "Google Gemini", reasoning | {"vision", "embeddings"}, "GEMINI_API_KEY",
            role_models={
                ModelRole.DEFAULT_REASONING: "gemini-2.0-flash",
                ModelRole.FAST_REASONING: "gemini-2.0-flash",
                ModelRole.CHEAP_REASONING: "gemini-2.0-flash",
                ModelRole.LONG_CONTEXT: "gemini-1.5-pro",
                ModelRole.PREMIUM_REASONING: "gemini-1.5-pro",
                ModelRole.EMBEDDINGS: "text-embedding-004",
            },
            context_window=1048576, max_output_tokens=8192,
        ),
        ProviderSpec(
            "anthropic", "Anthropic", reasoning | {"vision"}, "ANTHROPIC_API_KEY",
            role_models={
                ModelRole.DEFAULT_REASONING: "claude-sonnet-5",
                ModelRole.FAST_REASONING: "claude-sonnet-5",
                ModelRole.CHEAP_REASONING: "claude-sonnet-5",
                ModelRole.LONG_CONTEXT: "claude-sonnet-5",
                ModelRole.PREMIUM_REASONING: "claude-opus-4-8",
            },
            context_window=200000, max_output_tokens=8192,
        ),
        ProviderSpec(
            "openai", "OpenAI", reasoning | {"vision", "embeddings"}, "OPENAI_API_KEY",
            role_models={
                ModelRole.DEFAULT_REASONING: "gpt-4o-mini",
                ModelRole.FAST_REASONING: "gpt-4o-mini",
                ModelRole.CHEAP_REASONING: "gpt-4o-mini",
                ModelRole.LONG_CONTEXT: "gpt-4o",
                ModelRole.PREMIUM_REASONING: "gpt-4o",
                ModelRole.EMBEDDINGS: "text-embedding-3-small",
            },
            context_window=128000, max_output_tokens=16384,
        ),
        ProviderSpec(
            "openrouter", "OpenRouter", reasoning, "OPENROUTER_API_KEY",
            role_models={
                ModelRole.DEFAULT_REASONING: "openai/gpt-4o-mini",
                ModelRole.FAST_REASONING: "openai/gpt-4o-mini",
                ModelRole.CHEAP_REASONING: "openai/gpt-4o-mini",
                ModelRole.LONG_CONTEXT: "openai/gpt-4o-mini",
                ModelRole.PREMIUM_REASONING: "openai/gpt-4o-mini",
            },
            context_window=128000, max_output_tokens=16384,
        ),
        ProviderSpec(
            "hashing", "Local Hashing (embeddings)", frozenset({"embeddings"}), "",
            role_models={ModelRole.EMBEDDINGS: "hashing-v1"},
        ),
    ]
    for s in specs:
        register_provider_spec(s)


_seed()
