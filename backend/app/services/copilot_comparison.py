"""
Copilot ↔ Comparison bridge.

Lets the Recruiter Copilot reuse the SAME comparison engine
(`services.comparison_service.run_comparison`) instead of duplicating logic. When
a recruiter asks the copilot to compare candidates in a campaign context, this
detects the intent, resolves which roster candidates they mean, runs the shared
comparison capability, and folds the report into a `CopilotStructuredResponse`
(the full report is also stashed in message metadata for the UI).

Returns None when the message is not a comparison request or fewer than two
candidates can be resolved — the caller then falls back to the normal grounded
copilot answer (which already handles single-candidate and ranking questions).
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.schemas.comparison import CandidateComparisonReport
from app.schemas.copilot import CopilotPageContext, CopilotStructuredResponse
from app.services.comparison_service import MAX_CANDIDATES, MIN_CANDIDATES, run_comparison

logger = logging.getLogger(__name__)

_TRIGGERS = (
    "compare", " vs ", " vs.", "versus", "safer hire", "safer bet",
    "who is better", "who's better", "who is stronger", "which is better",
    "stack up", "head to head", "head-to-head",
)
_NUMBER_WORDS = {"two": 2, "three": 3, "four": 4, "five": 5, "both": 2}


def _is_comparison(question: str) -> bool:
    q = f" {question.lower()} "
    return any(t in q for t in _TRIGGERS)


def _requested_count(question: str) -> Optional[int]:
    q = question.lower()
    m = re.search(r"\btop\s+(\d+)\b", q) or re.search(r"\b(\d+)\s+candidates?\b", q)
    if m:
        return int(m.group(1))
    for word, n in _NUMBER_WORDS.items():
        if re.search(rf"\b(top\s+)?{word}\b", q):
            return n
    return None


def _match_names(question: str, roster: list[Any]) -> list[str]:
    """Return candidate ids whose name is mentioned, in order of first mention."""
    q = question.lower()
    hits: list[tuple[int, str]] = []
    for c in roster:
        name = (getattr(c, "full_name", "") or "").strip()
        if not name:
            continue
        candidates_tokens = [name.lower()] + [t.lower() for t in name.split() if len(t) > 2]
        pos = min(
            (q.find(tok) for tok in candidates_tokens if tok and q.find(tok) != -1),
            default=-1,
        )
        if pos != -1:
            hits.append((pos, c.id))
    hits.sort(key=lambda x: x[0])
    # De-dup preserving order.
    seen: set[str] = set()
    return [cid for _, cid in hits if not (cid in seen or seen.add(cid))]


def _top_by_score(roster: list[Any], n: int) -> list[str]:
    def score(c: Any) -> float:
        la = getattr(c, "latest_analysis", None) or {}
        val = la.get("overall_score") if isinstance(la, dict) else None
        return float(val) if val is not None else -1.0

    ranked = sorted(roster, key=score, reverse=True)
    return [c.id for c in ranked[:n]]


def try_comparison(
    question: str,
    page: CopilotPageContext,
    *,
    campaign_repo,
    candidate_repo,
    note_repo=None,
) -> Optional[tuple[CandidateComparisonReport, CopilotStructuredResponse]]:
    """Detect + run a comparison for the copilot. Returns None if not applicable."""
    if not _is_comparison(question) or not page.campaign_id:
        return None

    try:
        roster = candidate_repo.list_for_campaign_with_analysis(page.campaign_id)
    except Exception as exc:  # pragma: no cover
        logger.info("Copilot comparison: roster unavailable: %s", exc)
        return None
    if len(roster) < MIN_CANDIDATES:
        return None

    ids = _match_names(question, roster)
    if len(ids) < MIN_CANDIDATES:
        # "compare them / the top two / these candidates" → fall back to top-N.
        n = _requested_count(question) or 3
        n = max(MIN_CANDIDATES, min(n, MAX_CANDIDATES, len(roster)))
        ids = _top_by_score(roster, n)
    ids = ids[:MAX_CANDIDATES]
    if len(ids) < MIN_CANDIDATES:
        return None

    report = run_comparison(
        page.campaign_id, ids,
        campaign_repo=campaign_repo, candidate_repo=candidate_repo,
        note_repo=note_repo, question=question,
    )
    return report, _report_to_copilot(report)


def safe_try_comparison(
    question: str,
    page: CopilotPageContext,
    campaign_repo,
    candidate_repo,
    note_repo=None,
) -> Optional[tuple[CandidateComparisonReport, CopilotStructuredResponse]]:
    """try_comparison that never raises — the copilot must never break on this."""
    try:
        return try_comparison(
            question, page,
            campaign_repo=campaign_repo, candidate_repo=candidate_repo, note_repo=note_repo,
        )
    except Exception as exc:  # pragma: no cover — fall back to normal copilot
        logger.info("Copilot comparison skipped: %s", exc)
        return None


def _report_to_copilot(report: CandidateComparisonReport) -> CopilotStructuredResponse:
    """Render a comparison report as a copilot answer (engine reused, not duplicated)."""
    es = report.executive_summary
    lines: list[str] = []
    if es.summary:
        lines.append(es.summary)
    if report.rankings:
        lines.append("\n**Ranking**")
        for r in sorted(report.rankings, key=lambda x: x.rank or 99):
            bits = [f"**{r.rank}. {r.name}**"]
            if r.overall_score:
                bits.append(f"overall {r.overall_score:g}/100")
            if r.ats_score:
                bits.append(f"ATS {r.ats_score:g}")
            tail = f" — {r.strength_summary}" if r.strength_summary else ""
            lines.append(f"- {' · '.join(bits)}{tail}")
    if es.best_candidate_name:
        rec = es.overall_recommendation or f"{es.best_candidate_name} is the strongest overall."
        lines.append(f"\n**Recommendation:** {rec}")
    if report.tradeoffs:
        lines.append("\n**Trade-offs**")
        for t in report.tradeoffs[:3]:
            lines.append(f"- {t.scenario}: choose **{t.choose_name}** — {t.reasoning}")

    strengths = [
        f"{s.name}: {', '.join(s.technical_strengths[:3])}"
        for s in report.strengths if s.technical_strengths
    ]
    recommendations = [
        f"{v.name}: {v.recommendation}" for v in report.hiring_recommendations if v.recommendation
    ]
    followups = []
    if es.best_candidate_name:
        followups = [
            f"Why is {es.best_candidate_name} ranked first?",
            "Who is the safer hire?",
            f"Generate interview questions for {es.best_candidate_name}.",
        ]

    return CopilotStructuredResponse(
        answer="\n".join(lines) or "Here is the candidate comparison.",
        summary=es.summary,
        strengths=strengths,
        recommendations=recommendations,
        confidence=es.hiring_confidence or es.comparison_confidence,
        reasoning_summary="Generated by the shared AI comparison engine.",
        followups=followups,
        sources_used=report.sources_used,
        degraded=report.degraded,
    )
