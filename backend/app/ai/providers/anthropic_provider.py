"""
Anthropic (Claude) provider.

Lazily imports the `anthropic` SDK; raises AIConfigError when the SDK or
ANTHROPIC_API_KEY is missing so the gateway can fall back.
"""

from __future__ import annotations

from app.ai.gateway.roles import ModelRole
from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings


class AnthropicProvider(LLMProvider):
    name = "anthropic"
    display_name = "Anthropic"
    api_key_setting = "ANTHROPIC_API_KEY"
    sdk_namespace = "anthropic"
    # Deliberately EMPTY, and that is the finding rather than a gap in it.
    # Anthropic's 429s are per-minute buckets (RPM / input- and output-tokens-
    # per-minute) that reset within the minute, so every one of them SHOULD be
    # retried — and now is, honouring the `retry-after` header it sends, which
    # this provider previously discarded. Credit exhaustion, the one Anthropic
    # failure that will not clear, arrives as a 400 `invalid_request_error` and
    # never reaches the rate-limit branch, so a marker for it could not fire.
    # Declaring nothing is an answer here (§9A rule 10); inventing markers so the
    # list looked like Groq's would have been the guess.
    quota_markers = ()
    can_json = True
    can_stream = True
    can_reason = True
    can_tools = True
    can_vision = True
    ctx_window = 200000
    max_output = 8192
    role_models = {
        ModelRole.DEFAULT_REASONING: "claude-sonnet-5",
        ModelRole.FAST_REASONING: "claude-sonnet-5",
        ModelRole.CHEAP_REASONING: "claude-sonnet-5",
        ModelRole.LONG_CONTEXT: "claude-sonnet-5",
        ModelRole.PREMIUM_REASONING: "claude-opus-4-8",
    }

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds) -> ProviderResponse:
        key = settings.ANTHROPIC_API_KEY or ""
        if not key:
            raise AIConfigError("anthropic: ANTHROPIC_API_KEY is not configured.")
        try:
            import anthropic  # lazy
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'anthropic' package is not installed.") from exc

        try:
            client = anthropic.Anthropic(api_key=key)
            resp = client.messages.create(
                model=model,
                system=system,
                messages=[{"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover
            raise self._classify(exc) from exc

        text = "".join(
            getattr(block, "text", "") for block in getattr(resp, "content", [])
            if getattr(block, "type", None) == "text"
        )
        u = getattr(resp, "usage", None)
        usage = TokenUsage(
            prompt_tokens=getattr(u, "input_tokens", None),
            completion_tokens=getattr(u, "output_tokens", None),
            total_tokens=(getattr(u, "input_tokens", 0) + getattr(u, "output_tokens", 0)) if u else None,
        ) if u else TokenUsage()
        return ProviderResponse(
            text=text, model=model, provider=self.name, usage=usage,
            finish_reason=getattr(resp, "stop_reason", None),
        )

