"""Candidate + candidate_analysis persistence."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import Candidate


class CandidateRepository(BaseRepository):
    table_name = "candidates"

    # -- candidates ---------------------------------------------------------
    def create(
        self,
        campaign_id: str,
        *,
        full_name: str = "",
        email: Optional[str] = None,
        phone: Optional[str] = None,
        resume_path: Optional[str] = None,
        resume_filename: Optional[str] = None,
        source_batch_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> Candidate:
        row = {
            "campaign_id": campaign_id,
            "recruiter_id": self.recruiter_id,
            "full_name": full_name or "",
            "email": email,
            "phone": phone,
            "resume_path": resume_path,
            "resume_filename": resume_filename,
            "source_batch_id": source_batch_id,
            "metadata": metadata or {},
        }
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create candidate")
        return Candidate(**self._one_or_404(resp, "Candidate"))

    def list_for_campaign(self, campaign_id: str) -> list[Candidate]:
        try:
            resp = (
                self._scoped()
                .eq("campaign_id", campaign_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list candidates")
        return [Candidate(**r) for r in self._rows(resp)]

    def list_for_campaign_with_analysis(self, campaign_id: str) -> list[Candidate]:
        """
        Candidates for a campaign, each with its latest analysis hydrated —
        in exactly TWO queries (candidates + latest-analysis view), never N+1.
        """
        candidates = self.list_for_campaign(campaign_id)
        analyses = self.latest_analyses_for_campaign(campaign_id)
        for c in candidates:
            c.latest_analysis = analyses.get(c.id)
        return candidates

    def latest_analyses_for_campaign(self, campaign_id: str) -> dict[str, dict[str, Any]]:
        """Map candidate_id -> latest analysis row for a whole campaign (1 query)."""
        try:
            resp = (
                self._client.table("candidate_latest_analysis")
                .select("*")
                .eq("recruiter_id", self.recruiter_id)
                .eq("campaign_id", campaign_id)
                .execute()
            )
        except Exception:
            # View unavailable → fall back to none rather than failing the list.
            return {}
        return {r["candidate_id"]: r for r in self._rows(resp) if r.get("candidate_id")}

    def bulk_delete(self, campaign_id: str, candidate_ids: list[str]) -> int:
        """Delete multiple candidates (recruiter- + campaign-scoped). Returns count."""
        if not candidate_ids:
            return 0
        try:
            resp = (
                self._table.delete()
                .eq("recruiter_id", self.recruiter_id)
                .eq("campaign_id", campaign_id)
                .in_("id", candidate_ids)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "bulk delete candidates")
        return len(self._rows(resp))

    def get(self, candidate_id: str) -> Candidate:
        try:
            resp = self._scoped().eq("id", candidate_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get candidate")
        return Candidate(**self._one_or_404(resp, "Candidate"))

    def attach_resume(self, candidate_id: str, resume_path: str, resume_filename: str) -> Candidate:
        try:
            resp = (
                self._table.update({"resume_path": resume_path, "resume_filename": resume_filename})
                .eq("id", candidate_id)
                .eq("recruiter_id", self.recruiter_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "attach resume")
        return Candidate(**self._one_or_404(resp, "Candidate"))

    def set_stage(self, candidate_id: str, stage: str) -> Candidate:
        try:
            resp = (
                self._table.update({"stage": stage})
                .eq("id", candidate_id)
                .eq("recruiter_id", self.recruiter_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "update candidate stage")
        return Candidate(**self._one_or_404(resp, "Candidate"))

    # -- analyses -----------------------------------------------------------
    def add_analysis(
        self,
        candidate_id: str,
        campaign_id: str,
        result: dict[str, Any],
        *,
        analysis_version: str = "v1.0",
    ) -> dict[str, Any]:
        """Store a verbatim CandidateResult, projecting key scalars for querying."""
        row = {
            "candidate_id": candidate_id,
            "campaign_id": campaign_id,
            "recruiter_id": self.recruiter_id,
            "analysis_version": analysis_version,
            "rank": result.get("rank"),
            "overall_score": result.get("overall_score"),
            "ats_score": result.get("ats_score"),
            "semantic_similarity": result.get("semantic_similarity"),
            "years_experience": result.get("years_experience"),
            "match_category": result.get("match_category"),
            "recommendation": result.get("recommendation"),
            "result": result,
        }
        try:
            resp = self._client.table("candidate_analyses").insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "add candidate analysis")
        return self._one_or_404(resp, "Analysis")

    def latest_analysis(self, candidate_id: str) -> Optional[dict[str, Any]]:
        try:
            resp = (
                self._client.table("candidate_analyses")
                .select("*")
                .eq("recruiter_id", self.recruiter_id)
                .eq("candidate_id", candidate_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get latest analysis")
        rows = self._rows(resp)
        return rows[0] if rows else None
