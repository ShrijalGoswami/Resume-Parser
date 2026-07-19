"""
Executive report orchestration (product layer).

Composes the deterministic report data (analytics + campaigns + activity) with the
reusable report context builder, then calls the orchestrated executive-report
capability. Falls back to a metrics-only report (still grounded) when the LLM is
unavailable.

`run_executive_report(...)` takes repositories, so it is reusable by the report
route today and by a future scheduler/cron/queue tomorrow — no code change needed
to schedule executive briefings.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.ai.context.report_context import build_report_context
from app.ai.services.report_service import generate_executive_report
from app.schemas.copilot import CopilotSource
from app.schemas.report import (
    ExecRecommendation,
    ExecutiveReport,
    ExecutiveSummaryNarrative,
    HiringRisk,
    SkillGapAnalysis,
)
from app.services.report_data import ReportData, gather_report_data

logger = logging.getLogger(__name__)


def run_executive_report(
    *,
    focus: str = "full",
    instruction: str = "",
    sections: Optional[list[str]] = None,
    period: str = "current",
    analytics_repo: Any,
    campaign_repo: Any,
    activity_repo: Any,
) -> ExecutiveReport:
    """Generate an executive report grounded in the recruiter's stored data."""
    data = gather_report_data(
        analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo,
    )
    context_text = build_report_context(data)
    # Organizational memory (historical patterns/decisions) before reasoning.
    from app.enterprise.context import current_org_id
    from app.knowledge.injection import memory_block
    _mem, _ = memory_block(current_org_id.get(), instruction or "hiring pipeline health and trends")
    if _mem:
        context_text = _mem + context_text
    # Deterministic forecast the report EXPLAINS (never generates) — future outlook.
    try:
        from app.services.prediction_service import forecast_brief
        _fc = forecast_brief(current_org_id.get(), analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo)
        if _fc:
            context_text = _fc + context_text
    except Exception:
        pass
    sources = [
        CopilotSource(source="Campaign Analytics", detail="Aggregated pipeline metrics"),
        CopilotSource(source="Candidate Analysis", detail="Scores, skills, recommendations"),
        CopilotSource(source="Activity Feed", detail="Recruiter productivity signals"),
    ]
    fallback = _deterministic_report(data, sources, period)
    report = generate_executive_report(
        context_text=context_text, data=data, sources=sources,
        focus=focus, instruction=instruction, sections=sections,
        period=period, fallback=fallback,
    )
    from app.knowledge.service import safe_ingest
    safe_ingest(current_org_id.get(), "report", source_id=f"report:{period}", report=report.model_dump())
    return report


def _deterministic_report(data: ReportData, sources: list[CopilotSource], period: str) -> ExecutiveReport:
    """A grounded, metrics-only report used when the LLM is unavailable."""
    m = data.metrics
    action = data.action_center or {}
    stale = action.get("stale_active_campaigns_count", 0)
    awaiting = m.awaiting_analysis
    analyzed_ratio = (m.analyzed_candidates / m.total_candidates) if m.total_candidates else 1.0
    health = "Healthy" if analyzed_ratio >= 0.8 and stale == 0 else "At Risk" if analyzed_ratio >= 0.4 else "Critical"

    risks: list[HiringRisk] = []
    if stale:
        risks.append(HiringRisk(
            category="Stalled campaigns", evidence=f"{stale} active campaign(s) have no recent activity.",
            impact="Open roles risk missing hiring deadlines.",
            suggested_action="Review stale campaigns and resume sourcing or close them.",
        ))
    if awaiting:
        risks.append(HiringRisk(
            category="Analysis backlog", evidence=f"{awaiting} candidate(s) await analysis.",
            impact="Strong candidates may be overlooked.",
            suggested_action="Run analysis on the backlog to surface top talent.",
        ))

    recs = [
        ExecRecommendation(priority="High", title=f"Clear the {awaiting}-candidate analysis backlog",
                           rationale="Unanalyzed candidates can hide strong hires.",
                           evidence=f"{awaiting} awaiting of {m.total_candidates} total.")
    ] if awaiting else []

    return ExecutiveReport(
        period=period,
        executive_summary=ExecutiveSummaryNarrative(
            headline=f"{m.total_candidates} candidates across {m.total_campaigns} campaigns; pipeline is {health.lower()}.",
            pipeline_health=health,
            blockers=[r.category for r in risks],
            immediate_attention=[f"{awaiting} awaiting analysis"] if awaiting else [],
        ),
        skill_gap_analysis=SkillGapAnalysis(
            summary="Most common gaps across analyzed candidates.",
            emerging_demand=[s.skill for s in data.talent_snapshot.common_missing_skills[:5]],
        ),
        hiring_risks=risks,
        recommendations=recs,
        metrics=m, campaigns=data.campaigns, productivity=data.productivity,
        talent_snapshot=data.talent_snapshot, sources_used=sources, degraded=True,
    )
