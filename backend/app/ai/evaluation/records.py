"""
The evaluation record — one row per evaluated request.

This is the durable artifact of the whole harness. Everything else (the runner,
the store, any future scorer) exists to produce or consume these.

TWO RULES SHAPE EVERY FIELD HERE:

1. **A record states facts, never judgements.** There is no `score`, no `passed`,
   no `better_than`. Whether a provider is good enough is a question that gets a
   different answer per capability, per month, and per person asking — so it is
   answered by a replaceable scorer reading these records, never by the record
   itself. See `scoring.py`.

2. **Unknown is a distinct value from false.** `json_valid=None` means the
   request never got far enough to produce JSON; `json_valid=False` means the
   model returned something that was not JSON. Collapsing those two would make a
   provider that times out look identical to a provider that cannot follow a
   format instruction — which is precisely the comparison this harness exists to
   support. The same distinction governs `output_bytes`, `retry_count` and the
   token counts.

Deliberately NOT here: **cost**. Token counts are recorded because they are facts
the execution already carries and because "provider B was slower" is unreadable
without them, but no price is looked up, stored or implied. Cost is Phase 4.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Optional


class ParseResult(str, Enum):
    """How far the response got through parse → validate.

    Ordered by how far the request travelled, which is how a reader should
    interpret them: `NOT_REACHED` is a transport problem, `INVALID_JSON` is a
    format-following problem, `SCHEMA_MISMATCH` is a comprehension problem.
    Telling those apart is the main reason this harness exists.
    """

    VALIDATED = "validated"              # parsed as JSON and satisfied the schema
    INVALID_JSON = "invalid_json"        # returned text that would not parse
    SCHEMA_MISMATCH = "schema_mismatch"  # parsed, but the shape was wrong
    NOT_REACHED = "not_reached"          # never produced a response to parse
    UNKNOWN = "unknown"                  # classification unavailable


class ProviderSource(str, Enum):
    """Whether `provider`/`model` are what ANSWERED or what was INTENDED.

    On success the orchestrator reports which provider actually served the
    request, including after a failover. On failure it raises without that
    metadata, so the harness records the gateway's *intended* primary instead
    and says so here. Silently labelling an intention as an observation would
    corrupt exactly the dataset this exists to build.
    """

    ACTUAL = "actual"
    INTENDED = "intended"


@dataclass(frozen=True)
class EvalRecord:
    """One evaluated request. Append-only; never mutated after construction."""

    # ── identity ────────────────────────────────────────────────────────────
    run_id: str                     # groups every record from one harness run
    case_id: str                    # stable id of the case, so runs are comparable
    timestamp: str                  # ISO-8601 UTC, when the record was created

    # ── what was asked ──────────────────────────────────────────────────────
    task_type: str                  # Capability value, e.g. "batch_candidate"
    prompt_id: Optional[str]        # from the prompt registry
    prompt_version: Optional[str]   # ditto — a run is only comparable at equal version
    role: Optional[str]             # the logical role requested, if any

    # ── who answered ────────────────────────────────────────────────────────
    provider: Optional[str]
    model: Optional[str]
    provider_source: str = ProviderSource.ACTUAL.value

    # ── what happened ───────────────────────────────────────────────────────
    success: bool = False
    execution_time_ms: int = 0              # measured by the harness; always present
    orchestrator_latency_ms: Optional[int] = None  # as reported; absent on failure
    json_valid: Optional[bool] = None
    parse_result: str = ParseResult.UNKNOWN.value
    output_bytes: Optional[int] = None      # serialized size of the VALIDATED object

    # ── the retry ladder, raw and derived ───────────────────────────────────
    retry_count: Optional[int] = None
    network_attempts: Optional[int] = None
    json_attempts: Optional[int] = None
    schema_attempts: Optional[int] = None

    # ── token counts (facts, not cost — see module docstring) ───────────────
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None

    # ── failure detail ──────────────────────────────────────────────────────
    error_type: Optional[str] = None
    error_message: Optional[str] = None     # truncated; never a secret carrier

    # ── free-form, for the golden dataset to attach its own labels ──────────
    metadata: dict[str, Any] = field(default_factory=dict)

    #: Bumped when a field's MEANING changes, so old runs are never silently
    #: compared against new ones under different semantics.
    schema_version: str = "1"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, sort_keys=True)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "EvalRecord":
        """Rebuild a record, tolerating fields added by a LATER schema version.

        Unknown keys are dropped rather than raising: a record written by a newer
        harness must still be readable by an older one, or a mid-migration run
        becomes unreadable at exactly the moment someone needs it.
        """
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in raw.items() if k in known})


def truncate_error(exc: BaseException, limit: int = 300) -> str:
    """A bounded, single-line error string.

    Bounded because a provider stack trace can be kilobytes and this file is
    append-only; single-line because the store is JSONL and a stray newline in a
    value is the classic way to corrupt one.
    """
    text = " ".join(str(exc).split())
    return text[:limit]
