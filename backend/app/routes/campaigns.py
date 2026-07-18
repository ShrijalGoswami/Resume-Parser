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
    NoteRepoDep,
    StorageDep,
)
from app.services.storage_service import object_key
from app.services.upload_utils import validate_resume_upload
from app.schemas.batch import BatchAnalysisResponse
from app.schemas.campaign import (
    Campaign,
    CampaignCreate,
    CampaignUpdate,
    Candidate,
    CandidateStageUpdate,
    NoteCreate,
    RecruiterNote,
)
from app.services.persistence_service import PersistenceService

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
    # Hydrate candidate counts (cheap; parallelizable later).
    for c in campaigns:
        c.candidate_count = repo.count_candidates(c.id)
    return campaigns


@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, repo: CampaignRepoDep):
    campaign = repo.get(campaign_id)
    campaign.candidate_count = repo.count_candidates(campaign_id)
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
    candidates = repo.list_for_campaign(campaign_id)
    for cand in candidates:
        cand.latest_analysis = repo.latest_analysis(cand.id)
    return candidates


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
    ext = validate_resume_upload(file)
    data = await file.read()
    if len(data) > settings.max_file_size_bytes:
        raise HTTPException(status_code=413, detail="File too large.")
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
