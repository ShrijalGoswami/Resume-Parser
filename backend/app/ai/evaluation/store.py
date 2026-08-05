"""
Where evaluation records go.

JSONL, append-only, one record per line. Chosen over a database table on
purpose:

  * **No migration.** Phase 4 owns the schema change for production usage
    (`0028`). An evaluation artifact is not production data and must not force a
    migration to exist before Phase 0 can finish.
  * **No dependency, no network, no credentials.** The harness must run offline
    (that is a hard requirement of this task), and a file satisfies it with
    nothing to configure.
  * **Append-only is the right shape.** A run is an observation. Observations are
    never edited; a re-run is a new run with a new `run_id`.
  * **Readable by anything.** `jq`, pandas, a diff, or the next task's scorer.

`EvalStore` is a Protocol so the destination is replaceable — if these ever need
to land in Postgres or object storage, that is a new implementation, not a change
to the harness.
"""

from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Iterable, Iterator, Protocol, runtime_checkable

from app.ai.evaluation.records import EvalRecord

#: Default output directory. Deliberately inside `backend/` and gitignored —
#: evaluation output is an artifact of a run, not source, and committing it would
#: put model output (which can contain candidate-derived text) into version
#: control.
DEFAULT_EVAL_DIR = Path(__file__).resolve().parents[3] / "eval-runs"


@runtime_checkable
class EvalStore(Protocol):
    def append(self, record: EvalRecord) -> None: ...

    def append_all(self, records: Iterable[EvalRecord]) -> None: ...


class NullEvalStore:
    """Records nothing. The default, so evaluating never writes to disk unless
    someone asked for persistence — a harness that silently litters the working
    tree is one people stop running."""

    def append(self, record: EvalRecord) -> None:
        return None

    def append_all(self, records: Iterable[EvalRecord]) -> None:
        return None


class JsonlEvalStore:
    """Append-only JSONL, one file per run id.

    Writes are flushed per record rather than buffered to the end: a run that
    crashes halfway is exactly the run whose records are most worth keeping.
    """

    def __init__(self, directory: Path | str = DEFAULT_EVAL_DIR, *, filename: str | None = None):
        self.directory = Path(directory)
        self._filename = filename

    def path_for(self, run_id: str) -> Path:
        name = self._filename or f"{_safe(run_id)}.jsonl"
        return self.directory / name

    def append(self, record: EvalRecord) -> None:
        self.append_all([record])

    def append_all(self, records: Iterable[EvalRecord]) -> None:
        records = list(records)
        if not records:
            return
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.path_for(records[0].run_id)
        # newline="" so the JSON separator is exactly one \n on every platform.
        # On Windows the default would write \r\n and a naive reader elsewhere
        # would carry a stray \r into the last field of every record.
        with io.open(path, "a", encoding="utf-8", newline="") as fh:
            for record in records:
                fh.write(record.to_json() + "\n")
            fh.flush()
            os.fsync(fh.fileno())


def read_records(path: Path | str) -> Iterator[EvalRecord]:
    """Read a JSONL run back. Blank lines are skipped; a malformed line raises,
    because a silently-dropped record would understate a failure rate."""
    import json

    with io.open(path, encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield EvalRecord.from_dict(json.loads(line))
            except Exception as exc:  # noqa: BLE001 — location matters more than type
                raise ValueError(f"{path}:{line_no}: malformed evaluation record — {exc}") from exc


def _safe(name: str) -> str:
    """A filename-safe run id. Run ids are supplied by callers and tests, so they
    are not trusted to be path-safe."""
    return "".join(c if (c.isalnum() or c in "-_.") else "-" for c in name) or "run"
