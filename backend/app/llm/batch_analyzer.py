"""
Batch candidate analyzer — a single JD-aware Groq call per resume.

Unlike chaining analyze_resume + analyze_match (two LLM calls), this makes one
call returning everything the recruiter workflow needs: summary, matching /
missing skills, project relevance, strengths, weaknesses, recommendation, and
tailored interview questions. Reuses the retry/parse infrastructure from the
existing analyzer module.
"""

import json
import logging

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeData
from app.llm.analyzer import _strip_fences, _call_with_network_retries
from app.llm.batch_prompts import BATCH_SYSTEM_PROMPT, build_batch_prompt

logger = logging.getLogger(__name__)

_MAX_JSON_RETRIES = 3
_MAX_SCHEMA_RETRIES = 2


class GroqBatchAnalysis(BaseModel):
    """Validates the qualitative JD-aware analysis returned by Groq."""
    candidate_summary: str = Field(default="")
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    relevant_projects: list[str] = Field(default_factory=list)
    less_relevant_projects: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    experience_relevance: str = Field(default="")
    hiring_recommendation: str = Field(default="Consider for Further Review")
    recommendation_explanation: str = Field(default="")
    interview_questions: list[str] = Field(default_factory=list)


def analyze_candidate(resume_data: ResumeData, job_description: str) -> GroqBatchAnalysis:
    """
    Run the single-call JD-aware analysis for one candidate.

    Raises RuntimeError (incl. GroqConfigError) if the LLM cannot be reached or
    never returns valid JSON — the caller decides how to degrade.
    """
    resume_json = resume_data.model_dump_json(indent=2)
    user_prompt = build_batch_prompt(job_description, resume_json)

    last_error: Exception | None = None
    for attempt in range(1, _MAX_SCHEMA_RETRIES + 1):
        raw = _parse_json(BATCH_SYSTEM_PROMPT, user_prompt)
        try:
            return GroqBatchAnalysis(**raw)
        except Exception as e:  # pydantic validation error
            last_error = e
            logger.warning(f"Batch analysis schema validation failed attempt {attempt}: {e}")

    raise RuntimeError(f"Groq batch response failed schema validation: {last_error}")


def _parse_json(system_prompt: str, user_prompt: str) -> dict:
    """Call Groq and retry until valid JSON is returned."""
    for attempt in range(1, _MAX_JSON_RETRIES + 1):
        raw = _call_with_network_retries(system_prompt, user_prompt)
        cleaned = _strip_fences(raw)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(
                f"Batch JSON parse failed attempt {attempt}/{_MAX_JSON_RETRIES}: {e} | "
                f"preview={cleaned[:200]!r}"
            )
    raise RuntimeError(f"Groq returned invalid JSON after {_MAX_JSON_RETRIES} attempts.")
