"""
Candidate Comparison orchestration (product layer).

Fetches the campaign, its candidate roster (with analyses), and recruiter notes
through the RLS-scoped repositories; enforces that every requested candidate
belongs to the authenticated recruiter's campaign (no cross-campaign / cross-
tenant comparison); composes context via the reusable ComparisonContextBuilder;
and calls the orchestrated comparison capability. Falls back to a deterministic,
score-based report when the LLM is unavailable.

Reused by both the campaign comparison route and the Recruiter Copilot, so the
comparison logic lives in exactly one place.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import HTTPException, status

from app.ai.context.comparison_context import build_comparison_context
from app.ai.services.comparison_service import generate_comparison
from app.schemas.batch import CandidateResult
from app.schemas.comparison import (
    CandidateComparisonReport,
    ComparedCandidate,
    ExecutiveSummary,
    HiringVerdict,
    RankingRow,
    RiskItem,
    RiskProfile,
    SkillMatrixRow,
    StrengthProfile,
    InterviewFocus,
)
from app.schemas.copilot import CopilotSource

logger = logging.getLogger(__name__)

MIN_CANDIDATES = 2
MAX_CANDIDATES = 5


def _candidate_result(candidate: Any) -> Optional[CandidateResult]:
    la = getattr(candidate, "latest_analysis", None)
    result = la.get("result") if isinstance(la, dict) else None
    if not isinstance(result, dict):
        return None
    try:
        return CandidateResult(**result)
    except Exception as exc:  # pragma: no cover — tolerate schema drift
        logger.warning("Comparison: could not reconstruct CandidateResult: %s", exc)
        return None


def run_comparison(
    campaign_id: str,
    candidate_ids: list[str],
    *,
    campaign_repo,
    candidate_repo,
    note_repo=None,
    question: str = "",
) -> CandidateComparisonReport:
    """Compare 2–5 candidates from one campaign. Raises HTTPException on misuse."""
    # De-duplicate while preserving order.
    seen: set[str] = set()
    ordered_ids = [cid for cid in candidate_ids if not (cid in seen or seen.add(cid))]
    if not (MIN_CANDIDATES <= len(ordered_ids) <= MAX_CANDIDATES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Select between {MIN_CANDIDATES} and {MAX_CANDIDATES} candidates to compare.",
        )

    # Campaign must belong to the recruiter (RLS + explicit scoping → 404 otherwise).
    campaign = campaign_repo.get(campaign_id)
    campaign_dict = campaign.model_dump()

    # Roster with analyses in 2 queries (no N+1). Everything is recruiter-scoped.
    roster = candidate_repo.list_for_campaign_with_analysis(campaign_id)
    by_id = {c.id: c for c in roster}

    # Security: every requested candidate must be in THIS campaign's roster.
    missing = [cid for cid in ordered_ids if cid not in by_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more candidates were not found in this campaign.",
        )

    entries: list[dict[str, Any]] = []
    compared: list[ComparedCandidate] = []
    any_notes = False
    any_analysis = False
    for cid in ordered_ids:
        cand = by_id[cid]
        result = _candidate_result(cand)
        any_analysis = any_analysis or result is not None
        name = getattr(cand, "full_name", None) or (result.name if result else None) or "Unnamed candidate"
        notes: list[str] = []
        if note_repo is not None:
            try:
                notes = [n.body for n in note_repo.list_for_candidate(cid) if getattr(n, "body", None)]
            except Exception as exc:  # pragma: no cover
                logger.info("Comparison: notes unavailable for %s: %s", cid, exc)
        any_notes = any_notes or bool(notes)
        entries.append({"candidate_id": cid, "name": name, "result": result, "notes": notes})
        compared.append(ComparedCandidate(candidate_id=cid, name=name))

    context_text, roster_text = build_comparison_context(campaign_dict, entries)

    # Organizational memory before reasoning.
    from app.enterprise.context import current_org_id
    from app.knowledge.injection import memory_block
    _mem, _msrc = memory_block(current_org_id.get(), question or "compare candidates " + " ".join(c.name for c in compared))
    if _mem:
        context_text = _mem + context_text

    sources = [CopilotSource(source="Current Campaign", detail=campaign_dict.get("title") or "")]
    if _mem:
        sources.append(CopilotSource(source="Organizational Memory", detail=f"{len(_msrc)} remembered fact(s)"))
    if (campaign_dict.get("job_description") or "").strip():
        sources.append(CopilotSource(source="Job Description"))
    if any_analysis:
        sources.append(CopilotSource(source="Candidate Analysis", detail="Scores, skills, ranking"))
        sources.append(CopilotSource(source="Resume", detail="Parsed resume data"))
    if any_notes:
        sources.append(CopilotSource(source="Recruiter Notes"))

    fallback = _deterministic_report(campaign_id, entries, compared, sources)

    report = generate_comparison(
        context_text=context_text,
        roster_text=roster_text,
        candidates=compared,
        campaign_id=campaign_id,
        sources=sources,
        question=question,
        fallback=fallback,
    )
    # Accumulate organizational memory from this comparison (incremental, best-effort).
    from app.knowledge.service import safe_ingest
    safe_ingest(current_org_id.get(), "comparison", source_id=campaign_id, report=report.model_dump())
    return report


def _deterministic_report(
    campaign_id: str,
    entries: list[dict[str, Any]],
    compared: list[ComparedCandidate],
    sources: list[CopilotSource],
) -> CandidateComparisonReport:
    """A grounded, score-based report used when the LLM is unavailable."""
    def score(entry: dict[str, Any]) -> float:
        r: Optional[CandidateResult] = entry.get("result")
        return float(r.overall_score) if r else -1.0

    ranked = sorted(entries, key=score, reverse=True)
    rankings: list[RankingRow] = []
    matrix: list[SkillMatrixRow] = []
    strengths: list[StrengthProfile] = []
    risks: list[RiskProfile] = []
    verdicts: list[HiringVerdict] = []
    focus: list[InterviewFocus] = []

    for i, e in enumerate(ranked, start=1):
        cid, name, r = e["candidate_id"], e["name"], e.get("result")
        if r is None:
            rankings.append(RankingRow(candidate_id=cid, name=name, rank=i,
                                       experience_summary="Not analysed yet."))
            verdicts.append(HiringVerdict(candidate_id=cid, name=name, recommendation="Maybe",
                                          rationale="No stored analysis available."))
            continue
        rankings.append(RankingRow(
            candidate_id=cid, name=name, rank=i,
            overall_score=r.overall_score, ai_match=round((r.semantic_similarity or 0) * 100),
            ats_score=r.ats_score,
            experience_summary=f"{r.years_experience} years; {r.match_category or 'n/a'}.",
            strength_summary=(r.strengths[0] if r.strengths else ""),
            weakness_summary=(r.weaknesses[0] if r.weaknesses else ""),
        ))
        matrix.append(SkillMatrixRow(
            candidate_id=cid, name=name,
            required_skills=list(r.matching_skills[:12]),
            missing_skills=list(r.missing_skills[:12]),
        ))
        strengths.append(StrengthProfile(
            candidate_id=cid, name=name, technical_strengths=list(r.strengths[:6]),
        ))
        risks.append(RiskProfile(
            candidate_id=cid, name=name,
            risks=[RiskItem(category="Missing skill", detail=s) for s in r.missing_skills[:5]],
        ))
        verdicts.append(HiringVerdict(
            candidate_id=cid, name=name, recommendation=r.recommendation or "Maybe",
            rationale=r.recommendation_explanation or f"Overall {r.overall_score}/100 ({r.match_category}).",
        ))
        focus.append(InterviewFocus(
            candidate_id=cid, name=name,
            weak_areas_to_verify=list(r.missing_skills[:5]),
        ))

    best = ranked[0] if ranked else None
    runner = ranked[1] if len(ranked) > 1 else None
    summary = ExecutiveSummary(
        overall_recommendation=(
            f"{best['name']} leads on stored scores." if best else "Insufficient data."
        ),
        hiring_confidence=0,
        best_candidate_id=best["candidate_id"] if best else "",
        best_candidate_name=best["name"] if best else "",
        runner_up_id=runner["candidate_id"] if runner else "",
        runner_up_name=runner["name"] if runner else "",
        comparison_confidence=0,
        summary="AI narrative is temporarily unavailable; this ranking is derived "
        "deterministically from stored candidate scores.",
    )
    return CandidateComparisonReport(
        executive_summary=summary, rankings=rankings, skill_matrix=matrix,
        strengths=strengths, risks=risks, hiring_recommendations=verdicts,
        interview_focus=focus, tradeoffs=[], campaign_id=campaign_id,
        candidates=compared, sources_used=sources, degraded=True,
    )
