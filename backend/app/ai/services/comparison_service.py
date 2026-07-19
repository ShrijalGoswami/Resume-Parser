"""
Candidate Comparison capability service.

Thin orchestration seam (Sprint 3 pattern): pass resolved context + roster to the
AIOrchestrator for Capability.CANDIDATE_COMPARISON, validate the structured output,
and wrap it into a `CandidateComparisonReport` with the compared roster and the
server-authoritative sources. Never raises — degrades to a deterministic,
score-based report when the LLM layer is unavailable.

No database or provider access here; the orchestrator owns the round-trip.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.ai import Capability, ModelRole, orchestrator
from app.ai.utils.errors import AIError
from app.schemas.comparison import (
    CandidateComparisonReport,
    ComparedCandidate,
    ComparisonLLMOutput,
)
from app.schemas.copilot import CopilotSource

logger = logging.getLogger("app.ai")

# Multi-candidate reports need more headroom than the 2048 default.
_MAX_TOKENS = 4096
_TIMEOUT_SECONDS = 60


def generate_comparison(
    *,
    context_text: str,
    roster_text: str,
    candidates: list[ComparedCandidate],
    campaign_id: str,
    sources: list[CopilotSource],
    question: str = "",
    fallback: Optional[CandidateComparisonReport] = None,
) -> CandidateComparisonReport:
    """Produce a grounded executive comparison through the orchestration layer."""
    try:
        result = orchestrator.run(
            capability=Capability.CANDIDATE_COMPARISON,
            variables={"context": context_text, "roster": roster_text, "question": question},
            schema=ComparisonLLMOutput,
            role=ModelRole.LONG_CONTEXT,  # multi-candidate prompts — logical role, not a hardcoded model
            max_tokens=_MAX_TOKENS,
            timeout_seconds=_TIMEOUT_SECONDS,
        )
    except AIError as exc:
        logger.warning("Comparison orchestration failed (%s): %s", type(exc).__name__, exc)
        if fallback is not None:
            return fallback
        return CandidateComparisonReport(
            campaign_id=campaign_id, candidates=candidates, sources_used=sources, degraded=True,
        )

    out: ComparisonLLMOutput = result.data
    logger.info(
        "Comparison generated | candidates=%d latency=%dms tokens=%s",
        len(candidates), result.execution.latency_ms, result.execution.usage.total_tokens,
    )
    return CandidateComparisonReport(
        **out.model_dump(),
        campaign_id=campaign_id,
        candidates=candidates,
        sources_used=sources,
        degraded=False,
    )
