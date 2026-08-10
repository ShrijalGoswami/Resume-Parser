"""
OpenAI-compatible providers (OpenAI, OpenRouter, Kimi/Moonshot, and any compatible
endpoint).

Uses the `openai` SDK with a configurable base URL, so any vendor that speaks the
OpenAI chat-completions API is a ~10-line subclass: set `name`, `api_key_setting`,
`base_url`, and its capability metadata. The SDK is imported lazily so it is only
required when one of these providers is actually selected; an unconfigured
provider raises AIConfigError, which the gateway treats as a fall-back signal.
"""

from __future__ import annotations

from app.ai.gateway.roles import ModelRole
from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings


class OpenAICompatProvider(LLMProvider):
    name = "openai_compat"
    api_key_setting = "OPENAI_API_KEY"
    base_url: str | None = None
    # Every provider in this family raises the `openai` SDK's exception types,
    # whatever endpoint it is pointed at.
    sdk_namespace = "openai"
    # Preserved VERBATIM from the pre-C1 expression. "You exceeded your current
    # quota" is OpenAI's billing-exhausted message and does not clear today;
    # subclasses inherit it because they speak the same API. A subclass whose
    # vendor words differ overrides this ONE attribute and nothing else.
    quota_markers = ("per day", "tpd", "rpd", "daily", "quota")
    # Same request parameter as Groq — this family speaks the same API.
    can_json = True
    can_stream = True
    can_reason = True
    can_tools = True

    def _api_key(self) -> str:
        return (getattr(settings, self.api_key_setting, "") or "").strip()

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds,
                 json_mode: bool = False) -> ProviderResponse:
        key = self._api_key()
        if not key:
            raise AIConfigError(f"{self.name}: {self.api_key_setting} is not configured.")
        try:
            from openai import OpenAI  # lazy — only needed for this provider
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'openai' package is not installed.") from exc

        try:
            client = OpenAI(api_key=key, base_url=self.base_url) if self.base_url else OpenAI(api_key=key)
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout_seconds,
                **({"response_format": {"type": "json_object"}} if json_mode else {}),
            )
        except Exception as exc:  # pragma: no cover — normalize vendor errors
            raise self._classify(exc) from exc

        choice = resp.choices[0]
        text = choice.message.content or ""
        return ProviderResponse(
            text=text, model=model, provider=self.name,
            usage=TokenUsage.from_raw(getattr(resp, "usage", None)),
            finish_reason=getattr(choice, "finish_reason", None),
        )



class OpenAIProvider(OpenAICompatProvider):
    name = "openai"
    display_name = "OpenAI"
    api_key_setting = "OPENAI_API_KEY"
    base_url = None
    can_vision = True
    can_embeddings = True
    ctx_window = 128000
    max_output = 16384
    role_models = {
        ModelRole.DEFAULT_REASONING: "gpt-4o-mini",
        ModelRole.FAST_REASONING: "gpt-4o-mini",
        ModelRole.CHEAP_REASONING: "gpt-4o-mini",
        ModelRole.LONG_CONTEXT: "gpt-4o",
        ModelRole.PREMIUM_REASONING: "gpt-4o",
        ModelRole.EMBEDDINGS: "text-embedding-3-small",
    }


class OpenRouterProvider(OpenAICompatProvider):
    name = "openrouter"
    display_name = "OpenRouter"
    api_key_setting = "OPENROUTER_API_KEY"
    base_url = "https://openrouter.ai/api/v1"
    ctx_window = 128000
    max_output = 16384
    role_models = {
        ModelRole.DEFAULT_REASONING: "openai/gpt-4o-mini",
        ModelRole.FAST_REASONING: "openai/gpt-4o-mini",
        ModelRole.CHEAP_REASONING: "openai/gpt-4o-mini",
        ModelRole.LONG_CONTEXT: "openai/gpt-4o-mini",
        ModelRole.PREMIUM_REASONING: "openai/gpt-4o-mini",
    }


class NvidiaProvider(OpenAICompatProvider):
    """NVIDIA NIM — OpenAI-compatible; only base_url + key + models differ.

    Reuses `NVIDIA_API_KEY`, already this repo's NVIDIA credential (the Nemotron
    embedding provider reads the same setting), and the same NIM base URL that
    `app/ai/embeddings/nvidia_provider.py` documents as `DEFAULT_BASE_URL`.

    `quota_markers` is inherited from the OpenAI-compatible family because NIM
    speaks that API. NVIDIA's own wording for a ceiling that will not clear today
    has NOT been observed yet, so if a trial 429 turns out to use different words
    this attribute is the one place to correct it (§9A rule 13 — vocabulary, not
    verdicts).
    """

    name = "nvidia"
    display_name = "NVIDIA NIM"
    api_key_setting = "NVIDIA_API_KEY"
    base_url = "https://integrate.api.nvidia.com/v1"
    ctx_window = 131072
    max_output = 8192
    role_models = {
        ModelRole.DEFAULT_REASONING: "z-ai/glm-5.2",
        ModelRole.FAST_REASONING: "z-ai/glm-5.2",
        ModelRole.CHEAP_REASONING: "z-ai/glm-5.2",
        ModelRole.LONG_CONTEXT: "z-ai/glm-5.2",
        ModelRole.PREMIUM_REASONING: "z-ai/glm-5.2",
    }


class KimiProvider(OpenAICompatProvider):
    """Kimi / Moonshot AI — OpenAI-compatible; only base_url + key + models differ."""

    name = "kimi"
    display_name = "Kimi (Moonshot)"
    api_key_setting = "MOONSHOT_API_KEY"
    base_url = "https://api.moonshot.ai/v1"
    can_tools = True
    ctx_window = 131072
    max_output = 16384
    role_models = {
        ModelRole.DEFAULT_REASONING: "kimi-k2-0711-preview",
        ModelRole.FAST_REASONING: "moonshot-v1-8k",
        ModelRole.CHEAP_REASONING: "moonshot-v1-8k",
        ModelRole.LONG_CONTEXT: "moonshot-v1-128k",
        ModelRole.PREMIUM_REASONING: "kimi-k2-0711-preview",
    }
