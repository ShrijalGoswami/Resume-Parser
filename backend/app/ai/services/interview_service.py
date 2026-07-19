"""
Interview Intelligence capability service.

Thin orchestration seam (Sprint 3 pattern): pass resolved context to the
AIOrchestrator for Capability.INTERVIEW_GENERATION, validate the structured
output, and wrap it into an `InterviewPack` with candidate identity and the
server-authoritative sources. Never raises — degrades to a deterministic pack
when the LLM layer is unavailable.

No database or provider access here; the orchestrator owns the round-trip.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.ai import Capability, orchestrator
from app.ai.utils.errors import AIError
from app.schemas.copilot import CopilotSource
from app.schemas.interview import InterviewLLMOutput, InterviewPack

logger = logging.getLogger("app.ai")

_MAX_TOKENS = 4096
_TIMEOUT_SECONDS = 60


def generate_interview_pack(
    *,
    context_text: str,
    candidate_line: str,
    candidate_id: str,
    candidate_name: str,
    campaign_id: str,
    sources: list[CopilotSource],
    focus: str = "blueprint",
    instruction: str = "",
    sections: Optional[list[str]] = None,
    fallback: Optional[InterviewPack] = None,
) -> InterviewPack:
    """Produce a grounded interview workbench through the orchestration layer."""
    try:
        result = orchestrator.run(
            capability=Capability.INTERVIEW_GENERATION,
            variables={
                "context": context_text,
                "candidate_line": candidate_line,
                "focus": focus,
                "instruction": instruction,
                "sections": sections,
            },
            schema=InterviewLLMOutput,
            max_tokens=_MAX_TOKENS,
            timeout_seconds=_TIMEOUT_SECONDS,
        )
    except AIError as exc:
        logger.warning("Interview orchestration failed (%s): %s", type(exc).__name__, exc)
        if fallback is not None:
            return fallback
        return InterviewPack(
            candidate_id=candidate_id, candidate_name=candidate_name,
            campaign_id=campaign_id, focus=focus, sources_used=sources, degraded=True,
        )

    out: InterviewLLMOutput = result.data
    logger.info(
        "Interview pack generated | candidate=%s focus=%s latency=%dms tokens=%s",
        candidate_id, focus, result.execution.latency_ms, result.execution.usage.total_tokens,
    )
    return InterviewPack(
        **out.model_dump(),
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        campaign_id=campaign_id,
        focus=focus,
        sources_used=sources,
        degraded=False,
    )
