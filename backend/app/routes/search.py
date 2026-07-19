"""
Semantic Talent Search routes (V5 / Sprint 6).

    POST /api/v1/search/talent   — natural-language semantic candidate search
    POST /api/v1/search/similar  — vector 'find similar candidates'

Retrieval is embedding-based (NO LLM). All queries are recruiter-scoped
(repositories + RLS); a recruiter can only search their own candidates.
"""

import logging

from fastapi import APIRouter, status
from fastapi.concurrency import run_in_threadpool

from app.core.deps import CandidateRepoDep, EmbeddingRepoDep
from app.schemas.search import SimilarSearchRequest, TalentSearchRequest, TalentSearchResponse
from app.services.talent_search import search_similar, search_talent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/talent", response_model=TalentSearchResponse, status_code=status.HTTP_200_OK)
async def talent_search(
    payload: TalentSearchRequest,
    candidate_repo: CandidateRepoDep,
    embedding_repo: EmbeddingRepoDep,
):
    return await run_in_threadpool(
        search_talent,
        payload.query,
        campaign_id=payload.campaign_id,
        limit=payload.limit,
        filters=payload.filters,
        candidate_repo=candidate_repo,
        embedding_repo=embedding_repo,
    )


@router.post("/similar", response_model=TalentSearchResponse)
async def similar_search(
    payload: SimilarSearchRequest,
    candidate_repo: CandidateRepoDep,
    embedding_repo: EmbeddingRepoDep,
):
    return await run_in_threadpool(
        search_similar,
        payload.candidate_id,
        campaign_id=payload.campaign_id,
        limit=payload.limit,
        candidate_repo=candidate_repo,
        embedding_repo=embedding_repo,
    )
