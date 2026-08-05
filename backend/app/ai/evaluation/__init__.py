"""
AI Evaluation Harness (Phase 0, task 1 of the AI Architecture milestone).

Permanent infrastructure. Its job is to make provider comparisons POSSIBLE, not
to make one today: it runs cases through `orchestrator.run` and records what
happened, so that when a second provider is switched on there is a before to
compare the after against.

    from app.ai.evaluation import EvalCase, EvaluationHarness, JsonlEvalStore

    harness = EvaluationHarness(store=JsonlEvalStore())
    report  = harness.evaluate_all(cases)     # cases come from the golden dataset
    report.succeeded, report.by_parse_result()

Three properties are load-bearing and should survive every later change:

1. **No vendor import.** Nothing under `app/ai/evaluation/` imports a provider
   SDK or a provider module. The harness reaches an LLM only through the
   injected runner, whose default is `orchestrator.run`. That is what makes one
   harness valid for Groq, OpenAI, Gemini, Anthropic, OpenRouter and a local
   model without modification. A test asserts it.
2. **The orchestrator is untouched.** The harness wraps; it does not hook.
   Where that costs information, the gap is recorded rather than closed by
   reaching inside (§9A rule 1).
3. **Facts, not verdicts.** Records carry no score and no ranking. Scoring is a
   replaceable Protocol applied afterwards (`scoring.py`).
"""

from app.ai.evaluation.harness import (
    EvalCase,
    EvalReport,
    EvaluationHarness,
    RunnerFn,
)
from app.ai.evaluation.records import EvalRecord, ParseResult, ProviderSource
from app.ai.evaluation.scoring import ScoreResult, Scorer
from app.ai.evaluation.store import (
    DEFAULT_EVAL_DIR,
    EvalStore,
    JsonlEvalStore,
    NullEvalStore,
    read_records,
)

__all__ = [
    "EvalCase",
    "EvalReport",
    "EvaluationHarness",
    "RunnerFn",
    "EvalRecord",
    "ParseResult",
    "ProviderSource",
    "Scorer",
    "ScoreResult",
    "EvalStore",
    "JsonlEvalStore",
    "NullEvalStore",
    "DEFAULT_EVAL_DIR",
    "read_records",
]
