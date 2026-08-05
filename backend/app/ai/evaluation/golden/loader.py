"""
Golden dataset loader.

The dataset itself is **data, not code** — `cases.json`. Adding a case is
editing that file; no Python changes, no redeploy of a fixture module. That is
the requirement that keeps the dataset growable by whoever is investigating a
regression rather than only by whoever wrote the loader.

WHAT A CASE IS
--------------
A faithful reproduction of a real call: the same capability, the same variables a
capability service would pass, and the structured output a correct answer looks
like. It is deliberately NOT a synthetic prompt — evaluating a prompt the product
never sends measures nothing.

THE CASE ID IS THE CONTRACT
---------------------------
`case_id` is stable and immutable (D0.10). Comparing two providers means joining
their runs on `case_id`, so renaming or regenerating one silently disconnects
every historical comparison that referenced it — the data does not go wrong, it
goes *missing*, which is harder to notice. A test pins the known ids: additions
are free, renames and removals fail.

HOW THE FAKE PROVIDER ANSWERS THESE
-----------------------------------
The provider never sees a schema. So the loader renders each case's prompt
exactly as the orchestrator will, fingerprints it, and registers the case's
`expected_output` against that fingerprint. The fake then returns it because the
prompt matched — not because anything special-cased the evaluation path.

Validation is strict and fails loudly (§9A rule 9): a duplicate id, an unknown
capability, an unregistered schema or a malformed case aborts the load rather
than quietly shrinking the dataset, because a dataset that silently loses a case
reports a better pass rate than reality.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Optional, Type

from app.ai.evaluation.harness import EvalCase
from app.ai.gateway.roles import ModelRole
from app.ai.schemas.base import Capability

DATASET_PATH = Path(__file__).resolve().parent / "cases.json"


class GoldenDatasetError(RuntimeError):
    """The dataset is malformed. Always fatal — never a warning."""


def _schema_for(capability: Capability) -> Type[Any]:
    """Capability → the Pydantic schema its production call site validates against.

    Imports are local so loading this module never drags the whole application
    graph in, and so a capability whose schema moves fails here with a clear
    message rather than at import time in an unrelated test.
    """
    from app.llm.batch_analyzer import GroqBatchAnalysis
    from app.schemas.agent import AgentBriefing
    from app.schemas.analysis import GroqExplanation
    from app.schemas.comparison import ComparisonLLMOutput
    from app.schemas.copilot import CopilotLLMOutput
    from app.schemas.interview import InterviewLLMOutput
    from app.schemas.match_analysis import GroqMatchAnalysis
    from app.schemas.report import ExecutiveReportLLMOutput

    table: dict[Capability, Type[Any]] = {
        Capability.RESUME_ANALYSIS: GroqExplanation,
        Capability.JOB_MATCHING: GroqMatchAnalysis,
        Capability.BATCH_CANDIDATE: GroqBatchAnalysis,
        Capability.RECRUITER_COPILOT: CopilotLLMOutput,
        Capability.CANDIDATE_COMPARISON: ComparisonLLMOutput,
        Capability.INTERVIEW_GENERATION: InterviewLLMOutput,
        Capability.EXECUTIVE_REPORT: ExecutiveReportLLMOutput,
        Capability.AGENT_REASONING: AgentBriefing,
    }
    schema = table.get(capability)
    if schema is None:
        raise GoldenDatasetError(
            f"No schema registered for capability '{capability.value}'. "
            f"Register it in golden/loader.py::_schema_for before adding cases for it."
        )
    return schema


@dataclass(frozen=True)
class GoldenCase:
    """One dataset entry."""

    case_id: str                 # STABLE and IMMUTABLE — see module docstring
    capability: Capability
    description: str
    category: str
    difficulty: str
    variables: dict[str, Any]
    expected_output: dict[str, Any]
    role: ModelRole = ModelRole.DEFAULT_REASONING
    options: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def schema(self) -> Type[Any]:
        return _schema_for(self.capability)

    def to_eval_case(self) -> EvalCase:
        """The harness's view of this case. Category/difficulty ride along as
        metadata so a run can be sliced by them afterwards without re-reading
        the dataset."""
        return EvalCase(
            case_id=self.case_id,
            capability=self.capability,
            variables=dict(self.variables),
            schema=self.schema,
            role=self.role,
            options=dict(self.options),
            metadata={
                "category": self.category,
                "difficulty": self.difficulty,
                "description": self.description,
                **self.metadata,
            },
        )


def load_cases(path: Path | str = DATASET_PATH) -> list[GoldenCase]:
    """Read, validate and return every case. Order follows the file."""
    path = Path(path)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise GoldenDatasetError(f"Golden dataset not found at {path}") from exc
    except json.JSONDecodeError as exc:
        raise GoldenDatasetError(f"{path}: dataset is not valid JSON — {exc}") from exc

    entries = raw.get("cases") if isinstance(raw, dict) else raw
    if not isinstance(entries, list):
        raise GoldenDatasetError(f"{path}: expected a list of cases (or {{'cases': [...]}}).")

    cases: list[GoldenCase] = []
    seen: set[str] = set()
    for index, entry in enumerate(entries):
        case = _build(entry, index, path)
        if case.case_id in seen:
            raise GoldenDatasetError(
                f"{path}: duplicate case_id '{case.case_id}'. Ids are join keys for "
                f"historical comparisons and must be unique and immutable."
            )
        seen.add(case.case_id)
        cases.append(case)
    return cases


def _build(entry: Any, index: int, path: Path) -> GoldenCase:
    where = f"{path}[{index}]"
    if not isinstance(entry, dict):
        raise GoldenDatasetError(f"{where}: expected an object, got {type(entry).__name__}.")

    missing = [k for k in ("case_id", "capability", "description", "category",
                           "difficulty", "variables", "expected_output") if k not in entry]
    if missing:
        raise GoldenDatasetError(f"{where}: missing required field(s): {', '.join(missing)}.")

    try:
        capability = Capability(entry["capability"])
    except ValueError as exc:
        raise GoldenDatasetError(
            f"{where}: unknown capability '{entry['capability']}'. "
            f"Valid: {', '.join(sorted(c.value for c in Capability))}."
        ) from exc

    role_raw = entry.get("role")
    try:
        role = ModelRole(role_raw) if role_raw else ModelRole.DEFAULT_REASONING
    except ValueError as exc:
        raise GoldenDatasetError(f"{where}: unknown role '{role_raw}'.") from exc

    case = GoldenCase(
        case_id=str(entry["case_id"]),
        capability=capability,
        description=str(entry["description"]),
        category=str(entry["category"]),
        difficulty=str(entry["difficulty"]),
        variables=dict(entry["variables"]),
        expected_output=dict(entry["expected_output"]),
        role=role,
        options=dict(entry.get("options") or {}),
        metadata=dict(entry.get("metadata") or {}),
    )

    # The expected output must satisfy the real schema, or the case can never
    # pass and the dataset is lying about what "correct" looks like.
    try:
        case.schema(**case.expected_output)
    except GoldenDatasetError:
        raise
    except Exception as exc:
        raise GoldenDatasetError(
            f"{where} ('{case.case_id}'): expected_output does not satisfy "
            f"{case.capability.value}'s schema — {exc}"
        ) from exc
    return case


def register_expected_responses(cases: Iterable[GoldenCase], *, script=None) -> int:
    """Teach the fake provider how to answer each case.

    Renders each case's prompt exactly as the orchestrator will, then binds the
    case's `expected_output` to that prompt's fingerprint. Returns how many were
    registered.

    This is the only coupling between the dataset and the fake, and it runs in
    one direction: the dataset knows the fake exists; the fake knows nothing
    about datasets, capabilities or schemas.
    """
    from app.ai.prompts.registry import get_prompt
    from app.ai.providers.fake_provider import fake_script, fingerprint

    target = script or fake_script
    count = 0
    for case in cases:
        template = get_prompt(case.capability)
        system = template.system
        user = template.build_user(**case.variables)
        target.register_response(fingerprint(system, user), case.expected_output)
        count += 1
    return count


def load_and_register(path: Path | str = DATASET_PATH) -> list[GoldenCase]:
    """Convenience for the reviewer flow: load the dataset and make the fake able
    to answer it, in one call."""
    cases = load_cases(path)
    register_expected_responses(cases)
    return cases


def case_ids(cases: Optional[Iterable[GoldenCase]] = None) -> list[str]:
    return [c.case_id for c in (cases if cases is not None else load_cases())]
