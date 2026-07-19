"""
Executive report data composition (deterministic — NO LLM, NO fabrication).

Gathers every number an executive report needs from the EXISTING repositories in a
bounded set of queries (analytics overview + campaign stats + activity feed) — no
per-campaign/per-candidate loops, no N+1. These real aggregates are what the report
is grounded in; the LLM only explains them, it never invents statistics.

The `gather_report_data(...)` entry point takes repositories, so it is reusable by
routes today and by a future scheduler/cron/queue (which would build the same
recruiter-scoped repos) without change.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from app.schemas.report import (
    CampaignSnapshot,
    ProductivityMetrics,
    ReportMetrics,
    SkillCount,
    TalentSnapshot,
)


@dataclass
class ReportData:
    metrics: ReportMetrics
    campaigns: list[CampaignSnapshot]
    productivity: ProductivityMetrics
    talent_snapshot: TalentSnapshot
    # Raw pieces the context builder narrates over.
    ai_insights: dict[str, Any] = field(default_factory=dict)
    action_center: dict[str, Any] = field(default_factory=dict)
    recent_activity: list[dict[str, Any]] = field(default_factory=list)


def _days_since(value: Any) -> Optional[int]:
    if not value:
        return None
    try:
        dt = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return None


def _skill_counts(items: list[dict]) -> list[SkillCount]:
    return [SkillCount(skill=i.get("skill", ""), count=i.get("count", 0)) for i in (items or []) if i.get("skill")]


def gather_report_data(*, analytics_repo, campaign_repo, activity_repo) -> ReportData:
    overview = analytics_repo.overview()
    ov = overview.get("overview", {}) if isinstance(overview, dict) else {}
    ai = overview.get("ai_insights", {}) if isinstance(overview, dict) else {}
    charts = overview.get("charts", {}) if isinstance(overview, dict) else {}
    action = overview.get("action_center", {}) if isinstance(overview, dict) else {}
    recent = overview.get("recent_activity", []) if isinstance(overview, dict) else []

    metrics = ReportMetrics(
        total_campaigns=ov.get("total_campaigns", 0),
        active_campaigns=ov.get("active_campaigns", 0),
        total_candidates=ov.get("total_candidates", 0),
        analyzed_candidates=ov.get("analyzed_candidates", 0),
        awaiting_analysis=ov.get("awaiting_analysis", 0),
        average_match_score=ov.get("average_match_score"),
        average_ats_score=ov.get("average_ats_score"),
        high_quality_candidates=ov.get("high_quality_candidates", 0),
    )

    # Per-campaign snapshots (2 bulk queries via the campaign repo — no N+1).
    campaigns: list[CampaignSnapshot] = []
    try:
        stats = campaign_repo.stats_for_recruiter()
        for c in campaign_repo.list():
            s = stats.get(c.id, {})
            cd = c.model_dump() if hasattr(c, "model_dump") else {}
            campaigns.append(CampaignSnapshot(
                campaign_id=c.id,
                title=getattr(c, "title", "") or "",
                status=getattr(c, "status", "") or "",
                role_title=cd.get("role_title") or getattr(c, "role_title", "") or "",
                total_candidates=s.get("total_candidates", 0),
                awaiting_analysis=s.get("awaiting_analysis", 0),
                average_match_score=s.get("average_match_score"),
                days_since_activity=_days_since(s.get("last_activity_at") or getattr(c, "updated_at", None)),
            ))
    except Exception:
        pass

    # Recruiter productivity from the real activity feed (grounded in stored events).
    counts: Counter[str] = Counter()
    comparisons = 0
    try:
        events = activity_repo.recent(limit=300)
        for e in events:
            counts[getattr(e, "type", "")] += 1
            if getattr(e, "type", "") == "batch_analyzed" and "comparison" in (getattr(e, "summary", "") or "").lower():
                comparisons += 1
    except Exception:
        pass
    productivity = ProductivityMetrics(
        resumes_uploaded=counts.get("resume_uploaded", 0),
        candidates_analyzed=max(0, counts.get("batch_analyzed", 0) - comparisons),
        comparisons_run=comparisons,
        interview_packs_generated=counts.get("interview_pack_generated", 0),
        copilot_messages=counts.get("copilot_message", 0),
        stage_changes=counts.get("candidate_stage_changed", 0),
        notes_added=counts.get("note_added", 0),
    )

    talent = TalentSnapshot(
        top_technologies=_skill_counts(ai.get("top_technologies", [])),
        common_missing_skills=_skill_counts(ai.get("common_missing_skills", [])),
        match_distribution=charts.get("match_distribution", []),
        ats_distribution=charts.get("ats_distribution", []),
        experience_distribution=charts.get("experience_distribution", []),
        hiring_funnel=charts.get("hiring_funnel", []),
    )

    return ReportData(
        metrics=metrics, campaigns=campaigns, productivity=productivity,
        talent_snapshot=talent, ai_insights=ai, action_center=action, recent_activity=recent,
    )
