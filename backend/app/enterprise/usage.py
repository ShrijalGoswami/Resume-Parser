"""
Usage metering — the counters quota decisions are made from.

Two responsibilities, deliberately separated from `UsageRepository` (which is the
generic org counter store used for AI-request statistics):

  * READ  a complete usage snapshot for one organization in a single round trip
  * WRITE résumé consumption atomically, to both the lifetime and the monthly
    counter

Why both counters, always
-------------------------
FREE counts résumés for the lifetime of the organization; paid plans count per
month. If only the plan's current window were written, then an organization that
upgrades and later lapses would have a lifetime figure with a hole in it, and a
FREE account that briefly upgraded would come back with its trial credits
restored. Writing both is one extra RPC on a path that already does file I/O and
an AI call, and it makes the counter independent of the plan that happened to be
active at the time.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.db.supabase_client import get_service_client
from app.enterprise.catalog import (
    METRIC_CAMPAIGNS, METRIC_MEMBERS, METRIC_ORGANIZATIONS, METRIC_RESUMES,
    Plan, WINDOW_LIFETIME, resume_window,
)

logger = logging.getLogger(__name__)

PERIOD_LIFETIME = "lifetime"


def current_period(now: Optional[datetime] = None) -> str:
    """Month key, e.g. `2026-07`. UTC — a quota window must not depend on where
    the server happens to be."""
    moment = now or datetime.now(timezone.utc)
    return f"{moment.year:04d}-{moment.month:02d}"


@dataclass(frozen=True)
class UsageSnapshot:
    """Point-in-time usage for one organization."""
    resumes_lifetime: int = 0
    resumes_period: int = 0
    members: int = 0
    campaigns: int = 0
    period: str = ""

    def used_for(self, metric: str, plan: Plan) -> int:
        if metric == METRIC_RESUMES:
            return (self.resumes_lifetime
                    if resume_window(plan) == WINDOW_LIFETIME
                    else self.resumes_period)
        if metric == METRIC_MEMBERS:
            return self.members
        if metric == METRIC_CAMPAIGNS:
            return self.campaigns
        if metric == METRIC_ORGANIZATIONS:
            # V1 is single-organization by decision, so an org always occupies
            # exactly one slot. Reported honestly rather than as 0, which would
            # read as "you have room for another".
            return 1
        return 0

    def as_dict(self) -> dict:
        return {
            "resumes_lifetime": self.resumes_lifetime,
            "resumes_period": self.resumes_period,
            "members": self.members,
            "campaigns": self.campaigns,
            "period": self.period,
        }


def read_snapshot(organization_id: str, *, period: Optional[str] = None) -> UsageSnapshot:
    """One RPC → every count a quota decision needs.

    Failure returns ZERO usage, not an exception: this runs inside org-context
    resolution, and a counter read that 503s must not take the whole application
    down with it. The trade-off is explicit — a failed read is generous rather
    than punitive, because wrongly blocking a paying customer is worse than
    briefly allowing one extra résumé. The failure is logged at WARNING so it is
    visible rather than silent.
    """
    p = period or current_period()
    try:
        client = get_service_client()
        resp = client.rpc("usage_snapshot", {"p_org": organization_id, "p_period": p}).execute()
        rows = getattr(resp, "data", None) or []
        row = rows[0] if isinstance(rows, list) and rows else (rows if isinstance(rows, dict) else {})
        return UsageSnapshot(
            resumes_lifetime=int(row.get("resumes_lifetime") or 0),
            resumes_period=int(row.get("resumes_period") or 0),
            members=int(row.get("members") or 0),
            campaigns=int(row.get("campaigns") or 0),
            period=p,
        )
    except Exception as exc:  # pragma: no cover — defensive; see docstring
        logger.warning("usage snapshot read failed for org=%s: %s", organization_id, exc)
        return UsageSnapshot(period=p)


def record_resumes(organization_id: str, count: int = 1, *, period: Optional[str] = None) -> None:
    """Consume `count` résumé credits atomically (lifetime + current month).

    Never raises: a counter write must not fail an upload that already succeeded.
    A missed increment under-counts (generous); a failed request after the résumé
    was stored would be a lie about what happened.
    """
    if count <= 0 or not organization_id:
        return
    p = period or current_period()
    client = get_service_client()
    for window in (PERIOD_LIFETIME, p):
        try:
            client.rpc("increment_usage", {
                "p_org": organization_id, "p_period": window,
                "p_metric": METRIC_RESUMES, "p_delta": count,
            }).execute()
        except Exception as exc:  # pragma: no cover
            logger.warning("résumé usage increment failed (org=%s window=%s): %s",
                           organization_id, window, exc)
