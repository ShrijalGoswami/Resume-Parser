"""
Copilot ↔ Interview Intelligence bridge.

Lets the Recruiter Copilot reuse the SAME interview engine
(`services.interview_service.run_interview`) instead of duplicating prompt logic.
Detects interview intent, resolves the candidate(s) in play (page candidate, a
named roster candidate, or the top-N for "packs for the top two"), runs the shared
engine with the right focus, and renders the pack(s) into a
`CopilotStructuredResponse` (full packs kept in message metadata).

Returns None when the message is not an interview request — the caller then falls
back to the normal grounded copilot answer.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.schemas.copilot import CopilotPageContext, CopilotSource, CopilotStructuredResponse
from app.schemas.interview import InterviewPack
from app.services.interview_service import run_interview

logger = logging.getLogger(__name__)

_TRIGGERS = (
    "interview", "what should i ask", "what to ask", "questions for", "question for",
    "how do i verify", "how to verify", "coding round", "system design question",
    "generate questions", "prepare for the interview", "ask this candidate",
)
_TOP_N_RE = re.compile(r"top\s+(\d+|two|three|2|3)|both|top two|top three", re.IGNORECASE)
_WORD_N = {"two": 2, "three": 3, "2": 2, "3": 3}


def _is_interview(question: str) -> bool:
    q = f" {question.lower()} "
    return any(t in q for t in _TRIGGERS)


def _focus_and_sections(message: str) -> tuple[str, Optional[list[str]]]:
    m = message.lower()
    if "verify" in m:
        return "technical", ["skill_verifications", "technical_questions"]
    if "only behavioral" in m or "behavioural" in m or "behavioral" in m:
        return "behavioral", None
    if "leadership" in m:
        return "leadership", None
    if "culture" in m:
        return "culture_fit", None
    if "scorecard" in m:
        return "scorecard", ["scorecard", "final_recommendation"]
    if "system design" in m or "coding round" in m or "harder" in m or "technical" in m:
        return "technical", None
    return "blueprint", None


def _resolve_named(message: str, campaign_id: Optional[str], candidate_repo: Any) -> Optional[str]:
    if not campaign_id:
        return None
    m = message.lower()
    try:
        for c in candidate_repo.list_for_campaign(campaign_id):
            full = (getattr(c, "full_name", "") or "").lower()
            if full and (full in m or (full.split()[0] in m and len(full.split()[0]) > 2)):
                return c.id
    except Exception:  # pragma: no cover
        return None
    return None


def _top_ids(campaign_id: str, n: int, candidate_repo: Any) -> list[str]:
    try:
        roster = candidate_repo.list_for_campaign_with_analysis(campaign_id)
    except Exception:  # pragma: no cover
        return []

    def score(c: Any) -> float:
        la = getattr(c, "latest_analysis", None) or {}
        val = la.get("overall_score") if isinstance(la, dict) else None
        return float(val) if val is not None else -1.0

    return [c.id for c in sorted(roster, key=score, reverse=True)[:n]]


def try_interview(
    question: str,
    page: CopilotPageContext,
    *,
    candidate_repo: Any,
    campaign_repo: Any,
    note_repo: Any = None,
) -> Optional[tuple[list[InterviewPack], CopilotStructuredResponse]]:
    if not _is_interview(question):
        return None

    focus, sections = _focus_and_sections(question)
    ids: list[str] = []

    if page.candidate_id:
        ids = [page.candidate_id]
    elif page.campaign_id:
        top = _TOP_N_RE.search(question)
        if top:
            n = _WORD_N.get((top.group(1) or "").lower(), 2) if top.group(1) else 2
            ids = _top_ids(page.campaign_id, max(1, min(n, 3)), candidate_repo)
        else:
            named = _resolve_named(question, page.campaign_id, candidate_repo)
            if named:
                ids = [named]
    if not ids:
        return None

    packs: list[InterviewPack] = []
    for cid in ids:
        packs.append(run_interview(
            cid, campaign_id=page.campaign_id, focus=focus, instruction=question,
            sections=sections if len(ids) == 1 else None,
            candidate_repo=candidate_repo, campaign_repo=campaign_repo, note_repo=note_repo,
        ))
    return packs, _render(packs)


def safe_try_interview(
    question: str,
    page: CopilotPageContext,
    candidate_repo: Any,
    campaign_repo: Any,
    note_repo: Any = None,
) -> Optional[tuple[list[InterviewPack], CopilotStructuredResponse]]:
    """try_interview that never raises — the copilot must never break on this."""
    try:
        return try_interview(question, page, candidate_repo=candidate_repo, campaign_repo=campaign_repo, note_repo=note_repo)
    except Exception as exc:  # pragma: no cover
        logger.info("Copilot interview skipped: %s", exc)
        return None


def _render(packs: list[InterviewPack]) -> CopilotStructuredResponse:
    if len(packs) == 1:
        return _render_single(packs[0])

    lines: list[str] = []
    all_sources: list[CopilotSource] = []
    for p in packs:
        lines.append(f"**Interview plan — {p.candidate_name}**")
        if p.executive_summary.why_shortlisted:
            lines.append(p.executive_summary.why_shortlisted)
        for q in p.technical_questions[:3]:
            lines.append(f"- ({q.difficulty}) {q.question}")
        fr = p.final_recommendation
        if fr.recommendation:
            lines.append(f"_Recommendation: {fr.recommendation}_")
        lines.append("")
        all_sources = p.sources_used or all_sources
    return CopilotStructuredResponse(
        answer="\n".join(lines).strip(),
        summary=f"Interview packs for {len(packs)} candidates.",
        confidence=0 if any(p.degraded for p in packs) else 75,
        reasoning_summary="Generated by the shared Interview Intelligence engine.",
        followups=["Generate harder questions", "Compare these candidates", "Only behavioral"],
        sources_used=all_sources,
        degraded=any(p.degraded for p in packs),
    )


def _render_single(pack: InterviewPack) -> CopilotStructuredResponse:
    es = pack.executive_summary
    st = pack.interview_strategy
    lines = [f"**Interview plan — {pack.candidate_name}**"]
    if es.why_shortlisted:
        lines.append(es.why_shortlisted)
    if st.recommended_duration_minutes:
        lines.append(f"\n_Suggested: {st.recommended_duration_minutes} min across {len(st.stages)} stage(s)._")
    if pack.technical_questions:
        lines.append("\n**Technical**")
        for q in pack.technical_questions[:5]:
            lines.append(f"- ({q.difficulty}) {q.question}")
    if pack.behavioral_questions:
        lines.append("\n**Behavioral**")
        for q in pack.behavioral_questions[:3]:
            lines.append(f"- {q.question}")
    if pack.skill_verifications:
        lines.append("\n**Verify**")
        for v in pack.skill_verifications[:4]:
            lines.append(f"- **{v.skill}**: {v.verification_method}")
    fr = pack.final_recommendation
    if fr.recommendation:
        lines.append(f"\n**Recommendation:** {fr.recommendation} — {fr.reasoning}")

    return CopilotStructuredResponse(
        answer="\n".join(lines),
        summary=es.who or es.why_shortlisted,
        strengths=es.key_differentiators[:5],
        weaknesses=[r.detail for r in pack.risks[:4]],
        recommendations=[f"{r.category}: {r.how_to_investigate}" for r in pack.risks[:4]],
        confidence=0 if pack.degraded else 75,
        reasoning_summary="Generated by the shared Interview Intelligence engine.",
        followups=["Generate harder questions", "Only behavioral", "Focus on system design", "Generate a coding round"],
        sources_used=pack.sources_used,
        degraded=pack.degraded,
    )
