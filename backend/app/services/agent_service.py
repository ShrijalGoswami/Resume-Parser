"""
Autonomous Recruiting Agent orchestration (product layer).

Runs the agent's workflows over the recruiter's data (via the tool registry — no
duplicated logic), persists NEW recommendations idempotently (dedupe by
workflow+entity), and produces a prioritised briefing. Approvals mutate only the
agent's own recommendations — never production candidate/campaign data.

`run_agent_scan(...)` takes repositories, so a future scheduler (cron / queue /
serverless / worker) can build recruiter-scoped repos and invoke it unchanged.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import HTTPException, status as http_status

from app.ai.agent import ToolContext, agent_engine
from app.schemas.agent import ApprovalStatus, AgentScanResponse, Recommendation

logger = logging.getLogger(__name__)

# The only status values a human decision may set (the pending -> terminal step of
# the approved state machine). `executed` is a system-only forward transition.
_HUMAN_DECISIONS = {
    ApprovalStatus.approved.value,
    ApprovalStatus.rejected.value,
    ApprovalStatus.dismissed.value,
}


def _context(*, recruiter_id, campaign_repo, candidate_repo, note_repo, analytics_repo, activity_repo, embedding_repo) -> ToolContext:
    return ToolContext(
        recruiter_id=recruiter_id, campaign_repo=campaign_repo, candidate_repo=candidate_repo,
        note_repo=note_repo, analytics_repo=analytics_repo, activity_repo=activity_repo,
        embedding_repo=embedding_repo,
    )


def run_agent_scan(
    *,
    workflows: Optional[list[str]] = None,
    agent_repo: Any,
    campaign_repo: Any,
    candidate_repo: Any,
    note_repo: Any,
    analytics_repo: Any,
    activity_repo: Any,
    embedding_repo: Any,
) -> AgentScanResponse:
    """Detect situations, persist new recommendations, and return open items + briefing."""
    ctx = _context(
        recruiter_id=agent_repo.recruiter_id, campaign_repo=campaign_repo, candidate_repo=candidate_repo,
        note_repo=note_repo, analytics_repo=analytics_repo, activity_repo=activity_repo, embedding_repo=embedding_repo,
    )
    detected = agent_engine.scan(ctx, workflows)

    # Idempotent persistence: only insert situations that aren't already open.
    open_keys = agent_repo.open_dedupe_keys()
    fresh: list[Recommendation] = []
    seen: set[str] = set()
    for r in detected:
        if r.dedupe_key in open_keys or r.dedupe_key in seen:
            continue
        seen.add(r.dedupe_key)
        fresh.append(r)
    created = agent_repo.create_many(fresh)

    open_recs = agent_repo.list(status="pending")
    briefing = agent_engine.briefing(open_recs)
    return AgentScanResponse(
        generated=len(created), total_open=len(open_recs), recommendations=open_recs, briefing=briefing,
    )


def list_recommendations(*, agent_repo: Any, status: Optional[str] = None) -> list[Recommendation]:
    return agent_repo.list(status=status)


def update_recommendation_status(*, agent_repo: Any, rec_id: str, status: str) -> Recommendation:
    """Decide a recommendation. Decisions are FINAL: only a pending recommendation
    may be decided, and only to a terminal human-decision state. Re-deciding is
    rejected here with 409 (clean UX); the DB trigger (migration 0015) is the
    authoritative backstop against any path that bypasses this guard."""
    if status not in _HUMAN_DECISIONS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{status}'. Allowed: {sorted(_HUMAN_DECISIONS)}.",
        )
    current = agent_repo.get(rec_id)  # 404 if not owned
    if current.status != ApprovalStatus.pending.value:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"Recommendation already {current.status}; decisions are final and "
                "cannot be changed (Decision Ledger)."
            ),
        )
    return agent_repo.update_status(rec_id, status)
