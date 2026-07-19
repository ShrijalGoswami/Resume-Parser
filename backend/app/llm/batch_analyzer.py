"""
Batch candidate analyzer — a single JD-aware LLM call per resume.

Routed through the **AI Orchestrator** (Capability.BATCH_CANDIDATE) so it shares
the one and only LLM path with every other capability: provider selection +
fallback, unified retry policy (incl. no-retry on rate-limits), usage
instrumentation, QA response cache, and centralized logging. No direct provider
calls remain here.

Returns everything the recruiter workflow needs in one call: summary, matching /
missing skills, project relevance, strengths, weaknesses, recommendation, and
tailored interview questions.
"""

import logging

from pydantic import BaseModel, Field

from app.ai import Capability, orchestrator
from app.ai.utils.errors import AIError
from app.schemas.resume import ResumeData

logger = logging.getLogger(__name__)


class GroqBatchAnalysis(BaseModel):
    """Validates the qualitative JD-aware analysis returned by the LLM.

    (Name kept for import stability; the analysis is provider-agnostic now.)"""
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
    Run the single-call JD-aware analysis for one candidate through the AI
    orchestrator (Capability.BATCH_CANDIDATE).

    Raises RuntimeError if the LLM cannot be reached or never returns valid,
    schema-conformant JSON — the caller (batch_service) decides how to degrade.
    """
    resume_json = resume_data.model_dump_json(indent=2)
    try:
        result = orchestrator.run(
            capability=Capability.BATCH_CANDIDATE,
            variables={"job_description": job_description, "resume_json": resume_json},
            schema=GroqBatchAnalysis,
        )
        return result.data
    except AIError as exc:
        # Preserve the historical contract: batch_service catches RuntimeError and
        # degrades that candidate to a deterministic-only result.
        raise RuntimeError(f"Batch candidate analysis failed via orchestrator: {exc}") from exc
