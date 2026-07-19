# ADR-011 — AI Gateway & Provider Management

**Status:** Accepted · **Date:** V4 Sprint 7.5

## Context

Sprint 3 introduced provider abstraction (`LLMProvider`) and Sprint 6 the same for
embeddings, but selection was largely static: the default provider/model came from
config and capabilities effectively used one vendor. To be commercially scalable
we need to switch LLM **and** embedding providers — Groq, Gemini, Anthropic,
OpenAI, OpenRouter, local — entirely by configuration, with every capability
(Copilot, Comparison, Interview Intelligence, Semantic Search, future features)
transparently following. No feature should know or care which vendor answered.

## Decision

Evolve the AI Foundation into a true **AI Gateway** — "Stripe for AI providers."

- **Logical roles, not model names.** Features request a `ModelRole`
  (DEFAULT_REASONING, FAST_REASONING, CHEAP_REASONING, LONG_CONTEXT,
  PREMIUM_REASONING, EMBEDDINGS). The gateway maps role → (provider, model) from
  configuration. Callers never hardcode models.
- **Model Registry** (`ai/gateway/model_registry.py`) — metadata per model
  (provider, cost tier, context window, max output, json/streaming/tools/embeddings
  support, optional token pricing). Powers resolution + cost estimation.
- **Provider Registry** (`ai/gateway/provider_registry.py`) — declarative provider
  metadata (capabilities, per-role default models, context window, the *name* of
  the key setting — never the key). Complements the instance registry.
- **Gateway** (`ai/gateway/gateway.py`) — resolves roles, builds a **configurable
  fallback chain**, estimates cost, and supports a **runtime provider override**
  (one switch updates the whole platform). Selection precedence: runtime override →
  `AI_PROVIDER`/`AI_DEFAULT_PROVIDER`; model precedence: per-role env override →
  provider's registered default → `AI_DEFAULT_MODEL`.
- **Orchestrator integration** — `orchestrator.run(..., role=…)` resolves via the
  gateway and wraps the historical retry ladder (network 3 → JSON 3 → schema 2) in
  a **provider fallback loop**: if a provider's key/SDK is missing or it errors out,
  the next configured provider is tried. Every attempt feeds the usage tracker.
- **Usage, cost & health** (`ai/gateway/usage.py`) — an in-memory, thread-safe
  aggregator (requests, tokens, estimated cost, latency, error rate, timeouts) per
  provider/model, plus derived provider health. Exposed to an authenticated admin.
- **Admin layer** (`routes/admin.py`) — `GET /ai/config`, `GET /ai/usage`,
  `POST /ai/provider` (runtime switch). Secrets never leave the server; only
  provider/model names, capability flags, and counters are surfaced.
- **Embeddings** follow the same abstraction (hashing/openai/gemini, configurable),
  so Semantic Search stays provider-agnostic.

## Consequences

- ✅ **Vendor-swappable by config** — change `AI_PROVIDER` (+ restart) or POST a
  runtime switch; every AI feature follows instantly. No feature-level code edits.
- ✅ **Role-based** — features express intent ("reasoning", "long context"); the
  business maps roles to models per cost/quality strategy.
- ✅ **Resilient** — configurable, non-hardcoded fallback chains; a dead provider
  degrades to the next automatically.
- ✅ **Observable & costed** — per-provider/model usage, estimated cost, and health
  ready for dashboards and optimisation.
- ✅ **Secure** — keys stay server-side; the frontend never sees provider details or
  raw provider errors.
- ✅ **Scale-ready** — the Stage 1→3 routing strategies (Gemini for cost, Anthropic
  for quality, tiered by workspace) are expressible today via config.
- ⚠️ **Provider SDKs are lazy** — gemini/anthropic/openai/openrouter import their
  SDK only when selected; an unconfigured provider raises a clean AIConfigError
  (which triggers fallback) rather than failing at import.
- ⚠️ **Usage is in-memory** — resets on restart; a durable store is a future step.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Keep static default provider/model | Not commercially scalable; vendor changes need code edits. |
| Hardcode models per capability | Couples features to vendors; blocks cost/quality routing. |
| Adopt a third-party AI gateway service | External dependency + data-flow concerns; our needs are a narrow, well-understood seam. |
| Hardcoded fallback chains | The business must tune cost/resilience; chains are config. |
| Expose provider choice to the frontend | Leaks vendor details; selection is a server-side business decision. |

Related: [ADR-002](./ADR-002-groq.md), [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-009](./ADR-009-semantic-search-architecture.md),
[sprints/V4_SPRINT7_5.md](../sprints/V4_SPRINT7_5.md).
