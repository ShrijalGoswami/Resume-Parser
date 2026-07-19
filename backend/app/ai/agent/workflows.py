"""
Built-in agent workflows.

Each workflow = a deterministic TRIGGER over stored data (via retrieval tools) →
an explainable, evidence-backed `Recommendation` that references the existing
ENGINE tool able to act on it (future execution). Workflows never modify data and
never fabricate evidence; thresholds are configurable module constants.

Add a workflow by writing a `detect(ctx) -> list[Recommendation]` and registering
it — no route or engine change.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from app.ai.agent.tools import ToolContext, invoke_tool
from app.schemas.agent import Recommendation, RecommendationCategory, Severity

# ── Configurable thresholds ─────────────────────────────────────────────────
STALL_DAYS = 14
HIGH_ATS = 80
HIGH_AI = 85
WEAK_POOL_AVG = 55
INTERVIEW_BACKLOG = 8
DEADLINE_DAYS = 14
MAX_CANDIDATE_ALERTS = 12


def _days_since(value: Any) -> int | None:
    if not value:
        return None
    try:
        dt = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return None


def _days_until(value: Any) -> int | None:
    if not value:
        return None
    try:
        dt = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (dt - datetime.now(timezone.utc)).days
    except Exception:
        return None


def _cand_scores(c: Any) -> tuple[float | None, float | None, str | None]:
    la = getattr(c, "latest_analysis", None) or {}
    result = la.get("result") if isinstance(la, dict) else None
    result = result if isinstance(result, dict) else {}
    overall = la.get("overall_score") if la.get("overall_score") is not None else result.get("overall_score")
    ats = la.get("ats_score") if la.get("ats_score") is not None else result.get("ats_score")
    return overall, ats, getattr(c, "stage", None)


# ── Workflow 1: Stalled Campaign Detection ──────────────────────────────────
def stalled_campaign(ctx: ToolContext) -> list[Recommendation]:
    out: list[Recommendation] = []
    for c in invoke_tool("retrieve_campaigns", ctx):
        if c["status"] != "active":
            continue
        days = _days_since(c["last_activity_at"])
        if days is None or days < STALL_DAYS:
            continue
        confidence = min(95, 50 + (days - STALL_DAYS) * 3)
        out.append(Recommendation(
            workflow="stalled_campaign", dedupe_key=f"stalled_campaign:{c['id']}",
            category=RecommendationCategory.campaign_risk.value,
            severity=Severity.high.value if days >= STALL_DAYS * 2 else Severity.medium.value,
            confidence=confidence,
            title=f"Campaign '{c['title']}' has stalled ({days} days inactive)",
            why=f"An active campaign with no recorded activity for {days} days risks losing momentum and candidates.",
            evidence=[f"No activity for {days} days", f"{c['total_candidates']} candidates",
                      f"Average match {c['average_match_score']}"],
            data_sources=["Campaign Analytics", "Activity Feed"],
            tools_used=["retrieve_campaigns"],
            recommended_action="Expand sourcing, revisit requirements or salary, or review shortlisted candidates.",
            suggested_tool="generate_executive_report", tool_params={"focus": "campaign_intelligence"},
            campaign_id=c["id"], campaign_title=c["title"],
        ))
    return out


# ── Workflow 2: High-Potential Candidate Alert ──────────────────────────────
def high_potential_candidate(ctx: ToolContext) -> list[Recommendation]:
    out: list[Recommendation] = []
    for c in invoke_tool("retrieve_campaigns", ctx):
        for cand in invoke_tool("retrieve_campaign_context", ctx, campaign_id=c["id"]):
            overall, ats, stage = _cand_scores(cand)
            if overall is None or ats is None:
                continue
            if overall >= HIGH_AI and ats >= HIGH_ATS and stage in ("sourced", "screening"):
                name = getattr(cand, "full_name", "") or "Candidate"
                out.append(Recommendation(
                    workflow="high_potential_candidate", dedupe_key=f"high_potential:{cand.id}",
                    category=RecommendationCategory.candidate_alert.value,
                    severity=Severity.urgent.value, confidence=min(98, int((overall + ats) / 2)),
                    title=f"Fast-track {name} — top scores, still early in the pipeline",
                    why=f"{name} scores {overall}/100 overall and {ats}/100 ATS but is only at '{stage}'. "
                        f"Strong candidates are lost when they wait.",
                    evidence=[f"Overall {overall}/100", f"ATS {ats}/100", f"Stage: {stage}"],
                    data_sources=["Candidate Analysis"], tools_used=["retrieve_campaigns", "retrieve_campaign_context"],
                    recommended_action="Fast-track: generate an interview pack and schedule interviewers now.",
                    suggested_tool="generate_interview_pack",
                    tool_params={"candidate_id": cand.id, "campaign_id": c["id"]},
                    campaign_id=c["id"], campaign_title=c["title"], candidate_id=cand.id, candidate_name=name,
                ))
                if len(out) >= MAX_CANDIDATE_ALERTS:
                    return out
    return out


# ── Workflow 3: Weak Candidate Pool ─────────────────────────────────────────
def weak_candidate_pool(ctx: ToolContext) -> list[Recommendation]:
    overview = invoke_tool("retrieve_analytics", ctx)
    gaps = [g.get("skill") for g in (overview.get("ai_insights", {}).get("common_missing_skills", []) or [])][:5]
    out: list[Recommendation] = []
    for c in invoke_tool("retrieve_campaigns", ctx):
        avg = c["average_match_score"]
        if avg is None or c["total_candidates"] < 3 or avg >= WEAK_POOL_AVG:
            continue
        out.append(Recommendation(
            workflow="weak_candidate_pool", dedupe_key=f"weak_pool:{c['id']}",
            category=RecommendationCategory.campaign_risk.value,
            severity=Severity.high.value if avg < WEAK_POOL_AVG * 0.7 else Severity.medium.value,
            confidence=80,
            title=f"Weak candidate pool in '{c['title']}' (avg match {avg})",
            why=f"The average match score ({avg}) is below the healthy threshold ({WEAK_POOL_AVG}), "
                f"suggesting sourcing or requirements need attention.",
            evidence=[f"Average match {avg} across {c['total_candidates']} candidates",
                      f"Common missing skills: {', '.join(gaps) or 'n/a'}"],
            data_sources=["Campaign Analytics", "Candidate Analysis", "Semantic Search"],
            tools_used=["retrieve_analytics", "retrieve_campaigns"],
            recommended_action="Run a semantic search for stronger profiles, refine the JD, and broaden sourcing.",
            suggested_tool="search_candidates",
            tool_params={"query": f"strong candidates for {c['role_title'] or c['title']}", "campaign_id": c["id"]},
            campaign_id=c["id"], campaign_title=c["title"],
        ))
    return out


# ── Workflow 4: Interview Backlog ───────────────────────────────────────────
def interview_backlog(ctx: ToolContext) -> list[Recommendation]:
    out: list[Recommendation] = []
    for c in invoke_tool("retrieve_campaigns", ctx):
        roster = invoke_tool("retrieve_campaign_context", ctx, campaign_id=c["id"])
        waiting = [x for x in roster if getattr(x, "stage", None) in ("screening", "shortlisted")]
        if len(waiting) < INTERVIEW_BACKLOG:
            continue
        ranked = sorted(waiting, key=lambda x: (_cand_scores(x)[0] or -1), reverse=True)
        top_ids = [x.id for x in ranked[:3]]
        out.append(Recommendation(
            workflow="interview_backlog", dedupe_key=f"interview_backlog:{c['id']}",
            category=RecommendationCategory.action.value, severity=Severity.medium.value, confidence=75,
            title=f"Interview backlog in '{c['title']}' — {len(waiting)} candidates waiting",
            why=f"{len(waiting)} candidates are in screening/shortlisted with no interview progression; "
                f"prioritising the strongest keeps the pipeline moving.",
            evidence=[f"{len(waiting)} candidates waiting",
                      f"Top waiting: {', '.join(getattr(x, 'full_name', '') or '?' for x in ranked[:3])}"],
            data_sources=["Candidate Analysis", "Pipeline stages"],
            tools_used=["retrieve_campaigns", "retrieve_campaign_context"],
            recommended_action="Prioritise the strongest waiting candidates and schedule interviews in score order.",
            suggested_tool="compare_candidates",
            tool_params={"campaign_id": c["id"], "candidate_ids": top_ids} if len(top_ids) >= 2 else {},
            campaign_id=c["id"], campaign_title=c["title"],
        ))
    return out


# ── Workflow 5: Hiring Deadline Risk ────────────────────────────────────────
def hiring_deadline_risk(ctx: ToolContext) -> list[Recommendation]:
    out: list[Recommendation] = []
    for c in invoke_tool("retrieve_campaigns", ctx):
        if c["status"] != "active":
            continue
        deadline = (c.get("metadata") or {}).get("deadline") or (c.get("metadata") or {}).get("target_date")
        days = _days_until(deadline)
        if days is None or days > DEADLINE_DAYS:
            continue
        roster = invoke_tool("retrieve_campaign_context", ctx, campaign_id=c["id"])
        hired = sum(1 for x in roster if getattr(x, "stage", None) == "hired")
        if hired > 0:
            continue
        out.append(Recommendation(
            workflow="hiring_deadline_risk", dedupe_key=f"deadline_risk:{c['id']}",
            category=RecommendationCategory.urgent.value,
            severity=Severity.urgent.value if days <= 3 else Severity.high.value,
            confidence=min(95, 60 + (DEADLINE_DAYS - days) * 3),
            title=f"'{c['title']}' deadline in {days} days with no hire yet",
            why=f"The hiring deadline is {days} days away and no candidate has been hired; the role is at risk of slipping.",
            evidence=[f"Deadline in {days} days", f"{c['total_candidates']} candidates", "0 hires so far"],
            data_sources=["Campaign metadata", "Pipeline stages"],
            tools_used=["retrieve_campaigns", "retrieve_campaign_context"],
            recommended_action="Fast-track the strongest candidates, unblock interviews, and escalate immediately.",
            suggested_tool="generate_executive_report", tool_params={"focus": "hiring_risks"},
            campaign_id=c["id"], campaign_title=c["title"],
        ))
    return out


#: Registry of built-in workflows (name → detector).
WORKFLOWS: dict[str, Callable[[ToolContext], list[Recommendation]]] = {
    "stalled_campaign": stalled_campaign,
    "high_potential_candidate": high_potential_candidate,
    "weak_candidate_pool": weak_candidate_pool,
    "interview_backlog": interview_backlog,
    "hiring_deadline_risk": hiring_deadline_risk,
}
