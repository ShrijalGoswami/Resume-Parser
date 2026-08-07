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


def embed_texts(
    texts: list[str],
    *,
    provider: str | None = None,
    input_type: str | None = None,
) -> EmbeddingResult:
    """Embed a batch of texts through the configured provider (observed).

    `input_type` is "passage" when indexing and "query" when searching. It is
    forwarded ONLY to providers that advertise `supports_input_type`, so the
    symmetric providers (hashing) keep their existing single-argument call and
    their behaviour is unchanged.
    """
    prov = get_embedding_provider(provider)
    start = time.time()
    if not texts:
        vectors = []
    elif input_type and getattr(prov, "supports_input_type", False):
        vectors = prov.embed(texts, input_type=input_type)
    else:
        vectors = prov.embed(texts)
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
    """Embed a single SEARCH QUERY.

    Tagged `query` so asymmetric retrieval models project it into the same space
    as the stored passages. Getting this wrong does not raise — it just makes
    every ranking quietly worse — which is why the distinction lives here rather
    than at each call site.
    """
    result = embed_texts([text], provider=provider, input_type="query")
    return result.vectors[0] if result.vectors else []


def active_embedding_model() -> str:
    """Identifier for the active provider+model (stored to detect staleness)."""
    prov = get_embedding_provider()
    return f"{prov.name}:{prov.model}"
