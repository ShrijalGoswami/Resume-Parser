"""
LLMProvider — the common interface every provider implements.

The rest of the application never imports a vendor SDK; it talks to this
interface. Adding OpenAI / Anthropic / Gemini / OpenRouter later means writing a
new subclass and registering it — no changes to the orchestrator or callers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterator, Sequence

from app.ai.schemas.base import ChatMessage, ProviderResponse


class LLMProvider(ABC):
    """Abstract base for chat-completion providers."""

    #: Registry key, e.g. "groq", "openai".
    name: str = "base"

    @abstractmethod
    def complete(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
    ) -> ProviderResponse:
        """
        Perform ONE completion attempt (no retries — the orchestrator owns retry
        policy). Must raise an `app.ai.utils.errors.AIError` subclass on failure
        (AIConfigError for non-retryable config problems, AIProviderError/
        AITimeoutError/AIRateLimitError for transient ones). Never let a raw
        vendor exception escape.
        """
        raise NotImplementedError

    # -- streaming (architecture-ready; not required this sprint) -----------
    def supports_streaming(self) -> bool:
        return False

    def stream(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
    ) -> Iterator[str]:
        """Yield response text chunks. Providers that support streaming override this."""
        raise NotImplementedError(f"{self.name} does not support streaming yet.")

    # -- multi-turn (architecture-ready for the future Copilot) -------------
    def complete_messages(
        self,
        *,
        messages: Sequence[ChatMessage],
        model: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
    ) -> ProviderResponse:
        """
        Multi-turn completion. Default implementation collapses a system + single
        user turn onto `complete()`; providers may override for true multi-turn.
        """
        system = next((m.content for m in messages if m.role.value == "system"), "")
        user = "\n\n".join(m.content for m in messages if m.role.value != "system")
        return self.complete(
            system=system,
            user=user,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout_seconds=timeout_seconds,
        )
