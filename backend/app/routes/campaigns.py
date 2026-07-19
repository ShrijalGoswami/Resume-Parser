"""
Campaign & persistence routes (V4).

All endpoints require a valid recruiter access token and operate strictly on the
authenticated recruiter's own data (enforced by RLS + repository scoping).

These are ADDITIVE — the existing stateless AI endpoints (/batch-analysis,
/copilot/chat, ...) are untouched. A recruiter uses the AI endpoints exactly as
before, then calls /campaigns/{id}/persist-batch to store the result.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import settings
from app.core.deps import (
    ActivityRepoDep,
    CampaignRepoDep,
    CandidateRepoDep,
    EmbeddingRepoDep,
    NoteRepoDep,
    StorageDep,
)
from app.enterprise.deps import OrgIdDep
from app.services.storage_service import object_key
from app.services.upload_utils import validate_resume_upload, _verify_magic_bytes
from app.schemas.batch import BatchAnalysisResponse
from app.schemas.campaign import (
    BulkCandidateIds,
    Campaign,
    CampaignCreate,
    CampaignUpdate,
    Candidate,
    CandidateStageUpdate,
    NoteCreate,
    RecruiterNote,
)
from app.schemas.comparison import CandidateComparisonReport, ComparisonRequest
from app.schemas.interview import InterviewGenerateRequest, InterviewPack
from app.services.comparison_service import run_comparison
from app.services.embedding_pipeline import reindex_campaign
from app.services.interview_service import run_interview
from app.services.persistence_service import PersistenceService
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# ── Campaign CRUD ────────────────────────────────────────────────────────────
@router.post("", response_model=Campaign, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate, repo: CampaignRepoDep, activity: ActivityRepoDep
):
    campaign = repo.create(payload)
    activity.record(
        "campaign_created", summary=f"Created campaign '{campaign.title}'",
        campaign_id=campaign.id,
    )
    return campaign


@router.get("", response_model=list[Campaign])
async def list_campaigns(
    repo: CampaignRepoDep,
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    campaigns = repo.list(status_filter=status_filter)
    # Hydrate dashboard aggregates in 3 bulk queries (no N+1).
    stats = repo.stats_for_recruiter()
    for c in campaigns:
        s = stats.get(c.id, {})
        c.total_candidates = s.get("total_candidates", 0)
        c.candidate_count = c.total_candidates
        c.awaiting_analysis = s.get("awaiting_analysis", 0)
        c.average_match_score = s.get("average_match_score")
        c.last_activity_at = s.get("last_activity_at") or c.updated_at
    return campaigns


@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, repo: CampaignRepoDep):
    campaign = repo.get(campaign_id)
    stats = repo.stats_for_recruiter().get(campaign_id, {})
    campaign.total_candidates = stats.get("total_candidates", repo.count_candidates(campaign_id))
    campaign.candidate_count = campaign.total_candidates
    campaign.awaiting_analysis = stats.get("awaiting_analysis", 0)
    campaign.average_match_score = stats.get("average_match_score")
    campaign.last_activity_at = stats.get("last_activity_at") or campaign.updated_at
    return campaign


@router.patch("/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str, payload: CampaignUpdate, repo: CampaignRepoDep, activity: ActivityRepoDep
):
    campaign = repo.update(campaign_id, payload)
    activity.record(
        "campaign_updated", summary=f"Updated campaign '{campaign.title}'",
        campaign_id=campaign_id,
    )
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(campaign_id: str, repo: CampaignRepoDep):
    repo.delete(campaign_id)


# ── Candidates within a campaign ─────────────────────────────────────────────
@router.get("/{campaign_id}/candidates", response_model=list[Candidate])
async def list_candidates(campaign_id: str, repo: CandidateRepoDep):
    # Two queries total (candidates + latest-analysis view) — no N+1.
    return repo.list_for_campaign_with_analysis(campaign_id)


@router.post("/{campaign_id}/candidates/bulk-delete")
async def bulk_delete_candidates(
    campaign_id: str,
    payload: BulkCandidateIds,
    candidates: CandidateRepoDep,
    activity: ActivityRepoDep,
):
    """Delete multiple candidates at once (bulk action)."""
    deleted = candidates.bulk_delete(campaign_id, payload.candidate_ids)
    activity.record(
        "campaign_updated",
        summary=f"Removed {deleted} candidate(s)",
        campaign_id=campaign_id,
        payload={"action": "bulk_delete", "count": deleted},
    )
    return {"deleted": deleted}


@router.get("/{campaign_id}/candidates/{candidate_id}", response_model=Candidate)
async def get_candidate(campaign_id: str, candidate_id: str, repo: CandidateRepoDep):
    candidate = repo.get(candidate_id)
    candidate.latest_analysis = repo.latest_analysis(candidate_id)
    return candidate


@router.patch("/{campaign_id}/candidates/{candidate_id}/stage", response_model=Candidate)
async def update_candidate_stage(
    campaign_id: str,
    candidate_id: str,
    payload: CandidateStageUpdate,
    repo: CandidateRepoDep,
    activity: ActivityRepoDep,
):
    candidate = repo.set_stage(candidate_id, payload.stage.value)
    activity.record(
        "candidate_stage_changed",
        summary=f"Moved {candidate.full_name or 'candidate'} to {payload.stage.value}",
        campaign_id=campaign_id, candidate_id=candidate_id,
        payload={"stage": payload.stage.value},
    )
    return candidate


# ── Notes ────────────────────────────────────────────────────────────────────
@router.post(
    "/{campaign_id}/candidates/{candidate_id}/notes",
    response_model=RecruiterNote, status_code=status.HTTP_201_CREATED,
)
async def create_note(
    campaign_id: str, candidate_id: str, payload: NoteCreate,
    repo: NoteRepoDep, activity: ActivityRepoDep,
):
    note = repo.create(campaign_id, candidate_id, payload)
    activity.record(
        "note_added", summary="Added a note",
        campaign_id=campaign_id, candidate_id=candidate_id,
    )
    return note


@router.get(
    "/{campaign_id}/candidates/{candidate_id}/notes",
    response_model=list[RecruiterNote],
)
async def list_notes(campaign_id: str, candidate_id: str, repo: NoteRepoDep):
    return repo.list_for_candidate(candidate_id)


@router.delete(
    "/{campaign_id}/candidates/{candidate_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_note(campaign_id: str, candidate_id: str, note_id: str, repo: NoteRepoDep):
    repo.delete(note_id)


@router.get("/{campaign_id}/candidates/{candidate_id}/activity")
async def candidate_activity(
    campaign_id: str,
    candidate_id: str,
    activity: ActivityRepoDep,
    limit: int = Query(default=50, le=200),
):
    """Chronological activity for a single candidate (most recent first)."""
    return activity.recent(limit=limit, campaign_id=campaign_id, candidate_id=candidate_id)


# ── Persistence: store a completed batch analysis ────────────────────────────
@router.post(
    "/{campaign_id}/persist-batch",
    response_model=list[Candidate], status_code=status.HTTP_201_CREATED,
)
async def persist_batch(
    campaign_id: str,
    batch: BatchAnalysisResponse,
    campaigns: CampaignRepoDep,
    candidates: CandidateRepoDep,
    activity: ActivityRepoDep,
):
    """
    Persist an already-computed batch analysis under a campaign.

    The frontend runs POST /batch-analysis (unchanged AI pipeline) and posts the
    response here to save it. AI logic is never re-run.
    """
    service = PersistenceService(campaigns, candidates, activity)
    return service.persist_batch(campaign_id, batch)


# ── Resume storage (private bucket + signed URLs) ────────────────────────────
_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/{campaign_id}/candidates/{candidate_id}/resume", response_model=Candidate)
async def upload_candidate_resume(
    campaign_id: str,
    candidate_id: str,
    candidates: CandidateRepoDep,
    storage: StorageDep,
    activity: ActivityRepoDep,
    file: UploadFile = File(...),
):
    """Store a candidate's resume in the private `resumes` bucket (server-side)."""
    # Verify ownership BEFORE writing anything to storage (no orphaned objects).
    candidates.get(candidate_id)
    ext = validate_resume_upload(file)
    data = await file.read()
    if len(data) > settings.max_file_size_bytes:
        raise HTTPException(status_code=413, detail="File too large.")
    # Content-based validation: a renamed file (e.g. .exe → .pdf) is rejected by
    # magic-byte sniffing, not just the (spoofable) extension/MIME.
    if not _verify_magic_bytes(data[:8], ext):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="File contents do not match a valid PDF/DOCX.")
    key = object_key(storage.recruiter_id, campaign_id, candidate_id, file.filename or f"resume{ext}")
    storage.upload(settings.STORAGE_BUCKET_RESUMES, key, data, _CONTENT_TYPES.get(ext, "application/octet-stream"))
    candidate = candidates.attach_resume(candidate_id, key, file.filename or f"resume{ext}")
    activity.record(
        "resume_uploaded", summary=f"Uploaded resume for {candidate.full_name or 'candidate'}",
        campaign_id=campaign_id, candidate_id=candidate_id,
    )
    return candidate


