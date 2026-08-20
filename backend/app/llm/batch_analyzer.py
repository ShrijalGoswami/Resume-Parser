"""
Batch candidate analyzer — a single JD-aware LLM call per resume.

Routed through the **AI Orchestrator** (Capability.BATCH_CANDIDATE) so it shares
the one and only LLM path with every other capability: provider selection +
fallback, unified retry policy (incl. no-retry on rate-limits), usage
instrumentation, QA response cache, and centralized logging. No direct provider
calls remain here.

Returns everything the recruiter workflow needs in one call: summary, matching /
missing skills, project relevance, strengths, weaknesses, and recommendation.
Interview questions are NOT generated here (prompt v1.1) — the dedicated
Interview Intelligence engine produces them on demand from the stored analysis.
"""

import logging

from pydantic import BaseModel, Field

from app.ai import Capability, orchestrator
from app.ai.utils.errors import AIError
from app.ai.utils.untrusted import ground_claims, normalize_skill
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
    # No longer requested by the prompt (v1.1). Kept so analyses produced before
    # the change — and QA-cache replays of them — still validate.
    interview_questions: list[str] = Field(default_factory=list)


def _enforce_grounding(analysis: GroqBatchAnalysis, resume_json: str) -> GroqBatchAnalysis:
    """Drop claimed matching skills the résumé does not actually evidence.

    The last line of defence against a résumé that talks the model into inflating
    it. Prompt hardening asks the model to behave; this does not depend on it.
    It matters disproportionately because the match score is derived from these
    fields — `matching/(matching+missing) * 40` — so a fabricated skill list is
    worth real points, and an emptied `missing_skills` is worth the rest.

    A rejected claim is recorded as a weakness rather than silently deleted: a
    recruiter should be able to see that the document overstated itself.
    """
    supported, unsupported = ground_claims(analysis.matching_skills, resume_json)
    if not unsupported:
        return analysis

    logger.warning(
        "Dropped %d unevidenced matching_skills claim(s) from candidate analysis: %s",
        len(unsupported),
        ", ".join(unsupported[:10]),
    )
    analysis.matching_skills = supported

    # A rejected claim is a JD-relevant skill the document does not evidence — which
    # is the definition of a missing skill. Reclassifying rather than deleting is
    # what actually closes the scoring exploit: the score is
    # `matching/(matching+missing) * 40`, so merely removing fabricated matches
    # while `missing_skills` stayed empty still awarded full marks on whatever
    # single claim survived.
    known = {normalize_skill(s) for s in analysis.missing_skills}
    analysis.missing_skills = [
        *analysis.missing_skills,
        *[s for s in unsupported if normalize_skill(s) not in known],
    ]

    note = (
        "Résumé asserted skills it does not evidence "
        f"({', '.join(unsupported[:5])}) — treat its claims with care."
    )
    if note not in analysis.weaknesses:
        analysis.weaknesses = [*analysis.weaknesses, note]
    return analysis


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
        return _enforce_grounding(result.data, resume_json)
    except AIError as exc:
        # Preserve the historical contract: batch_service catches RuntimeError and
        # degrades that candidate to a deterministic-only result.
        raise RuntimeError(f"Batch candidate analysis failed via orchestrator: {exc}") from exc
