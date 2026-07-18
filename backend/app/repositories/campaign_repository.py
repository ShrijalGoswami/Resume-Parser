"""Campaign persistence + dashboard aggregates."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import Campaign, CampaignCreate, CampaignUpdate


def _parse_ts(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime) or value is None:
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:  # pragma: no cover
        return None


class CampaignRepository(BaseRepository):
    table_name = "campaigns"

    # -- mapping -----------------------------------------------------------
    @staticmethod
    def _to_campaign(row: dict[str, Any]) -> Campaign:
        """Build a Campaign, lifting `company` out of the metadata jsonb."""
        c = Campaign(**row)
        if c.company is None and isinstance(c.metadata, dict):
            c.company = c.metadata.get("company")
        return c

    # -- CRUD --------------------------------------------------------------
    def create(self, payload: CampaignCreate) -> Campaign:
        metadata: dict[str, Any] = {}
        if payload.company:
            metadata["company"] = payload.company
        row: dict[str, Any] = {
            "recruiter_id": self.recruiter_id,
            "title": payload.title,
            "role_title": payload.role_title,
            "department": payload.department,
            "location": payload.location,
            "employment_type": payload.employment_type,
            "job_description": payload.job_description or "",
            "status": payload.status.value,
            "metadata": metadata,
        }
        if payload.ranking_weights is not None:
            row["ranking_weights"] = payload.ranking_weights.model_dump()
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create campaign")
        return self._to_campaign(self._one_or_404(resp, "Campaign"))

    def list(self, status_filter: Optional[str] = None) -> list[Campaign]:
        try:
            q = self._scoped().order("created_at", desc=True)
            if status_filter:
                q = q.eq("status", status_filter)
            resp = q.execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list campaigns")
        return [self._to_campaign(r) for r in self._rows(resp)]

    def get(self, campaign_id: str) -> Campaign:
        try:
            resp = self._scoped().eq("id", campaign_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get campaign")
        return self._to_campaign(self._one_or_404(resp, "Campaign"))

    def update(self, campaign_id: str, payload: CampaignUpdate) -> Campaign:
        data = payload.model_dump(exclude_unset=True)
        patch: dict[str, Any] = {}
        for field, value in data.items():
            if field == "ranking_weights" and value is not None:
                patch[field] = payload.ranking_weights.model_dump()  # type: ignore[union-attr]
            elif field == "status" and value is not None:
                patch[field] = payload.status.value  # type: ignore[union-attr]
            elif field == "company":
                continue  # merged into metadata below
            else:
                patch[field] = value
        if "company" in data:
            current = self.get(campaign_id)
            meta = dict(current.metadata or {})
            meta["company"] = data["company"]
            patch["metadata"] = meta
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
        return self._to_campaign(self._one_or_404(resp, "Campaign"))

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

    # -- dashboard aggregates ---------------------------------------------
    def stats_for_recruiter(self) -> dict[str, dict[str, Any]]:
        """
        Per-campaign dashboard aggregates for all of the recruiter's campaigns,
        computed in 3 bulk queries (no N+1):
          total_candidates, awaiting_analysis, average_match_score, last_activity_at.
        """
        stats: dict[str, dict[str, Any]] = {}

        def bucket(cid: str) -> dict[str, Any]:
            return stats.setdefault(
                cid,
                {"total_candidates": 0, "analyzed": 0, "score_sum": 0.0, "last_activity_at": None},
            )

        # 1) all candidates → totals per campaign
        try:
            cands = (
                self._client.table("candidates")
                .select("id,campaign_id")
                .eq("recruiter_id", self.recruiter_id)
                .execute()
            )
            for r in self._rows(cands):
                bucket(r["campaign_id"])["total_candidates"] += 1
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "aggregate candidates")

        # 2) latest analysis per candidate (view) → analyzed count + score sum
        try:
            analyses = (
                self._client.table("candidate_latest_analysis")
                .select("campaign_id,overall_score")
                .eq("recruiter_id", self.recruiter_id)
                .execute()
            )
            for r in self._rows(analyses):
                b = bucket(r["campaign_id"])
                b["analyzed"] += 1
                b["score_sum"] += float(r.get("overall_score") or 0)
        except Exception:  # view may be unavailable; degrade to no scores
            pass

        # 3) most recent activity per campaign
        try:
            acts = (
                self._client.table("activity_events")
                .select("campaign_id,created_at")
                .eq("recruiter_id", self.recruiter_id)
                .order("created_at", desc=True)
                .limit(1000)
                .execute()
            )
            for r in self._rows(acts):
                cid = r.get("campaign_id")
                if not cid:
                    continue
                b = bucket(cid)
                if b["last_activity_at"] is None:  # rows are desc → first seen is latest
                    b["last_activity_at"] = _parse_ts(r.get("created_at"))
        except Exception:  # pragma: no cover
            pass

        # finalize derived fields
        for b in stats.values():
            total, analyzed = b["total_candidates"], b["analyzed"]
            b["awaiting_analysis"] = max(0, total - analyzed)
            b["average_match_score"] = round(b["score_sum"] / analyzed, 1) if analyzed else None
            b.pop("analyzed", None)
            b.pop("score_sum", None)
        return stats
