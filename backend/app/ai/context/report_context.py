"""
Executive report context composition (pure).

Turns the deterministic `ReportData` into a single labelled context block the
executive-report prompt narrates over. Every number here is real (server-computed
from stored data); the prompt is instructed to explain these numbers and never
invent new ones.
"""

from __future__ import annotations

from typing import Any


def _skills(items: list[Any], n: int = 10) -> str:
    rows = []
    for i in items[:n]:
        skill = getattr(i, "skill", None) or (i.get("skill") if isinstance(i, dict) else None)
        count = getattr(i, "count", None) or (i.get("count") if isinstance(i, dict) else None)
        if skill:
            rows.append(f"{skill} ({count})")
    return ", ".join(rows) or "(none)"


def _dist(items: list[dict]) -> str:
    parts = []
    for d in items or []:
        label = d.get("range") or d.get("stage") or d.get("label") or ""
        parts.append(f"{label}: {d.get('count', 0)}")
    return ", ".join(parts) or "(none)"


def build_report_context(data) -> str:
    m = data.metrics
    parts: list[str] = []

    parts.append(
        "### Pipeline Metrics\n"
        f"- Campaigns: {m.total_campaigns} ({m.active_campaigns} active)\n"
        f"- Candidates: {m.total_candidates} ({m.analyzed_candidates} analyzed, {m.awaiting_analysis} awaiting)\n"
        f"- Average match score: {m.average_match_score}\n"
        f"- Average ATS score: {m.average_ats_score}\n"
        f"- High-quality candidates (>=80): {m.high_quality_candidates}"
    )

    # Per-campaign
    camp_rows = []
    for c in data.campaigns[:25]:
        stale = f", {c.days_since_activity}d since activity" if c.days_since_activity is not None else ""
        camp_rows.append(
            f"- {c.title} [{c.status}]: {c.total_candidates} candidates, "
            f"{c.awaiting_analysis} awaiting, avg match {c.average_match_score}{stale}"
        )
    parts.append("### Campaigns\n" + ("\n".join(camp_rows) or "(no campaigns)"))

    # Productivity
    p = data.productivity
    parts.append(
        "### Recruiter Activity (recent)\n"
        f"- Resumes uploaded: {p.resumes_uploaded}\n"
        f"- Candidates analyzed: {p.candidates_analyzed}\n"
        f"- Comparisons run: {p.comparisons_run}\n"
        f"- Interview packs generated: {p.interview_packs_generated}\n"
        f"- Copilot messages: {p.copilot_messages}\n"
        f"- Pipeline stage changes: {p.stage_changes}\n"
        f"- Notes added: {p.notes_added}"
    )

    # Talent snapshot
    t = data.talent_snapshot
    parts.append(
        "### Talent Snapshot (internal data only)\n"
        f"- Most common technologies: {_skills(t.top_technologies)}\n"
        f"- Most common missing skills: {_skills(t.common_missing_skills)}\n"
        f"- Match distribution: {_dist(t.match_distribution)}\n"
        f"- ATS distribution: {_dist(t.ats_distribution)}\n"
        f"- Experience distribution: {_dist(t.experience_distribution)}\n"
        f"- Hiring funnel: {_dist(t.hiring_funnel)}"
    )

    # AI insights + action center (already computed, grounded)
    ai = data.ai_insights or {}
    strongest = ai.get("strongest_candidate") or {}
    pool = ai.get("strongest_talent_pool") or {}
    action = data.action_center or {}
    parts.append(
        "### Signals\n"
        f"- Strongest candidate: {strongest.get('name', 'n/a')} "
        f"({strongest.get('overall_score', 'n/a')}/100, {strongest.get('campaign_title', 'n/a')})\n"
        f"- Strongest talent pool: {pool.get('campaign_title', 'n/a')} (avg {pool.get('average_score', 'n/a')})\n"
        f"- Candidates awaiting review: {action.get('awaiting_review_count', 0)}\n"
        f"- Stale active campaigns: {action.get('stale_active_campaigns_count', 0)}\n"
        f"- Candidates flagged for review: {ai.get('candidates_requiring_review_count', 0)}"
    )

    # Recent activity feed
    recent = [f"- {e.get('summary')}" for e in (data.recent_activity or [])[:12] if isinstance(e, dict) and e.get("summary")]
    if recent:
        parts.append("### Recent Activity\n" + "\n".join(recent))

    return "\n\n".join(parts)
