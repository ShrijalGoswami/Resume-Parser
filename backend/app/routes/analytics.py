"""
Analytics routes — Executive Intelligence Dashboard aggregates.

One endpoint, backed by AnalyticsRepository, which aggregates across all of the
authenticated recruiter's campaigns in a fixed number of bulk queries (no N+1).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.deps import AnalyticsRepoDep
from app.enterprise.deps import RequireUsageView, require_entitlement

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    dependencies=[RequireUsageView, Depends(require_entitlement("advanced_analytics"))],
)
async def analytics_overview(
    repo: AnalyticsRepoDep,
    threshold: int = Query(default=80, ge=0, le=100, description="High-quality match-score threshold"),
):
    """Executive overview, AI insights, chart series, action center, recent activity.

    Gated whole rather than split into basic/advanced tiers: this is a single
    aggregate response, and Analytics is locked below PRO in the plan matrix
    (FREE lists it as locked; PLUS does not include it). Carving out a "basic"
    subset would mean inventing a product surface the plans do not describe —
    when that surface exists, gate it separately rather than weakening this one.

    Two gates, two meanings: `usage.view` is "your ROLE may see org numbers",
    `advanced_analytics` is "your PLAN includes them". A recruiter on FREE and a
    viewer on PRO both fail here, with different remedies.
    """
    return repo.overview(threshold=threshold)
