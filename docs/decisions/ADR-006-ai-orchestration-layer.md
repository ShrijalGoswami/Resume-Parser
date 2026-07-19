# ADR-006 — Centralize AI through an Orchestration Layer

**Status:** Accepted · **Date:** V4 Sprint 3

## Context

AI usage had grown across the product (resume analysis, job matching, batch
ranking, copilot). Each flow independently built prompts, called the Groq SDK,
and hand-rolled its own retry/JSON-parse/schema-validation ladder. This coupled
the entire application to one vendor, duplicated fragile parsing/retry logic, put
prompts next to business logic, and gave us no consistent place to measure
latency, token usage, or failures. We are building an AI recruitment platform,
not an ATS with a few LLM calls — future features (Copilot, semantic search,
candidate comparison, interview generation) need a shared, swappable substrate.

## Decision

Introduce an **AI Foundation Layer** (`backend/app/ai/`) with a central
**AIOrchestrator** that every AI call goes through. It composes four registries —
**providers** (a common `LLMProvider` interface; Groq today, others by
registration), **prompts** (versioned templates by capability, reusing existing
prompt text), **context builders**, and typed **response schemas** — plus
centralized **config**, a typed **error hierarchy**, and **observability**
(`AIExecution` per call). The orchestrator owns the LLM round-trip and the retry
ladder; domain services keep deterministic scoring and merging. Resume analysis
and job matching were migrated to the orchestrator this sprint; batch and copilot
remain on their proven legacy paths pending migration. See
[AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md).

## Consequences

- ✅ **Provider-swappable** — adding OpenAI/Anthropic/Gemini/OpenRouter is one
  `LLMProvider` subclass + one registration; callers are unchanged.
- ✅ **DRY** — retry/parse/validation logic exists once, in the orchestrator.
- ✅ **Observable** — every call yields latency, provider, model, retries, tokens.
- ✅ **Safe errors** — a typed `AIError` hierarchy; raw vendor errors never reach
  the frontend. `AIError` subclasses `RuntimeError`, so existing `→ 503` routes
  are backward compatible with zero change.
- ✅ **Prompt hygiene** — versioned templates, never embedded in routes.
- ✅ **Future-ready** — multi-turn (`complete_messages`) and `stream()` interfaces
  and forward-looking response contracts exist without building those features.
- ⚠️ **Partial migration** — batch and copilot still use legacy helpers; they are
  registered and slated for mechanical migration (tracked in the backlog). Until
  then two code paths coexist.
- ⚠️ Slight indirection for a single-provider setup today; justified by the
  platform trajectory.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Keep per-flow Groq calls | The status quo — vendor lock-in, duplicated retry logic, no shared observability. |
| A thin `call_llm()` helper only | Removes duplication but not vendor coupling, prompt/versioning, or structured-output/observability concerns. |
| Adopt a framework (LangChain, etc.) | Heavy dependency + abstraction mismatch for a small, deterministic-first pipeline; our needs are a narrow, well-understood interface. |
| Big-bang migrate all four flows now | Higher regression risk to Sprint 2's batch upload path; phased migration (resume + match first) proves the layer safely. |

Related: [ADR-002](./ADR-002-groq.md) (why Groq), [ADR-003](./ADR-003-repository-pattern.md) (same "one seam" philosophy for data).
