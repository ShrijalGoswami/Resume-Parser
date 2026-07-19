# ADR-007 — AI Recruiter Copilot

**Status:** Accepted · **Date:** V4 Sprint 4

## Context

Sprint 3 delivered the [AI Foundation Layer](../AI_ARCHITECTURE.md) (ADR-006):
an `AIOrchestrator`, versioned prompt registry, context builders, provider
abstraction, typed schemas, and observability — with `Capability.RECRUITER_COPILOT`
reserved but unwired, and the legacy `answer_question` still on a direct-Groq path.

We now want the Copilot to be the primary way recruiters interact with HireLens:
an assistant that feels like an experienced technical recruiter with complete
knowledge of every campaign, candidate, resume, job description, note, and prior
conversation — **not** a generic chatbot. It must ground answers in our own data
before using model reasoning, follow the recruiter across pages (Dashboard,
Campaign, Candidate, Analytics) without losing the thread, and persist
conversations so nothing is lost on refresh.

## Decision

Build the Copilot **entirely on top of the Sprint 3 orchestration layer** — no
provider is called outside `app/ai`. Concretely:

- **Capability wiring.** Register `Capability.RECRUITER_COPILOT` with a versioned
  system prompt (`app/ai/prompts/copilot.py`, `v2.0`) that encodes the recruiter
  persona, the **context priority** (Campaign → Candidate → Resume → JD → Notes →
  History → LLM), grounding rules, and a structured JSON contract. Per-intent
  task instructions (candidate summary, hiring recommendation, match explanation,
  skill-gap, campaign summary, ranking, …) are versioned and injected to sharpen
  each answer.
- **Structured responses.** The model fills `CopilotLLMOutput` (answer, summary,
  strengths, weaknesses, recommendations, confidence, followups, reasoning). The
  **server** attaches the authoritative `sources_used` — sources can never be
  fabricated by the model.
- **Server-side context resolution.** A `resolve_context` service reads the
  recruiter's own data through the existing repositories (RLS-scoped) based on the
  auto-detected page context, and composes it via reusable context builders
  (candidate, campaign, dashboard, notes, conversation history). Routes never
  concatenate prompt strings.
- **Persistent conversations.** Reuse the Sprint 1 `copilot_conversations` /
  `copilot_messages` tables. Migration `0005` relaxes the candidate/campaign
  `NOT NULL` so a thread can be scoped to any page context. Authenticated routes
  provide create / list / rename / delete / history / ask; each turn resolves
  context, runs the orchestrator, and persists both messages (assistant metadata
  stores the full structured payload for lossless reload).
- **Global UI.** A single Cursor-style collapsible panel mounted once in the root
  layout, gated to recruiter routes, with a `CopilotProvider` holding open state,
  auto-detected page context, and the active conversation — so the thread survives
  navigation and refresh.
- **Legacy path migrated.** The stateless `answer_question` now also flows through
  the orchestrator (`RECRUITER_COPILOT`), eliminating the last direct-provider
  copilot call while preserving its response contract.

## Consequences

- ✅ **Grounded, not generic** — answers prioritise platform data; the priority
  order is enforced in the prompt and in resolution.
- ✅ **No provider bypass** — every copilot answer goes through the orchestrator;
  observability (latency/model/tokens) is captured for free.
- ✅ **Attribution is trustworthy** — "Sources Used" is server-authoritative.
- ✅ **Context-aware & continuous** — page context is auto-detected; conversations
  persist and survive refresh; follow-ups (“compare them”, “why?”) resolve via
  history.
- ✅ **Secure** — auth + RLS + explicit `recruiter_id` scoping; one recruiter can
  never read another's conversations, candidates, or campaigns.
- ✅ **Extensible** — the same seams feed future semantic search, candidate
  comparison, interview-pack generation, and executive reports.
- ⚠️ **Streaming deferred** — the provider `stream()` interface exists but the UI
  uses request/response for now; the backend stays streaming-compatible.
- ⚠️ **Migration `0005` required** — a justified, backward-compatible schema change
  (nullable candidate/campaign + `context_type`) to support page-scoped threads.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Separate `/chat` page | The spec wants an ambient copilot that follows the recruiter across pages, closer to Cursor than ChatGPT. |
| Client-supplied context (like the stateless endpoint) | Untrustworthy and unable to honour RLS; the server must resolve context from its own data. |
| Let the model report its own sources | Invites fabricated attribution; the resolver owns the authoritative source list. |
| One prompt per capability endpoint | A single conversational capability with versioned per-intent instructions keeps follow-ups coherent and avoids fragmenting the thread. |
| New conversation tables | The Sprint 1 tables already fit; only a small, additive migration was needed. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md) (the orchestration layer),
[ADR-003](./ADR-003-repository-pattern.md) (repository seam),
[sprints/V4_SPRINT4.md](../sprints/V4_SPRINT4.md).
