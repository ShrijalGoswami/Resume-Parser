"""Activity timeline persistence (append-only)."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import ActivityEvent


class ActivityRepository(BaseRepository):
    table_name = "activity_events"

    def record(
        self,
        type: str,
        *,
        summary: str = "",
        campaign_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
    ) -> Optional[ActivityEvent]:
        """Best-effort activity log — never raises into the caller's happy path."""
        row = {
            "recruiter_id": self.recruiter_id,
            "type": type,
            "summary": summary,
            "campaign_id": campaign_id,
            "candidate_id": candidate_id,
            "payload": payload or {},
        }
        try:
            resp = self._table.insert(row).execute()
            rows = self._rows(resp)
            return ActivityEvent(**rows[0]) if rows else None
        except Exception:  # pragma: no cover - telemetry must not break requests
            return None

    def recent(
        self,
        limit: int = 50,
        campaign_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
    ) -> list[ActivityEvent]:
        try:
            q = self._scoped().order("created_at", desc=True).limit(limit)
            if campaign_id:
                q = q.eq("campaign_id", campaign_id)
            if candidate_id:
                q = q.eq("candidate_id", candidate_id)
            resp = q.execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list activity")
        return [ActivityEvent(**r) for r in self._rows(resp)]
