"""
Copilot ↔ Executive Report bridge.

Lets the Recruiter Copilot answer executive-level, natural-language questions
("how healthy is our pipeline?", "what changed?", "which campaign is
underperforming?", "biggest hiring risks?") by reusing the SAME report engine
(`services.report_service.run_executive_report`) — no duplicated analysis logic.
Only triggers at executive scope (no specific candidate selected).

Returns None otherwise, so the caller falls back to the normal grounded answer.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.schemas.copilot import CopilotPageContext, CopilotSource, CopilotStructuredResponse
from app.schemas.report import ExecutiveReport
from app.services.report_service import run_executive_report

logger = logging.getLogger(__name__)

# Intent detection is two-tier. The report engine is the most expensive path the
# copilot can take (4096-token LLM call over org-wide analytics), and the old
# flat trigger list sent ordinary conversational questions there on incidental
# words — "which campaign is Priya in?", "any recommendations on her notice
# period?", "he reported to the CTO" all escalated. The capability is unchanged;
# only the gate is stricter.

# Unambiguous executive-scope asks: these route to the report engine on their own.
_STRONG_TRIGGERS = (
    "executive summary", "executive report", "hiring report", "pipeline report",
    "pipeline health", "hiring health", "how healthy", "how is hiring",
    "overall pipeline", "recruiter productivity", "biggest hiring risk",
)

# Words that also occur in ordinary conversation. They still reach the report
# engine, but only alongside an explicit request verb ("generate a skill gap
# report"), never on their own. `\breports?\b` is word-bounded so "reported" /
# "reporting" no longer match.
_WEAK_TOPIC_RE = re.compile(
    r"\breports?\b|recommendations|skill gap|skill shortage|hiring risk|"
    r"what changed|underperform|which recruiter|which campaign|biggest risk"
)
_REQUEST_RE = re.compile(
    r"\b(generate|create|build|run|produce|prepare|write|show me|give me|i need|i want)\b"
)


def _is_report(question: str) -> bool:
    q = question.lower()
    if any(t in q for t in _STRONG_TRIGGERS):
        return True
    # Keep the docstring's canonical example working without a request verb:
    # "which campaign is underperforming?" is executive by construction.
    if "underperform" in q and "campaign" in q:
        return True
    return bool(_WEAK_TOPIC_RE.search(q) and _REQUEST_RE.search(q))


def _focus(message: str) -> tuple[str, Optional[list[str]]]:
    m = message.lower()
    if "risk" in m:
        return "hiring_risks", ["hiring_risks"]
    if "skill" in m:
        return "skill_gap", ["skill_gap"]
    if "recommend" in m:
        return "recommendations", ["recommendations"]
    if "recruiter" in m or "productivity" in m:
        return "recruiter_productivity", ["recruiter_productivity"]
    if "campaign" in m or "underperform" in m:
        return "campaign_intelligence", ["campaign_intelligence"]
    if "changed" in m or "summary" in m or "health" in m:
        return "executive_summary", ["executive_summary"]
    return "full", None


def try_report(
    question: str,
    page: CopilotPageContext,
    *,
    analytics_repo: Any,
    campaign_repo: Any,
    activity_repo: Any,
) -> Optional[tuple[ExecutiveReport, CopilotStructuredResponse]]:
    # Executive scope only — a specific candidate belongs to the normal copilot.
    if page.candidate_id or not _is_report(question):
        return None
    focus, sections = _focus(question)
    report = run_executive_report(
        focus=focus, instruction=question, sections=sections,
        analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo,
    )
    return report, _render(report)


def safe_try_report(
    question: str,
    page: CopilotPageContext,
    analytics_repo: Any,
    campaign_repo: Any,
    activity_repo: Any,
) -> Optional[tuple[ExecutiveReport, CopilotStructuredResponse]]:
    """try_report that never raises — the copilot must never break on this."""
    try:
        return try_report(question, page, analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo)
    except Exception as exc:  # pragma: no cover
        logger.info("Copilot report skipped: %s", exc)
        return None


def _render(report: ExecutiveReport) -> CopilotStructuredResponse:
    es = report.executive_summary
    lines: list[str] = []
    if es.headline:
        lines.append(f"**{es.headline}**")
    if es.pipeline_health:
        lines.append(f"_Pipeline health: {es.pipeline_health}_")
    if es.whats_changed:
        lines.append("\n**What changed**")
        lines += [f"- {c}" for c in es.whats_changed[:4]]
    if report.hiring_risks:
        lines.append("\n**Top risks**")
        lines += [f"- **{r.category}**: {r.evidence} → {r.suggested_action}" for r in report.hiring_risks[:3]]
    if report.recommendations:
        lines.append("\n**Recommendations**")
        lines += [f"- ({r.priority}) {r.title}" for r in report.recommendations[:4]]
    if report.campaign_insights:
        lines.append("\n**Campaigns**")
        lines += [f"- **{c.title}**: {c.headline or c.explanation}" for c in report.campaign_insights[:4]]

    return CopilotStructuredResponse(
        answer="\n".join(lines) or "Here is the executive summary.",
        summary=es.headline,
        weaknesses=[r.category for r in report.hiring_risks[:5]],
        recommendations=[r.title for r in report.recommendations[:5]],
        confidence=0 if report.degraded else 70,
        reasoning_summary="Generated by the shared Executive Intelligence engine.",
        followups=["What are the biggest hiring risks?", "Which campaign is underperforming?", "Show recruiter productivity"],
        sources_used=report.sources_used or [CopilotSource(source="Campaign Analytics")],
        degraded=report.degraded,
    )
