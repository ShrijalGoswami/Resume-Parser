"""
Persistence service — bridges the (unchanged) AI pipeline to Supabase.

The batch pipeline still runs exactly as before and returns a
`BatchAnalysisResponse`. This service takes that *already-computed* output and
writes it into a campaign: one `candidates` row + one `candidate_analyses` row
(verbatim AI JSON) per successful candidate, plus an activity event.

It never recomputes or mutates AI results — it only stores them.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from app.repositories import (
    ActivityRepository,
    CampaignRepository,
    CandidateRepository,
)
from app.schemas.batch import BatchAnalysisResponse
from app.schemas.campaign import Candidate

logger = logging.getLogger(__name__)


class PersistenceService:
    def __init__(
        self,
        campaign_repo: CampaignRepository,
        candidate_repo: CandidateRepository,
        activity_repo: ActivityRepository,
    ):
        self._campaigns = campaign_repo
        self._candidates = candidate_repo
        self._activity = activity_repo

    def persist_batch(
        self, campaign_id: str, batch: BatchAnalysisResponse
    ) -> list[Candidate]:
        """
        Store a completed batch analysis under a campaign.

        Returns the created durable Candidate rows. Failed pipeline candidates
        (status != 'success') are skipped — only analyzable resumes are stored.
        """
        # Verify the campaign belongs to this recruiter (raises 404 otherwise).
        campaign = self._campaigns.get(campaign_id)
        batch_id = str(uuid.uuid4())
        stored: list[Candidate] = []

        for c in batch.candidates:
            payload: dict[str, Any] = c.model_dump()
            if payload.get("status") != "success":
                continue
            candidate = self._candidates.create(
                campaign_id=campaign_id,
                full_name=payload.get("name") or "",
                email=payload.get("email") or None,
                phone=payload.get("phone") or None,
                resume_filename=payload.get("filename"),
                source_batch_id=batch_id,
                metadata={"pipeline_candidate_id": payload.get("candidate_id")},
            )
            self._candidates.add_analysis(
                candidate.id,
                campaign_id,
                payload,
                analysis_version=batch.analysis_version,
            )
            stored.append(candidate)

        # Optionally sync the campaign's JD if it was empty.
        if not campaign.job_description and batch.job_description:
            from app.schemas.campaign import CampaignUpdate

            self._campaigns.update(
                campaign_id, CampaignUpdate(job_description=batch.job_description)
            )

        self._activity.record(
            "batch_analyzed",
            summary=f"Analyzed and stored {len(stored)} candidates",
            campaign_id=campaign_id,
            payload={
                "batch_id": batch_id,
                "total": batch.analytics.total,
                "succeeded": batch.analytics.succeeded,
                "failed": batch.analytics.failed,
                "stored": len(stored),
            },
        )
        logger.info(
            "Persisted batch %s to campaign %s: %d candidates stored",
            batch_id, campaign_id, len(stored),
        )
        return stored
