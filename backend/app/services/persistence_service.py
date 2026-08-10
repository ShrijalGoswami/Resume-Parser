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
from app.ai.utils.errors import AIError
from app.enterprise.usage import record_resumes
from app.schemas.batch import BatchAnalysisResponse, CandidateResult
from app.schemas.campaign import Candidate

logger = logging.getLogger(__name__)


class PersistenceService:
    def __init__(
        self,
        campaign_repo: CampaignRepository,
        candidate_repo: CandidateRepository,
        activity_repo: ActivityRepository,
        organization_id: str | None = None,
        embedding_repo: Any = None,
    ):
        self._campaigns = campaign_repo
        self._candidates = candidate_repo
        self._activity = activity_repo
        self._organization_id = organization_id
        #: Optional. When present, newly stored analyses are indexed for semantic
        #: search here — see `_index_embeddings`. A caller without one (tests,
        #: stateless paths) behaves exactly as before.
        self._embeddings = embedding_repo

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
        #: (candidate_id, result) for rows whose analysis was written in this
        #: call — the only candidates whose embedding can be missing or stale.
        newly_analysed: list[tuple[str, CandidateResult]] = []

        # Idempotency by CONTENT HASH (production): never create a second
        # candidate for a resume whose SHA-256 already exists in this campaign.
        # The same file persisted twice — via double-submit, retry, React Strict
        # Mode, network replay, or a renamed copy — yields exactly one candidate.
        # A pre-check set handles the common case; the DB UNIQUE
        # (campaign_id, file_hash) is the race-safe backstop for concurrent calls.
        # Files that lack a hash (older clients) fall back to filename dedup.
        # Content-hash dedup is used when migration 0013 is live; otherwise we
        # fall back to filename dedup so the pipeline keeps working pre-migration.
        hashing_ok = self._candidates.uploads_table_available()
        seen_hashes: set[str] = set()
        seen_filenames: set[str] = set()
        try:
            if hashing_ok:
                seen_hashes = self._candidates.existing_upload_hashes(campaign_id)
            for existing in self._candidates.list_for_campaign(campaign_id):
                fn = getattr(existing, "resume_filename", None)
                if fn:
                    seen_filenames.add(fn.strip().lower())
        except Exception:  # pragma: no cover — best-effort; unique constraint still guards
            seen_hashes, seen_filenames = set(), set()

        for c in batch.candidates:
            payload: dict[str, Any] = c.model_dump()
            if payload.get("status") != "success":
                continue

            file_hash = payload.get("file_hash")
            filename = payload.get("filename")
            fkey = filename.strip().lower() if filename else None
            use_hash = hashing_ok and bool(file_hash)

            # Pre-check: skip content we've already stored (or seen earlier in
            # this same batch). Hash wins; filename is the no-hash fallback.
            if use_hash:
                if file_hash in seen_hashes:
                    continue
            elif fkey and fkey in seen_filenames:
                continue

            candidate = self._candidates.create(
                campaign_id=campaign_id,
                full_name=payload.get("name") or "",
                email=payload.get("email") or None,
                phone=payload.get("phone") or None,
                resume_filename=filename,
                source_batch_id=batch_id,
                metadata={"pipeline_candidate_id": payload.get("candidate_id")},
            )

            # Claim the content hash via the unique constraint. If another
            # concurrent request won the race, undo this candidate and skip so
            # no duplicate survives.
            if use_hash:
                claimed = self._candidates.record_upload(
                    campaign_id=campaign_id,
                    candidate_id=candidate.id,
                    file_hash=file_hash,
                    filename=filename,
                    file_size=payload.get("file_size"),
                    organization_id=self._organization_id,
                )
                if not claimed:
                    self._candidates.delete_one(candidate.id, campaign_id)
                    seen_hashes.add(file_hash)
                    continue
                seen_hashes.add(file_hash)
            if fkey:
                seen_filenames.add(fkey)

            self._candidates.add_analysis(
                candidate.id,
                campaign_id,
                payload,
                analysis_version=batch.analysis_version,
            )
            stored.append(candidate)
            newly_analysed.append((candidate.id, c))

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
        # Consume résumé credits for what was ACTUALLY stored. `stored` excludes
        # every candidate skipped by content-hash or filename dedup, so
        # re-uploading the same file — a double-submit, a retry, React Strict
        # Mode, a renamed copy — costs nothing. Charging for a duplicate the
        # product deliberately discards would be charging for nothing.
        #
        # Counted here rather than at /batch-analysis because this is where a
        # résumé becomes durable organization data; the pre-check there stops an
        # exhausted account before it spends tokens, but a batch that is analysed
        # and never persisted must not consume credits.
        if self._organization_id and stored:
            record_resumes(self._organization_id, len(stored))

        # Index for semantic search LAST: everything above is already durable, so
        # a vendor failure here cannot cost the caller their persisted batch.
        self._index_embeddings(campaign_id, newly_analysed)

        logger.info(
            "Persisted batch %s to campaign %s: %d candidates stored",
            batch_id, campaign_id, len(stored),
        )
        return stored

    def _index_embeddings(
        self, campaign_id: str, pending: list[tuple[str, CandidateResult]]
    ) -> None:
        """Embed the analyses this call just wrote, so semantic search sees them.

        WHY HERE. Embeddings were previously built only by an explicit reindex or
        by the first search of a campaign that had NO vectors at all. Once a
        campaign was indexed, every candidate persisted afterwards was invisible
        to `/search/talent` — and any candidate whose analysis was rewritten kept
        serving its old vector — with no error anywhere. Writing the analysis is
        the moment the profile text changes, so it is the moment to re-embed.

        NOT A SECOND INVALIDATION SYSTEM. This calls the existing
        `ensure_candidate_embedding`, so the existing content-hash + model gate
        still decides: an unchanged profile costs one metadata read and no vendor
        call, and only genuinely changed content is re-embedded. Candidates this
        call did not touch are never considered.

        BEST EFFORT. The batch is already durable by the time this runs. A 429
        must not turn a successful persist into a failed request, so provider
        failures are logged and the vectors are simply left for the next reindex
        — nothing is written when embedding fails.
        """
        if not self._embeddings or not pending:
            return

        from app.services.embedding_pipeline import ensure_candidate_embedding

        for idx, (candidate_id, result) in enumerate(pending):
            try:
                ensure_candidate_embedding(
                    candidate_id, campaign_id, result, embedding_repo=self._embeddings
                )
            except AIError as exc:
                # A provider-level failure applies to every remaining candidate
                # too. Stop rather than making N more calls that will all fail.
                logger.warning(
                    "Embedding indexing stopped for batch in campaign %s "
                    "(%d candidate(s) left for the next reindex): %s",
                    campaign_id, len(pending) - idx, exc,
                )
                return
            except Exception as exc:  # noqa: BLE001 - one bad row must not stop the rest
                logger.warning("Embedding skipped for candidate %s: %s", candidate_id, exc)
