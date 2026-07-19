# V4 Sprint 7.5 — Multi-Provider AI Gateway & Model Management

> Evolve the AI Foundation into a true **AI Gateway** — the platform switches LLM
> and embedding providers (Groq, Gemini, Anthropic, OpenAI, OpenRouter, local)
> entirely by configuration, with every capability following automatically.
> Decision record: [ADR-011](../decisions/ADR-011-ai-gateway-and-provider-management.md).

## Goal

Make the AI platform commercially scalable: no feature assumes a vendor; changing
providers is a config change, not a code change.

## Architecture

```
Feature ("I need reasoning: DEFAULT_REASONING")
        │
   AIOrchestrator.run(role=…)
        │
   AI Gateway ── resolve(role) ─► (provider, model)  ◄── Provider Registry + Model Registry
        │        fallback_chain(role) ─► [primary, …fallbacks]   (configurable)
        ▼
   for each selection: provider.complete() with retry ladder (network→json→schema)
        │  on provider failure → next fallback
        ▼
   UsageTracker.record(provider, model, tokens, cost, latency, success)  →  /ai/usage
```

### Gateway core (`app/ai/gateway/`)
- `roles.py` — `ModelRole` (DEFAULT/FAST/CHEAP/LONG_CONTEXT/PREMIUM reasoning, EMBEDDINGS).
- `model_registry.py` — `ModelSpec` metadata (provider, cost tier, context window,
  max output, json/streaming/tools/embeddings, optional token pricing) + cost
  estimation. Seeded for Groq, Gemini, Anthropic, OpenAI, OpenRouter, local.
- `provider_registry.py` — `ProviderSpec` metadata (capabilities, per-role default
  models, context window, the key-setting *name*).
- `gateway.py` — role resolution, configurable fallback chain, runtime override,
  cost, `config_snapshot()` (no secrets).
- `usage.py` — thread-safe usage/cost/health aggregator.

### Orchestrator
`orchestrator.run(..., role=ModelRole.…)` resolves via the gateway, wraps the
historical retry ladder in a **provider fallback loop**, and records usage per
attempt. Explicit `provider`/`model` still override for one-offs. Default role
keeps existing behaviour (groq) unchanged.

### Providers
New lazy-SDK providers registered alongside Groq: `gemini_provider`,
`anthropic_provider`, `openai_compat` (OpenAI + OpenRouter). New embedding provider
`gemini_provider`. Unconfigured providers raise a clean `AIConfigError` → fallback.

### Admin layer (`routes/admin.py`)
- `GET /ai/config` — active provider, model per role, embeddings, provider
  capabilities + `key_configured` booleans. No secrets.
- `GET /ai/usage` — usage, estimated cost, provider health.
- `POST /ai/provider` — runtime switch of the platform-wide reasoning provider.

## Configuration

| Setting | Purpose |
|---------|---------|
| `AI_PROVIDER` | Primary reasoning provider (falls back to `AI_DEFAULT_PROVIDER`) |
| `AI_FALLBACK_PROVIDERS` | Comma-separated fallback chain (configurable) |
| `AI_ENABLE_FALLBACK` | Toggle fallback |
| `DEFAULT/FAST/CHEAP/LONG_CONTEXT/PREMIUM_REASONING_MODEL` | Per-role model overrides |
| `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` | Embedding provider/model |
| `GROQ/GEMINI/ANTHROPIC/OPENAI/OPENROUTER_API_KEY` | Server-side keys |

Switching providers requires only updating env + restarting — or a runtime
`POST /ai/provider`. One change updates the entire platform.

## Provider switching

Selection precedence: runtime override → `AI_PROVIDER` → `AI_DEFAULT_PROVIDER`.
Model precedence for a role: per-role env override → provider's registered default
→ `AI_DEFAULT_MODEL`. Switching the provider re-resolves every role instantly
(verified: switch to `gemini` → DEFAULT=`gemini-2.0-flash`, LONG_CONTEXT=`gemini-1.5-pro`).

## Cost tracking

Per provider/model: requests, input/output tokens, estimated cost (from registry
pricing), average latency, success/error rate, timeouts. Provider health is derived
(healthy ≥ 0.95, degraded ≥ 0.5, else unhealthy). Exposed at `GET /ai/usage`.

## Future routing strategies

The Stage 1→3 growth strategies are expressible today via config: Gemini for cost,
Anthropic for quality, tiered per workspace, Groq for internal automation, Gemini
long-context for long documents, configurable embedding provider. Per-workspace and
automated cost/health-based routing build on the same seams.

## Security considerations

API keys stay server-side (only the key-setting *name* is registered). The gateway
never exposes keys, provider internals, or raw provider errors to the frontend
(`AIError` wrapping is preserved). Admin endpoints require authentication and return
booleans/counters only.

## Verification

- ✅ Every capability flows through the gateway (orchestrator resolves role →
  provider/model); comparison uses `LONG_CONTEXT`.
- ✅ Provider switch by config only (env or runtime) re-resolves all roles;
  end-to-end fallback test: primary fails → gateway falls back → success; usage +
  health recorded.
- ✅ Embedding provider configurable (hashing/openai/gemini).
- ✅ Copilot, Comparison, Semantic Search, Interview Intelligence still function
  (default role resolves to the prior groq behaviour).
- ✅ `config_snapshot` contains no secrets; 47 API routes; frontend `tsc` zero
  errors + `next build` green; Sprint 2–7 intact.
