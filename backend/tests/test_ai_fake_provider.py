"""
The fake provider and the golden dataset (Phase 0, task 2).

WHAT THESE TESTS ARE REALLY FOR
-------------------------------
Not "does the fake work". The fake is trivial. What matters is that setting
`AI_PROVIDER=fake` drives the **real** stack — gateway, health, per-provider
config, the retry ladder, the usage tracker — so that everything measured
afterwards was measured through the path production uses. A fake reached by a
shortcut would make every later phase's evidence worthless.

So the load-bearing tests here are the ones that would still pass if someone
quietly added a shortcut, and must not:

  * `TestOrchestratorReachesTheFake`     — the real path, end to end
  * `TestHarnessNeedsNoModification`     — no special-casing leaked into task 1
  * `TestRetryLadder`                    — the ladder actually ran
  * `TestNoFalseGreen`                   — an unanswerable prompt FAILS
  * `TestGoldenCaseIdsAreStable`         — historical comparisons stay joinable

Everything is offline: no key, no network, no wall clock (backoff sleeps and
latency simulation are both patched out).
"""
from __future__ import annotations

import importlib
import json

import pytest

# `app.ai.orchestrator.__init__` re-exports the singleton under the same name as
# the submodule, so a plain `import app.ai.orchestrator.orchestrator` resolves to
# the object, not the module. The existing AI tests use importlib for the same
# reason; keeping the idiom identical.
orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")
provider_registry = importlib.import_module("app.ai.providers.registry")
from app.ai.evaluation import EvaluationHarness, JsonlEvalStore, ParseResult, read_records
from app.ai.evaluation.golden import (
    GoldenDatasetError,
    load_and_register,
    load_cases,
    register_expected_responses,
)
from app.ai.gateway import health_manager, resolve
from app.ai.gateway.gateway import clear_override
from app.ai.gateway.provider_registry import get_provider_spec
from app.ai.gateway.model_registry import get_model, estimate_cost
from app.ai.providers.fake_provider import (
    FAKE_MODEL,
    Behaviour,
    FakeBehaviour,
    FakeProvider,
    behaviour,
    fake_script,
    fingerprint,
)
from app.ai.providers.registry import available_providers, get_provider
from app.ai.prompts.registry import get_prompt
from app.ai.schemas.base import Capability
from app.ai.utils.errors import AIConfigError, AIParseError, AIRateLimitError, AIValidationError
from app.core.config import settings


