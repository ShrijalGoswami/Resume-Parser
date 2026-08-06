# Runtime Validation Report — Provider-Agnostic Architecture

> **Generated** by `backend/tests/test_provider_contract.py`. Do not edit by hand — re-run the suite.

## 1. Environment

- **Environment:** `development`
- **Registered providers:** anthropic, contract_fake, fake, gemini, groq, kimi, openai, openrouter, routefake
- **Active provider:** `groq`
- **Date/time:** 2026-08-06 08:45 UTC
- **Totals:** 35 PASS · 0 FAIL · 5 SKIPPED
- **Overall:** ✅ PASS

## 2. Behavioral Validation — deterministic

_In-process; no network. Contract conformance, provider-sourced metadata, health self-report, config-driven selection, per-provider config, and the (inert) routing structure._

| Check | Result | Detail |
|---|---|---|
| groq: implements the full provider contract | ✅ PASS |  |
| anthropic: implements the full provider contract | ✅ PASS |  |
| gemini: implements the full provider contract | ✅ PASS |  |
| kimi: implements the full provider contract | ✅ PASS |  |
| openai: implements the full provider contract | ✅ PASS |  |
| openrouter: implements the full provider contract | ✅ PASS |  |
| generate() delegates to complete() (alias) | ✅ PASS |  |
| gemini declares vision + embeddings; groq does not | ✅ PASS |  |
| every provider reports a non-empty model_name + positive context_window | ✅ PASS |  |
| groq: health() reports configured when key present | ✅ PASS |  |
| anthropic: health() reports NOT configured when key absent | ✅ PASS |  |
| gemini: health() reports NOT configured when key absent | ✅ PASS |  |
| kimi: health() reports NOT configured when key absent | ✅ PASS |  |
| openai: health() reports NOT configured when key absent | ✅ PASS |  |
| openrouter: health() reports NOT configured when key absent | ✅ PASS |  |
| AI_PROVIDER=groq → gateway selects groq (config-driven) | ✅ PASS |  |
| AI_PROVIDER=anthropic → gateway selects anthropic (config-driven) | ✅ PASS |  |
| AI_PROVIDER=gemini → gateway selects gemini (config-driven) | ✅ PASS |  |
| AI_PROVIDER=kimi → gateway selects kimi (config-driven) | ✅ PASS |  |
| AI_PROVIDER=openai → gateway selects openai (config-driven) | ✅ PASS |  |
| AI_PROVIDER=openrouter → gateway selects openrouter (config-driven) | ✅ PASS |  |
| per-provider override applies (timeout/retries/default_model) | ✅ PASS |  |
| alias resolves (claude→anthropic) + global fallback | ✅ PASS |  |
| capability routing disabled by default → no override | ✅ PASS |  |
| model-first: model determines provider (gemini-2.0-flash → gemini) | ✅ PASS |  |
| list value routes to the PRIMARY model (fallback-ready shape) | ✅ PASS |  |
| gateway ProviderSpec is derived from the provider (source of truth) | ✅ PASS |  |
| a newly registered provider is resolvable by name | ✅ PASS |  |
| Kimi registered as an OpenAI-compatible provider | ✅ PASS |  |
| validation rejects an unknown model | ✅ PASS |  |
| validation rejects an invalid capability | ✅ PASS |  |
| validation rejects a model whose provider key is missing (anthropic) | ✅ PASS |  |
| validation passes for a valid, configured model (groq) | ✅ PASS |  |
| orchestrator routes capability → model → provider end-to-end | ✅ PASS |  |

## 3. Live Provider Validation — one smoke per configured key

_A real request for each provider whose key is configured. **SKIPPED (Not Configured)** when no key is set — never a failure; **SKIPPED (External Dependency)** if a configured provider is temporarily unreachable._

| Check | Result | Detail |
|---|---|---|
| groq: live smoke | ✅ PASS | model=llama-3.3-70b-versatile |
| anthropic: live smoke | ⚠️ SKIPPED | Not Configured |
| gemini: live smoke | ⚠️ SKIPPED | Not Configured |
| kimi: live smoke | ⚠️ SKIPPED | Not Configured |
| openai: live smoke | ⚠️ SKIPPED | Not Configured |
| openrouter: live smoke | ⚠️ SKIPPED | Not Configured |

## 4. Failure classification

No failures. Live SKIPs are **Not Configured** or **External Dependency**, by design.

## 5. Recommendation

✅ **Provider-agnostic architecture validated.** Every provider implements one contract; selection and per-provider policy are config-driven; the provider is the source of truth for its metadata; Kimi is added; the capability-routing structure is in place (inert). Live smokes passed for every configured provider; unconfigured providers are Not Configured, not failures.