@router.get("/{campaign_id}/candidates/{candidate_id}/resume-url")
async def get_resume_signed_url(
    campaign_id: str, candidate_id: str, candidates: CandidateRepoDep, storage: StorageDep
):
    """Return a short-lived signed download URL for the candidate's resume."""
    candidate = candidates.get(candidate_id)
    if not candidate.resume_path:
        raise HTTPException(status_code=404, detail="No resume stored for this candidate.")
    url = storage.signed_url(settings.STORAGE_BUCKET_RESUMES, candidate.resume_path)
    return {"url": url, "expires_in": settings.SIGNED_URL_TTL_SECONDS}


# ── Activity timeline ────────────────────────────────────────────────────────
@router.get("/{campaign_id}/activity")
async def campaign_activity(
    campaign_id: str, activity: ActivityRepoDep, limit: int = Query(default=50, le=200)
):
    return activity.recent(limit=limit, campaign_id=campaign_id)


# ── AI Candidate Comparison (V5 / Sprint 5) ──────────────────────────────────
@router.post("/{campaign_id}/compare", response_model=CandidateComparisonReport)
async def compare_candidates(
    campaign_id: str,
    payload: ComparisonRequest,
    campaign_repo: CampaignRepoDep,
    candidate_repo: CandidateRepoDep,
    note_repo: NoteRepoDep,
    activity: ActivityRepoDep,
    org_id: OrgIdDep,
):
    """Generate an executive AI comparison of 2–5 candidates in this campaign.

    Candidates are validated to belong to the authenticated recruiter's campaign
    (RLS + explicit scoping) — cross-campaign comparison is impossible. The LLM
    round-trip runs off the event loop; the engine degrades gracefully.
    """
    report = await run_in_threadpool(
        run_comparison,
        campaign_id,
        payload.candidate_ids,
        campaign_repo=campaign_repo,
        candidate_repo=candidate_repo,
        note_repo=note_repo,
    )
    activity.record(
        "batch_analyzed",
        summary=f"AI comparison of {len(payload.candidate_ids)} candidates",
        campaign_id=campaign_id,
    )
    return report