@pytest.fixture(autouse=True)
def fake_env(monkeypatch):
    """Point the whole stack at the fake, and remove every source of nondeterminism."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "fake", raising=False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development", raising=False)
    monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "success", raising=False)
    monkeypatch.setattr(settings, "AI_FAKE_LATENCY_MS", 0, raising=False)
    # The orchestrator's backoff is real time. Patch it out so the retry-ladder
    # tests are instant and never flaky.
    monkeypatch.setattr(orch_mod.time, "sleep", lambda _s: None)
    monkeypatch.setattr(FakeProvider, "sleeper", staticmethod(lambda _s: None))
    clear_override()
    health_manager.reset()
    fake_script.reset()
    provider_registry._INSTANCES.pop("fake", None)
    yield
    fake_script.reset()
    health_manager.reset()
    clear_override()


def copilot_case(question="Is this candidate a fit?"):
    """A real capability with a REQUIRED field (`answer`), so a wrong-shape
    response genuinely fails validation. Capabilities whose schemas default every
    field cannot detect a schema mismatch at all — see TestNoFalseGreen."""
    from app.schemas.copilot import CopilotLLMOutput

    variables = {
        "context": "Candidate: Test Person. Role: Backend Engineer.",
        "available_sources": ["Candidate record"],
        "history_text": "",
        "question": question,
        "intent": "general",
    }
    return Capability.RECRUITER_COPILOT, variables, CopilotLLMOutput


def register(capability, variables, payload):
    template = get_prompt(capability)
    fp = fingerprint(template.system, template.build_user(**variables))
    fake_script.register_response(fp, payload)
    return fp


GOOD_COPILOT = {"answer": "Yes — the record supports it.", "confidence": 70}


# ── registration ─────────────────────────────────────────────────────────────
class TestRegistration:
    def test_registry_exposes_fake_like_any_other_provider(self):
        assert "fake" in available_providers()
        assert isinstance(get_provider("fake"), FakeProvider)

    def test_it_needs_no_api_key(self):
        assert get_provider("fake").is_configured() is True

    def test_the_gateway_has_a_spec_and_resolves_its_own_model(self):
        # Without a ProviderSpec the gateway cannot resolve a model for the
        # fake at all. Before C4 it fell through to AI_DEFAULT_MODEL — a GROQ
        # model name — and every record was mislabelled as llama-3.3-70b; now it
        # raises instead. Either way the spec is what makes this correct.
        spec = get_provider_spec("fake")
        assert spec is not None
        selection = resolve()
        assert (selection.provider, selection.model) == ("fake", FAKE_MODEL)

    def test_the_model_is_registered_with_no_price(self):
        # Cost must read UNKNOWN, never 0.0 — a fake reporting "$0.00 spent"
        # would look like a real measurement.
        assert get_model(FAKE_MODEL) is not None
        assert estimate_cost(FAKE_MODEL, 1000, 1000) is None

    def test_it_refuses_to_construct_in_production(self, monkeypatch):
        monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
        provider_registry._INSTANCES.pop("fake", None)
        with pytest.raises(AIConfigError, match="cannot be used in production"):
            get_provider("fake")


# ── the real path ────────────────────────────────────────────────────────────
class TestOrchestratorReachesTheFake:
    def test_a_normal_orchestrated_call_is_served_by_the_fake(self):
        cap, variables, schema = copilot_case()
        register(cap, variables, GOOD_COPILOT)

        result = orch_mod.orchestrator.run(capability=cap, variables=variables, schema=schema)

        assert result.data.answer == GOOD_COPILOT["answer"]
        assert result.execution.provider == "fake"
        assert result.execution.model == FAKE_MODEL
        assert result.execution.success is True
        assert fake_script.calls, "the provider was never actually reached"

    def test_the_provider_receives_the_orchestrator_resolved_parameters(self):
        # Proves nothing bypassed per-provider config on the way down.
        cap, variables, schema = copilot_case()
        register(cap, variables, GOOD_COPILOT)
        orch_mod.orchestrator.run(capability=cap, variables=variables, schema=schema)
        call = fake_script.calls[0]
        assert call["model"] == FAKE_MODEL
        assert call["max_tokens"] == settings.AI_MAX_TOKENS
        assert call["timeout_seconds"] == settings.AI_TIMEOUT_SECONDS

    def test_usage_is_recorded_against_the_fake(self):
        from app.ai.gateway import usage_tracker

        cap, variables, schema = copilot_case()
        register(cap, variables, GOOD_COPILOT)
        orch_mod.orchestrator.run(capability=cap, variables=variables, schema=schema)
        assert "fake" in usage_tracker.snapshot()["by_provider"]


# ── determinism ──────────────────────────────────────────────────────────────
class TestDeterminism:
    def test_the_same_prompt_returns_byte_identical_output(self):
        provider = FakeProvider()
        kwargs = dict(system="sys", user="usr", model=FAKE_MODEL, temperature=0.2,
                      max_tokens=100, timeout_seconds=30)
        fake_script.register_response(fingerprint("sys", "usr"), {"a": 1})
        first = provider.complete(**kwargs)
        second = provider.complete(**kwargs)
        assert first.text == second.text
        assert first.usage.prompt_tokens == second.usage.prompt_tokens

    def test_a_different_prompt_returns_a_different_fingerprint(self):
        assert fingerprint("s", "a") != fingerprint("s", "b")

    def test_the_fingerprint_ignores_the_per_call_injection_nonce(self):
        # `untrusted.fence()` puts a fresh random nonce in every rendered prompt
        # so a résumé cannot close its own fence. Without normalising it out, no
        # fenced capability (batch_candidate) could ever be keyed by prompt —
        # this was a real false green during development.
        a = "<<<UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>text<<<END_UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>"
        b = "<<<UNTRUSTED_CANDIDATE_DOCUMENT:bbbbbbbbbbbbbbbb>>>text<<<END_UNTRUSTED_CANDIDATE_DOCUMENT:bbbbbbbbbbbbbbbb>>>"
        assert fingerprint("sys", a) == fingerprint("sys", b)

    def test_prompt_text_changes_still_change_the_fingerprint(self):
        # The normalisation must not be so aggressive that a genuine prompt edit
        # goes unnoticed — §9A rule 6 depends on that being detectable.
        a = "<<<UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>one<<<END_UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>"
        b = "<<<UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>two<<<END_UNTRUSTED_CANDIDATE_DOCUMENT:aaaaaaaaaaaaaaaa>>>"
        assert fingerprint("sys", a) != fingerprint("sys", b)


# ── behaviours are configuration, not code ───────────────────────────────────
class TestBehaviourSelection:
    def test_env_var_selects_a_behaviour_without_touching_provider_code(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "invalid_json", raising=False)
        provider = FakeProvider()
        text = provider.complete(system="s", user="u", model=FAKE_MODEL,
                                 temperature=0.0, max_tokens=10, timeout_seconds=5).text
        with pytest.raises(json.JSONDecodeError):
            json.loads(text)

    def test_an_unknown_behaviour_fails_loudly(self):
        with pytest.raises(AIConfigError, match="Unknown fake behaviour"):
            FakeBehaviour(kind="teleport")

    def test_latency_is_simulated_through_the_injected_sleeper(self):
        slept: list[float] = []
        FakeProvider.sleeper = staticmethod(slept.append)
        try:
            fake_script.set_default(behaviour(Behaviour.SUCCESS, latency_ms=250, payload={"a": 1}))
            FakeProvider().complete(system="s", user="u", model=FAKE_MODEL,
                                    temperature=0.0, max_tokens=10, timeout_seconds=5)
        finally:
            FakeProvider.sleeper = staticmethod(lambda _s: None)
        assert slept == [0.25]

    def test_token_counts_are_configurable_and_otherwise_derived(self):
        fake_script.set_default(behaviour(Behaviour.SUCCESS, payload={"a": 1},
                                          prompt_tokens=111, completion_tokens=22))
        usage = FakeProvider().complete(system="s", user="u", model=FAKE_MODEL,
                                        temperature=0.0, max_tokens=10, timeout_seconds=5).usage
        assert (usage.prompt_tokens, usage.completion_tokens, usage.total_tokens) == (111, 22, 133)


# ── the retry ladder actually runs ───────────────────────────────────────────
class TestRetryLadder:
    def _run(self, cap, variables, schema):
        return orch_mod.orchestrator.run(capability=cap, variables=variables, schema=schema)

    def test_a_transient_timeout_is_retried_then_succeeds(self):
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.TIMEOUT), behaviour(Behaviour.TIMEOUT),
                                behaviour(Behaviour.SUCCESS)])
        result = self._run(cap, variables, schema)
        assert result.execution.success is True
        assert result.execution.network_attempts == 3, "the network ladder did not run"

    def test_daily_quota_is_never_retried(self):
        # The standing decision: a quota will not clear today, so retrying only
        # burns more of a scarce budget.
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.QUOTA)])
        with pytest.raises(AIRateLimitError):
            self._run(cap, variables, schema)
        assert len(fake_script.calls) == 1

    def test_a_transient_rate_limit_is_retried(self):
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.RATE_LIMIT), behaviour(Behaviour.RATE_LIMIT),
                                behaviour(Behaviour.SUCCESS)])
        assert self._run(cap, variables, schema).execution.success is True
        assert len(fake_script.calls) == 3

    def test_unparseable_output_exhausts_the_json_ladder(self):
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.INVALID_JSON)])
        with pytest.raises(AIParseError):
            self._run(cap, variables, schema)
        assert len(fake_script.calls) == settings.AI_MAX_JSON_RETRIES

    def test_empty_output_is_a_parse_failure_not_a_success(self):
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.EMPTY)])
        with pytest.raises(AIParseError):
            self._run(cap, variables, schema)

    def test_wrong_shape_exhausts_the_schema_ladder(self):
        cap, variables, schema = copilot_case()
        fp = register(cap, variables, GOOD_COPILOT)
        fake_script.script(fp, [behaviour(Behaviour.SCHEMA_MISMATCH)])
        with pytest.raises(AIValidationError):
            self._run(cap, variables, schema)
        assert len(fake_script.calls) == settings.AI_MAX_SCHEMA_RETRIES


# ── the harness was not modified, and still classifies correctly ─────────────
class TestHarnessNeedsNoModification:
    def test_the_harness_default_runner_drives_the_fake(self):
        # No runner injected, no special-casing: the harness's production seam.
        cases = load_and_register()
        report = EvaluationHarness().evaluate_all([c.to_eval_case() for c in cases])
        assert report.total == len(cases)
        assert report.failed == 0, report.by_parse_result()
        assert report.by_provider() == {"fake": len(cases)}
        assert set(report.by_parse_result()) == {ParseResult.VALIDATED.value}

    def test_the_harness_has_no_code_reference_to_any_provider(self):
        # The injection seam is the registry, not the harness. Asserted over the
        # AST rather than the raw text, because the harness's docstring
        # legitimately EXPLAINS the fake (decision D0.2) — a substring check
        # would fire on its own documentation and get deleted for being noise.
        import ast
        from pathlib import Path

        pkg = Path(orch_mod.__file__).resolve().parents[1] / "evaluation"
        offenders: list[str] = []
        for path in sorted(pkg.rglob("*.py")):
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom) and "providers" in (node.module or ""):
                    offenders.append(f"{path.name}: imports {node.module}")
                elif isinstance(node, ast.Import):
                    offenders.extend(
                        f"{path.name}: imports {a.name}" for a in node.names if "providers" in a.name
                    )
                elif isinstance(node, ast.Constant) and node.value in {"fake", "groq", "openai"}:
                    offenders.append(f"{path.name}: provider name literal {node.value!r}")
        # golden/loader.py is the one legitimate exception and is asserted
        # separately below — it must reach the fake to register responses.
        offenders = [o for o in offenders if not o.startswith("loader.py")]
        assert offenders == [], offenders

    def test_only_the_golden_loader_knows_the_fake_exists(self):
        # And it knows in one direction only: the dataset registers answers with
        # the fake; the fake knows nothing about datasets, capabilities or schemas.
        from pathlib import Path

        import ast

        root = Path(orch_mod.__file__).resolve().parents[1]
        loader = (root / "evaluation" / "golden" / "loader.py").read_text(encoding="utf-8")
        assert "fake_provider" in loader, "the dataset must be able to register answers"

        # The reverse direction, over the AST — the fake's docstring legitimately
        # mentions the golden dataset, and a substring check would fire on it.
        fake_tree = ast.parse((root / "providers" / "fake_provider.py").read_text(encoding="utf-8"))
        imported: list[str] = []
        for node in ast.walk(fake_tree):
            if isinstance(node, ast.ImportFrom):
                imported.append(node.module or "")
            elif isinstance(node, ast.Import):
                imported.extend(a.name for a in node.names)
        leaks = [m for m in imported if "evaluation" in m or "golden" in m]
        assert leaks == [], f"the fake imports the evaluation layer: {leaks}"

    def test_records_are_written_for_a_full_golden_run(self, tmp_path):
        store = JsonlEvalStore(tmp_path)
        cases = load_and_register()
        report = EvaluationHarness(store=store).evaluate_all([c.to_eval_case() for c in cases])
        rows = list(read_records(store.path_for(report.run_id)))
        assert len(rows) == len(cases)
        assert {r.case_id for r in rows} == {c.case_id for c in cases}
        for row in rows:
            assert row.provider == "fake" and row.model == FAKE_MODEL
            assert row.prompt_id and row.prompt_version
            assert row.output_bytes and row.output_bytes > 0
            assert row.prompt_tokens and row.completion_tokens

    def test_malformed_json_is_classified_through_the_real_stack(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "invalid_json", raising=False)
        cases = load_and_register()
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.success is False
        assert record.json_valid is False
        assert record.parse_result == ParseResult.INVALID_JSON.value

    def test_schema_mismatch_still_records_json_valid_true(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "schema_mismatch", raising=False)
        cases = [c for c in load_and_register() if c.case_id == "copilot-001"]
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.json_valid is True, "the model DID return JSON; only the shape was wrong"
        assert record.parse_result == ParseResult.SCHEMA_MISMATCH.value

    def test_timeout_is_recorded_as_unknown_json_validity(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "timeout", raising=False)
        cases = load_and_register()
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.json_valid is None
        assert record.parse_result == ParseResult.NOT_REACHED.value
        assert record.error_type == "AITimeoutError"

    def test_provider_exceptions_are_recorded_not_raised(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_FAKE_BEHAVIOUR", "provider_error", raising=False)
        cases = load_and_register()
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.success is False and record.error_type == "AIProviderError"

    def test_latency_and_tokens_reach_the_record(self):
        cases = load_and_register()
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.orchestrator_latency_ms is not None
        assert record.execution_time_ms >= 0
        assert record.prompt_tokens and record.completion_tokens


# ── the false green that was found and closed ────────────────────────────────
class TestNoFalseGreen:
    def test_an_unregistered_prompt_fails_instead_of_being_invented(self):
        cap, variables, schema = copilot_case(question="never registered")
        with pytest.raises(AIConfigError, match="no registered response"):
            orch_mod.orchestrator.run(capability=cap, variables=variables, schema=schema)

    def test_an_unregistered_prompt_cannot_pass_a_fully_defaulted_schema(self):
        # THE regression this guards. GroqBatchAnalysis defaults every field, so
        # any object validates against it. When the fake returned a marker for an
        # unregistered prompt, a batch case reported SUCCESS while measuring
        # nothing. Discovered during development of this task.
        from app.llm.batch_analyzer import GroqBatchAnalysis

        assert GroqBatchAnalysis()  # proves the schema really is fully defaulted
        variables = {"job_description": "unregistered", "resume_json": "{}"}
        with pytest.raises(AIConfigError, match="no registered response"):
            orch_mod.orchestrator.run(
                capability=Capability.BATCH_CANDIDATE, variables=variables,
                schema=GroqBatchAnalysis,
            )

    def test_a_fenced_capability_is_answerable_at_all(self):
        # The other half: batch_candidate DOES work once registered, which only
        # holds because the fingerprint normalises the injection nonce.
        cases = [c for c in load_and_register() if c.case_id == "batch-candidate-001"]
        record = EvaluationHarness().evaluate(cases[0].to_eval_case())
        assert record.success is True
        assert record.output_bytes > 400, "suspiciously small — is this a marker object?"


# ── the golden dataset ───────────────────────────────────────────────────────
class TestGoldenDataset:
    def test_every_case_validates_against_its_real_production_schema(self):
        cases = load_cases()
        assert len(cases) >= 6
        for c in cases:
            c.schema(**c.expected_output)

    def test_cases_carry_description_category_and_difficulty(self):
        for c in load_cases():
            assert c.description and c.category and c.difficulty
            assert c.difficulty in {"trivial", "typical", "hard"}

    def test_metadata_reaches_the_record(self):
        case = next(c for c in load_and_register() if c.case_id == "copilot-001")
        record = EvaluationHarness().evaluate(case.to_eval_case())
        assert record.metadata["category"] == case.category
        assert record.metadata["difficulty"] == case.difficulty

    def test_a_duplicate_case_id_is_fatal(self, tmp_path):
        one = load_cases()[0]
        entry = {
            "case_id": one.case_id, "capability": one.capability.value,
            "description": "d", "category": "c", "difficulty": "typical",
            "variables": one.variables, "expected_output": one.expected_output,
        }
        path = tmp_path / "dupes.json"
        path.write_text(json.dumps({"cases": [entry, entry]}), encoding="utf-8")
        with pytest.raises(GoldenDatasetError, match="duplicate case_id"):
            load_cases(path)

    def test_an_expected_output_that_cannot_satisfy_the_schema_is_fatal(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text(json.dumps({"cases": [{
            "case_id": "x-001", "capability": "recruiter_copilot", "description": "d",
            "category": "c", "difficulty": "typical", "variables": {},
            "expected_output": {"not_the_right_shape": True},
        }]}), encoding="utf-8")
        with pytest.raises(GoldenDatasetError, match="does not satisfy"):
            load_cases(path)

    def test_an_unknown_capability_is_fatal(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text(json.dumps({"cases": [{
            "case_id": "x-001", "capability": "telepathy", "description": "d",
            "category": "c", "difficulty": "typical", "variables": {},
            "expected_output": {},
        }]}), encoding="utf-8")
        with pytest.raises(GoldenDatasetError, match="unknown capability"):
            load_cases(path)

    def test_the_dataset_is_extensible_without_code_changes(self, tmp_path):
        # A new case is a JSON edit. If this ever needs a Python change, the
        # dataset stops growing.
        existing = load_cases()[0]
        entry = {
            "case_id": "copilot-999", "capability": "recruiter_copilot",
            "description": "added by editing data only", "category": "grounded-qa",
            "difficulty": "trivial", "variables": existing.variables,
            "expected_output": {"answer": "yes"},
        }
        path = tmp_path / "extended.json"
        path.write_text(json.dumps({"cases": [entry]}), encoding="utf-8")
        cases = load_cases(path)
        assert [c.case_id for c in cases] == ["copilot-999"]
        assert register_expected_responses(cases) == 1


class TestGoldenCaseIdsAreStable:
    """`case_id` is a permanent join key (D0.10).

    Renaming one does not corrupt data — it makes historical results for that
    case silently DISAPPEAR from a comparison, which is far harder to notice.
    Additions are free; renames and removals fail here.
    """

    KNOWN = (
        "copilot-001",
        "copilot-002",
        "resume-analysis-001",
        "job-matching-001",
        "batch-candidate-001",
        "agent-reasoning-001",
    )

    def test_no_known_case_id_has_been_renamed_or_removed(self):
        present = {c.case_id for c in load_cases()}
        missing = [cid for cid in self.KNOWN if cid not in present]
        assert not missing, (
            f"case_id(s) {missing} disappeared. Ids are join keys for historical "
            f"comparisons — add new ones freely, but never rename or remove one. "
            f"If a case is genuinely obsolete, retire it in the dataset and leave "
            f"the id in this list."
        )
