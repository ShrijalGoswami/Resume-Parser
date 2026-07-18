# ADR-002 — Use Groq (Llama-3.3) for LLM inference

**Status:** Accepted · **Date:** v1.0

## Context

The hybrid pipeline uses an LLM only for qualitative text (summaries, strengths,
gaps, recommendations, interview questions, Copilot answers) — **never for
numeric scores**, which are deterministic. For a responsive recruiter UX we need
**low latency** and **low cost per token**, since batch ranking issues one LLM
call per resume and Copilot is interactive.

## Decision

Use **Groq** with the **`llama-3.3-70b-versatile`** model via the official
`groq` SDK (`groq_client.call_groq`, `temperature=0.2`, `max_tokens=2048`,
`timeout=30s`, 3 retries). All LLM output is validated against Pydantic schemas
that contain **no score fields**, so the model cannot override deterministic
numbers.

## Consequences

- ✅ Very fast inference → the product feels instantaneous even in batch.
- ✅ Low cost per token keeps batch ranking economical.
- ✅ A capable 70B open model gives strong recruiter-grade reasoning.
- ✅ Deterministic-first design means an LLM outage only degrades *text*, not
  scores (see fallback in [AI_PIPELINE.md](../AI_PIPELINE.md)).
- ⚠️ Single-provider coupling; mitigated by a planned provider abstraction
  (the call site is isolated in `groq_client.py`).
- ⚠️ Model/version drift risk; pinned via the explicit model id.

## Alternatives considered

| Option | Why not |
|--------|---------|
| OpenAI GPT-4-class | Higher latency and cost per token for a per-resume call; overkill for text-only tasks. |
| Anthropic Claude | Strong quality but similar cost/latency trade-off for this narrow use. |
| Self-hosted Llama | Ops burden (GPUs, scaling) not justified at current stage. |
| LLM for scoring too | Rejected — non-deterministic, hallucinated scores break candidate comparison (the core value prop). |

See [AI_PIPELINE.md](../AI_PIPELINE.md), [ROADMAP.md](../ROADMAP.md).
