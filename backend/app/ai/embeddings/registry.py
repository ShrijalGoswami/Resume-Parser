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
from app.ai.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.ai.utils.errors import AIConfigError
from app.core.config import settings


def _make_hashing() -> EmbeddingProvider:
    cfg = get_ai_config()
    return HashingEmbeddingProvider(dimensions=cfg.embedding_dimensions, model=cfg.embedding_model)


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


_FACTORIES: dict[str, Callable[[], EmbeddingProvider]] = {
    "hashing": _make_hashing,
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
