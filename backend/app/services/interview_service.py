"""
Interview Intelligence orchestration (product layer).

Fetches a candidate's stored data through the RLS-scoped repositories, composes
grounded context via the reusable builders (the same multi-source candidate
context the Copilot uses + campaign requirements + optional comparison/semantic
findings), and calls the orchestrated interview capability. Falls back to a
deterministic, data-derived pack when the LLM is unavailable.

Reused by the interview route AND the Recruiter Copilot, so interview logic lives
in exactly one place. Supports interactive mode (focus/instruction/sections) so
follow-ups regenerate only what was asked for.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import HTTPException, status

from app.ai.context.interview_context import candidate_line, compose_interview_context
from app.ai.services.interview_service import generate_interview_pack
from app.schemas.batch import CandidateResult
from app.schemas.copilot import CopilotSource
from app.schemas.interview import (
    ExecutiveCandidateSummary,
    FinalInterviewRecommendation,
    InterviewPack,
    InterviewRisk,
    ScorecardCategory,
    SkillVerification,
)
from app.services.candidate_context import build_candidate_context

logger = logging.getLogger(__name__)

_SCORECARD_CATEGORIES = [
    ("Technical", 25), ("Problem Solving", 20), ("Communication", 15),
    ("Leadership", 10), ("Learning Ability", 10), ("Culture Fit", 10), ("Ownership", 10),
]


def run_interview(
    candidate_id: str,
    *,
    campaign_id: Optional[str] = None,
    focus: str = "blueprint",
    instruction: str = "",
    sections: Optional[list[str]] = None,
    candidate_repo: Any,
    campaign_repo: Any,
    note_repo: Any = None,
    comparison_text: Optional[str] = None,
) -> InterviewPack:
    """Generate an interview pack for one candidate. Raises HTTPException on misuse."""
    # Candidate must belong to the recruiter (RLS + explicit scoping → 404 otherwise).
    candidate = candidate_repo.get(candidate_id)
    resolved_campaign_id = getattr(candidate, "campaign_id", None) or campaign_id or ""
    name = getattr(candidate, "full_name", None) or "Unnamed candidate"

    analysis = candidate_repo.latest_analysis(candidate_id)
    result = _result_from_row(analysis)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This candidate has not been analysed yet — analyse them before generating an interview pack.",
        )
    name = name if name != "Unnamed candidate" else (result.name or name)

    # Campaign requirements + JD.
    campaign_dict: dict[str, Any] = {}
    job_description = ""
    if resolved_campaign_id:
        try:
            campaign = campaign_repo.get(resolved_campaign_id)
            campaign_dict = campaign.model_dump()
            job_description = campaign_dict.get("job_description") or ""
        except Exception as exc:  # pragma: no cover
            logger.info("Interview: campaign unavailable: %s", exc)

    # Recruiter notes.
    notes: list[str] = []
    if note_repo is not None:
        try:
            notes = [n.body for n in note_repo.list_for_candidate(candidate_id) if getattr(n, "body", None)]
        except Exception as exc:  # pragma: no cover
            logger.info("Interview: notes unavailable: %s", exc)

    # Reuse the multi-source candidate context (resume + analysis + ATS + ranking + JD + notes).
    candidate_block = build_candidate_context(result, job_description, notes).build()
    context_text = compose_interview_context(
        candidate_block=candidate_block,
        campaign=campaign_dict or None,
        comparison_text=comparison_text,
    )
    # Organizational memory before reasoning (successful interview strategies, prefs).
    from app.enterprise.context import current_org_id
    from app.knowledge.injection import memory_block
    _mem, _msrc = memory_block(current_org_id.get(), f"interview {name} " + instruction)
    if _mem:
        context_text = _mem + context_text

    sources = [CopilotSource(source="Selected Candidate", detail=name),
               CopilotSource(source="Resume", detail="Parsed resume data"),
               CopilotSource(source="Candidate Analysis", detail="Scores, skills, ranking")]
    if job_description.strip():
        sources.append(CopilotSource(source="Job Description"))
    if notes:
        sources.append(CopilotSource(source="Recruiter Notes", detail=f"{len(notes)} note(s)"))
    if comparison_text:
        sources.append(CopilotSource(source="Candidate Comparison"))

    fallback = _deterministic_pack(candidate_id, name, resolved_campaign_id, focus, result, sources)

    pack = generate_interview_pack(
        context_text=context_text,
        candidate_line=candidate_line(name, candidate_id),
        candidate_id=candidate_id,
        candidate_name=name,
        campaign_id=resolved_campaign_id,
        sources=sources,
        focus=focus,
        instruction=instruction,
        sections=sections,
        fallback=fallback,
    )
    from app.knowledge.service import safe_ingest
    safe_ingest(current_org_id.get(), "interview", source_id=candidate_id,
                pack=pack.model_dump(), campaign_title=campaign_dict.get("title", ""), candidate_name=name)
    return pack


def _result_from_row(row: Optional[dict]) -> Optional[CandidateResult]:
    result_dict = row.get("result") if isinstance(row, dict) else None
    if not isinstance(result_dict, dict):
        return None
    try:
        return CandidateResult(**result_dict)
    except Exception:  # pragma: no cover
        return None


def _deterministic_pack(
    candidate_id: str, name: str, campaign_id: str, focus: str,
    result: CandidateResult, sources: list[CopilotSource],
) -> InterviewPack:
    """A grounded, data-derived pack used when the LLM is unavailable."""
    rec_map = {"Strong Hire": "Strong Hire", "Hire": "Hire", "Maybe": "Borderline"}
    rec = rec_map.get(result.recommendation or "", "Borderline")
    return InterviewPack(
        candidate_id=candidate_id, candidate_name=name, campaign_id=campaign_id, focus=focus,
        executive_summary=ExecutiveCandidateSummary(
            who=result.summary or f"{name}, {result.years_experience} years experience.",
            why_shortlisted=result.recommendation_explanation or f"Overall {result.overall_score}/100 ({result.match_category}).",
            key_differentiators=list(result.strengths[:3]),
        ),
        skill_verifications=[
            SkillVerification(
                skill=s, verification_method="Targeted technical discussion + a short hands-on task.",
                discussion_topic=f"Depth of {s} experience.", confidence_level="Low",
            )
            for s in (result.missing_skills[:5] or result.top_skills[:3])
        ],
        risks=[
            InterviewRisk(category="Missing skill", detail=f"No clear evidence of {s}.",
                          how_to_investigate=f"Ask for a concrete example of using {s} in production.")
            for s in result.missing_skills[:5]
        ],
        scorecard=[
            ScorecardCategory(category=c, weight=w, suggested_focus="", notes="")
            for c, w in _SCORECARD_CATEGORIES
        ],
        final_recommendation=FinalInterviewRecommendation(
            recommendation=rec,
            reasoning=result.recommendation_explanation or f"Derived from stored scores: overall {result.overall_score}/100.",
            uncertainty="AI narrative unavailable; this pack is derived deterministically from stored analysis.",
        ),
        sources_used=sources, degraded=True,
    )
