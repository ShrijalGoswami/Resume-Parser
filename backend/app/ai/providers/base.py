"""
LLMProvider — the common interface every provider implements.

The rest of the application never imports a vendor SDK; it talks to this
interface. Adding OpenAI / Anthropic / Gemini / Kimi / OpenRouter later means
writing a new subclass and registering it — no changes to the orchestrator or
callers.

A provider is the SINGLE SOURCE OF TRUTH for its own metadata: it declares its
capabilities, default models per role, context window, and key setting as class
attributes; the base implements the descriptor methods (`supports_*`,
`model_name`, `context_window`, `health`) from those declarations, and the gateway
derives its `ProviderSpec` from the same source (no duplicate metadata).

Contract (every provider exposes the same surface):
    generate()  complete()(alias)  health()
    supports_json()  supports_streaming()  supports_reasoning()
    supports_vision()  supports_tools()  supports_embeddings()
    model_name()  context_window()
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterator, Optional, Sequence

from app.ai.gateway.roles import ModelRole
from app.ai.schemas.base import ChatMessage, ProviderHealth, ProviderResponse
from app.core.config import settings


class LLMProvider(ABC):
    """Abstract base for chat-completion providers."""

    #: Registry key, e.g. "groq", "openai".
    name: str = "base"
    #: Human-friendly name for admin/config surfaces.
    display_name: str = ""
    #: settings attribute holding the API key ("" = no key required).
    api_key_setting: str = ""

    # ── Declared capability metadata (providers override; base reads these) ──
    can_json: bool = True          # native/parseable JSON output
    can_stream: bool = False       # token streaming
    can_reason: bool = True        # general reasoning/chat
    can_vision: bool = False       # image inputs
    can_tools: bool = False        # tool/function calling
    can_embeddings: bool = False   # vectorisation
    ctx_window: int = 8192         # context window (tokens)
    max_output: int = 4096         # max output tokens
    #: Default model per logical role — the provider's own defaults.
    role_models: dict[ModelRole, str] = {}

    # ── The one wire method every provider implements ───────────────────────
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

    def generate(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
    ) -> ProviderResponse:
        """Canonical generation entry point. `complete()` is retained as a
        backward-compatible alias (the orchestrator still calls it); new code
        should call `generate()`."""
        return self.complete(
            system=system, user=user, model=model, temperature=temperature,
            max_tokens=max_tokens, timeout_seconds=timeout_seconds,
        )

    # ── Capability descriptors (metadata; future routing consumes these) ────
    def supports_json(self) -> bool:
        return self.can_json

    def supports_streaming(self) -> bool:
        return self.can_stream

    def supports_reasoning(self) -> bool:
        return self.can_reason

    def supports_vision(self) -> bool:
        return self.can_vision

    def supports_tools(self) -> bool:
        return self.can_tools

    def supports_embeddings(self) -> bool:
        return self.can_embeddings

    def context_window(self) -> int:
        return self.ctx_window

    def model_name(self, role: ModelRole = ModelRole.DEFAULT_REASONING) -> str:
        """The provider's default model for a role (its primary by default)."""
        return self.role_models.get(role, self.role_models.get(ModelRole.DEFAULT_REASONING, ""))

    # ── Health self-report (distinct from the runtime ProviderHealthManager) ─
    def is_configured(self) -> bool:
        """True when this provider has what it needs to run (its key, if any)."""
        if not self.api_key_setting:
            return True
        return bool((getattr(settings, self.api_key_setting, "") or "").strip())

    def health(self, *, ping: bool = False) -> ProviderHealth:
        """Self-report: is the key configured, and (optionally) does a cheap live
        call succeed? Never raises — returns a structured verdict."""
        model = self.model_name()
        if not self.is_configured():
            return ProviderHealth(self.name, False, model, False,
                                  f"{self.api_key_setting or 'key'} not configured")
        if not ping:
            return ProviderHealth(self.name, True, model, True, "configured")
        try:
            self.complete(system="You are a health probe. Reply with: ok.",
                          user="Reply with ok.", model=model, temperature=0.0,
                          max_tokens=4, timeout_seconds=15)
            return ProviderHealth(self.name, True, model, True, "ping ok")
        except Exception as exc:  # any AIError → unhealthy, but configured
            return ProviderHealth(self.name, True, model, False, f"ping failed: {str(exc)[:80]}")

    # ── Streaming (architecture-ready; not required this sprint) ─────────────
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

    # ── Multi-turn (architecture-ready for the future Copilot) ──────────────
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
