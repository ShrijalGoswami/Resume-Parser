# Features

> Complete feature inventory grouped by domain. Status reflects what is **in the
> codebase today** — nothing here is aspirational unless marked 🗓️ Planned.
> Legend: ✅ Implemented · 🚧 In Progress · 🗓️ Planned.
> Cross-refs: [ROADMAP.md](./ROADMAP.md), [API.md](./API.md).
>
> **Infrastructure status (2026-07-18):** the Supabase persistence layer is
> **activated and live-verified** — auth, campaigns, storage, RLS, triggers, and
> FK cascades all confirmed against the live project (15/15 e2e). See
> [PROJECT_AUDIT.md](./PROJECT_AUDIT.md).
>
> **Sprint 2 (Recruiter Workspace) shipped:** campaign dashboard, candidate
> management table, candidate detail page, intelligent upload, and the Executive
> Intelligence analytics dashboard — 62/62 live checks. See
> [sprints/V4_SPRINT2.md](./sprints/V4_SPRINT2.md).

---

## Job Seeker

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| ATS analysis | ✅ | Upload a resume → deterministic ATS score (0–100) + confidence + Groq insights | Parser, ATS scorer, Groq | P0 |
| Job-description match | ✅ | Compare a resume to a JD → match score, matching/missing skills | Match scorer, Groq | P0 |
| PDF report (ATS & match) | ✅ | Download a branded PDF of the analysis | ReportLab | P1 |
| Resume version history | 🗓️ | Track a candidate's resume over time | Persistence, auth | P3 |
| Skill-gap learning paths | 🗓️ | Suggested paths to close missing skills | AI | P3 |

## Recruiter

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Batch ranking | ✅ | Many resumes vs one JD → ranked table + analytics | Batch service, Groq | P0 |
| AI Recruiter Copilot | ✅ | Grounded Q&A about a candidate, with evidence | Copilot, candidate context | P0 |
| Hiring campaigns | ✅ | One campaign = one hiring process (JD, candidates, pipeline, notes) | Supabase, auth | P0 |
| Pipeline stages | ✅ | Move candidates sourced → hired/rejected | Campaigns | P1 |
| Recruiter notes | ✅ | Free-form notes per candidate (add/list/delete) | Campaigns | P1 |
| Activity timeline | ✅ | Append-only log; campaign- and candidate-scoped | Campaigns | P2 |
| Candidate management table | ✅ | Ranking, 8 filters, bulk actions, search, pagination | Campaigns | P0 |
| Candidate detail page | ✅ | Tabbed overview / AI analysis / notes / activity | Campaigns | P0 |
| Intelligent upload | ✅ | Drag&drop, queue, progress, retry, dedupe, auto-insert | AI pipeline | P0 |
| Executive analytics dashboard | ✅ | KPIs, AI insights, charts, action center (`/insights`) | Analytics endpoint | P1 |
| Copilot memory | 🚧 | Persist conversations across sessions (tables + repo exist) | Campaigns | P0 |
| Interview packs | 🗓️ | Generate + store interview kits (PDF) | AI, Storage | P2 |
| Realtime pipeline board | 🗓️ | Live candidate updates | Supabase Realtime | P1 |

## Platform

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Hybrid AI pipeline | ✅ | Deterministic scoring + LLM reasoning | Parser, NLP, Groq | P0 |
| Stored AI outputs | ✅ | Results persisted, not recomputed | Persistence | P0 |
| Private storage + signed URLs | ✅ | Recruiter-namespaced buckets, no public URLs | Supabase Storage | P0 |
| Health + observability | ✅ | `/health`, request IDs, structured logs, security headers | Middleware | P1 |
| Graceful degradation | ✅ | Runs stateless with no Supabase; LLM failures fall back deterministically | — | P1 |
| Rate limiting | 🗓️ | Per-IP / per-recruiter throttling | — | P1 |
| Pagination + search | 🗓️ | Keyset paging, server-side search (trgm indexes ready) | DB | P1 |
| AI provider abstraction | 🗓️ | Multi-model routing / failover | LLM layer | P3 |

## Admin

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Recruiter profile | ✅ | `GET/PATCH /me`, auto-provisioned on sign-up | Auth | P1 |
| Organizations / teams | 🗓️ | Multi-seat tenancy | Auth, DB | P2 |
| Role-based access | 🗓️ | Admin/member roles within an org | Orgs | P2 |
| Audit log | 🗓️ | Immutable trail from activity events | Activity | P2 |

## Authentication

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Email + password | ✅ | Supabase Auth sign up / in | Supabase | P0 |
| JWT verification | ✅ | Local HS256 verify in backend | PyJWT | P0 |
| Route protection | ✅ | `middleware.ts` guards `/dashboard`, `/campaigns` | @supabase/ssr | P0 |
| Session refresh | ✅ | Cookie refresh on every request | @supabase/ssr | P1 |
| OAuth providers | 🗓️ | Google / GitHub (verification path already provider-agnostic) | Supabase | P2 |
| MFA / SSO | 🗓️ | TOTP, SAML | Supabase | P3 |

## AI

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Deterministic ATS rubric | ✅ | 100-point, reproducible | NLP | P0 |
| Semantic similarity | ✅ | Bag-of-words TF cosine (no external ML lib) | NLP | P1 |
| Groq Llama-3.3 analysis | ✅ | Summaries, strengths, gaps, recommendations | Groq | P0 |
| Interview questions | ✅ | 4–6 per candidate in batch analysis | Groq | P1 |
| Structured-output validation | ✅ | Pydantic schemas + retry/repair ladder | Pydantic | P0 |

## Payments

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Billing / subscriptions | 🗓️ | Plans, metering, invoices | Orgs, provider | P2 |
| Usage metering | 🗓️ | Track LLM/analysis usage per tenant | Analytics | P2 |

> **Payments are not implemented.** No billing code, provider integration, or
> pricing exists in the repository today.

## Analytics

| Feature | Status | Description | Dependencies | Priority |
|---------|:------:|-------------|--------------|:--------:|
| Batch analytics | ✅ | Per-batch top/missing skills, distributions | Batch service | P1 |
| Dashboard stats | ✅ | Campaign/candidate counts on the dashboard | Campaigns | P2 |
| Cross-campaign analytics | ✅ | Executive dashboard aggregating all campaigns (`/insights`) | Analytics endpoint | P1 |
| Charts (funnel, distributions, trend, skills) | ✅ | Reusable dependency-free chart components | Analytics | P2 |

## Future

Consolidated view of everything 🗓️ Planned lives in [ROADMAP.md](./ROADMAP.md)
with a priority matrix and cost-scaling plan.
