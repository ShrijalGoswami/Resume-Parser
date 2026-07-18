"""
FastAPI dependencies that assemble recruiter-scoped repositories.

Each recruiter request gets a Supabase client authenticated *as that recruiter*,
so Row Level Security is the ultimate guard. Repositories add a second, explicit
recruiter_id filter (defence in depth). Building a client is cheap (no network),
so we construct one per request.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.core.auth import CurrentRecruiter, require_recruiter
from app.db.supabase_client import get_user_client
from app.repositories import (
    ActivityRepository,
    CampaignRepository,
    CandidateRepository,
    ConversationRepository,
    NoteRepository,
)
from app.services.storage_service import StorageService

RecruiterDep = Annotated[CurrentRecruiter, Depends(require_recruiter)]


def _client_for(recruiter: CurrentRecruiter):
    return get_user_client(recruiter.access_token)


def get_campaign_repo(recruiter: RecruiterDep) -> CampaignRepository:
    return CampaignRepository(_client_for(recruiter), recruiter.id)


def get_candidate_repo(recruiter: RecruiterDep) -> CandidateRepository:
    return CandidateRepository(_client_for(recruiter), recruiter.id)


def get_note_repo(recruiter: RecruiterDep) -> NoteRepository:
    return NoteRepository(_client_for(recruiter), recruiter.id)


def get_conversation_repo(recruiter: RecruiterDep) -> ConversationRepository:
    return ConversationRepository(_client_for(recruiter), recruiter.id)


def get_activity_repo(recruiter: RecruiterDep) -> ActivityRepository:
    return ActivityRepository(_client_for(recruiter), recruiter.id)


def get_storage_service(recruiter: RecruiterDep) -> StorageService:
    return StorageService(_client_for(recruiter), recruiter.id)


CampaignRepoDep = Annotated[CampaignRepository, Depends(get_campaign_repo)]
CandidateRepoDep = Annotated[CandidateRepository, Depends(get_candidate_repo)]
NoteRepoDep = Annotated[NoteRepository, Depends(get_note_repo)]
ConversationRepoDep = Annotated[ConversationRepository, Depends(get_conversation_repo)]
ActivityRepoDep = Annotated[ActivityRepository, Depends(get_activity_repo)]
StorageDep = Annotated[StorageService, Depends(get_storage_service)]