# ── Semantic search: (re)build candidate embeddings for a campaign ───────────
@router.post("/{campaign_id}/embeddings/reindex")
async def reindex_campaign_embeddings(
    campaign_id: str,
    candidate_repo: CandidateRepoDep,
    embedding_repo: EmbeddingRepoDep,
    force: bool = Query(default=False),
):
    """Embed all analysed candidates in this campaign (skips unchanged unless
    force=true). Recruiter-scoped; safe to call after uploads/analysis."""
    return await run_in_threadpool(
        reindex_campaign,
        campaign_id,
        candidate_repo=candidate_repo,
        embedding_repo=embedding_repo,
        force=force,
    )


# ── Interview Intelligence: generate an interview workbench ───────────────────
@router.post(
    "/{campaign_id}/candidates/{candidate_id}/interview",
    response_model=InterviewPack,
)
async def generate_interview(
    campaign_id: str,
    candidate_id: str,
    payload: InterviewGenerateRequest,
    candidate_repo: CandidateRepoDep,
    campaign_repo: CampaignRepoDep,
    note_repo: NoteRepoDep,
    activity: ActivityRepoDep,
    org_id: OrgIdDep,
):
    """Generate a grounded interview pack (full or focused) for one candidate.

    Recruiter-scoped: the candidate must belong to the recruiter (RLS + explicit
    scoping). `focus`/`instruction`/`sections` drive interactive mode so follow-ups
    regenerate only what was asked. The LLM round-trip runs off the event loop.
    """
    pack = await run_in_threadpool(
        run_interview,
        candidate_id,
        campaign_id=campaign_id,
        focus=payload.focus,
        instruction=payload.instruction,
        sections=payload.sections,
        candidate_repo=candidate_repo,
        campaign_repo=campaign_repo,
        note_repo=note_repo,
    )
    activity.record(
        "interview_pack_generated",
        summary=f"Generated interview pack ({payload.focus})",
        campaign_id=campaign_id, candidate_id=candidate_id,
    )
    return pack
