# Runtime Validation Report — A6 End-to-End Recruiter Workflow

> **Generated** by `backend/tests/test_e2e_workflow.py`. Do not edit by hand — re-run the suite.

## 1. Environment

- **Backend URL:** `http://127.0.0.1:8000`
- **Supabase project:** `vmqhigckfkedkwfkvnij.supabase.co`
- **Environment:** `development`
- **Date/time:** 2026-07-24 09:08 UTC
- **Commit:** `db090b2` (tree dirty — uncommitted A6 suite)

## 2. Static baseline

- **Vitest (frontend P0 units):** ✅ 3 files / 18 tests passed (vitest 4.1.10)
- **A6 suite static verification:** ✅ PASS — py_compile OK + 2 guard-abort checks (exit 2: missing opt-in, and ENVIRONMENT=production)

## 3. Runtime execution summary

- **Total PASS:** 21
- **Total FAIL:** 0
- **Total SKIPPED:** 0
- **Overall:** ✅ PASS

## 4. P0 validation

### P0-1 — Logout / session consolidation · ✅ PASS

- **What was actually executed:** Authenticated `/me` (200) → real Supabase `sign_out()` on the session → post-logout no-token probe → re-probe of the pre-logout access token.
- **What was proven:** Authenticated access succeeds; sign-out completes; the enforced guarantee holds (with no session, the backend rejects the request with 401).
- **What remains outside scope:** The visual sign-out **button click** and client-side `queryClient.clear()` are browser behaviors — decision/wiring unit-proven in `use-session`/`proxy.test.ts`, not driven here (no browser automation, per A6 scope).
- **Supporting evidence (live-run checks):**
  - ✅ PASS — Authenticated access succeeds before logout (/me → 200)
  - ✅ PASS — Supabase sign_out() completes
  - ✅ PASS — After logout, no-token request is rejected (401)
  - ✅ PASS — Pre-logout access token is rejected after sign-out _(backend get_user revalidation honored the sign-out)_

### P0-2 — Server route protection + auth boundary · ✅ PASS

- **What was actually executed:** Live requests to `GET /me` with (a) no token, (b) an invalid token, (c) a valid Supabase session; plus recruiter profile self-provisioning.
- **What was proven:** The backend auth boundary rejects missing/invalid tokens with 401 and accepts a valid live session with 200; `/me` derives and provisions recruiter identity from the JWT.
- **What remains outside scope:** The Next proxy's unauthenticated→`/auth/login` **redirect** is edge/browser behavior; its decision logic is unit-proven in `tests/proxy.test.ts` and is not re-run here.
- **Supporting evidence (live-run checks):**
  - ✅ PASS — No token → 401 (backend rejects anonymous)
  - ✅ PASS — Garbage token → 401 (backend rejects invalid)
  - ✅ PASS — Valid session → 200 on /me (auth boundary passes) _(status=200)_

### P0-3 — Native role lifecycle + JD authoring + candidate workflow · ✅ PASS

- **What was actually executed:** Create role + JD → read-back → JD edit → status transition → list; candidate persist/list/open/stage/notes on a deterministic service-seeded candidate; and the AI add-candidates chain (batch-analysis → persist-batch → reindex) when Groq is available.
- **What was proven:** Role lifecycle and JD authoring round-trip through the live database (writes persist and re-read correctly); the candidate triage workflow (stage + notes) persists.
- **What remains outside scope:** Live AI batch analysis is an **external dependency** (Groq); recorded SKIPPED when unavailable. AI reliability is owned by A4.
- **Supporting evidence (live-run checks):**
  - ✅ PASS — /me provisions the recruiter profile (id + email match) _(id=ok)_
  - ✅ PASS — Create role + JD → 201 _(status=201)_
  - ✅ PASS — JD persisted (read-back matches authored JD)
  - ✅ PASS — JD edit persists (re-read reflects the update)
  - ✅ PASS — Status transition persists (active → paused)
  - ✅ PASS — Role appears in the recruiter's campaign list
  - ✅ PASS — Candidate appears in the pipeline list
  - ✅ PASS — Open candidate → 200
  - ✅ PASS — Triage stage change persists (sourced → shortlisted)
  - ✅ PASS — Add recruiter note → 201 _(status=201)_
  - ✅ PASS — Note is listed after creation
  - ✅ PASS — Note deletion persists (no longer listed)
  - ✅ PASS — AI batch persists candidates under the role (201) _(status=201)_
  - ✅ PASS — Reindex embeddings after persist (2xx) _(status=200)_

## 5. Failure classification

No failures or skips — every executed check passed. Nothing to classify.

## 6. Release recommendation

✅ **Ready to close A6.**

Every executed release-critical workflow check passed against the live backend + live Supabase with real authentication and real persistence. All SKIPPED items are external dependencies (Groq availability / Supabase stateless-JWT token model), not product defects, and are explicitly out of A6's scope (AI reliability → A4; the visual logout click → browser-level, unit-proven).

_A1 proves cross-tenant **denial**; A6 proves the single-tenant **workflow** succeeds end-to-end. Reference: Launch Sprint A6; `docs/security/TENANT_ISOLATION.md` (auth boundary)._
