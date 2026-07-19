"""
Executive report capability service.

Thin orchestration seam: pass the deterministic report context to the
AIOrchestrator for Capability.EXECUTIVE_REPORT, validate the structured narrative,
and merge it with the REAL server-computed metrics into an `ExecutiveReport`. The
LLM never sees a chance to invent numbers — it only narrates. Never raises;
degrades to a metrics-only report when the LLM is unavailable.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.ai import Capability, ModelRole, orchestrator
from app.ai.utils.errors import AIError
from app.schemas.copilot import CopilotSource
from app.schemas.report import ExecutiveReport, ExecutiveReportLLMOutput

logger = logging.getLogger("app.ai")

_MAX_TOKENS = 4096
_TIMEOUT_SECONDS = 60


def generate_executive_report(
    *,
    context_text: str,
    data,
    sources: list[CopilotSource],
    focus: str = "full",
    instruction: str = "",
    sections: Optional[list[str]] = None,
    period: str = "current",
    fallback: Optional[ExecutiveReport] = None,
) -> ExecutiveReport:
    """Produce a grounded executive report (deterministic metrics + LLM narrative)."""
    try:
        result = orchestrator.run(
            capability=Capability.EXECUTIVE_REPORT,
            variables={"context": context_text, "focus": focus, "instruction": instruction, "sections": sections},
            schema=ExecutiveReportLLMOutput,
            role=ModelRole.LONG_CONTEXT,  # aggregate-heavy prompt — logical role, not a hardcoded model
            max_tokens=_MAX_TOKENS,
            timeout_seconds=_TIMEOUT_SECONDS,
        )
    except AIError as exc:
        logger.warning("Executive report orchestration failed (%s): %s", type(exc).__name__, exc)
        if fallback is not None:
            return fallback
        return _merge(ExecutiveReportLLMOutput(), data, sources, period, degraded=True)

    logger.info(
        "Executive report generated | focus=%s latency=%dms tokens=%s",
        focus, result.execution.latency_ms, result.execution.usage.total_tokens,
    )
    return _merge(result.data, data, sources, period, degraded=False)


def _merge(out: ExecutiveReportLLMOutput, data, sources, period, *, degraded: bool) -> ExecutiveReport:
    return ExecutiveReport(
        **out.model_dump(),
        period=period,
        metrics=data.metrics,
        campaigns=data.campaigns,
        productivity=data.productivity,
        talent_snapshot=data.talent_snapshot,
        sources_used=sources,
        degraded=degraded,
    )
