"""Campaign persistence."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import Campaign, CampaignCreate, CampaignUpdate


class CampaignRepository(BaseRepository):
    table_name = "campaigns"

    def create(self, payload: CampaignCreate) -> Campaign:
        row: dict[str, Any] = {
            "recruiter_id": self.recruiter_id,
            "title": payload.title,
            "role_title": payload.role_title,
            "department": payload.department,
            "location": payload.location,
            "employment_type": payload.employment_type,
            "job_description": payload.job_description or "",
            "status": payload.status.value,
        }
        if payload.ranking_weights is not None:
            row["ranking_weights"] = payload.ranking_weights.model_dump()
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create campaign")
        return Campaign(**self._one_or_404(resp, "Campaign"))

    def list(self, status_filter: Optional[str] = None) -> list[Campaign]:
        try:
            q = self._scoped().order("created_at", desc=True)
            if status_filter:
                q = q.eq("status", status_filter)
            resp = q.execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list campaigns")
        return [Campaign(**r) for r in self._rows(resp)]

    def get(self, campaign_id: str) -> Campaign:
        try:
            resp = self._scoped().eq("id", campaign_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get campaign")
        return Campaign(**self._one_or_404(resp, "Campaign"))

    def update(self, campaign_id: str, payload: CampaignUpdate) -> Campaign:
        patch: dict[str, Any] = {}
        for field, value in payload.model_dump(exclude_unset=True).items():
            if field == "ranking_weights" and value is not None:
                patch[field] = payload.ranking_weights.model_dump()  # type: ignore[union-attr]
            elif field == "status" and value is not None:
                patch[field] = payload.status.value  # type: ignore[union-attr]
            else:
                patch[field] = value
        if not patch:
            return self.get(campaign_id)
        try:
            resp = (
                self._table.update(patch)
                .eq("id", campaign_id)
                .eq("recruiter_id", self.recruiter_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "update campaign")
        return Campaign(**self._one_or_404(resp, "Campaign"))

    def delete(self, campaign_id: str) -> None:
        try:
            self._table.delete().eq("id", campaign_id).eq("recruiter_id", self.recruiter_id).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "delete campaign")

    def count_candidates(self, campaign_id: str) -> int:
        try:
            resp = (
                self._client.table("candidates")
                .select("id", count="exact")
                .eq("recruiter_id", self.recruiter_id)
                .eq("campaign_id", campaign_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "count candidates")
        return getattr(resp, "count", 0) or 0
