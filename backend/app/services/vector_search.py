"""
Vector store abstraction + cosine ranking.

Decouples the app from any specific vector backend. The default
`SupabaseVectorStore` ranks recruiter-scoped embeddings (stored as jsonb) with
cosine similarity in the service layer — no `vector` extension required, works on
any PostgreSQL/Supabase, and every query is recruiter-scoped so there is no
cross-tenant vector leakage.

Swapping to pgvector / Qdrant / Pinecone / Weaviate = implement `VectorStore`
against that backend; callers (`talent_search`) are unchanged.
"""

from __future__ import annotations

import math
from typing import Any, Optional, Protocol, Sequence


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity. Vectors are unit-normalised at write time, so this is a
    dot product, but we normalise defensively for provider-agnosticism."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = na = nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    denom = math.sqrt(na) * math.sqrt(nb)
    return dot / denom if denom else 0.0


class VectorMatch:
    __slots__ = ("candidate_id", "campaign_id", "score")

    def __init__(self, candidate_id: str, campaign_id: Optional[str], score: float):
        self.candidate_id = candidate_id
        self.campaign_id = campaign_id
        self.score = score


class VectorStore(Protocol):
    def search(
        self,
        query_embedding: Sequence[float],
        *,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        exclude_ids: Sequence[str] = (),
    ) -> list[VectorMatch]: ...


class SupabaseVectorStore:
    """Recruiter-scoped cosine ranking over jsonb embeddings."""

    def __init__(self, embedding_repo: Any):
        self._repo = embedding_repo

    def search(
        self,
        query_embedding: Sequence[float],
        *,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        exclude_ids: Sequence[str] = (),
    ) -> list[VectorMatch]:
        if not query_embedding:
            return []
        excluded = set(exclude_ids)
        rows = self._repo.list_for_recruiter(campaign_id)  # recruiter-scoped + RLS
        scored: list[VectorMatch] = []
        for row in rows:
            cid = row.get("candidate_id")
            if not cid or cid in excluded:
                continue
            emb = row.get("embedding")
            if not isinstance(emb, list):
                continue
            score = cosine_similarity(query_embedding, emb)
            scored.append(VectorMatch(cid, row.get("campaign_id"), score))
        scored.sort(key=lambda m: m.score, reverse=True)
        return scored[: max(0, limit)]
