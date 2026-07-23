# Multi-Provider AI Gateway

> The provider-agnostic foundation under the AI Orchestrator. Every AI capability
> calls `orchestrator.run(...)` and never knows which vendor answered. Cross-refs:
> [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md), [AI_PIPELINE.md](./AI_PIPELINE.md).

## Request flow

```
Feature (Resume/Batch Analysis · Comparison · Interview · Copilot · Prediction · …)
        │  result = orchestrator.run(capability, variables, schema)
        ▼
AI Orchestrator  (app/ai/orchestrator)
        │  QA cache → health-aware routing → retry ladder → usage/health recording
        ▼
Provider Router  (fallback_chain + health_manager)   app/ai/gateway
        │  ordered [primary, …fallbacks], healthy-first, unhealthy skipped
        ▼
Provider Interface  (LLMProvider.complete → ProviderResponse)   app/ai/providers
        ▼
Groq · OpenAI · Anthropic · Gemini   (+ OpenRouter)
```

There is **no provider-specific code in business logic**. Adding a provider is a
new `LLMProvider` subclass + a registry entry — zero orchestrator/caller changes.

## Provider abstraction

Every provider implements one method and returns one normalized object:

```python
class LLMProvider(ABC):
    name: str
    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds) -> ProviderResponse: ...
```

`ProviderResponse` (`app/ai/schemas/base.py`) is identical for every vendor:

| field | notes |
|-------|-------|
| `text` / `content` | the completion (both populated; `content` is an alias) |
| `model`, `provider` | which model/vendor answered |
| `usage` | `TokenUsage(prompt_tokens, completion_tokens, total_tokens)` |
| `finish_reason` | native stop reason (stop / length / …), per provider |
| `latency_ms`, `cost_usd` | attached when known |
| `raw` | the untouched vendor object |

Providers must raise the **AI error hierarchy** (`AIConfigError`,
`AIRateLimitError`, `AITimeoutError`, `AIProviderError`) — never a raw vendor
exception. Vendor SDKs are imported lazily so an unconfigured provider costs
nothing.

## Routing strategy

`gateway.resolve(role)` picks `(provider, model)` for a logical role; `fallback_chain(role)`
returns the ordered `[primary, …fallbacks]`. The orchestrator then routes
**health-aware**: providers currently `HEALTHY` are tried first; providers in a
cooldown are skipped (kept only as a last resort so a stale-health state can
never hard-fail a request). Precedence: runtime admin override → `AI_PROVIDER` →
`AI_DEFAULT_PROVIDER`. Explicit `provider=`/`model=` on `run()` pins a single
selection (no fallback).

## Fallback strategy

If the primary fails (timeout / 5xx / rate-limit / unavailable), the orchestrator
fails over to the next **healthy** provider. On a successful failover it logs
`AI gateway FAILOVER | from=… to=… reason=… latency=…ms` and records a fallback
event (`usage_tracker.record_fallback`) with the request id. Rate-limits are
**not retried** (a 429 won't clear in-request) — the provider is marked unhealthy
and the request fails over immediately. Retries never loop forever: the ladder is
bounded (`AI_MAX_NETWORK_RETRIES` × JSON × schema), and rate-limits/config errors
break out on the first attempt. Business logic never sees a provider failure — it
gets a result or a single typed `AIError`.

## Health monitoring

`ProviderHealthManager` (`app/ai/gateway/health.py`) tracks per-provider state:

| State | Set when | Behavior |
|-------|----------|----------|
| `HEALTHY` | success / cooldown elapsed | routed freely |
| `RATE_LIMITED` | 429 / quota | skipped for `AI_RATE_LIMIT_COOLDOWN_SECONDS` |
| `TEMPORARY_FAILURE` | timeout / 5xx | skipped for `AI_HEALTH_COOLDOWN_SECONDS` |
| `UNAVAILABLE` | missing key / unreachable | skipped for `AI_UNAVAILABLE_COOLDOWN_SECONDS` |
| `DISABLED` | in `AI_DISABLED_PROVIDERS` | never routed |

Providers **auto-recover**: after the cooldown window (or any success) they
return to `HEALTHY`. This is what stops the platform from re-calling a known-down
provider on every request.

## Configuration (all env-driven — no hardcoded providers)

| Var | Purpose |
|-----|---------|
| `AI_PROVIDER` / `AI_DEFAULT_PROVIDER` | primary reasoning provider |
| `AI_FALLBACK_PROVIDERS` | comma list, e.g. `groq,anthropic,openai,gemini` |
| `AI_ENABLE_FALLBACK` | master fallback switch |
| `AI_DISABLED_PROVIDERS` | comma list to hard-disable |
| `AI_HEALTH_COOLDOWN_SECONDS` / `AI_RATE_LIMIT_COOLDOWN_SECONDS` / `AI_UNAVAILABLE_COOLDOWN_SECONDS` | cooldowns |
| `AI_TIMEOUT_SECONDS`, `AI_MAX_NETWORK_RETRIES`, `AI_MAX_JSON_RETRIES`, `AI_MAX_SCHEMA_RETRIES` | retry policy |
| `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | per-provider keys |
| `DEFAULT_/FAST_/CHEAP_/LONG_CONTEXT_/PREMIUM_REASONING_MODEL` | per-role model overrides |

## Observability

`GET /api/v1/ai/usage` (auth): per-capability runs/calls/**retries**, tokens,
cost, **total_fallbacks**, **recent_fallbacks**, cache hits, duplicate prompts.
`GET /api/v1/ai/health` (auth): live per-provider state, cooldown remaining,
consecutive failures, and recent fallback events. `GET /api/v1/ai/config`:
active provider, fallback chain, disabled providers, and each provider's health
(no secrets — names/counters only). `POST /api/v1/ai/provider` (org-admin):
runtime provider switch.

## Cache

The QA response cache (`usage_tracker`) is keyed on `capability | model | system |
user` — **provider-agnostic** and unchanged by this work. Dev-only (QA mode);
production leaves it off.

## Tests

`backend/tests/test_ai_gateway.py` (runnable without pytest) — 34 checks: provider
conformance, normalized response, health state machine + cooldown + auto-recovery,
health-aware skip-unhealthy, automatic fallback + event, retry policy (rate-limit
not retried / timeout retried), provider-agnostic cache, usage metrics. Uses
in-process fake providers so no OpenAI/Anthropic/Gemini keys are required.
