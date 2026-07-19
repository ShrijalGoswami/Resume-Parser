# ADR-017 — Predictive Intelligence Architecture

**Status:** Accepted · **Date:** V8 Sprint 13

## Context

HireLens *describes* the hiring organization (analytics, executive reports) and
*remembers* it (organizational knowledge). The next step is to **model** it and
forecast the future: "if we open 15 AI Engineer roles next quarter, what happens?",
"probability this campaign finishes before deadline?", "how many recruiters will we
need?", "what if we raise salary 15%?". Leaders need evidence-based, explainable
forecasts grounded in the org's own history.

Hard constraints: predictions must be **deterministic** (statistical models, not an
LLM — no hallucinated numbers), the layer must be **independent of the AI Gateway**,
LLMs may only *explain* forecasts, it must not require GPUs, and it must stay
organization-scoped and explainable.

## Decision

Add a **Predictive Intelligence Layer** (`app/prediction/`) with an Organizational
**Digital Twin** as the simulation environment.

- **Digital Twin** (`twin.py`) — a deterministic internal model of the hiring system
  built ONLY from the org's own data (analytics + knowledge + activity): campaigns,
  recruiters, skills, funnel, velocity, offer/interview conversion, per-recruiter
  throughput. Rebuilt incrementally (cached, persisted to `digital_twin_state`).
- **Forecast Models** (`models.py`) — pure statistical models (logistic/linear over
  twin features) for hiring completion, delay risk, offer acceptance, interview
  success, dropout, recruiter capacity, skill shortage, hiring cost, pipeline health.
  Same input → same output; no randomness, no LLM. Each returns probability/value,
  confidence, evidence, contributing factors (with direction), a historical
  comparison, and best/worst alternatives.
- **Prediction Engine** (`engine.py`) — dispatch + a dashboard set + an **Outcome
  Evaluator** (Brier score / hit rate over recorded predictions vs realised outcomes)
  for model governance.
- **Simulation Engine + Scenario Builder** (`simulation.py`) — applies hypothetical
  levers (salary, recruiters, remote, relax requirements, sourcing, open campaigns)
  to a COPY of the twin using transparent, evidence-based elasticities, then re-runs
  forecasts to estimate downstream impact. The baseline twin is never mutated.
- **Confidence Calculator** (`confidence.py`) — confidence grows (log-scaled) with the
  volume of organizational evidence behind a forecast.
- **AI consumes, never computes** — Executive Reports inject a deterministic
  `forecast_brief` the LLM *explains*; the Copilot answers "what happens if…" via the
  same engine; the Agent has a `forecast` tool in its registry. No capability computes
  forecasts itself.
- **Independence & security** — `app/prediction` imports no AI gateway/orchestrator
  (verified). Org-scoped (membership RLS); only transparent forecast outputs are
  stored — never model artifacts. No GPUs.

## Consequences

- ✅ **Models, not describes** — a Digital Twin + forecasts + what-if simulation.
- ✅ **Deterministic & explainable** — reproducible numbers with evidence, factors,
  confidence, and alternatives; the LLM only narrates.
- ✅ **Evidence-based** — grounded entirely in the org's own history; improves as
  knowledge grows.
- ✅ **Composable** — reused by Reports, Copilot, and the Agent through one engine.
- ✅ **Lightweight** — statistical models, no GPU, cached/incremental twin.
- ⚠️ **Parametric models** — transparent formulas with sensible priors, not trained
  ML; a fitted model can slot in behind the same interface as data accumulates.
- ⚠️ **Copilot lever parsing is heuristic** — the Scenario Simulator UI provides exact
  control; the natural-language path is best-effort.

## Alternatives considered

| Option | Why not |
|--------|---------|
| LLM-generated forecasts | Hallucinates numbers; predictions must be deterministic. |
| Train ML models now (GPU) | Premature + heavy; parametric models ship value now, ML slots in later. |
| Put prediction inside the AI gateway | Couples deterministic forecasting to the LLM; the layer must be independent. |
| Each capability forecasts itself | Fragmented + inconsistent; one shared engine instead. |
| External forecasting service | Data-flow/cost; a native, explainable engine keeps governance in-house. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-012](./ADR-012-executive-intelligence-architecture.md),
[ADR-016](./ADR-016-organizational-knowledge-architecture.md),
[sprints/V8_SPRINT13.md](../sprints/V8_SPRINT13.md).
