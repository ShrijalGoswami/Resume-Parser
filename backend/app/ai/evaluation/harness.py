"""
The evaluation harness — it runs cases through the orchestrator and records what
happened. It decides nothing else.

WHY IT WRAPS RATHER THAN HOOKS
------------------------------
§9A rule 1 is "never rewrite the orchestrator", and the cheapest way to break
that rule is to add "just one" instrumentation hook inside it. So the harness
sits strictly outside: it calls `orchestrator.run(...)` exactly as a capability
service does, and reads the `AIExecution` the orchestrator already returns.

The consequence is a real and deliberate constraint: **the harness can only see
what a caller can see.** Where that limits the record, the limit is recorded
rather than worked around (see LIMITATIONS below). Nothing here reaches into a
provider, and nothing here imports a vendor SDK — which is what makes the same
harness valid for Groq, OpenAI, Gemini, Anthropic, OpenRouter and a local model
without a line changing.

THE INJECTION SEAM
------------------
`runner` defaults to `orchestrator.run` and is the only way the harness reaches
an LLM. Tests pass a stub and the whole harness is exercised offline, with no
provider, no key and no network. This is also why Task 1 does not need Task 2's
fake provider: the fake will slot in one layer lower, at the provider registry,
and this harness will not notice.

LIMITATIONS, recorded on purpose
--------------------------------
* On failure `orchestrator.run` raises an `AIError` carrying no `AIExecution`,
  so provider/model/attempt counts are unavailable. The harness records the
  gateway's *intended* primary and labels it `provider_source="intended"`.
  Making the orchestrator attach execution metadata to its exceptions would fix
  this properly and is a candidate for Phase 1 — it is not done here because
  this task may not modify the orchestrator.
* `output_bytes` measures the serialized VALIDATED object, not the raw provider
  text, which `run()` does not expose. It is a faithful measure of what business
  logic received and a proxy — not a substitute — for response size.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Optional, Protocol, Sequence, Type

from app.ai.evaluation.records import EvalRecord, ParseResult, ProviderSource, truncate_error
from app.ai.evaluation.store import EvalStore, NullEvalStore
from app.ai.gateway.roles import ModelRole
from app.ai.schemas.base import AIResult, Capability
from app.ai.utils.errors import (
    AIConfigError,
    AIError,
    AIParseError,
    AIValidationError,
)

logger = logging.getLogger("app.ai.evaluation")


class RunnerFn(Protocol):
    """The one call the harness makes. `orchestrator.run` satisfies this."""

    def __call__(
        self,
        *,
        capability: Capability,
        variables: dict,
        schema: Type[Any],
        role: ModelRole = ...,
        **kwargs: Any,
    ) -> AIResult: ...


@dataclass(frozen=True)
class EvalCase:
    """One thing to evaluate.

    Intentionally the same arguments a capability service passes, so a case is a
    faithful reproduction of a real call rather than a synthetic approximation.
    The golden dataset (Phase 0 task 3) supplies these; this task defines only
    the shape.
    """

    case_id: str
    capability: Capability
    variables: dict
    schema: Type[Any]
    role: ModelRole = ModelRole.DEFAULT_REASONING
    #: Extra keyword arguments forwarded verbatim (max_tokens, timeout_seconds…),
    #: so a case can reproduce a call site that overrides them.
    options: dict = field(default_factory=dict)
    #: Labels the dataset wants carried onto every record (difficulty, source…).
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class EvalReport:
    """The result of one run. Counts, not verdicts.

    There is deliberately no `passed`, no `score` and no ranking: this object is
    a manifest of what was observed. Judgement belongs to a scorer (`scoring.py`)
    that reads records, and is replaceable without touching the harness.
    """

    run_id: str
    records: tuple[EvalRecord, ...]

    @property
    def total(self) -> int:
        return len(self.records)

    @property
    def succeeded(self) -> int:
        return sum(1 for r in self.records if r.success)

    @property
    def failed(self) -> int:
        return self.total - self.succeeded

    def by_parse_result(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.records:
            out[r.parse_result] = out.get(r.parse_result, 0) + 1
        return out

    def by_provider(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.records:
            key = r.provider or "unknown"
            out[key] = out.get(key, 0) + 1
        return out


class EvaluationHarness:
    """Runs `EvalCase`s through a runner and produces `EvalRecord`s.

    Every dependency that would otherwise make a run non-deterministic — the
    runner, the clock, the timer, the run-id source — is injected, so the tests
    that guard this file need no network, no provider and no wall-clock tolerance.
    """

    def __init__(
        self,
        *,
        runner: Optional[RunnerFn] = None,
        store: Optional[EvalStore] = None,
        clock: Optional[Callable[[], datetime]] = None,
        timer: Optional[Callable[[], float]] = None,
        run_id_factory: Optional[Callable[[], str]] = None,
    ):
        self._runner = runner
        self._store = store or NullEvalStore()
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._timer = timer or time.perf_counter
        self._run_id_factory = run_id_factory or (lambda: uuid.uuid4().hex[:12])

    # -- the default runner is resolved lazily -----------------------------
    def _resolve_runner(self) -> RunnerFn:
        """Import the orchestrator only when it is actually needed.

        Lazy so that constructing a harness with an injected runner never drags
        in the orchestrator, the gateway or the provider registry — which is what
        keeps the offline tests genuinely offline rather than merely unconnected.
        """
        if self._runner is not None:
            return self._runner
        from app.ai.orchestrator.orchestrator import orchestrator

        return orchestrator.run  # type: ignore[return-value]

    # -- public API ---------------------------------------------------------
    def evaluate(self, case: EvalCase, *, run_id: Optional[str] = None) -> EvalRecord:
        record = self._evaluate_one(case, run_id or self._run_id_factory())
        self._store.append(record)
        return record

    def evaluate_all(
        self, cases: Sequence[EvalCase], *, run_id: Optional[str] = None
    ) -> EvalReport:
        rid = run_id or self._run_id_factory()
        records = [self._evaluate_one(case, rid) for case in cases]
        self._store.append_all(records)
        logger.info(
            "Evaluation run %s | cases=%d succeeded=%d failed=%d",
            rid, len(records), sum(1 for r in records if r.success),
            sum(1 for r in records if not r.success),
        )
        return EvalReport(run_id=rid, records=tuple(records))

    # -- one case -----------------------------------------------------------
    def _evaluate_one(self, case: EvalCase, run_id: str) -> EvalRecord:
        runner = self._resolve_runner()
        prompt_id, prompt_version = _prompt_identity(case.capability)
        started = self._timer()

        try:
            result = runner(
                capability=case.capability,
                variables=case.variables,
                schema=case.schema,
                role=case.role,
                **case.options,
            )
        except AIError as exc:
            # An AI-layer failure is an OBSERVATION, not an error in the run.
            elapsed = self._elapsed_ms(started)
            provider, model = _intended_selection(case.role)
            json_valid, parse_result = _classify_failure(exc)
            return EvalRecord(
                run_id=run_id,
                case_id=case.case_id,
                timestamp=self._now(),
                task_type=case.capability.value,
                prompt_id=prompt_id,
                prompt_version=prompt_version,
                role=case.role.value if case.role else None,
                provider=provider,
                model=model,
                provider_source=ProviderSource.INTENDED.value,
                success=False,
                execution_time_ms=elapsed,
                json_valid=json_valid,
                parse_result=parse_result.value,
                error_type=type(exc).__name__,
                error_message=truncate_error(exc),
                metadata=dict(case.metadata),
            )
        # Anything that is NOT an AIError is a defect in the harness, the case or
        # the schema — never a provider observation. It propagates untouched
        # (§9A rule 9: unknown behaviour fails loudly rather than being recorded
        # as if it were a normal result).

        elapsed = self._elapsed_ms(started)
        ex = result.execution
        return EvalRecord(
            run_id=run_id,
            case_id=case.case_id,
            timestamp=self._now(),
            task_type=case.capability.value,
            prompt_id=prompt_id,
            prompt_version=prompt_version,
            role=case.role.value if case.role else None,
            provider=ex.provider,
            model=ex.model,
            provider_source=ProviderSource.ACTUAL.value,
            success=ex.success,
            execution_time_ms=elapsed,
            orchestrator_latency_ms=ex.latency_ms,
            json_valid=True if ex.success else None,
            parse_result=(ParseResult.VALIDATED if ex.success else ParseResult.UNKNOWN).value,
            output_bytes=_output_bytes(result.data),
            retry_count=ex.retry_count,
            network_attempts=ex.network_attempts,
            json_attempts=ex.json_attempts,
            schema_attempts=ex.schema_attempts,
            prompt_tokens=ex.usage.prompt_tokens,
            completion_tokens=ex.usage.completion_tokens,
            error_type=None if ex.success else "UnsuccessfulExecution",
            error_message=ex.error,
            metadata=dict(case.metadata),
        )

    # -- helpers ------------------------------------------------------------
    def _now(self) -> str:
        return self._clock().isoformat()

    def _elapsed_ms(self, started: float) -> int:
        return max(0, round((self._timer() - started) * 1000))


# ── classification ───────────────────────────────────────────────────────────
def _classify_failure(exc: AIError) -> tuple[Optional[bool], ParseResult]:
    """Map a typed AI failure to (json_valid, parse_result).

    The three outcomes are genuinely different and the whole point of recording
    them separately:

      * `AIParseError`      the model answered, and the answer was not JSON.
      * `AIValidationError` the answer WAS valid JSON but the wrong shape — so
                            `json_valid` is True even though the call failed.
      * anything else       transport, rate limit, timeout, misconfiguration:
                            no answer was produced, so JSON validity is UNKNOWN
                            rather than False.
    """
    if isinstance(exc, AIParseError):
        return False, ParseResult.INVALID_JSON
    if isinstance(exc, AIValidationError):
        return True, ParseResult.SCHEMA_MISMATCH
    if isinstance(exc, AIConfigError):
        return None, ParseResult.NOT_REACHED
    return None, ParseResult.NOT_REACHED


def _prompt_identity(capability: Capability) -> tuple[Optional[str], Optional[str]]:
    """The registered prompt's id and version.

    Read-only, and tolerant: a capability with no registered prompt (today,
    `RESUME_SUMMARIZATION`) yields `(None, None)` rather than aborting the run.
    That absence is itself a fact worth having in the dataset.
    """
    try:
        from app.ai.prompts.registry import get_prompt

        template = get_prompt(capability)
        return template.id, template.version
    except Exception:  # noqa: BLE001 — an unregistered prompt must not end a run
        return None, None


def _intended_selection(role: Optional[ModelRole]) -> tuple[Optional[str], Optional[str]]:
    """What the gateway WOULD have used, for the failure path.

    Goes through the gateway, never a provider module, so this stays free of
    vendor imports. Failure to resolve is not fatal — an unresolvable selection
    is often the very reason the call failed.
    """
    try:
        from app.ai.gateway import resolve

        selection = resolve(role or ModelRole.DEFAULT_REASONING)
        return selection.provider, selection.model
    except Exception:  # noqa: BLE001
        return None, None


def _output_bytes(data: Any) -> Optional[int]:
    """Serialized size of the validated object, in UTF-8 bytes.

    Tolerant by design: the harness must not care whether a capability's schema
    is a Pydantic model, a dataclass, or something else. `None` means "could not
    be measured", which is honest — unlike 0, which would read as an empty
    response.
    """
    try:
        dump = getattr(data, "model_dump_json", None)
        if callable(dump):
            return len(dump().encode("utf-8"))
        if is_dataclass(data) and not isinstance(data, type):
            return len(json.dumps(asdict(data), default=str).encode("utf-8"))
        return len(json.dumps(data, default=str).encode("utf-8"))
    except Exception:  # noqa: BLE001
        return None
