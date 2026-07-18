"""
Analytics routes — Executive Intelligence Dashboard aggregates.

One endpoint, backed by AnalyticsRepository, which aggregates across all of the
authenticated recruiter's campaigns in a fixed number of bulk queries (no N+1).
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.deps import AnalyticsRepoDep

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(
    repo: AnalyticsRepoDep,
    threshold: int = Query(default=80, ge=0, le=100, description="High-quality match-score threshold"),
):
    """Executive overview, AI insights, chart series, action center, recent activity."""
    return repo.overview(threshold=threshold)
