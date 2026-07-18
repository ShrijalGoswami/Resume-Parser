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
