# V4 — Sprint 3: AI Foundation Layer

> Sprint record. Establishes the centralized AI architecture every future AI
> capability will use — **not** a new product feature. Cross-refs:
> [AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md),
> [decisions/ADR-006](../decisions/ADR-006-ai-orchestration-layer.md),
> [AI_PIPELINE.md](../AI_PIPELINE.md).

- **Status:** ✅ Complete (implementation + verification + documentation)
- **Theme:** AI orchestration substrate; no Sprint 2 behavior changed
- **Scope guard:** Copilot / Semantic Search / Candidate Comparison intentionally NOT built

## Objectives

Build the AI Foundation Layer so no page/route/component calls an LLM provider
directly; all AI flows go through a central orchestrator with provider
abstraction, prompt management, context builders, structured schemas, config,
error handling, and observability — reusing existing architecture and preserving
the current AI pipeline.

## Completed work

- **`backend/app/ai/`** module: `config`, `providers/` (base + Groq + registry),
  `prompts/` (base + registry reusing `app/llm/*_prompts`), `context/` (builders),
  `schemas/` (base types + forward-looking response contracts),
  `orchestrator/`, `utils/` (errors + json), `services/`.
- **AIOrchestrator** — provider/prompt selection, retry ladder (network 3 → JSON 3
  → schema 2, unchanged), structured parse/validate, typed errors, observability.
- **Provider abstraction** — `LLMProvider` (`complete` / `complete_messages` /
  `stream`); `GroqProvider` captures token usage; registry ready for
  OpenAI/Anthropic/Gemini/OpenRouter.
- **Integration** — `analyze_resume` and `analyze_match` migrated to the
  orchestrator; batch + copilot left on proven legacy helpers (registered; pending).
- **Config** — `AI_*` settings centralized in `AIConfig`.

## Architecture changes

New `app/ai` package sits between domain services and the LLM SDK. Domain
services (`analyzer`, `match_analyzer`) now build a context, call
`orchestrator.run(capability, variables, schema)`, and keep deterministic scoring
+ merging. See the module map in [AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md).

## Database changes

**None.** No schema changes were required (conversation readiness reuses the
Sprint 1 `copilot_*` tables).

## API changes

**None.** All 23 `/api/v1` routes are unchanged and backward compatible; the AI
migration is internal to the analysis services.

## Testing

| Check | Result |
|-------|--------|
| Resume analysis + job matching **through the orchestrator** (real Groq) | ✅ 15/15 |
| Deterministic scores preserved (ats/match), LLM text generated, versions intact | ✅ |
| Observability captured (provider/model/latency/tokens) | ✅ |
| Batch path (`analyze_candidate`) still works (Sprint 2 upload) | ✅ |
| Backend imports; 23 API routes registered | ✅ |
| Frontend `tsc --noEmit` + `next build` | ✅ 0 errors |

## Performance considerations

Retry semantics are identical to before (no extra calls on the happy path — one
provider call). Token usage is now captured per call for future cost tracking.
No measurable overhead added to the LLM round-trip.

## Technical decisions

See [ADR-006](../decisions/ADR-006-ai-orchestration-layer.md). Key points:
`AIError` subclasses `RuntimeError` (routes' `→ 503` unchanged); prompts reuse
existing text (no duplication); batch/copilot phased migration to avoid
regression risk; providers constructed lazily via a registry.

## Known issues / remaining backlog (Sprint 4+)

- Migrate **batch** + **copilot** LLM paths onto the orchestrator (registered).
- Implement additional providers (OpenAI/Anthropic/Gemini/OpenRouter) + runtime
  routing/failover.
- Wire real streaming + tool-calling + memory for the future Copilot.
- Persist token usage/metrics from `AIExecution` (observability sink).
- Carry-over from Sprint 2: server-side pagination, bulk compare/analyze,
  resume-to-storage, realtime, rate limiting, ESLint + test suite.
