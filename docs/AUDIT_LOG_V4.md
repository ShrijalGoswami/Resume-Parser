# HireLens V4 — Backend Stabilization & End-to-End Product Audit

Running log. Every entry records: feature · route · API · root cause · files
modified · verification performed.

**Environment under test**

| Service | Status |
|---|---|
| Next.js frontend | `http://localhost:3000` — running (dev) |
| FastAPI backend | `http://127.0.0.1:8000` — started for this audit (`uvicorn app.main:app`) |
| Supabase | cloud project, reachable; 2 confirmed auth users |
| Groq LLM | configured — AI analysis endpoints enabled |

Backend surface: **104 endpoints** across campaigns, candidates, copilot,
search, org/enterprise, integrations, knowledge, prediction, agent, reports.

---

## Phase 1 — API surface audit (no session required)

### A1. Authentication enforcement sweep — PASS

Probed all 39 parameterless `GET` endpoints with no credentials.

- **36 / 39 returned `401`** — auth correctly enforced.
- **0 returned `500`** — no uncaught exceptions on the unauthenticated path.
- 3 returned `200`, all verified to carry **no tenant data**:
  - `GET /health` — intentional health probe.
  - `GET /api/v1/copilot/suggestions` — static prompt suggestion catalogue.
  - `GET /api/v1/org/roles` — static RBAC role→permission matrix.

**Verdict:** no fix applied. See O1 for the one observation.

### A2. Request validation — PASS

`POST` with `{}` against the stateless AI endpoints returns `422` with a
well-formed Pydantic `detail` array (field-level `loc`/`msg`), not a `500`:
`/ats-analysis`, `/match-analysis`, `/batch-analysis`, `/copilot/chat`.

### A4. Mutating endpoints, unauthenticated — PASS

Probed all **57** `POST`/`PUT`/`PATCH`/`DELETE` endpoints with no credentials
and a `{}` body, substituting well-formed UUIDs for path parameters. This
specifically catches routes that authorise *after* parsing or touching the
database, which is where 5xx normally hides.

| Result | Count |
|---|---|
| `401` auth enforced | 51 |
| `422` validation (public AI endpoints) | 4 |
| `200` public PDF export (see O2) | 2 |
| **`5xx` / uncaught** | **0** |

No endpoint returned a 5xx, an invalid JSON body, or an unhandled exception.

### A3. Frontend → backend contract — PASS

Extracted every backend path referenced across the frontend (64 distinct paths
over 14 client modules) and diffed against the OpenAPI spec.

**No frontend call targets a non-existent backend route.** (Four apparent
mismatches were query-string template literals, e.g. `/campaigns?status=${…}`,
not missing routes.)

`services/api.ts` is the only client that never attaches `Authorization`. This
is **correct by design** — it calls only the stateless, deliberately public AI
endpoints. Verified those endpoints do not require auth (they answer `422` on
bad input, not `401`).

---

## Phase 2 — Database audit (no session required)

### D1. Tables — PASS

All **28** tables declared across migrations `0001`–`0015` exist and are
readable by the service role.

### D2. Row Level Security — PASS

For every table, queried with the anon key and compared exact row counts
against the service-role count. **Anonymous reads return 0 rows on all 28
tables**, including populated ones — `organizations` (40), `knowledge_items`
(60), `subscriptions` (35), `audit_logs` (32), `prediction_snapshots` (14),
`digital_twin_state` (6), `recruiters` (2), `organization_members` (2),
`org_feature_flags` (1). No leaks.

### D3. Storage buckets — PASS

All four buckets exist, all **private**, all with size limits:

| Bucket | Public | Limit |
|---|---|---|
| `resumes` | no | 10 MB |
| `job-descriptions` | no | 5 MB |
| `interview-packs` | no | 10 MB |
| `avatars` | no | 2 MB |

---

## Fixes applied

### F1 — React 19 console error: script tag rendered inside a React component

| | |
|---|---|
| **Feature** | Theme provider (affects every authenticated surface) |
| **Route** | `/auth/*` and `(hirelens)/*` — reported at `AuthLayout` |
| **API** | none (client rendering defect) |

**Symptom.** `Encountered a script tag while rendering React component. Scripts
inside React components are never executed when rendering on the client.`
Stack: `script → ThemeProvider → HireLensProviders → AuthLayout`.

