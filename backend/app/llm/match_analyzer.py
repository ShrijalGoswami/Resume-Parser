"""
JD-Resume match analysis orchestrator.

Pipeline:
    (JD text, ResumeData)
        │
        ▼
    Groq (qualitative analysis — no numeric scores)
        │  → matching_skills, missing_skills, experience_relevance,
        │    relevant_projects, less_relevant_projects,
        │    candidate_strengths, areas_for_improvement,
        │    hiring_recommendation, recommendation_explanation
        ▼
    Match Scorer (deterministic)
        │  → job_match_score, match_category
        ▼
    MatchAnalysisResponse (merged output)

The LLM round-trip now flows through the AI orchestrator
(Capability.JOB_MATCHING); deterministic scoring and merging stay here.
"""

import logging

from app.schemas.resume import ResumeData
from app.schemas.match_analysis import GroqMatchAnalysis, MatchAnalysisResponse
from app.nlp.match_scorer import calculate_match_score
from app.ai import orchestrator, Capability
from app.ai.context import build_job_matching_context

logger = logging.getLogger(__name__)


def analyze_match(resume_data: ResumeData, job_description: str) -> MatchAnalysisResponse:
    """
    Full match analysis pipeline:
        Groq qualitative analysis → deterministic scoring → merged response.

    Args:
        resume_data:     Validated structured resume data from the extraction pipeline.
        job_description: Raw job description text pasted by the recruiter.

    Returns:
        MatchAnalysisResponse with deterministic scores and Groq-generated insights.
    """
    # ── Step 1: get Groq qualitative analysis via the AI orchestrator ─────────
    logger.info("Requesting Groq match analysis via AI orchestrator...")
    context = build_job_matching_context(resume_data, job_description)
    result = orchestrator.run(
        capability=Capability.JOB_MATCHING,
        variables=context,
        schema=GroqMatchAnalysis,
    )
    groq_result = result.data
    logger.info("Groq match analysis received and validated.")

    # ── Step 3: calculate deterministic match score ───────────────────────────
    score, category = calculate_match_score(
        matching_skills=groq_result.matching_skills,
        missing_skills=groq_result.missing_skills,
        relevant_projects=groq_result.relevant_projects,
        less_relevant_projects=groq_result.less_relevant_projects,
        candidate_strengths=groq_result.candidate_strengths,
        areas_for_improvement=groq_result.areas_for_improvement,
        hiring_recommendation=groq_result.hiring_recommendation,
    )

    # ── Step 4: merge into final response ─────────────────────────────────────
    response = MatchAnalysisResponse(
        analysis_version="v1.1",
        job_match_score=score,
        match_category=category,
        matching_skills=groq_result.matching_skills,
        missing_skills=groq_result.missing_skills,
        experience_relevance=groq_result.experience_relevance,
        relevant_projects=groq_result.relevant_projects,
        less_relevant_projects=groq_result.less_relevant_projects,
        candidate_strengths=groq_result.candidate_strengths,
        areas_for_improvement=groq_result.areas_for_improvement,
        hiring_recommendation=groq_result.hiring_recommendation,
        recommendation_explanation=groq_result.recommendation_explanation,
    )

    logger.info(
        f"Match analysis complete | score={score} category={category} "
        f"matched={len(groq_result.matching_skills)} missing={len(groq_result.missing_skills)}"
    )
    return response
