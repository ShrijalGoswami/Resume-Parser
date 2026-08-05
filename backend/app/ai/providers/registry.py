"""
Provider registry.

Maps a provider name → a singleton LLMProvider instance. New providers register
here; callers resolve by name via the orchestrator/config. Adding OpenAI etc.
later is a one-line registration.
"""

from __future__ import annotations

from typing import Callable

from app.ai.providers.base import LLMProvider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.fake_provider import FakeProvider
from app.ai.providers.openai_compat import KimiProvider, OpenAIProvider, OpenRouterProvider
from app.ai.utils.errors import AIConfigError

# Factories so providers are constructed lazily (their SDK/client init is deferred).
# Selection is entirely config-driven via the AI Gateway; every provider here can
# be the platform-wide reasoning provider by setting AI_PROVIDER. Adding a provider
# is exactly: (1) write the class, (2) register it here, (3) add its key/config.
_FACTORIES: dict[str, Callable[[], LLMProvider]] = {
    "groq": GroqProvider,
    "gemini": GeminiProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "openrouter": OpenRouterProvider,
    "kimi": KimiProvider,
    # Offline, deterministic, no credential. Registered exactly like the others
    # so `AI_PROVIDER=fake` exercises the real gateway → health → retry ladder
    # path rather than a parallel one. It refuses to construct in production.
    "fake": FakeProvider,
}
_INSTANCES: dict[str, LLMProvider] = {}


def register_provider(name: str, factory: Callable[[], LLMProvider]) -> None:
    _FACTORIES[name] = factory
    _INSTANCES.pop(name, None)


def available_providers() -> list[str]:
    return sorted(_FACTORIES)


def get_provider(name: str) -> LLMProvider:
    key = (name or "").lower()
    if key not in _FACTORIES:
        raise AIConfigError(
            f"Unknown AI provider '{name}'. Available: {', '.join(available_providers())}."
        )
    if key not in _INSTANCES:
        _INSTANCES[key] = _FACTORIES[key]()
    return _INSTANCES[key]
