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

import json
import re
import logging
from app.schemas.resume import ResumeData
from app.schemas.analysis import AnalysisResponse, GroqExplanation
from app.llm.groq_client import call_groq
from app.llm.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.nlp.ats_scorer import calculate_ats_score

logger = logging.getLogger(__name__)

_MAX_NETWORK_RETRIES = 3
_MAX_JSON_RETRIES = 3
_MAX_SCHEMA_RETRIES = 2  # 1 retry after initial failure


def _strip_fences(raw: str) -> str:
    """Removes markdown code fences that LLMs occasionally emit despite instructions."""
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    return cleaned.strip()


def _call_with_network_retries(
    system_prompt: str,
    user_prompt: str,
    max_retries: int = _MAX_NETWORK_RETRIES
) -> str:
    """
    Calls Groq and retries on network/timeout errors up to max_retries times.
    Raises RuntimeError if all attempts fail.
    """
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return call_groq(system_prompt=system_prompt, user_prompt=user_prompt)
        except RuntimeError as e:
            last_error = e
            logger.warning(f"Network/timeout error on attempt {attempt}/{max_retries}: {e}")

    raise RuntimeError(
        f"Groq network/timeout failed after {max_retries} attempts: {last_error}"
    )


def _parse_json_with_retries(
    system_prompt: str,
    user_prompt: str,
    max_retries: int = _MAX_JSON_RETRIES
) -> dict:
    """
    Calls Groq and retries if the response cannot be parsed as valid JSON.
    Raises RuntimeError after exhausting retries.
    """
    for attempt in range(1, max_retries + 1):
        raw = _call_with_network_retries(system_prompt, user_prompt)
        cleaned = _strip_fences(raw)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(
                f"JSON parse failed on attempt {attempt}/{max_retries}: {e} | "
                f"preview={cleaned[:200]!r}"
            )

    raise RuntimeError(f"Groq returned invalid JSON after {max_retries} attempts.")


def _validate_with_retries(
    system_prompt: str,
    user_prompt: str,
    max_retries: int = _MAX_SCHEMA_RETRIES
) -> GroqExplanation:
    """
    Calls Groq, parses JSON, and validates against GroqExplanation schema.
    Retries on schema validation failures.
    Raises RuntimeError after exhausting retries.
    """
    for attempt in range(1, max_retries + 1):
        parsed = _parse_json_with_retries(system_prompt, user_prompt)
        try:
            return GroqExplanation(**parsed)
        except Exception as e:
            logger.warning(
                f"Schema validation failed on attempt {attempt}/{max_retries}: {e}"
            )

    raise RuntimeError(
        f"Groq response failed schema validation after {max_retries} attempts."
    )


def analyze_resume(resume_data: ResumeData) -> AnalysisResponse:
    """
    Full analysis pipeline: deterministic ATS scoring → Groq explanation → merged response.

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

    # ── Step 2: build prompts with scores already embedded ────────────────────
    resume_json = resume_data.model_dump_json(indent=2)
    breakdown_json = breakdown.model_dump_json(indent=2)
    user_prompt = build_analysis_prompt(resume_json, ats_score, breakdown_json)

    logger.info("Requesting Groq explanation layer...")
    explanation = _validate_with_retries(SYSTEM_PROMPT, user_prompt)
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
