"""Agent recommendation persistence (recruiter-scoped + RLS)."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.agent import Recommendation


class AgentRepository(BaseRepository):
    table_name = "agent_recommendations"

    _COLUMNS = (
        "workflow", "dedupe_key", "category", "severity", "confidence", "title",
        "why", "recommended_action", "evidence", "data_sources", "tools_used",
        "suggested_tool", "tool_params", "campaign_id", "campaign_title",
        "candidate_id", "candidate_name", "status",
    )

    def open_dedupe_keys(self) -> set[str]:
        """Dedupe keys of still-open (pending/approved) recommendations."""
        try:
            resp = (
                self._table.select("dedupe_key,status")
                .eq("recruiter_id", self.recruiter_id)
                .in_("status", ["pending", "approved"])
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list dedupe keys")
        return {r["dedupe_key"] for r in self._rows(resp) if r.get("dedupe_key")}

    def create_many(self, recs: list[Recommendation]) -> list[Recommendation]:
        if not recs:
            return []
        rows = []
        for r in recs:
            row = {c: getattr(r, c) for c in self._COLUMNS}
            row["recruiter_id"] = self.recruiter_id
            rows.append(row)
        try:
            resp = self._table.insert(rows).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create recommendations")
        return [Recommendation(**self._normalize(r)) for r in self._rows(resp)]

    def list(self, *, status: Optional[str] = None, limit: int = 200) -> list[Recommendation]:
        try:
            q = self._scoped().order("created_at", desc=True).limit(limit)
            if status:
                q = q.eq("status", status)
            resp = q.execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list recommendations")
        return [Recommendation(**self._normalize(r)) for r in self._rows(resp)]

    def get(self, rec_id: str) -> Recommendation:
        try:
            resp = self._scoped().eq("id", rec_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get recommendation")
        return Recommendation(**self._normalize(self._one_or_404(resp, "Recommendation")))

    def update_status(self, rec_id: str, status: str) -> Recommendation:
        try:
            resp = (
                self._table.update({"status": status})
                .eq("recruiter_id", self.recruiter_id)
                .eq("id", rec_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "update recommendation")
        return Recommendation(**self._normalize(self._one_or_404(resp, "Recommendation")))

    @staticmethod
    def _normalize(row: dict[str, Any]) -> dict[str, Any]:
        # Stringify timestamps for the API model.
        for key in ("created_at", "updated_at"):
            if row.get(key) is not None and not isinstance(row[key], str):
                row[key] = str(row[key])
        return row
