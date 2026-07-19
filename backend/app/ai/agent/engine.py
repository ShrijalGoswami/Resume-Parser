"""
Agent Engine — runs workflows and produces an optional AI briefing.

The engine coordinates: it runs each workflow's deterministic detector over a
shared `ToolContext` (cached reads — no N+1), collects explainable
`Recommendation`s, and adds a single portfolio-level reasoning pass through the
AIOrchestrator to prioritise them. It reuses existing engines via tools and owns
no business logic itself.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.ai import Capability, orchestrator
from app.ai.agent.tools import ToolContext
from app.ai.agent.workflows import WORKFLOWS
from app.ai.utils.errors import AIError
from app.schemas.agent import AgentBriefing, Recommendation

logger = logging.getLogger("app.ai")


class AgentEngine:
    def workflow_names(self) -> list[str]:
        return list(WORKFLOWS)

    def scan(self, ctx: ToolContext, workflows: Optional[list[str]] = None) -> list[Recommendation]:
        names = workflows or list(WORKFLOWS)
        found: list[Recommendation] = []
        for name in names:
            wf = WORKFLOWS.get(name)
            if wf is None:
                continue
            try:
                found.extend(wf(ctx))
            except Exception as exc:  # a broken workflow must not fail the whole scan
                logger.warning("Agent workflow '%s' failed: %s", name, exc)
        return found

    def briefing(self, recs: list[Recommendation]) -> Optional[AgentBriefing]:
        if not recs:
            return None
        situations = "\n".join(f"- [{r.severity}] {r.title} — {r.why}" for r in recs[:20])
        try:
            result = orchestrator.run(
                capability=Capability.AGENT_REASONING,
                variables={"situations": situations},
                schema=AgentBriefing,
            )
            return result.data
        except AIError as exc:
            logger.info("Agent briefing degraded (%s); using deterministic summary.", type(exc).__name__)
            urgent = [r for r in recs if r.severity in ("urgent", "high")]
            return AgentBriefing(
                headline=f"{len(recs)} item(s) need attention" + (f", {len(urgent)} urgent/high" if urgent else ""),
                priorities=[r.title for r in sorted(recs, key=_severity_rank)[:5]],
                summary="The agent detected the situations above from your pipeline data. "
                        "Review and approve the recommendations that make sense.",
            )


def _severity_rank(r: Recommendation) -> int:
    order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    return order.get(r.severity, 4)


#: Module-level singleton.
agent_engine = AgentEngine()
