"""Candidate embedding persistence (recruiter-scoped + RLS)."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository


class EmbeddingRepository(BaseRepository):
    table_name = "candidate_embeddings"

    def upsert(
        self,
        candidate_id: str,
        campaign_id: str,
        *,
        embedding: list[float],
        content_hash: str,
        model: str,
        dimensions: int,
    ) -> dict[str, Any]:
        row = {
            "candidate_id": candidate_id,
            "campaign_id": campaign_id,
            "recruiter_id": self.recruiter_id,
            "content_hash": content_hash,
            "model": model,
            "dimensions": dimensions,
            "embedding": embedding,
        }
        try:
            resp = self._table.upsert(row, on_conflict="candidate_id").execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "upsert embedding")
        return self._one_or_404(resp, "Embedding")

    def get(self, candidate_id: str) -> Optional[dict[str, Any]]:
        try:
            resp = self._scoped().eq("candidate_id", candidate_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get embedding")
        rows = self._rows(resp)
        return rows[0] if rows else None

    def get_meta(self, candidate_id: str) -> Optional[dict[str, Any]]:
        """Just the hash + model (to decide whether a re-embed is needed)."""
        try:
            resp = (
                self._table.select("candidate_id,content_hash,model")
                .eq("recruiter_id", self.recruiter_id)
                .eq("candidate_id", candidate_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get embedding meta")
        rows = self._rows(resp)
        return rows[0] if rows else None

    def list_for_recruiter(self, campaign_id: Optional[str] = None) -> list[dict[str, Any]]:
        """All embeddings for this recruiter (optionally one campaign)."""
        try:
            q = self._table.select("candidate_id,campaign_id,embedding,model").eq(
                "recruiter_id", self.recruiter_id
            )
            if campaign_id:
                q = q.eq("campaign_id", campaign_id)
            resp = q.execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list embeddings")
        return self._rows(resp)

    def delete(self, candidate_id: str) -> None:
        try:
            (
                self._table.delete()
                .eq("recruiter_id", self.recruiter_id)
                .eq("candidate_id", candidate_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "delete embedding")
