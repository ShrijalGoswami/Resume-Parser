"""
AI Recruiter Copilot service (stateless endpoint).

Answers a recruiter's natural-language question about ONE candidate, grounded in
structured candidate context (profile + ATS + ranking + recommendation + JD).

As of V5/Sprint 4 this flows through the AI Foundation Layer
(`orchestrator.run(Capability.RECRUITER_COPILOT, ...)`) — no provider is called
directly here. Returns the explainable, structured `CopilotResponse` the
existing stateless UI expects, and degrades gracefully when the LLM is
unavailable so the recruiter is never left without a response.
"""

import logging

from app.schemas.copilot import (
    ChatMessage,
    CopilotEvidence,
    CopilotRequest,
    CopilotResponse,
    CopilotSource,
    CopilotStructuredResponse,
)
from app.services.candidate_context import build_candidate_context
from app.ai.context.copilot_context import classify_intent
from app.ai.services.copilot_service import generate_copilot_answer

logger = logging.getLogger(__name__)

_MAX_MESSAGE_CHARS = 1500


def _history_dicts(history: list[ChatMessage]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in history]


def _deterministic_fallback(request: CopilotRequest) -> CopilotStructuredResponse:
    """Still-useful answer built from structured data when the LLM is unavailable."""
    c = request.candidate
    lines = [
        f"**AI narrative is temporarily unavailable**, so here is what the structured "
        f"analysis shows for **{c.name or 'this candidate'}**:",
        "",
        f"- Overall score: **{c.overall_score}/100** ({c.match_category})",
        f"- ATS score: **{c.ats_score}/100**",
        f"- Hiring recommendation: **{c.recommendation or 'N/A'}**",
    ]
    if c.missing_skills:
        lines.append(f"- Missing skills: {', '.join(c.missing_skills[:8])}")
    return CopilotStructuredResponse(
        answer="\n".join(lines),
        summary=f"{c.name or 'Candidate'} scored {c.overall_score}/100 ({c.match_category}).",
        strengths=list(c.strengths[:5]) if c.strengths else [],
        weaknesses=list(c.weaknesses[:5]) if c.weaknesses else [],
        confidence=0,
        reasoning_summary="Derived from deterministic analysis only (LLM unavailable).",
        followups=["Explain their ATS score.", "Which required skills are missing?"],
        sources_used=[CopilotSource(source="Candidate Analysis", detail="Stored scores and ranking")],
        degraded=True,
    )


def _to_legacy_response(s: CopilotStructuredResponse) -> CopilotResponse:
    """Map the structured V5 response onto the stateless UI's CopilotResponse."""
    evidence = [CopilotEvidence(category=src.source, detail=src.detail or src.source) for src in s.sources_used]
    return CopilotResponse(
        answer=s.answer,
        confidence=s.confidence,
        evidence=evidence,
        reasoning_summary=s.reasoning_summary,
        followups=s.followups,
        degraded=s.degraded,
    )


def answer_question(request: CopilotRequest) -> CopilotResponse:
    """Produce a grounded, explainable answer. Never raises — degrades gracefully."""
    builder = build_candidate_context(request.candidate, request.job_description)
    context_text = builder.build()
    available = builder.available_evidence()
    question = (request.message or "").strip()[:_MAX_MESSAGE_CHARS]
    sources = [CopilotSource(source=title) for title in available]
    intent = classify_intent(question, page_type="candidate")

    structured = generate_copilot_answer(
        question=question,
        context_text=context_text,
        available_sources=available,
        sources=sources,
        history_messages=_history_dicts(request.history),
        intent=intent,
        fallback=_deterministic_fallback(request),
    )
    logger.info(
        "Copilot(stateless): answered '%s' | confidence=%s degraded=%s",
        question[:60], structured.confidence, structured.degraded,
    )
    return _to_legacy_response(structured)
