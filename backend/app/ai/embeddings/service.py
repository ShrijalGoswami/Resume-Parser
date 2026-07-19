"""
Embedding service — the single entry point for turning text into vectors.

Resolves the active provider, runs the embedding call, and records lightweight
observability (provider, model, dimensions, count, latency). This is the
retrieval-side analogue of the AIOrchestrator; it NEVER calls the LLM.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from app.ai.embeddings.registry import get_embedding_provider

logger = logging.getLogger("app.ai")


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    provider: str
    model: str
    dimensions: int
    latency_ms: int


def embed_texts(texts: list[str], *, provider: str | None = None) -> EmbeddingResult:
    """Embed a batch of texts through the configured provider (observed)."""
    prov = get_embedding_provider(provider)
    start = time.time()
    vectors = prov.embed(texts) if texts else []
    latency = round((time.time() - start) * 1000)
    logger.info(
        "Embedding | provider=%s model=%s dim=%s count=%d latency=%dms",
        prov.name, prov.model, prov.dimensions, len(texts), latency,
    )
    return EmbeddingResult(
        vectors=vectors, provider=prov.name, model=prov.model,
        dimensions=prov.dimensions, latency_ms=latency,
    )


def embed_query(text: str, *, provider: str | None = None) -> list[float]:
    """Embed a single query string."""
    result = embed_texts([text], provider=provider)
    return result.vectors[0] if result.vectors else []


def active_embedding_model() -> str:
    """Identifier for the active provider+model (stored to detect staleness)."""
    prov = get_embedding_provider()
    return f"{prov.name}:{prov.model}"
