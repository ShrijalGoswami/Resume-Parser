"""
Embedding provider registry — name → provider (lazy singletons).

Resolves the active provider from `AIConfig`. Adding a provider (Voyage, Jina,
Gemini, local BGE/E5, …) is one subclass + one `register_embedding_provider`
call; callers use `get_embedding_provider()` unchanged.
"""

from __future__ import annotations

from typing import Callable, Optional

from app.ai.config import get_ai_config
from app.ai.embeddings.base import EmbeddingProvider
from app.ai.embeddings.gemini_provider import GeminiEmbeddingProvider
from app.ai.embeddings.hashing_provider import HashingEmbeddingProvider
from app.ai.embeddings.nvidia_provider import (
    DEFAULT_MODEL as NVIDIA_DEFAULT_MODEL,
    NvidiaEmbeddingProvider,
)
from app.ai.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.ai.utils.errors import AIConfigError
from app.core.config import settings


#: Model identifiers that genuinely belong to the hashing provider.
_HASHING_MODELS = ("hashing-v1",)


def _make_hashing() -> EmbeddingProvider:
    cfg = get_ai_config()
    # Do NOT adopt EMBEDDING_MODEL blindly. Selecting `hashing` while the env
    # still names a neural model (the normal offline-dev case, where only
    # EMBEDDING_PROVIDER is flipped) used to label hashing vectors
    # `hashing:nvidia/nemotron-3-embed-1b`. That identity is what
    # `embedding_pipeline` compares to decide whether a stored vector is stale,
    # so a mislabelled row is one that never gets re-embedded — it just silently
    # scores 0.0 forever against real Nemotron queries.
    model = cfg.embedding_model if cfg.embedding_model in _HASHING_MODELS else "hashing-v1"
    return HashingEmbeddingProvider(dimensions=cfg.embedding_dimensions, model=model)


def _make_openai() -> EmbeddingProvider:
    cfg = get_ai_config()
    return OpenAIEmbeddingProvider(
        api_key=settings.OPENAI_API_KEY,
        model=cfg.embedding_model if cfg.embedding_model != "hashing-v1" else "text-embedding-3-small",
        dimensions=cfg.embedding_dimensions,
    )


def _make_gemini() -> EmbeddingProvider:
    cfg = get_ai_config()
    return GeminiEmbeddingProvider(
        api_key=settings.GEMINI_API_KEY,
        model=cfg.embedding_model if cfg.embedding_model not in ("hashing-v1", "") else "text-embedding-004",
        dimensions=cfg.embedding_dimensions if cfg.embedding_dimensions else 768,
    )


def _make_nvidia() -> EmbeddingProvider:
    cfg = get_ai_config()
    # `EMBEDDING_DIMENSIONS` is passed for DRIFT DETECTION ONLY — the provider
    # derives its real width from the model's first response and logs a warning
    # if the configured value disagrees. It is never used to shape a request.
    model = cfg.embedding_model
    if model in ("", "hashing-v1"):
        model = NVIDIA_DEFAULT_MODEL
    return NvidiaEmbeddingProvider(
        api_key=settings.NVIDIA_API_KEY,
        model=model,
        timeout_seconds=cfg.timeout_seconds,
        configured_dimensions=cfg.embedding_dimensions,
    )


_FACTORIES: dict[str, Callable[[], EmbeddingProvider]] = {
    "hashing": _make_hashing,
    "nvidia": _make_nvidia,
    "openai": _make_openai,
    "gemini": _make_gemini,
}
_CACHE: dict[str, EmbeddingProvider] = {}


def register_embedding_provider(name: str, factory: Callable[[], EmbeddingProvider]) -> None:
    _FACTORIES[name.lower()] = factory
    _CACHE.pop(name.lower(), None)


def available_embedding_providers() -> list[str]:
    return sorted(_FACTORIES)


def get_embedding_provider(name: Optional[str] = None) -> EmbeddingProvider:
    key = (name or get_ai_config().embedding_provider or "hashing").lower()
    if key not in _FACTORIES:
        raise AIConfigError(f"Unknown embedding provider '{key}'.")
    if key not in _CACHE:
        _CACHE[key] = _FACTORIES[key]()
    return _CACHE[key]
