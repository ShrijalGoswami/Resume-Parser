"""Schemas for Semantic Talent Search (V5 / Sprint 6)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    min_score: Optional[float] = None       # min overall score
    min_experience: Optional[float] = None  # min years
    location: Optional[str] = None


class TalentSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    campaign_id: Optional[str] = None       # scope to one campaign (else all recruiter candidates)
    limit: int = Field(default=10, ge=1, le=50)
    filters: Optional[SearchFilters] = None


class SimilarSearchRequest(BaseModel):
    candidate_id: str
    campaign_id: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=50)


class SearchResultItem(BaseModel):
    candidate_id: str
    name: str = ""
    campaign_id: Optional[str] = None
    campaign_title: Optional[str] = None
    similarity: float = 0.0                 # 0–1 cosine similarity
    overall_score: Optional[float] = None
    ats_score: Optional[float] = None
    years_experience: Optional[float] = None
    stage: Optional[str] = None
    matched_concepts: list[str] = Field(default_factory=list)


class TalentSearchResponse(BaseModel):
    query: str
    provider: str = ""
    count: int = 0
    indexed: int = 0                        # candidates (re)embedded to serve this search
    results: list[SearchResultItem] = Field(default_factory=list)
