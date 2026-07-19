# V8 Sprint 13 — Predictive Hiring Intelligence & Organizational Digital Twin

> HireLens no longer just describes the hiring organization — it **models** it. A
> deterministic prediction framework + Organizational Digital Twin forecasts future
> recruiting outcomes and simulates alternative strategies, grounded in the org's own
> history. LLMs explain forecasts; they never generate them. Decision record:
> [ADR-017](../decisions/ADR-017-predictive-intelligence-architecture.md).

## Goal

Model the org's hiring system, forecast outcomes (completion, delay, offer acceptance,
capacity, skill shortage, cost, pipeline health), and simulate "what if…" scenarios —
explainable and evidence-backed, improving as organizational knowledge grows.

## Prediction lifecycle

```
Org data (analytics + knowledge + activity) → build Digital Twin (cached, incremental)
   → Forecast Models (deterministic) → Forecast {probability, confidence, evidence, factors, alternatives}
   → (Simulation: apply levers to a twin copy → re-forecast → delta)
   → AI EXPLAINS (Report / Copilot / Agent) — never generates the numbers
```

## Architecture (`app/prediction/`)
- `twin.py` — **Digital Twin**: deterministic model of campaigns, recruiters, skills,
  funnel, velocity, offer/interview conversion, per-recruiter throughput.
- `models.py` — **Forecast Models** (logistic/linear): hiring completion, delay risk,
  offer acceptance, interview success, dropout, recruiter capacity, skill shortage,
  hiring cost, pipeline health. Same input → same output.
- `engine.py` — **Prediction Engine** (dispatch + dashboard) + **Outcome Evaluator**
  (Brier / hit-rate).
- `simulation.py` — **Scenario Builder + Simulation Engine** (levers → twin copy → delta).
- `confidence.py` — **Confidence Calculator** (log-scaled by evidence volume).
- Migration `0011` (`prediction_snapshots`, `digital_twin_state`; membership RLS).

## Digital Twin

Built only from internal data (report data + knowledge skill evolution). Cached (120s)
and persisted to `digital_twin_state` for incremental updates. Never mutated by
simulations — scenarios run on a copy.

## Simulation engine

Levers (increase/reduce salary, add recruiters, expand remote, relax experience,
increase sourcing, open campaigns) apply transparent, evidence-based elasticities to a
twin copy; the forecast is re-run and the baseline↔scenario delta reported.

## Forecast methodology

Features are derived from the twin (progress, match quality, momentum, pool, funnel
rates); models are logistic/linear with documented coefficients. Every forecast exposes
probability/value, confidence, evidence, contributing factors (direction), a historical
comparison, and best/worst alternatives. No opaque predictions.

## Confidence calculations

`confidence = clamp(25, 95, 25 + 22·log10(1 + data_points))` — more organizational
evidence → higher confidence. Deterministic and transparent.

## Model governance

`prediction_snapshots` records forecasts; the Outcome Evaluator compares recorded
probabilities to realised outcomes (Brier score + hit rate) as evidence accumulates.
Only transparent outputs are stored — never model artifacts.

## AI integration (consume, never compute)

- **Executive Reports** inject a deterministic `forecast_brief` (future outlook) the LLM
  explains.
- **Copilot** answers "what happens if…" / "probability…" via the same engine
  (`copilot_prediction`), rendering baseline↔scenario and forecast cards.
- **Agent** has a `forecast` tool in its registry (risk prioritization).
- No capability computes forecasts independently.

## Frontend — Predictive Intelligence (`/predictions`)

Forecast Dashboard, Scenario Simulator, Capacity Planning, Skill Forecast, Digital Twin
Viewer, Outcome Explorer. Header link.

## Performance & security

Cached, incremental twin; no GPUs; deterministic (no training on the hot path).
Org-scoped (membership RLS); no model artifacts exposed; RBAC-honoured; explainable.

## Verification

- ✅ Deterministic: identical inputs → identical forecast output (test). Delay risk
  ranks a stalled+tight-deadline campaign above a fresh one; +15% salary improves offer
  acceptance; +3 recruiters reduces the capacity gap.
- ✅ AI explains but never invents (report injects forecast_brief; copilot renders engine
  output). Every forecast explainable (evidence/factors/confidence/alternatives).
- ✅ Prediction layer independent of the AI gateway (no import). 106 API routes (6
  prediction); frontend `tsc` zero errors + `next build` green (adds `/predictions`);
  Sprint 2–12 intact.