**Root cause.** `next-themes@0.4.6` emits its no-flash `<script>` as part of the
provider's own render output. `ThemeProvider` was inside `HireLensProviders`,
which is mounted **per route group** by both `app/auth/layout.tsx` and
`app/(hirelens)/layout.tsx`. Navigating between those groups (marketing →
`/auth/login`, or `/auth/login` → `/home`) unmounts and re-mounts the provider,
so React re-renders that `<script>` **on the client** — where scripts never
execute — and React 19 warns. next-themes exposes no prop to suppress the
script, so the fix had to be structural: mount the provider once at the single
shared root.

**Secondary defect found while fixing.** next-themes' `enableColorScheme`
(default on) writes `color-scheme` as an **inline style** on `<html>`. Hoisting
the provider to the root newly applied the OS dark preference to the light-only
marketing page. A stylesheet rule cannot outrank an inline style, so the
marketing scope pins it back with `!important`.

**Files modified**
- `app/layout.tsx` — mounts `<ThemeProvider>` at the root.
- `components/hirelens/shell/providers.tsx` — `ThemeProvider` removed from the
  per-route-group stack (`useTheme()` still resolves; the root is an ancestor).
- `app/globals.css` — `html:has(.mkt) { color-scheme: light !important }` plus
  `color-scheme: light` on `.mkt`.

**Verification performed (Chrome)**
- Theme script appears **exactly once, in the server-rendered HTML**, on `/`,
  `/auth/login` and `/auth/forgot-password` (`curl` of the SSR payload).
- Console clean across a full load of `/auth/forgot-password` and `/home` and a
  client-side navigation between route groups — no script warning, no errors.
- Theme still fully functional: `hl-theme=dark` persisted, `data-hl-theme=dark`
  on `<html>`, `.hl` scope present, theme toggle rendered.
- Scope isolation confirmed: `<html>` resolves `light` on the marketing page and
  `dark` in the app, on the same dark-preference machine.
- `tsc --noEmit` clean (app code), ESLint 0 errors, production build compiles.

> Note: two dev servers were briefly left holding ports 3000/3001 during this
> work, producing transient 404/500s that were **not** caused by the change.
> `pkill -f "next dev"` does not match the Windows node process — stop dev
> servers by port.

---

## Observations (not defects, carried for decision)

**O1 — `GET /api/v1/org/roles` is unauthenticated while every other `/org/*`
route requires auth.** It returns only the static role→permission matrix, so
there is no data exposure; it does reveal the permission model. Not changed,
because the frontend may legitimately read it before a session exists —
changing it blind risks breaking the login/permissions path.

**O2 — `POST /api/v1/export-report` and `/export-match-report` accept `{}` and
return a valid but empty PDF (`200`).** Lenient rather than broken: no crash,
valid output, correct content type. Worth tightening to a `422` on empty
payload, but it is not a failure.

**O3 — 40 `organizations` and 40 `workspaces` exist for 2 users, with 35
`subscriptions`.** Consistent with repeated org provisioning on sign-in/sign-up
rather than one-per-user. Migration `0012_fix_org_provision_timing.sql` suggests
this area has already been patched once. Flagged for investigation once a
session is available — needs the provisioning path exercised to confirm whether
a new org is still created per login.

**O4 — the core recruiting tables are empty**: `campaigns`, `candidates`,
`candidate_uploads`, `candidate_analyses`, `recruiter_notes`, `interview_packs`,
`copilot_conversations`, `copilot_messages`, `activity_events` all have 0 rows.
The end-to-end recruiter workflow has therefore never been exercised against
this database. Phase 3 will create this data, which also exercises every empty
state on the way in.

---

## Phase 3 — Feature audit (BLOCKED, awaiting session)

Protected routing is verified working: `GET /home` while unauthenticated
redirects to `/auth/login?next=%2Fhome`.

The browser has **no session** (no `sb-*` localStorage entry, no auth cookie).
Everything past the login wall — dashboard, campaigns, upload, analysis,
candidate detail, comparison, interview packs, copilot, semantic search, notes,
activity, settings, logout — requires an authenticated recruiter.

I cannot complete this myself: entering passwords and creating accounts are
actions I do not perform. Awaiting a user-performed login.
