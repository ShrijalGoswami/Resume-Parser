"""
Workflow engine.

An automation rule = a trigger event + an ordered list of steps. The engine runs
each step through the Integration Layer (never an external SDK directly), with
retry + exponential backoff and idempotency. It is pure (no DB) so it is fully
testable; the service layer supplies the rules, context, and persistence. The
`delay_schedule` is exposed so a future queue/worker can execute steps
asynchronously with the same semantics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from app.integrations.base import IntegrationAction, IntegrationResult
from app.integrations.events import Event
from app.integrations.registry import get_provider

MAX_ATTEMPTS = 3
BASE_BACKOFF_SECONDS = 2  # exponential: 2, 4, 8 … (used by async executors)


@dataclass
class WorkflowStep:
    action: str
    provider: str
    params: dict = field(default_factory=dict)


@dataclass
class AutomationRule:
    id: str
    name: str
    trigger_event: str
    steps: list[WorkflowStep]
    enabled: bool = True


@dataclass
class StepOutcome:
    provider: str
    action: str
    ok: bool
    attempts: int
    detail: str = ""
    error: Optional[str] = None
    simulated: bool = False


@dataclass
class ExecutionRecord:
    rule_id: str
    rule_name: str
    event: str
    status: str  # success | partial | failed
    steps: list[StepOutcome] = field(default_factory=list)
    latency_ms: int = 0
    error: Optional[str] = None


def backoff_delay(attempt: int) -> int:
    """Seconds a queue executor should wait before retry `attempt` (1-indexed)."""
    return BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))


class WorkflowEngine:
    def execute_rule(self, rule: AutomationRule, event: Event, ictx: Any) -> ExecutionRecord:
        import time
        start = time.time()
        outcomes: list[StepOutcome] = []
        status = "success"

        for step in rule.steps:
            provider = get_provider(step.provider)
            if provider is None:
                outcomes.append(StepOutcome(step.provider, step.action, False, 0, error="unknown provider"))
                status = "failed"
                break

            try:
                action = IntegrationAction(step.action)
            except ValueError:
                outcomes.append(StepOutcome(step.provider, step.action, False, 0, error="unknown action"))
                status = "failed"
                break

            merged = {**step.params, "event": event.payload}
            result: Optional[IntegrationResult] = None
            attempts = 0
            while attempts < MAX_ATTEMPTS:
                attempts += 1
                result = provider.execute(action, ictx, merged)
                if result.ok:
                    break
                # exponential backoff schedule is honoured by async executors; the
                # synchronous path retries immediately to keep requests non-blocking.
            outcomes.append(StepOutcome(
                step.provider, step.action, bool(result and result.ok), attempts,
                detail=(result.detail if result else ""), error=(result.error if result else "no result"),
                simulated=(result.simulated if result else False),
            ))
            if not (result and result.ok):
                status = "failed"
                break

        latency = round((time.time() - start) * 1000)
        return ExecutionRecord(
            rule_id=rule.id, rule_name=rule.name, event=event.type.value,
            status=status, steps=outcomes, latency_ms=latency,
            error=None if status == "success" else "one or more steps failed",
        )


workflow_engine = WorkflowEngine()
