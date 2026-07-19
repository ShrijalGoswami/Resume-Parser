"""
Recruiter Copilot capability service.

Thin orchestration seam (Sprint 3 pattern): build variables → call the
AIOrchestrator for Capability.RECRUITER_COPILOT → map the validated LLM output
into the product's structured response, attaching the server-authoritative
"Sources Used" list. Never raises: degrades gracefully when the LLM layer is
unavailable so the recruiter is never left without a response.

This module performs NO database or provider access directly — the orchestrator
owns the provider round-trip; callers supply already-resolved context.
"""

from __future__ import annotations

import logging

from app.ai import Capability, orchestrator
from app.ai.utils.errors import AIError
from app.ai.context.copilot_context import format_history
from app.schemas.copilot import (
    CopilotLLMOutput,
    CopilotSource,
    CopilotStructuredResponse,
)

logger = logging.getLogger("app.ai")


def generate_copilot_answer(
    *,
    question: str,
    context_text: str,
    available_sources: list[str],
    sources: list[CopilotSource],
    history_messages: list[dict] | None = None,
    intent: str = "general",
    fallback: CopilotStructuredResponse | None = None,
) -> CopilotStructuredResponse:
    """
    Produce a grounded, structured copilot answer through the orchestration layer.

    `sources` is the authoritative attribution decided by the caller's context
    resolver — it is attached to the response so sources can never be fabricated
    by the model.
    """
    history_text = format_history(history_messages or [])

    try:
        result = orchestrator.run(
            capability=Capability.RECRUITER_COPILOT,
            variables={
                "context": context_text,
                "available_sources": available_sources,
                "history_text": history_text,
                "question": question,
                "intent": intent,
            },
            schema=CopilotLLMOutput,
        )
    except AIError as exc:
        logger.warning("Copilot orchestration failed (%s): %s", type(exc).__name__, exc)
        return fallback or _degraded_response(str(getattr(exc, "public_message", "") or exc))

    out: CopilotLLMOutput = result.data
    logger.info(
        "Copilot answered | intent=%s confidence=%s latency=%dms tokens=%s",
        intent, out.confidence, result.execution.latency_ms, result.execution.usage.total_tokens,
    )
    return CopilotStructuredResponse(
        answer=out.answer,
        summary=out.summary,
        strengths=out.strengths,
        weaknesses=out.weaknesses,
        recommendations=out.recommendations,
        confidence=out.confidence,
        reasoning_summary=out.reasoning_summary,
        followups=out.followups,
        sources_used=sources,
        degraded=False,
    )


def _degraded_response(reason: str) -> CopilotStructuredResponse:
    """Generic graceful fallback when no richer deterministic answer is available."""
    return CopilotStructuredResponse(
        answer=(
            "The AI narrative is temporarily unavailable, so I can't generate a full "
            "answer right now. The underlying candidate and campaign data is still "
            "intact — please try again in a moment."
        ),
        summary="",
        confidence=0,
        reasoning_summary=f"Graceful fallback ({reason})." if reason else "Graceful fallback.",
        followups=["Try again", "Summarize this candidate", "Who are my strongest candidates?"],
        sources_used=[],
        degraded=True,
    )
