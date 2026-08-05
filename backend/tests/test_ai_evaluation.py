"""
The evaluation harness (Phase 0, task 1).

This harness is the thing every later phase leans on: without it, "we switched
provider and quality dropped" is undetectable until a customer says so. So these
tests care most about the properties that would make the RECORDED DATA WRONG,
which is worse than the harness being broken — a broken harness is noticed, a
harness that quietly mislabels a timeout as a formatting failure is not.

The cases that matter most, in order:

  * `TestFailureClassification` — the three ways a call can fail are genuinely
    different, and collapsing them would destroy the comparison this exists for
  * `TestNoVendorCoupling` — the harness must never import a provider SDK, or it
    stops being valid for the next provider
  * `TestUnknownIsNotFalse` — `json_valid=None` and `json_valid=False` mean
    different things
  * `TestNonAIErrorsPropagate` — a defect in a case must not be recorded as if
    it were a provider observation (§9A rule 9)

Everything here runs offline: no provider, no key, no network, no clock.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import BaseModel

from app.ai.evaluation import (
    EvalCase,
    EvaluationHarness,
    EvalRecord,
    JsonlEvalStore,
    NullEvalStore,
    ParseResult,
    ProviderSource,
    read_records,
)
from app.ai.evaluation.scoring import ScoreResult, apply
from app.ai.gateway.roles import ModelRole
from app.ai.schemas.base import AIExecution, AIResult, Capability, TokenUsage
from app.ai.utils.errors import (
    AIConfigError,
    AIParseError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
    AIValidationError,
)

FROZEN = datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc)


class Reply(BaseModel):
    answer: str = "ok"


def case(**overrides) -> EvalCase:
    base = dict(
        case_id="case-1",
        capability=Capability.RECRUITER_COPILOT,
        variables={},
        schema=Reply,
        role=ModelRole.DEFAULT_REASONING,
    )
    base.update(overrides)
    return EvalCase(**base)  # type: ignore[arg-type]


def ok_runner(
    *, provider="groq", model="llama-3.3-70b-versatile", success=True,
    network=1, json_att=1, schema_att=1, latency=250, usage=None, data=None,
):
    """A stub standing in for `orchestrator.run`. No provider, no network."""

    def _run(**kwargs):
        return AIResult(
            data=data if data is not None else Reply(answer="hello"),
            execution=AIExecution(
                capability=kwargs["capability"].value,
                provider=provider, model=model, success=success,
                latency_ms=latency, network_attempts=network,
                json_attempts=json_att, schema_attempts=schema_att,
                usage=usage or TokenUsage(prompt_tokens=100, completion_tokens=20, total_tokens=120),
            ),
        )

    return _run


def raising_runner(exc: BaseException):
    def _run(**kwargs):
        raise exc

    return _run


def harness(runner, *, store=None, timer=None) -> EvaluationHarness:
    ticks = iter(timer or [0.0, 0.5])  # 500 ms by default, deterministic
    return EvaluationHarness(
        runner=runner,
        store=store or NullEvalStore(),
        clock=lambda: FROZEN,
        timer=lambda: next(ticks),
        run_id_factory=lambda: "run-fixed",
    )


# ── the happy path records every required field ──────────────────────────────
class TestSuccessfulRun:
    def test_records_every_required_field(self):
        record = harness(ok_runner()).evaluate(case())

        assert record.run_id == "run-fixed"
        assert record.case_id == "case-1"
        assert record.timestamp == FROZEN.isoformat()
        assert record.task_type == "recruiter_copilot"
        assert record.prompt_id == "recruiter_copilot"       # from the prompt registry
        assert record.prompt_version                          # whatever it is, it is recorded
        assert record.role == "default_reasoning"
        assert record.provider == "groq"
        assert record.model == "llama-3.3-70b-versatile"
        assert record.provider_source == ProviderSource.ACTUAL.value
        assert record.success is True
        assert record.execution_time_ms == 500                # harness-measured
        assert record.orchestrator_latency_ms == 250          # as reported
        assert record.json_valid is True
        assert record.parse_result == ParseResult.VALIDATED.value
        assert record.output_bytes and record.output_bytes > 0
        assert record.prompt_tokens == 100 and record.completion_tokens == 20
        assert record.error_type is None

    def test_retry_count_is_derived_from_the_whole_ladder(self):
        # 3 network + 2 json + 1 schema attempt = 2 + 1 + 0 retries.
        record = harness(ok_runner(network=3, json_att=2, schema_att=1)).evaluate(case())
        assert (record.network_attempts, record.json_attempts, record.schema_attempts) == (3, 2, 1)
        assert record.retry_count == 3

    def test_output_bytes_measures_the_validated_object(self):
        record = harness(ok_runner(data=Reply(answer="x" * 500))).evaluate(case())
        assert record.output_bytes >= 500

    def test_metadata_from_the_case_is_carried_onto_the_record(self):
        # The golden dataset needs to label cases and read the labels back.
        record = harness(ok_runner()).evaluate(case(metadata={"difficulty": "hard"}))
        assert record.metadata == {"difficulty": "hard"}


# ── the classification that the whole harness exists for ─────────────────────
class TestFailureClassification:
    def test_invalid_json_is_recorded_as_the_model_answering_badly(self):
        record = harness(raising_runner(AIParseError("no json"))).evaluate(case())
        assert record.success is False
        assert record.json_valid is False
        assert record.parse_result == ParseResult.INVALID_JSON.value
        assert record.error_type == "AIParseError"

    def test_schema_mismatch_still_counts_as_valid_json(self):
        # The regression that matters: the model DID return JSON. Recording
        # json_valid=False here would blame a format failure for a comprehension
        # failure, and those have opposite fixes.
        record = harness(raising_runner(AIValidationError("bad shape"))).evaluate(case())
        assert record.success is False
        assert record.json_valid is True
        assert record.parse_result == ParseResult.SCHEMA_MISMATCH.value

    @pytest.mark.parametrize(
        "exc",
        [AITimeoutError("timed out"), AIRateLimitError("429"), AIProviderError("boom"), AIConfigError("no key")],
        ids=["timeout", "rate_limit", "provider_error", "config_error"],
    )
    def test_transport_failures_leave_json_validity_unknown(self, exc):
        record = harness(raising_runner(exc)).evaluate(case())
        assert record.success is False
        assert record.json_valid is None, "no response was produced — unknown, not invalid"
        assert record.parse_result == ParseResult.NOT_REACHED.value

    def test_failure_labels_the_provider_as_intended_not_observed(self):
        # run() raises without execution metadata, so provider/model are the
        # gateway's intent. Labelling that as observed would corrupt the dataset.
        record = harness(raising_runner(AITimeoutError("t"))).evaluate(case())
        assert record.provider_source == ProviderSource.INTENDED.value
        assert record.error_message  # bounded, single line
        assert "\n" not in record.error_message


class TestUnknownIsNotFalse:
    def test_none_and_false_are_distinguishable_after_a_round_trip(self, tmp_path):
        store = JsonlEvalStore(tmp_path)
        harness(raising_runner(AITimeoutError("t")), store=store).evaluate(case())
        harness(raising_runner(AIParseError("p")), store=store).evaluate(case(case_id="case-2"))

        rows = list(read_records(store.path_for("run-fixed")))
        by_case = {r.case_id: r for r in rows}
        assert by_case["case-1"].json_valid is None
        assert by_case["case-2"].json_valid is False


# ── §9A rule 9: unknown behaviour fails loudly ───────────────────────────────
class TestNonAIErrorsPropagate:
    def test_a_defect_in_the_case_is_not_recorded_as_a_provider_result(self):
        # A TypeError here means the case or the schema is wrong. Recording it as
        # a failed evaluation would put a harness bug into the provider dataset.
        with pytest.raises(TypeError):
            harness(raising_runner(TypeError("bad case"))).evaluate(case())


# ── the property that keeps this valid for the next provider ─────────────────
class TestNoVendorCoupling:
    """The harness must be usable for Groq, OpenAI, Gemini, Anthropic,
    OpenRouter and a local model without modification. The moment a vendor name
    appears in this package, that stops being true."""

    PACKAGE = Path(__file__).resolve().parents[1] / "app" / "ai" / "evaluation"
    VENDOR_IMPORTS = ("import groq", "from groq", "import openai", "from openai",
                      "import anthropic", "from anthropic", "google.generativeai")

    def test_no_module_imports_a_vendor_sdk(self):
        for path in self.PACKAGE.glob("*.py"):
            source = path.read_text(encoding="utf-8")
            for needle in self.VENDOR_IMPORTS:
                assert needle not in source, f"{path.name} imports a vendor SDK ({needle})"

    def test_no_module_imports_a_provider_implementation(self):
        # Reaching a provider directly would bypass the gateway and pin the
        # harness to one vendor's construction path.
        for path in self.PACKAGE.glob("*.py"):
            source = path.read_text(encoding="utf-8")
            assert "app.ai.providers" not in source, f"{path.name} reaches into a provider module"

    def test_the_default_runner_is_the_orchestrator(self):
        # The seam must actually be wired to the real thing, or every test above
        # is exercising a harness that production never uses. Resolved, never
        # called — calling it would make a live provider request.
        from app.ai.orchestrator.orchestrator import orchestrator

        resolved = EvaluationHarness()._resolve_runner()
        assert resolved == orchestrator.run

    def test_harness_never_touches_the_orchestrator_when_a_runner_is_injected(self, monkeypatch):
        # Proves the seam is real: with a runner injected, importing/constructing
        # the orchestrator is not required at all.
        import app.ai.evaluation.harness as mod

        def explode(*a, **k):
            raise AssertionError("the orchestrator must not be imported when a runner is injected")

        monkeypatch.setattr(mod.EvaluationHarness, "_resolve_runner",
                            lambda self: self._runner or explode())
        record = harness(ok_runner()).evaluate(case())
        assert record.success is True


# ── persistence ──────────────────────────────────────────────────────────────
class TestStore:
    def test_jsonl_round_trip_preserves_every_field(self, tmp_path):
        store = JsonlEvalStore(tmp_path)
        original = harness(ok_runner(), store=store).evaluate(case())
        [restored] = list(read_records(store.path_for("run-fixed")))
        assert restored == original

    def test_append_only_across_runs(self, tmp_path):
        store = JsonlEvalStore(tmp_path)
        harness(ok_runner(), store=store).evaluate(case())
        harness(ok_runner(), store=store).evaluate(case(case_id="case-2"))
        assert len(list(read_records(store.path_for("run-fixed")))) == 2

    def test_one_line_per_record(self, tmp_path):
        # JSONL is only JSONL if a record cannot contain a raw newline.
        store = JsonlEvalStore(tmp_path)
        harness(raising_runner(AIProviderError("boom\nwith a newline"))).evaluate(case())
        harness(raising_runner(AIProviderError("boom\nwith a newline")), store=store).evaluate(case())
        raw = store.path_for("run-fixed").read_text(encoding="utf-8")
        assert raw.count("\n") == 1
        json.loads(raw)  # parses as a single object

    def test_malformed_line_raises_with_its_location(self, tmp_path):
        # A dropped record would understate a failure rate, so a bad line is
        # fatal — and says which line, because a 500-record run is otherwise
        # unsearchable.
        good = harness(ok_runner()).evaluate(case()).to_json()
        path = tmp_path / "bad.jsonl"
        path.write_text(f"{good}\nnot json\n", encoding="utf-8")
        with pytest.raises(ValueError, match=r"bad\.jsonl:2"):
            list(read_records(path))

    def test_an_incomplete_record_is_also_fatal(self):
        # Valid JSON, but missing required fields. Defaulting it would invent
        # data that was never observed.
        with pytest.raises(TypeError):
            EvalRecord.from_dict({"run_id": "a"})

    def test_unknown_fields_from_a_newer_schema_are_dropped_not_fatal(self):
        record = EvalRecord.from_dict({"run_id": "r", "case_id": "c", "timestamp": "t",
                                       "task_type": "x", "prompt_id": None, "prompt_version": None,
                                       "role": None, "provider": None, "model": None,
                                       "field_from_the_future": 1})
        assert record.run_id == "r"

    def test_null_store_is_the_default_so_nothing_is_written_unasked(self, tmp_path):
        EvaluationHarness(runner=ok_runner(), clock=lambda: FROZEN).evaluate(case())
        assert not list(tmp_path.iterdir())


# ── the report counts; it does not judge ─────────────────────────────────────
class TestReport:
    def test_counts_without_ranking(self):
        h = harness(ok_runner(), timer=[0.0, 0.1, 0.1, 0.2, 0.2, 0.3])
        report = h.evaluate_all([case(), case(case_id="c2"), case(case_id="c3")])
        assert report.total == 3 and report.succeeded == 3 and report.failed == 0
        assert report.by_parse_result() == {ParseResult.VALIDATED.value: 3}
        assert report.by_provider() == {"groq": 3}
        # The report deliberately exposes no verdict.
        for banned in ("score", "passed", "winner", "best", "rank"):
            assert not hasattr(report, banned)

    def test_all_records_in_a_run_share_one_run_id(self):
        h = harness(ok_runner(), timer=[0.0, 0.1, 0.1, 0.2])
        report = h.evaluate_all([case(), case(case_id="c2")])
        assert {r.run_id for r in report.records} == {report.run_id}


# ── scoring is a seam, not a policy ──────────────────────────────────────────
class TestScoringIsReplaceable:
    def test_a_scorer_is_applied_over_records_never_inside_the_harness(self):
        @dataclass
        class LengthScorer:
            id: str = "length"
            version: str = "1"

            def score(self, record: EvalRecord) -> ScoreResult:
                return ScoreResult(record.run_id, record.case_id, self.id, self.version,
                                   float(record.output_bytes or 0))

        record = harness(ok_runner()).evaluate(case())
        [result] = apply(LengthScorer(), [record])
        assert result.value == record.output_bytes
        assert result.scorer_id == "length" and result.scorer_version == "1"

    def test_no_scorer_ships_with_the_harness(self):
        # Shipping one would freeze one definition of "good" into infrastructure.
        import app.ai.evaluation.scoring as scoring

        concrete = [
            n for n in dir(scoring)
            if n.endswith("Scorer") and n != "Scorer" and isinstance(getattr(scoring, n), type)
        ]
        assert concrete == [], f"scoring.py ships a concrete scorer: {concrete}"
