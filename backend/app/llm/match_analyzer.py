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

Reuses retry infrastructure from the existing analyzer module.
"""

import json
import logging

from app.schemas.resume import ResumeData
from app.schemas.match_analysis import GroqMatchAnalysis, MatchAnalysisResponse
from app.llm.match_prompts import MATCH_SYSTEM_PROMPT, build_match_prompt
from app.llm.analyzer import _strip_fences, _call_with_network_retries
from app.nlp.match_scorer import calculate_match_score

logger = logging.getLogger(__name__)

_MAX_JSON_RETRIES = 3
_MAX_SCHEMA_RETRIES = 2


def _parse_match_json(
    system_prompt: str,
    user_prompt: str,
    max_retries: int = _MAX_JSON_RETRIES,
) -> dict:
    """Call Groq and retry if the response is not valid JSON."""
    for attempt in range(1, max_retries + 1):
        raw = _call_with_network_retries(system_prompt, user_prompt)
        cleaned = _strip_fences(raw)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(
                f"Match JSON parse failed attempt {attempt}/{max_retries}: {e} | "
                f"preview={cleaned[:200]!r}"
            )

    raise RuntimeError(f"Groq returned invalid JSON after {max_retries} attempts.")


def _validate_match_response(
    system_prompt: str,
    user_prompt: str,
    max_retries: int = _MAX_SCHEMA_RETRIES,
) -> GroqMatchAnalysis:
    """Call Groq, parse JSON, and validate against GroqMatchAnalysis schema."""
    for attempt in range(1, max_retries + 1):
        parsed = _parse_match_json(system_prompt, user_prompt)
        try:
            return GroqMatchAnalysis(**parsed)
        except Exception as e:
            logger.warning(
                f"Match schema validation failed attempt {attempt}/{max_retries}: {e}"
            )

    raise RuntimeError(
        f"Groq match response failed schema validation after {max_retries} attempts."
    )


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
    # ── Step 1: build prompts ─────────────────────────────────────────────────
    resume_json = resume_data.model_dump_json(indent=2)
    user_prompt = build_match_prompt(job_description, resume_json)

    # ── Step 2: get Groq qualitative analysis ─────────────────────────────────
    logger.info("Requesting Groq match analysis...")
    groq_result = _validate_match_response(MATCH_SYSTEM_PROMPT, user_prompt)
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
