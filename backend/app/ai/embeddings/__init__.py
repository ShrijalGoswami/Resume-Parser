"""
Embedding layer (V5 / Sprint 6) — provider-agnostic vectorisation for semantic
retrieval. Separate from the LLM layer: retrieval never uses the LLM.

    from app.ai.embeddings import embed_query, embed_texts
    vector = embed_query("backend engineers with FastAPI")
"""

from app.ai.embeddings.base import EmbeddingProvider
from app.ai.embeddings.registry import (
    available_embedding_providers,
    get_embedding_provider,
    register_embedding_provider,
)
from app.ai.embeddings.service import (
    EmbeddingResult,
    active_embedding_model,
    embed_query,
    embed_texts,
)

__all__ = [
    "EmbeddingProvider",
    "get_embedding_provider",
    "register_embedding_provider",
    "available_embedding_providers",
    "embed_texts",
    "embed_query",
    "active_embedding_model",
    "EmbeddingResult",
]
