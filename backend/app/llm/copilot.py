"""
AI Recruiter Copilot service.

Answers a recruiter's natural-language question about ONE candidate, grounded
in structured candidate context (profile + ATS + ranking + recommendation + JD).
Reuses the existing Groq retry/parse infrastructure. Returns an explainable,
structured response and degrades gracefully when the LLM is unavailable.
"""

import json
import logging

from app.schemas.copilot import CopilotRequest, CopilotResponse, CopilotEvidence, ChatMessage
from app.services.candidate_context import build_candidate_context
from app.llm.analyzer import _strip_fences, _call_with_network_retries
from app.llm.groq_client import GroqConfigError
from app.llm.copilot_prompts import COPILOT_SYSTEM_PROMPT, build_copilot_prompt

logger = logging.getLogger(__name__)

# Keep token usage bounded: only the most recent turns are sent, each clamped.
_MAX_HISTORY_TURNS = 8
_MAX_MESSAGE_CHARS = 1200
_MAX_JSON_RETRIES = 3


def _format_history(history: list[ChatMessage]) -> str:
    recent = history[-_MAX_HISTORY_TURNS:]
    lines = []
    for m in recent:
        speaker = "Recruiter" if m.role == "user" else "Copilot"
        content = (m.content or "")[:_MAX_MESSAGE_CHARS]
        lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def _fallback_response(request: CopilotRequest, reason: str) -> CopilotResponse:
    """
    Deterministic, still-useful answer built from structured data when the LLM
    is unavailable. Never leaves the recruiter without a response.
    """
    c = request.candidate
    lines = [
        f"**AI narrative is temporarily unavailable**, so here is what the structured analysis shows for **{c.name or 'this candidate'}**:",
        "",
        f"- Overall score: **{c.overall_score}/100** ({c.match_category})",
        f"- ATS score: **{c.ats_score}/100**",
        f"- Hiring recommendation: **{c.recommendation or 'N/A'}**",
    ]
    if c.missing_skills:
        lines.append(f"- Missing skills: {', '.join(c.missing_skills[:8])}")
    if c.strengths:
        lines.append(f"- Strengths: {c.strengths[0]}")
    evidence = [
        CopilotEvidence(category="ranking", detail=f"Overall {c.overall_score}/100, rank #{c.rank}"),
        CopilotEvidence(category="ats", detail=f"ATS score {c.ats_score}/100"),
    ]
    return CopilotResponse(
        answer="\n".join(lines),
        confidence=0,
        evidence=evidence,
        reasoning_summary=f"Derived from deterministic analysis only ({reason}).",
        followups=["Explain their ATS score.", "Which required skills are missing?"],
        degraded=True,
    )


def answer_question(request: CopilotRequest) -> CopilotResponse:
    """Produce a grounded, explainable answer. Never raises — degrades gracefully."""
    builder = build_candidate_context(request.candidate, request.job_description)
    context = builder.build()
    available = builder.available_evidence()
    history_text = _format_history(request.history)
    question = (request.message or "").strip()[:_MAX_MESSAGE_CHARS]

    user_prompt = build_copilot_prompt(context, available, history_text, question)

    try:
        raw = _parse_json_with_retries(COPILOT_SYSTEM_PROMPT, user_prompt)
    except GroqConfigError as e:
        logger.warning(f"Copilot: LLM not configured: {e}")
        return _fallback_response(request, "LLM not configured")
    except Exception as e:
        logger.warning(f"Copilot: LLM call failed: {e}")
        return _fallback_response(request, "LLM temporarily unavailable")

    try:
        response = CopilotResponse(**raw)
    except Exception as e:
        logger.warning(f"Copilot: response schema invalid, wrapping raw answer: {e}")
        # If the model returned prose or a partial object, still surface something useful.
        answer = raw.get("answer") if isinstance(raw, dict) else None
        return CopilotResponse(
            answer=answer or "I couldn't produce a fully structured answer. Please rephrase your question.",
            confidence=int(raw.get("confidence", 30)) if isinstance(raw, dict) else 30,
            evidence=[],
            reasoning_summary="",
            followups=[],
        )

    logger.info(f"Copilot: answered '{question[:60]}' | confidence={response.confidence} evidence={len(response.evidence)}")
    return response


def _parse_json_with_retries(system_prompt: str, user_prompt: str) -> dict:
    """Call Groq and retry until valid JSON is returned."""
    last_error: Exception | None = None
    for attempt in range(1, _MAX_JSON_RETRIES + 1):
        raw = _call_with_network_retries(system_prompt, user_prompt)
        cleaned = _strip_fences(raw)
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
            last_error = ValueError("Top-level JSON is not an object")
        except json.JSONDecodeError as e:
            last_error = e
            logger.warning(f"Copilot JSON parse failed attempt {attempt}/{_MAX_JSON_RETRIES}: {e}")
    raise RuntimeError(f"Copilot returned invalid JSON after {_MAX_JSON_RETRIES} attempts: {last_error}")
