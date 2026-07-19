"""
Model Registry.

Centralised metadata for every model the platform knows about, across providers.
The gateway uses this to resolve logical roles, estimate cost, and expose model
capabilities. Pricing is optional (USD per 1M tokens) and only used for cost
estimates when configured.

Adding a model = one `register_model(...)` call (or an entry below). Unknown
models still work (the gateway tolerates a missing spec) — they just lack
metadata/pricing until registered.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ModelSpec:
    name: str
    provider: str
    purpose: str = "reasoning"            # reasoning | embeddings
    cost_tier: str = "standard"           # cheap | standard | premium
    context_window: int = 8192
    max_output_tokens: int = 4096
    supports_json: bool = True
    supports_streaming: bool = False
    supports_tools: bool = False
    supports_embeddings: bool = False
    # USD per 1M tokens (optional; enables cost estimation).
    input_price_per_1m: Optional[float] = None
    output_price_per_1m: Optional[float] = None
    dimensions: int = 0                   # embeddings only


_MODELS: dict[str, ModelSpec] = {}


def register_model(spec: ModelSpec) -> None:
    _MODELS[spec.name] = spec


def get_model(name: str) -> Optional[ModelSpec]:
    return _MODELS.get(name)


def models_for_provider(provider: str) -> list[ModelSpec]:
    return [m for m in _MODELS.values() if m.provider == provider]


def all_models() -> list[ModelSpec]:
    return list(_MODELS.values())


def _seed() -> None:
    seeds = [
        # ── Groq ──────────────────────────────────────────────────────────
        ModelSpec("llama-3.3-70b-versatile", "groq", cost_tier="cheap", context_window=131072,
                  max_output_tokens=32768, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=0.59, output_price_per_1m=0.79),
        ModelSpec("llama-3.1-8b-instant", "groq", cost_tier="cheap", context_window=131072,
                  max_output_tokens=8192, supports_streaming=True,
                  input_price_per_1m=0.05, output_price_per_1m=0.08),
        # ── Google Gemini ─────────────────────────────────────────────────
        ModelSpec("gemini-2.0-flash", "gemini", cost_tier="cheap", context_window=1048576,
                  max_output_tokens=8192, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=0.10, output_price_per_1m=0.40),
        ModelSpec("gemini-1.5-pro", "gemini", cost_tier="premium", context_window=2097152,
                  max_output_tokens=8192, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=1.25, output_price_per_1m=5.0),
        ModelSpec("text-embedding-004", "gemini", purpose="embeddings", cost_tier="cheap",
                  supports_json=False, supports_embeddings=True, dimensions=768),
        # ── Anthropic ─────────────────────────────────────────────────────
        ModelSpec("claude-sonnet-5", "anthropic", cost_tier="standard", context_window=200000,
                  max_output_tokens=8192, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=3.0, output_price_per_1m=15.0),
        ModelSpec("claude-opus-4-8", "anthropic", cost_tier="premium", context_window=200000,
                  max_output_tokens=8192, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=15.0, output_price_per_1m=75.0),
        # ── OpenAI ────────────────────────────────────────────────────────
        ModelSpec("gpt-4o-mini", "openai", cost_tier="cheap", context_window=128000,
                  max_output_tokens=16384, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=0.15, output_price_per_1m=0.60),
        ModelSpec("gpt-4o", "openai", cost_tier="premium", context_window=128000,
                  max_output_tokens=16384, supports_tools=True, supports_streaming=True,
                  input_price_per_1m=2.5, output_price_per_1m=10.0),
        ModelSpec("text-embedding-3-small", "openai", purpose="embeddings", cost_tier="cheap",
                  supports_json=False, supports_embeddings=True, dimensions=1536,
                  input_price_per_1m=0.02),
        # ── OpenRouter (routes to many models) ────────────────────────────
        ModelSpec("openai/gpt-4o-mini", "openrouter", cost_tier="cheap", context_window=128000,
                  max_output_tokens=16384, supports_tools=True, supports_streaming=True),
        # ── Local / dependency-free embedding ─────────────────────────────
        ModelSpec("hashing-v1", "hashing", purpose="embeddings", cost_tier="cheap",
                  supports_json=False, supports_embeddings=True, dimensions=1536),
    ]
    for s in seeds:
        register_model(s)


_seed()


def estimate_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> Optional[float]:
    """USD estimate for a call, or None when the model has no configured pricing."""
    spec = get_model(model_name)
    if not spec or (spec.input_price_per_1m is None and spec.output_price_per_1m is None):
        return None
    inp = (prompt_tokens or 0) / 1_000_000 * (spec.input_price_per_1m or 0)
    out = (completion_tokens or 0) / 1_000_000 * (spec.output_price_per_1m or 0)
    return round(inp + out, 6)
