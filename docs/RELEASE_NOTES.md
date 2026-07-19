# Release Notes — HireLens v1.0

**Status:** Production-ready (Release Candidate audit approved — zero blockers).
**Theme:** the AI recruiting platform, fully stabilized, hardened, and frozen.

HireLens turns raw résumés into grounded, explainable hiring intelligence:
deterministic scoring for the numbers, a single AI orchestration layer for the
reasoning, and a persistent recruiter workspace on top of a multi-tenant Supabase
foundation.

## Highlights

- **AI Recruiter Suite** — batch analysis & ranking, semantic talent search,
  candidate comparison, interview intelligence, an ambient Copilot, executive
  reports, an autonomous agent, organizational memory, and predictive/digital-twin
  intelligence. Every answer is grounded in the recruiter's own data.
- **One AI path** — every LLM request (résumé/batch analysis, comparison,
  interview, copilot, match, report, agent) flows through a single
  **AI Orchestrator**: prompt registry → QA cache → provider selection + fallback
  chain → retry policy → usage tracking → logging → provider. No direct provider
  calls remain anywhere in the backend.
- **Multi-tenant & secure** — Supabase Auth (JWT), per-recruiter + per-org
  isolation enforced at the repository layer *and* RLS, private résumé storage with
  signed URLs, and a hardened API surface.
- **Deterministic where it counts** — ATS scoring, ranking, semantic retrieval,
  and all predictions are reproducible; the LLM explains, it does not invent
  numbers.

## What changed during v1.0 stabilization

**Reliability & correctness**
- Content-hash (SHA-256) **idempotent uploads** — the same résumé (even renamed)
  never creates a duplicate candidate; `UNIQUE(campaign_id, file_hash)` backstop.
- Fixed the **recommendation vs ATS** confusion (surfaced reasoning in the UI).
- Rebuilt the **years-of-experience** parser (raw-text union-of-intervals; 18-case
  test suite) — resolved multiple grounding errors.
- Fixed **semantic search ranking** (hybrid two-tier lexical + IDF re-rank over the
  hashing embeddings) — 10/10 recruiter queries correct.
- Copilot grounding fixes (roster now carries skills/years/gaps; correct intent
  routing for "who's a fresher / who knows X / most experience").

**AI infrastructure & cost**
- **Migrated résumé/batch analysis onto the orchestrator** — the last direct
  provider path is gone; single, observable LLM path.
- **Retry optimization** — rate-limit (429) errors are no longer retried
  (eliminated 3× call amplification during quota/outage: measured 9→3 calls).
- **QA mode** (dev-only) — response cache for identical requests, duplicate
  detection, and per-capability usage/token reporting at `GET /api/v1/ai/usage`.

**Security hardening**
- Per-IP **rate limiting** on expensive/unauthenticated endpoints.
- **Magic-byte validation** on all résumé uploads (renamed-file bypass closed).
- **Bounded** LLM input sizes; **fail-closed CORS** in production; PII removed from
  logs.
- Full security audit: no Critical/High findings; tenant isolation verified live.

**Frontend & navigation**
- Auth-aware landing page (Login / Get started / Dashboard), full sidebar/header
  navigation to every feature, proper empty/loading/error states.
- Migrated `middleware.ts` → **`proxy.ts`** (Next.js 16 convention; deprecation
  warning cleared; auth redirects verified).

**Codebase freeze**
- Backend lint clean (`pyflakes` 0 findings), TypeScript clean (`tsc` 0), no
  dead/duplicated code paths, no TODO/FIXME/debug logging in production code.

## Verification

- **End-to-end:** 15/15 core workflows pass live (auth, org, campaign, upload,
  parse, analysis, search, comparison, interview, copilot, prediction, analytics,
  export, deletions) — including tenant-isolation checks (no-token → 401,
  cross-tenant read → 404).
- **Scores:** Security 8.5/10 · Performance 7.5/10 · Production Readiness 8.5/10.

## Upgrade / deploy notes

- Apply migrations `0001`–`0013` (and optionally `0014`). See
  [DEPLOYMENT.md](./DEPLOYMENT.md).
- Set `ENVIRONMENT=production` and an explicit `ALLOWED_ORIGINS` — the backend
  **fails closed** on wildcard CORS in production.
- Configure `GROQ_API_KEY` (LLM features degrade gracefully without it).

## Known limitations & what's next

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) and [ROADMAP.md](./ROADMAP.md).
Top post-launch items: AI **provider fallback**, **pgvector** + pagination for
1000+-candidate scale, and **granular RBAC**.
