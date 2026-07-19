"""
Resume analysis orchestrator.

Pipeline:
    ResumeData
        │
        ▼
    ATSScorer (rule-based, deterministic)
        │  → ats_score, score_breakdown, confidence_score
        ▼
    Groq (explanation layer only)
        │  → candidate_summary, strengths, areas_for_improvement,
        │    career_recommendations, interview_readiness, recommended_roles
        ▼
    AnalysisResponse (merged output)

Retry policy:
    Network / Timeout errors : up to 3 attempts
    JSON parse failures      : up to 3 attempts
    Schema validation errors : up to 2 attempts (1 retry)
"""

import logging
from app.schemas.resume import ResumeData
from app.schemas.analysis import AnalysisResponse, GroqExplanation
from app.nlp.ats_scorer import calculate_ats_score
from app.ai import orchestrator, Capability
from app.ai.context import build_resume_analysis_context

logger = logging.getLogger(__name__)


def analyze_resume(resume_data: ResumeData) -> AnalysisResponse:
    """
    Full analysis pipeline: deterministic ATS scoring → Groq explanation → merged response.

    The LLM round-trip now flows through the AI orchestrator
    (Capability.RESUME_ANALYSIS); deterministic scoring and merging stay here.

    Args:
        resume_data: Validated structured resume data from the extraction pipeline.

    Returns:
        AnalysisResponse with rule-based scores and LLM-generated explanations.
    """
    # ── Step 1: deterministic ATS scoring ─────────────────────────────────────
    ats_score, breakdown, confidence_score = calculate_ats_score(resume_data)
    logger.info(
        f"Deterministic scoring complete | ats_score={ats_score} "
        f"confidence={confidence_score}"
    )

    # ── Step 2: LLM explanation via the AI orchestrator ───────────────────────
    logger.info("Requesting Groq explanation layer via AI orchestrator...")
    context = build_resume_analysis_context(resume_data, ats_score, breakdown)
    result = orchestrator.run(
        capability=Capability.RESUME_ANALYSIS,
        variables=context,
        schema=GroqExplanation,
    )
    explanation = result.data
    logger.info("Groq explanation received and validated.")

    # ── Step 3: merge deterministic scores with LLM explanations ─────────────
    response = AnalysisResponse(
        analysis_version="v1.0",
        confidence_score=confidence_score,
        ats_score=ats_score,
        score_breakdown=breakdown,
        candidate_summary=explanation.candidate_summary,
        strengths=explanation.strengths,
        areas_for_improvement=explanation.areas_for_improvement,
        career_recommendations=explanation.career_recommendations,
        interview_readiness=explanation.interview_readiness,
        recommended_roles=explanation.recommended_roles,
    )

    logger.info(
        f"Analysis complete | ats={ats_score} confidence={confidence_score} "
        f"version={response.analysis_version}"
    )
    return response
