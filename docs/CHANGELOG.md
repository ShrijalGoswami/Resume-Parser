# Changelog

All notable changes to HireLens are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning follows
[Semantic Versioning](https://semver.org/).

> **Note on versioning:** the backend `APP_VERSION` constant is currently
> `1.2.0` (the last shipped release). The **V4 Supabase Foundation** below is an
> in-development major line (`4.0.0`) that adds the persistence platform; it is
> feature-complete for Sprint 1 but not yet cut as a release. See
> [ROADMAP.md](./ROADMAP.md) and [sprints/V4_SPRINT1.md](./sprints/V4_SPRINT1.md).

---

## [1.0.0] — Production Stabilization & Freeze

The full AI platform, stabilized and frozen for a production v1.0 release. See
[RELEASE_NOTES.md](./RELEASE_NOTES.md) for the narrative and
[KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for scoped-out items.

### Added
- **QA mode** (dev-only): identical-request LLM response cache, duplicate-prompt
  detection, and per-capability usage/token/retry reporting at `GET /api/v1/ai/usage`
  (+ `POST /api/v1/ai/qa/reset`).
- Per-IP **rate limiting** middleware for expensive/unauthenticated endpoints.
- Content-hash idempotent uploads (`candidate_uploads`, migration 0013) with
  `UNIQUE(campaign_id, file_hash)`.
- Upload pipeline **stage visualization** (Uploaded → Parsed → AI Analysis →
  Indexed → Ready) with precise per-stage failure reporting.
- Auth-aware landing page + full app navigation (header/sidebar to every feature).
- Docs: `RELEASE_NOTES.md`, `ROLLBACK.md`, `KNOWN_LIMITATIONS.md`; parser test
  suite `backend/tests/test_experience_years.py`.

### Changed
- **Résumé/batch analysis migrated onto the AI Orchestrator** — every LLM request
  now flows through one path (prompt registry → cache → provider+fallback → retry →
  usage → provider). No direct provider calls remain in the backend.
- Semantic search re-ranking rebuilt (hybrid two-tier lexical + IDF over hashing
  embeddings); years-of-experience parser rebuilt (raw-text union-of-intervals).
- Copilot roster context enriched (skills/years/gaps) + intent-routing guard.
- Rate-limit (429) errors are no longer retried (removed 3× call amplification).
- Frontend `middleware.ts` → **`proxy.ts`** (Next.js 16 convention; deprecation
  cleared).
- CORS **fails closed** in production on wildcard origins.

### Fixed
- Duplicate candidates on upload (frontend queue reentrancy + backend idempotency).
- Signup 500 (auth-provision trigger timing, migration 0012).
- Login "No API key" (stale Next.js build inlining of `NEXT_PUBLIC_*`).
- Feature-gate 403 now renders an upgrade empty-state, not a red system error.
- Recommendation-vs-ATS grounding surfaced in the UI; comparison risk hallucination
  resolved by the years fix.
- Magic-byte validation on the direct résumé-upload route; bounded LLM input;
  PII removed from logs.

### Removed
- Legacy direct-provider `call_groq` wrapper and dead helpers; redundant
  `candidates.resume_hash` (migration 0014); all unused imports (`pyflakes` clean).

---

## [8.0.0] — Unreleased (V8 Sprint 13: Predictive Intelligence & Digital Twin)

HireLens models the hiring organization and forecasts the future — deterministic,
explainable predictions + scenario simulation, grounded in the org's own history.
LLMs explain forecasts; they never generate them. Full detail:
[sprints/V8_SPRINT13.md](./sprints/V8_SPRINT13.md),
[decisions/ADR-017](./decisions/ADR-017-predictive-intelligence-architecture.md).

### Added
- **Predictive Intelligence Layer** (`app/prediction/`): Organizational **Digital Twin**
  (deterministic model of campaigns/recruiters/skills/funnel/velocity/conversion),
  **Forecast Models** (hiring completion, delay risk, offer acceptance, interview
  success, dropout, recruiter capacity, skill shortage, hiring cost, pipeline health),
  Prediction Engine + Outcome Evaluator, **Simulation Engine + Scenario Builder**
  (what-if levers), Confidence Calculator. Migration `0011`. **Independent of the AI
  gateway** — no LLM generates forecasts.
- **Explainable forecasts** — probability/value, confidence, evidence, contributing
  factors, historical comparison, best/worst alternatives.
- **AI consumption** — Executive Reports inject a deterministic forecast the LLM
  explains; the Copilot answers "what happens if…" via the engine; the Agent has a
  `forecast` tool. No capability computes forecasts itself.
- **Predictive Intelligence workspace** (`/predictions`): Forecast Dashboard, Scenario
  Simulator, Capacity Planning, Skill Forecast, Digital Twin Viewer, Outcome Explorer.

### Verified
- Deterministic (same input → same output); delay-risk / salary / capacity simulations
  behave correctly; AI explains not invents; prediction independent of the gateway; 106
  API routes; frontend `tsc` zero errors + `next build` green; Sprint 2–12 intact.

---

## [7.0.0] — Unreleased (V7 Sprint 12: Organizational Knowledge & Long-Term Memory)

A company-wide recruiting knowledge system — persistent, structured, time-aware,
org-scoped memory that every AI capability retrieves before reasoning. Full detail:
[sprints/V7_SPRINT12.md](./sprints/V7_SPRINT12.md),
[decisions/ADR-016](./decisions/ADR-016-organizational-knowledge-architecture.md).

### Added
- **Organizational Knowledge Layer** (`app/knowledge/`): knowledge store, extractor
  (structured extraction per source), explainable retrieval (keyword + entity ×
  confidence × recency decay), knowledge graph + traversal, timeline + skill-demand
  evolution, and emergent organizational preferences. Migration `0010`
  (`knowledge_items`, `knowledge_edges`; membership RLS). **Independent of the AI gateway.**
- **Universal memory injection** — `memory_block(...)` prepends relevant
  organizational memory (each fact tagged source/date/confidence, explainable "why")
  to the Copilot, Comparison, Interview, and Report contexts before reasoning. No
  capability implements its own memory.
- **Automatic, incremental ingestion** — copilot Q&A, comparisons, interview packs,
  executive reports, and approved agent decisions feed memory (idempotent dedupe).
- **Knowledge Center** (`/knowledge`): Memory Explorer, Hiring Timeline, Preference
  Learning, Knowledge Graph, Decision History, Knowledge Sources; header link.
- **Memory governance** — active/archived/invalidated, corrections, confidence,
  duplicate merge (RBAC-gated).

### Verified
- Extraction/retrieval/timeline/graph/preferences pure-logic tests; explainable memory
  injection; knowledge independent of the AI gateway; 100 API routes; frontend `tsc`
  zero errors + `next build` green; Sprint 2–11 intact.

---

## [6.1.0] — Unreleased (V6 Sprint 11: Integration Platform & Workflow Automation)

HireLens as the AI layer above existing HR software — a provider-plugin integration
platform + event-driven workflow automation, with all AI reasoning and approvals kept
inside HireLens. Full detail: [sprints/V6_SPRINT11.md](./sprints/V6_SPRINT11.md),
[decisions/ADR-015](./decisions/ADR-015-integration-platform-architecture.md).

### Added
- **Integration Platform** (`app/integrations/`): one `IntegrationProvider` interface
  + registry; adapters for Gmail, Outlook, Google/Microsoft Calendar, Slack, Teams,
  Google Meet, Zoom, Generic ATS, Generic Webhook. No feature calls an external API
  directly — everything goes through the layer.
- **OAuth 2 + encrypted credentials** — authorize/exchange per provider; refresh
  tokens **Fernet-encrypted** (never plaintext, never exposed to the frontend).
- **Event-driven automation** — events (candidate shortlisted/hired/…, agent
  recommendation approved, campaign created); a dispatcher matches org **automation
  rules**; a workflow engine runs steps through the integration layer with **retry +
  exponential backoff** and idempotency; execution history + **replay**.
- **Clean AI separation** — Agent → Workflow → Integration; the agent never calls
  integrations (approval emits an event). Migration `0009` (connections, rules,
  executions, webhook endpoints; membership RLS).
- **Webhooks** — HMAC-SHA256 signature verification + idempotent handling.
- **Integration Hub** (`/integrations`): connect/disconnect/test providers, automation
  rules, execution history + replay, connection health. RBAC-gated (`INTEGRATION_MANAGE`)
  + audited; header link.

### Verified
- End-to-end workflow execution + retry/backoff; crypto roundtrip; webhook HMAC +
  idempotency; agent→workflow separation (no direct imports); 89 API routes; frontend
  `tsc` zero errors + `next build` green; Sprint 2–10 intact.

---

## [6.0.0] — Unreleased (V6 Sprint 10: Enterprise Platform & Organizations)

The transition from an AI recruiting application to an enterprise AI recruiting
platform — multi-tenant organizations, RBAC, auditing, usage, subscriptions,
feature flags, and API keys, layered additively over V5. Full detail:
[sprints/V6_SPRINT10.md](./sprints/V6_SPRINT10.md),
[decisions/ADR-014](./decisions/ADR-014-enterprise-platform-architecture.md).

### Added
- **Organizations & Workspaces** (migration `0008`): Organization → Workspace →
  Members(role) → Campaigns → Candidates; every recruiter auto-provisioned a
  personal org + default workspace + owner membership + free subscription; workspace
  switching without re-login. Membership-based RLS (SECURITY DEFINER helpers).
- **Policy-based RBAC** (`app/enterprise/rbac.py`): configurable Role→Permission
  registry (owner/admin/hiring_manager/recruiter/interviewer/viewer);
  `require_permission(...)` dependency — no hardcoded role checks.
- **Immutable audit log** (`audit_logs`): critical actions recorded (members, flags,
  subscription, AI provider change, report/agent access, API keys); searchable.
- **Usage accounting** (`org_usage_counters`): AI usage rolls up to the org
  automatically via a gateway `usage_tracker` hook (`current_org_id`).
- **Subscription foundation** (Free/Professional/Business/Enterprise) with
  centralized plan limits; **per-org feature flags** resolved against plan defaults;
  reports/agent routers **feature-gated + audited**.
- **Scoped API keys** (read-only/read-write/admin) — secret shown once, only a hash
  stored (auth wiring is a placeholder).
- **Admin Console** (`/admin`): Settings, Workspaces, Members, Roles, Feature Flags,
  Usage, Audit Logs, Subscription, API Keys; header org badge + workspace switcher.
- Backend `app/enterprise/` package + `app/routes/org.py` (19 endpoints).

### Security
- Authorization is server-side (RBAC + RLS); the frontend never decides access.
  Organization/workspace isolation enforced; API-key secrets never stored in plaintext.

### Verified
- RBAC / plan-limit / feature-flag pure-logic tests pass; org usage hook registered;
  71 API routes; frontend `tsc` zero errors + `next build` green; Sprint 2–9 intact.

---

## [4.9.0] — Unreleased (V4 Sprint 9: Autonomous Recruiting Agent)

The first proactive AI teammate — observes the pipeline, coordinates the existing
engines, and produces explainable recommendations requiring human approval. Full
detail: [sprints/V4_SPRINT9.md](./sprints/V4_SPRINT9.md),
[decisions/ADR-013](./decisions/ADR-013-autonomous-agent-architecture.md).

### Added
- **Agent Framework** (`app/ai/agent/`): a **Tool Registry** wrapping existing
  services (search / comparison / interview / report + retrieval), 5 built-in
  **workflows** (stalled campaign, high-potential candidate, weak pool, interview
  backlog, hiring-deadline risk) with configurable triggers, and an **engine** that
  adds one `AGENT_REASONING` briefing pass. The agent orchestrates — it owns no
  business logic.
- **Explainable recommendations** — every one carries why, evidence, confidence,
  tools used, data sources, and the recommended next action.
- **Approval lifecycle** — `agent_recommendations` (migration `0007`, RLS) with
  pending → approved / rejected / dismissed (executed = future); **idempotent**
  scans (dedupe by workflow+entity). No workflow modifies production data.
- **Agent routes** — `POST /agent/scan`, `GET /agent/recommendations`,
  `PATCH /agent/recommendations/{id}`, `GET /agent/workflows`.
- **Agent Workspace** (`/agent`) — AI briefing + grouped sections (urgent alerts,
  candidate alerts, campaign risks, recommended actions, completed) with
  approve/reject/dismiss and expandable evidence/sources/engine; nav link.
- **Copilot reuse** — "what needs my attention?", "any bottlenecks?" invoke the same
  agent (`copilot_agent.py`).
- `run_agent_scan(...)` is a reusable, **scheduler-ready** service.

### Verified
- End-to-end scan test (all 5 workflows fire, idempotent, explainable); agent reuses
  engines via tools (no duplication); Copilot reuses the agent; approval lifecycle
  works; 52 API routes; frontend `tsc` zero errors + `next build` green; Sprint 2–8
  intact.

---

## [4.8.0] — Unreleased (V4 Sprint 8: Executive Hiring Intelligence)

An AI-powered executive decision system — explains hiring health, why, and what to
do, grounded in real data and composing existing engines. Full detail:
[sprints/V4_SPRINT8.md](./sprints/V4_SPRINT8.md),
[decisions/ADR-012](./decisions/ADR-012-executive-intelligence-architecture.md).

### Added
- **Executive Intelligence** (`Capability.EXECUTIVE_REPORT`): deterministic data
  composition (`report_data.py`) from existing analytics/campaign/activity repos
  (no N+1), a versioned executive-report prompt, and a structured `ExecutiveReport`
  that merges **server-computed metrics** with an **LLM narrative** (executive
  summary + pipeline health, campaign intelligence, recruiter productivity, skill
  gap, hiring risks, prioritised recommendations, talent snapshot). Statistics are
  never fabricated — the model only narrates real numbers.
- **`POST /reports/executive`** — recruiter-scoped; `focus`/`instruction`/`sections`
  for interactive/partial generation; metrics-only fallback when the LLM is down.
- **Executive Intelligence page** (`/reports`) — pipeline-health badge, KPI tiles,
  expandable insight cards, skill bars, recruiter-ready **PDF export**; nav link.
- **Copilot reuse** — executive questions ("how healthy is our pipeline?", "what
  changed?", "biggest risks?") invoke the same report engine (`copilot_report.py`).
- `run_executive_report(...)` is a reusable, **scheduler-ready** service.

### Verified
- Reports flow through the AIOrchestrator/gateway (`LONG_CONTEXT` role); reuse
  analytics + engines; end-to-end + fallback tests pass (metrics grounded, no
  fabrication); 48 API routes; frontend `tsc` zero errors + `next build` green; PDF
  export works; Sprint 2–7.5 intact.

---

## [4.7.0] — Unreleased (V4 Sprint 7.5: Multi-Provider AI Gateway)

The AI Foundation becomes a true AI Gateway — switch LLM and embedding providers
by configuration only, with every capability following automatically. Full detail:
[sprints/V4_SPRINT7_5.md](./sprints/V4_SPRINT7_5.md),
[decisions/ADR-011](./decisions/ADR-011-ai-gateway-and-provider-management.md).

### Added
- **AI Gateway** (`app/ai/gateway/`): logical `ModelRole`s (DEFAULT/FAST/CHEAP/
  LONG_CONTEXT/PREMIUM reasoning, EMBEDDINGS), a **Model Registry** (metadata +
  optional token pricing) and **Provider Registry** (capabilities, per-role default
  models), role→model resolution, a **configurable fallback chain**, a runtime
  provider override, and cost estimation.
- **Providers**: Gemini, Anthropic, OpenAI, OpenRouter (lazy-SDK) registered
  alongside Groq; Gemini embeddings added. Unconfigured providers raise a clean
  error and trigger fallback.
- **Usage/cost/health tracking** (`ai/gateway/usage.py`) per provider/model.
- **Admin routes**: `GET /ai/config`, `GET /ai/usage`, `POST /ai/provider`
  (runtime switch) — authenticated, no secrets.
- Config: `AI_PROVIDER`, `AI_FALLBACK_PROVIDERS`, per-role `*_REASONING_MODEL`,
  and `GEMINI/ANTHROPIC/OPENROUTER_API_KEY`.

### Changed
- **AIOrchestrator** now resolves provider+model via the gateway (logical `role`)
  and wraps the retry ladder in a **provider fallback loop**, recording usage per
  attempt. Default role preserves the prior Groq behaviour exactly.
- Candidate Comparison uses the `LONG_CONTEXT` role.

### Security
- API keys remain server-side; the gateway exposes only provider/model names,
  capability flags, and counters — never keys or raw provider errors.

### Verified
- Provider switch by config re-resolves all roles; end-to-end fallback + usage test
  passes; every capability flows through the gateway; 47 API routes; frontend `tsc`
  zero errors + `next build` green; Sprint 2–7 intact.

---

## [4.6.0] — Unreleased (V4 Sprint 7: AI Interview Intelligence)

A complete AI interview workbench for any candidate — grounded, structured, and
reused by the Copilot and Comparison. Full detail:
[sprints/V4_SPRINT7.md](./sprints/V4_SPRINT7.md),
[decisions/ADR-010](./decisions/ADR-010-interview-intelligence-engine.md).

### Added
- **Interview Intelligence Engine** (`Capability.INTERVIEW_GENERATION`): versioned
  Interview Prompt `v1.0` + per-focus task instructions; `InterviewContextBuilder`
  (reuses candidate context + campaign + comparison/semantic); structured
  `InterviewPack` (executive summary, strategy, technical & behavioral questions,
  skill verification, risk assessment, interviewer scorecard, final recommendation)
  with server-authoritative Sources Used.
- **`POST /campaigns/{id}/candidates/{cid}/interview`** — full or focused
  generation (`focus`/`instruction`/`sections`); recruiter-scoped; deterministic
  fallback when the LLM is unavailable.
- **Interview tab** on candidate detail with all sections, interactive controls
  (Full pack / Harder / Only behavioral / System design / Coding round), and
  **recruiter-ready PDF export**.
- **Reuse everywhere** — the Copilot invokes the same engine ("generate interview",
  "how do I verify Kubernetes?", "interview packs for the top two"); the Comparison
  ranking links to each candidate's interview pack. No duplicated prompt logic.

### Verified
- Interview generation flows through the AIOrchestrator; no provider calls outside
  `app/ai`; 44 API routes; end-to-end + fallback tests pass; frontend `tsc` zero
  errors + `next build` green; PDF export works; Sprint 2–6 intact.

---

## [4.5.0] — Unreleased (V4 Sprint 6: AI Semantic Talent Search)

The platform's semantic retrieval layer: discover talent by meaning, not
keywords. Embedding-based, fully separate from the LLM, reused by the Copilot.
Full detail: [sprints/V4_SPRINT6.md](./sprints/V4_SPRINT6.md),
[decisions/ADR-009](./decisions/ADR-009-semantic-search-architecture.md).

### Added
- **Embedding layer** (`app/ai/embeddings/`): provider-agnostic `EmbeddingProvider`
  abstraction + registry + observed service. Default is a dependency-free
  deterministic hashing provider (works with no API key); OpenAI provider optional
  (`EMBEDDING_PROVIDER=openai`).
- **Vector storage abstraction** (`services/vector_search.py`) + migration `0006`
  (`candidate_embeddings`, jsonb, RLS) — runs on any Supabase; documented pgvector
  upgrade path.
- **Embedding pipeline** — normalised profile + content-hash gating (regenerate
  only on change); `reindex_campaign`.
- **Semantic Talent Search** (`services/talent_search.py`): `POST /search/talent`
  (natural-language), `POST /search/similar` (vector similarity),
  `POST /campaigns/{id}/embeddings/reindex`. Retrieval is embedding-based — **no
  LLM**.
- **Talent Search page** (`/search`): NL search bar, filters, similarity scores,
  matched-concept highlights, save search + history; "Find similar" on candidate
  detail; nav link.
- **Copilot reuse** — "Find AI engineers", "candidates similar to John" invoke the
  same retrieval engine (`services/copilot_search`); explanations flow through the
  orchestrator separately.

### Security
- `candidate_embeddings` is recruiter-scoped (RLS + explicit scoping) — no
  cross-tenant vector leakage.

### Verified
- Retrieval uses embeddings, not the LLM (end-to-end ranking + regen-skip tests);
  Copilot reuses the engine; 43 API routes; no provider calls outside `app/ai`;
  frontend `tsc` zero errors + `next build` green; Sprint 2–5 intact.

---

## [4.4.0] — Unreleased (V4 Sprint 5: AI Candidate Comparison)

The first flagship AI capability on the Copilot: an **AI Hiring Analyst** that
compares 2–5 candidates into an executive report, reused by the Copilot. Full
detail: [sprints/V4_SPRINT5.md](./sprints/V4_SPRINT5.md),
[decisions/ADR-008](./decisions/ADR-008-ai-candidate-comparison.md).

### Added
- **AI Candidate Comparison** (`Capability.CANDIDATE_COMPARISON`): versioned
  Comparison Prompt `v1.0`, `ComparisonContextBuilder` (resume + analysis + ATS +
  match + notes + JD + campaign), and a structured `CandidateComparisonReport`
  (executive summary, rankings, skill matrix, strengths, risks, hiring
  recommendation, interview focus, trade-off analysis) with server-authoritative
  Sources Used.
- **`POST /api/v1/campaigns/{id}/compare`** — authenticated, same-campaign-scoped;
  degrades to a deterministic score-based report when the LLM is unavailable.
- **Comparison workspace** (`/campaigns/[id]/compare`) — select 2–5 candidates on
  the campaign page → "Compare with AI" → full report UI.
- **Copilot reuse** — "Compare Rahul and John", "Who is the safer hire?" invoke the
  same engine (`services/copilot_comparison`); no duplicated logic.

### Security
- Every compared candidate is validated to belong to the recruiter's campaign
  (RLS + explicit scoping) — cross-campaign/cross-tenant comparison is impossible.

### Verified
- Comparison runs through the AIOrchestrator; no provider calls outside `app/ai`;
  40 API routes; frontend `tsc` zero errors + `next build` green; Sprint 2–4 intact.

---

## [4.3.0] — Unreleased (V4 Sprint 4: AI Recruiter Copilot)

The first production **Recruiter Copilot** — an ambient, context-aware assistant
built entirely on the Sprint 3 orchestration layer. Full detail:
[sprints/V4_SPRINT4.md](./sprints/V4_SPRINT4.md),
[decisions/ADR-007](./decisions/ADR-007-ai-recruiter-copilot.md).

### Added
- **Recruiter Copilot** (`Capability.RECRUITER_COPILOT`): versioned system prompt
  (`v2.0`) + per-intent task instructions; server-side **context resolver** that
  grounds answers in the recruiter's own data in priority order (Campaign →
  Candidate → Resume → JD → Notes → History → LLM); **structured responses**
  (summary / strengths / concerns / recommendations / confidence) with
  server-authoritative **Sources Used**.
- **Persistent conversations**: authenticated routes to create / list / rename /
  delete / read / ask (`/api/v1/copilot/conversations…`); both turns persisted,
  assistant metadata stores the full structured payload for lossless reload.
- **Global Cursor-style Copilot panel** mounted once in the root layout, gated to
  recruiter routes; auto-detected page context; conversation list; survives
  navigation and refresh (`CopilotProvider`, `RecruiterCopilot`).
- Migration **`0005`**: page-scoped conversations (nullable candidate/campaign +
  `context_type`); additive index. RLS unchanged.

### Changed
- Stateless `answer_question` (`/copilot/chat`) now flows through the
  **AIOrchestrator** — the last direct-provider copilot call is gone; response
  contract preserved.
- Context builders extended (campaign / dashboard / recruiter notes / history).

### Verified
- Backend imports clean, 8 copilot routes; no provider calls outside `app/ai`;
  frontend `tsc` zero errors + `next build` green; Sprint 2/3 paths intact.

---

## [4.2.0] — Unreleased (V4 Sprint 3: AI Foundation Layer)

Introduces the centralized AI architecture every future AI feature will use. No
new product feature; the AI pipeline behavior is preserved. Full detail:
[sprints/V4_SPRINT3.md](./sprints/V4_SPRINT3.md), [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md).

### Added
- **AI Foundation Layer** (`backend/app/ai/`): central **AIOrchestrator**,
  **provider abstraction** (`LLMProvider`; Groq active, others by registration),
  **versioned prompt registry**, **context builders**, typed **response
  schemas** + forward-looking contracts, centralized **AIConfig**, a typed
  **AIError** hierarchy, and per-call **observability** (`AIExecution`:
  latency/provider/model/retries/tokens).
- `AI_*` settings (default provider/model/temperature/limits/retries).

### Changed
- `analyze_resume` (resume analysis) and `analyze_match` (job matching) now flow
  through the orchestrator — same inputs/outputs, deterministic scores unchanged.

### Notes
- Batch and copilot keep their proven legacy LLM paths for now (registered;
  migration is a mechanical follow-up). AI logic and behavior are unchanged.

### Verified
- Resume analysis + job matching **15/15** live through the orchestrator (real
  Groq); batch path re-verified; 23 API routes (backward compatible); `tsc` + `next build` green.

---

## [4.1.0] — Unreleased (V4 Sprint 2: Recruiter Workspace)

Turns the persisted V4 foundation into a usable recruiter product. Reuses the
repository pattern and the **unchanged** AI pipeline; no migrations. Full detail:
[sprints/V4_SPRINT2.md](./sprints/V4_SPRINT2.md).

### Added
- **Campaign Dashboard** (`/dashboard`) — per-campaign KPIs (candidates, awaiting,
  avg match, last activity) with search, sort, status filters, pagination, states.
- **Candidate Management table** (`/campaigns/[id]`) — AI-quality ranking, 6 sorts,
  8 combinable filters, expandable AI preview, multi-select + bulk actions
  (delete/export/analyze/compare), search, pagination.
- **Candidate Detail Page** — tabbed Overview / AI Analysis / Notes / Activity.
- **Intelligent Upload** — drag & drop, real progress, per-file pipeline stages,
  concurrency queue, retry, validation, duplicate detection, auto-insert.
- **Executive Intelligence Dashboard** (`/insights`) — overview KPIs, AI insights,
  visual analytics (funnel, distributions, top skills, trend), action center,
  recent activity. New `GET /api/v1/analytics/overview`.
- Reusable workspace UI: `components/workspace/{states,pagination,candidate-table,upload-panel,charts}.tsx`, `components/ui/skeleton.tsx`, `lib/{format,candidate}.ts`.
- Per-campaign `company` field (stored in `metadata`); candidate bulk-delete,
  candidate-scoped activity, and note-deletion endpoints.

### Changed
- Candidate listing now hydrates analyses in **2 queries (no N+1)**; dashboard
  and analytics use bulk aggregation.

### Performance
- Eliminated candidate-list N+1; 3-query dashboard stats; 4-query analytics with
  targeted JSON selection.

### Verified
- **62/62 live checks** against the project; `next build` + `tsc` green; 23 API routes.

---

## [4.0.0] — Unreleased (V4 Sprint 1: Supabase Foundation)

Converts HireLens from a stateless AI application into a persistent SaaS
platform. **The AI pipeline was not modified** — persistence is layered on top,
additively. Full detail: [sprints/V4_SPRINT1.md](./sprints/V4_SPRINT1.md).

### Added
- **Supabase persistence layer**: PostgreSQL schema across 4 migrations
  (`supabase/migrations/0001–0004`) — 9 tables, enums, indexes, triggers, a
  latest-analysis view.
- **Recruiter authentication** (email + password) via Supabase Auth; backend
  JWT verification (`app/core/auth.py`) — the codebase's first `Depends()`.
- **Hiring Campaigns**: create/list/update/delete; candidates, notes, pipeline
  stages, and an activity timeline scoped to each campaign.
- **Repository layer** (`app/repositories/*`) and DI wiring (`app/core/deps.py`).
- **Persistence service** (`persist_batch`) storing batch AI output verbatim in
  `candidate_analyses.result` — referenced, never recomputed.
- **Storage**: 4 private buckets (`resumes`, `job-descriptions`,
  `interview-packs`, `avatars`) + `StorageService` with signed-URL downloads.
- **Row Level Security** on every table and storage object.
- **Frontend auth + campaign UX**: `@supabase/ssr` clients, route-guarding
  `middleware.ts`, `AuthProvider`, Bearer-token API layer, and Login →
  Dashboard → Campaigns → Campaign detail pages.
- **New API routes** under `/api/v1`: `/me`, `/activity`, `/campaigns` (+ nested
  candidates, notes, stage, resume upload/signed-URL, persist-batch, activity).
- `/health` now reports `persistence` and `auth` configuration status.

### Changed
- `app/core/config.py` extended with Supabase settings (all optional).
- `app/main.py` mounts the new routers.

### Activated & verified (2026-07-18)
- Supabase project **linked and provisioned** — migrations `0001–0004` applied
  to the live database.
- **End-to-end live verification: 15/15 checks passed** — 9 tables, 4 private
  buckets, `handle_new_user` + `updated_at` triggers, FK cascade deletes, RLS
  tenant isolation, email sign-in → JWT → backend validation, and storage
  upload → signed URL → download.
- Config made **key-naming tolerant**: backend accepts `SUPABASE_PUBLISHABLE_KEY`
  / `SUPABASE_SECRET_KEY` / `SUPABASE_JWKS_URL` (new scheme) as well as the legacy
  `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET`.
  Asymmetric (JWKS) tokens are validated via the Supabase Auth fallback.
- Persistence layer is now **fully operational**.

### Notes
- Backward compatible: with no Supabase env configured the app runs fully
  stateless; persistence routes return a clear `503`.

---

## [1.2.0] — 2026-06-03

Evolution from prototype to premium recruiter SaaS.

### Added
- **Job Description Match Analysis** (`/api/v1/match-analysis`) — cross-references
  JD requirements against parsed resume, producing a job-match score and
  missing-skills breakdown.
- **Professional PDF export** (`/api/v1/export-report`, `/api/v1/export-match-report`)
  via ReportLab.
- **Recruiter-grade results dashboard** — Next.js 16 + React 19 + Tailwind +
  Shadcn/Radix, with score rings and structured feedback cards.
- Security & observability middleware (request IDs, security headers, body-size
  limits) and `GET/HEAD /health`.

### Changed
- Dashboard UI refactored to align schema and layouts.
- ATS rule engine tuned for modern frontend profiles and intern-tier scoring.

### Fixed
- PDF score overlap and missing candidate-metadata mappings.
- Vercel build/deploy configuration and lockfile sync.

---

## [1.1.0] — 2026-06-01

### Added
- **Recruiter screening workflow** — batch resume ranking backend foundation and
  workflow (`/api/v1/batch-analysis`): many resumes vs one JD, ranked with
  analytics.
- **Downloadable report** feature.

### Fixed
- Report download bug.

---

## [1.0.0] — 2026-05-30

Initial public release.

### Added
- High-fidelity **PDF & DOCX parsing** (PyMuPDF, python-docx) via a parser factory.
- **Deterministic ATS scoring engine** — 100-point rubric, fully reproducible.
- **Groq Llama-3 intelligence layer** for qualitative insights (summary,
  strengths, gaps, interview readiness, recommendations).
- Single-resume analysis endpoint and results dashboard.

[4.0.0]: #400--unreleased-v4-sprint-1-supabase-foundation
[1.2.0]: #120--2026-06-03
[1.1.0]: #110--2026-06-01
[1.0.0]: #100--2026-05-30
