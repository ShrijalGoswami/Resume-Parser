# V4 Sprint 4 — AI Recruiter Copilot (V5)

> Builds the first production version of the **Recruiter Copilot** on top of the
> Sprint 3 [AI Foundation Layer](../../AI_ARCHITECTURE.md). An ambient, context-aware
> assistant that grounds every answer in the recruiter's own data — not a generic
> chatbot. Decision record: [ADR-007](../../decisions/ADR-007-ai-recruiter-copilot.md).

## Goal

Make the Copilot feel like an experienced technical recruiter with complete
knowledge of every campaign, candidate, resume, job description, note, and prior
conversation — available across all recruiter pages, persistent across refresh,
and grounded in platform data before any model reasoning.

## Architecture

Every request follows the same path — no shortcuts:

```
Frontend (RecruiterCopilot panel + CopilotProvider)
  ↓  POST /api/v1/copilot/conversations/{id}/messages  (auth: Bearer)
Copilot API route
  ↓  resolve_context(page, question, repos…)      ← reads RLS-scoped data
Context builders (candidate / campaign / dashboard / notes / history)
  ↓  generate_copilot_answer(...)
AIOrchestrator.run(RECRUITER_COPILOT, variables, schema=CopilotLLMOutput)
  ↓  Prompt registry (v2.0) → Provider (Groq) → parse + validate
Structured response (+ server-attached Sources Used)
  ↓  persist user + assistant turns (copilot_messages)
Frontend renders sections + confidence + sources + follow-ups
```

### Backend — AI layer (`app/ai/`)
- `prompts/copilot.py` — versioned system prompt (`v2.0`) encoding persona,
  context priority, grounding rules, JSON contract; versioned per-intent task
  instructions (candidate summary, hiring recommendation, match explanation,
  skill-gap, strengths, weaknesses, campaign summary, top candidates, ranking,
  interview questions, dashboard summary).
- `context/copilot_context.py` — pure builders: `build_campaign_context`,
  `build_dashboard_context`, `format_history`, and a keyword `classify_intent`.
- `services/copilot_service.py` — thin `generate_copilot_answer` seam:
  orchestrator call → `CopilotStructuredResponse`, graceful fallback, never raises.

### Backend — product layer
- `services/copilot_resolver.py` — resolves the highest-priority context per page
  from the existing repositories, reconstructing a `CandidateResult` from stored
  analysis, adding recruiter notes and campaign/JD; produces the authoritative
  `sources_used`. Deleted candidates/campaigns/analyses drop out gracefully.
- `services/candidate_context.py` — added `RecruiterNotesSource`.
- `repositories/conversation_repository.py` — `create` (page-scoped), `get`,
  `list_for_recruiter`, `rename`, `touch`, `delete` alongside the existing
  message helpers.
- `routes/copilot.py` — authenticated persisted endpoints (below) + the migrated
  stateless `answer_question` (now orchestrator-backed).
- `schemas/copilot.py` — `CopilotLLMOutput`, `CopilotSource`,
  `CopilotStructuredResponse`, `CopilotPageContext`, request/response models.

### Database — migration `0005`
Relaxes `copilot_conversations.candidate_id` / `campaign_id` to nullable and adds
`context_type` so a conversation can be scoped to Dashboard / Analytics / Campaign
/ Candidate. Adds `(recruiter_id, updated_at desc)` index. RLS unchanged — the
generic `recruiter_id` policies from `0002` already cover all CRUD.

### Frontend (`resume-hero-section/`)
- `components/copilot/copilot-provider.tsx` — global state: open, auto-detected
  page context, conversation list, active thread, messages, send/new/select/
  rename/delete. Persists open + active id in `localStorage` (survives refresh).
- `components/copilot/recruiter-copilot.tsx` — Cursor-style collapsible panel:
  launcher, transcript, structured sections (summary / strengths / concerns /
  recommendations), confidence, **Sources Used**, follow-up chips, conversation
  list with rename/delete. Mounted once in `app/layout.tsx`, gated to recruiter
  routes.
- `lib/copilot-context.ts` — pathname → `CopilotPageContext` detection.
- `services/copilot-api.ts` — authed conversation/message client.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/copilot/conversations` | Create a page-scoped conversation |
| GET | `/api/v1/copilot/conversations` | List the recruiter's conversations |
| PATCH | `/api/v1/copilot/conversations/{id}` | Rename |
| DELETE | `/api/v1/copilot/conversations/{id}` | Delete |
| GET | `/api/v1/copilot/conversations/{id}/messages` | Full transcript |
| POST | `/api/v1/copilot/conversations/{id}/messages` | Ask (context-aware) |
| POST | `/api/v1/copilot/chat` | Stateless (legacy, now orchestrator-backed) |
| GET | `/api/v1/copilot/suggestions` | Quick-action suggestions |

## Context resolution

Priority — never reversed: **Current Campaign → Selected Candidate → Resume → Job
Description → Recruiter Notes → Conversation History → LLM reasoning.** The
resolver assembles the highest-priority sources available for the page and hands
the model an ordered, labelled context block plus the authoritative source list.

| Page | Context resolved |
|------|------------------|
| Candidate | Campaign header + JD, candidate profile/ATS/ranking, resume, notes |
| Campaign | Campaign + JD + ranked candidate roster |
| Dashboard / Analytics | Analytics overview (metrics, strongest candidate, gaps, funnel) |
| Global | History + general expertise (prompts the recruiter to open a campaign) |

## Conversation lifecycle

New (lazy on first send) → auto-titled from the first question → each turn persists
user + assistant messages (assistant metadata carries the full structured payload)
→ list ordered by `updated_at` → rename / delete / continue. Refresh restores the
active thread from `localStorage` + server history.

## Security

Auth (`require_recruiter`) + RLS + explicit `recruiter_id` scoping on every query.
Context is resolved server-side from the recruiter's own data, so one recruiter can
never read another's conversations, candidates, or campaigns. Hidden prompts and
internal system messages are never returned. Provider exceptions are wrapped by the
AI layer and never surfaced.

## Known limitations

- **Streaming** is deferred — the provider `stream()` interface exists and the
  backend stays streaming-compatible, but the UI uses request/response.
- **Cross-candidate comparison** is answered from campaign-roster context, not yet
  a dedicated multi-candidate builder.
- **Intent classification** is keyword-based (deliberately conservative; falls
  back to page defaults, then `general`).
- Conversations are scoped to the recruiter; no sharing/collaboration yet.

## Future roadmap

Semantic search, candidate comparison, interview-pack generation, executive
reports, and AI workflow automation all attach to the same seams (new capability +
prompt + context builder + schema).

## Verification

- ✅ Backend imports clean; app exposes the 8 copilot routes; intent classifier and
  context builders unit-exercised.
- ✅ No direct provider calls outside `app/ai` (routes grep clean).
- ✅ Frontend `tsc --noEmit` zero errors; `next build` green (11 routes).
- ✅ Sprint 2 (batch/workspace) and Sprint 3 (orchestrator) paths intact; stateless
  copilot preserved and migrated onto the orchestrator.
