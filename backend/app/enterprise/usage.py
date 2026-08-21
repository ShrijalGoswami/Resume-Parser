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
    METRIC_CAMPAIGNS, METRIC_COPILOT_QUESTIONS, METRIC_INTERVIEW_PACKS,
    METRIC_MEMBERS, METRIC_ORGANIZATIONS, METRIC_RESUMES,
    Plan, WINDOW_LIFETIME, metric_window,
)

logger = logging.getLogger(__name__)

PERIOD_LIFETIME = "lifetime"

#: Metered counters read straight from `org_usage_counters` (the RPC
#: `usage_snapshot` predates them and returns résumés/members/campaigns only —
#: reading the table directly avoids a hand-applied migration).
_EXTRA_METERED = (METRIC_INTERVIEW_PACKS, METRIC_COPILOT_QUESTIONS)


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
    interview_packs_lifetime: int = 0
    interview_packs_period: int = 0
    copilot_questions_lifetime: int = 0
    copilot_questions_period: int = 0
    period: str = ""

    def used_for(self, metric: str, plan: Plan) -> int:
        lifetime_window = metric_window(metric, plan) == WINDOW_LIFETIME
        if metric == METRIC_RESUMES:
            return self.resumes_lifetime if lifetime_window else self.resumes_period
        if metric == METRIC_INTERVIEW_PACKS:
            return (self.interview_packs_lifetime
                    if lifetime_window else self.interview_packs_period)
        if metric == METRIC_COPILOT_QUESTIONS:
            return (self.copilot_questions_lifetime
                    if lifetime_window else self.copilot_questions_period)
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
            "interview_packs_lifetime": self.interview_packs_lifetime,
            "interview_packs_period": self.interview_packs_period,
            "copilot_questions_lifetime": self.copilot_questions_lifetime,
            "copilot_questions_period": self.copilot_questions_period,
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

        # Interview / copilot counters live in the same table but not in the
        # RPC (which predates them). Read them directly; a failure here fails
        # open with the rest of the snapshot.
        extra: dict[tuple[str, str], int] = {}
        try:
            counters = (
                client.table("org_usage_counters")
                .select("period,metric,value")
                .eq("organization_id", organization_id)
                .in_("metric", list(_EXTRA_METERED))
                .in_("period", [PERIOD_LIFETIME, p])
                .execute()
            )
            for r in getattr(counters, "data", None) or []:
                extra[(r.get("metric"), r.get("period"))] = int(r.get("value") or 0)
        except Exception as exc:  # pragma: no cover — defensive; see docstring
            logger.warning("metered counter read failed for org=%s: %s", organization_id, exc)

        return UsageSnapshot(
            resumes_lifetime=int(row.get("resumes_lifetime") or 0),
            resumes_period=int(row.get("resumes_period") or 0),
            members=int(row.get("members") or 0),
            campaigns=int(row.get("campaigns") or 0),
            interview_packs_lifetime=extra.get((METRIC_INTERVIEW_PACKS, PERIOD_LIFETIME), 0),
            interview_packs_period=extra.get((METRIC_INTERVIEW_PACKS, p), 0),
            copilot_questions_lifetime=extra.get((METRIC_COPILOT_QUESTIONS, PERIOD_LIFETIME), 0),
            copilot_questions_period=extra.get((METRIC_COPILOT_QUESTIONS, p), 0),
            period=p,
        )
    except Exception as exc:  # pragma: no cover — defensive; see docstring
        logger.warning("usage snapshot read failed for org=%s: %s", organization_id, exc)
        return UsageSnapshot(period=p)


def _record_metric(metric: str, organization_id: str, count: int = 1,
                   *, period: Optional[str] = None) -> None:
    """Consume `count` credits of a metered metric atomically (lifetime + month).

    Never raises: a counter write must not fail an operation that already
    succeeded. A missed increment under-counts (generous); a failed request
    after the work was done would be a lie about what happened. Both windows are
    always written so the counters stay independent of the plan active at the
    time (see the module docstring).
    """
    if count <= 0 or not organization_id:
        return
    p = period or current_period()
    client = get_service_client()
    for window in (PERIOD_LIFETIME, p):
        try:
            client.rpc("increment_usage", {
                "p_org": organization_id, "p_period": window,
                "p_metric": metric, "p_delta": count,
            }).execute()
        except Exception as exc:  # pragma: no cover
            logger.warning("%s usage increment failed (org=%s window=%s): %s",
                           metric, organization_id, window, exc)


def record_resumes(organization_id: str, count: int = 1, *, period: Optional[str] = None) -> None:
    _record_metric(METRIC_RESUMES, organization_id, count, period=period)


def record_interview_packs(organization_id: str, count: int = 1,
                           *, period: Optional[str] = None) -> None:
    _record_metric(METRIC_INTERVIEW_PACKS, organization_id, count, period=period)


def record_copilot_questions(organization_id: str, count: int = 1,
                             *, period: Optional[str] = None) -> None:
    _record_metric(METRIC_COPILOT_QUESTIONS, organization_id, count, period=period)
