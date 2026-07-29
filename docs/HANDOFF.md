# Session handoff — 28–29 Jul 2026

Branch `manus-ui-v1`, last commit `080d382 "Gonna redesign landing page"`.
**145 files uncommitted** (135 modified, 3 deleted, 7 new — including this file).
**Still zero commits.** The working tree is being left intact so the history can
be structured after review.

This document was rewritten on 29 Jul after the second session. Sections 1–4
cover the first session (landing page, typography, polish, density, backend
RBAC); section 5 onward covers the second (frontend RBAC, manual testing, the
three bugs it found, the backend suite). Where the two disagree, the later
section is right.

---

## 0. Read this first — how to get running

Two servers. Both must be up or the app looks broken in confusing ways.

```bash
# Frontend
cd resume-hero-section && npx next dev          # :3000

# Backend  ← forgetting this cost an hour
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health` → `200`.

**If the dashboard shows empty states everywhere,** check the backend first. Chrome
reports a refused TCP connection as **503** in the DevTools network log, including
on the OPTIONS preflight — which reads like a server-side failure but means nothing
is listening. `curl` exit code **7** is the unambiguous tell.

`pytest` **is now installed** in `backend/.venv` (`pytest` 9.1.1, `pytest-asyncio`
1.4.0) — but read §7 before trusting what it reports. It is not a lie exactly,
but it is not the truth either.

**The dev org is empty.** Zero roles, zero candidates. Every product screen shows
a first-run empty state, which is correct behaviour and also why most of the
workflow could not be exercised — see §6.

---

## 1. What changed, in order (session 1)

### 1.1 Landing page redesign (`components/marketing/`)
Replaced the placeholder panel in frame 1 with `compression-engine.tsx` — a
three-column living visualisation (intake stream → compression passes → resolved
signal). Added `motion.tsx` (`Reveal`, `Counter`, `useInView`). Enriched frames 2–5
with real product data rather than decorative filler.

**Governance note:** this deliberately breaks the "reproduce the Stitch frames, do
not improve them" rule in DDL-MKT-009. The memory entry `homepage-program-frozen`
has been amended to say so. The DDL entry itself still needs re-filing — that is
the user's call.

### 1.2 Typography — four passes, escalating
Final scale lives in `app/globals.css` under `THE HIRELENS TYPE SCALE`, calibrated
against the Stripe Dashboard:

```
display 64 · hero 56 · h1 40 · h2 30 · h3 22
body-lg 18 · body 16 · ui 16/tight · small 15 · caption 13 · label 14 · label-sm 12
```

Ladder: **12 → 13 → 14 → 15 → 16 → 18 → 22 → 30 → 40 → 56 → 64.**
Zero arbitrary sizes remain in the product or marketing scopes.

`hl-ui` (16px, tighter leading, 530 weight) is the step that makes 16px body
affordable — controls are *identified*, not read, so they hold their own rhythm.

Spacing moved with it: controls 36/44/52, input 48, row 52, card-pad 24, icons
20/24/28. All token-driven; **no component sets its own `h-8`/`p-4`/`size-4`.**

**Do not change typography again without being asked.** The user was explicit.

### 1.3 Dashboard polish pass
Depth (paired contact+ambient shadows), `--hl-bg-raised` + `--hl-surface-highlight`
(the lit top edge is most of what makes dark-mode cards read as objects), page wash,
graded nav rail, `hl-ai-glow` / `hl-prism-focus` / `hl-empty-halo`, route-level
entrance keyed on `pathname`, staggered sections, row-hover accents.

### 1.4 Density toggle removed
Deleted `lib/density.tsx`, `theme/density-toggle.tsx` + story. Removed from the
account menu, the rail (trio → pair), and Settings → Preferences. Deleted the
`.hl[data-hl-density='compact']` CSS block. **Spacing tokens were kept** — they are
the design system's single scale, not density machinery.

Left behind deliberately: a stale `localStorage['hl-density']` key. Inert; nothing
reads it.

### 1.5 Backend RBAC
See `docs/security/PERMISSION_MATRIX.md` (generated from `ROLE_PERMISSIONS`).

The policy engine in `app/enterprise/rbac.py` was always correct. It was **only
wired to the org-admin surface**: 19/103 endpoints enforced a permission, and
`campaigns.py` — the entire product — had **0/20**. That is the whole reason roles
looked cosmetic.

Now ~80/103 gated via `dependencies=[RequireX]` on route decorators (no handler
signatures touched). Added `CAMPAIGN_DELETE` as distinct from `CAMPAIGN_MANAGE` so
recruiters cannot delete roles, per spec.

---

## 2. Frontend RBAC — completed (session 2)

The UI now mirrors the server. New shared gate in
`components/hirelens/lib/use-can.ts`:

- **`useCan(perm)` → boolean.** For affordances. Collapses "denied" and "not known
  yet" into `false`, which is right for a button: worst case a control appears a
  moment late.
- **`usePermissionGate(perm)` → `loading | error | allowed | denied`.** For whole
  screens. See §5.1 for why this distinction is not academic.

`useOrgContext` moved to its own module (`lib/api/org-context.ts`) and is
re-exported from `lib/api/settings.ts`, so the six pre-existing Settings sections
are untouched and there is still exactly one query key and one request. It was
moved because importing it from `settings.ts` dragged that file's whole graph
(org-api, campaigns-api, the Home hooks) behind every gated leaf component — which
was measurable: it pushed the Candidate Object barrel test over its 5s timeout.

### What is gated, and on what

| Surface | Permission | Behaviour without it |
|---|---|---|
| Candidate decision bar (Advance/Hold/Reject/Add note) | `candidate.manage` | Bar absent entirely — not disabled |
| Candidate A/S/R keyboard shortcuts | `candidate.manage` | Inert (guarded in the controller, not just the view) |
| Notes composer + delete (both the Candidate Object and the legacy tab) | `candidate.manage` | Thread stays readable, editing gone |
| Stage menu (pipeline row, candidate overview) | `candidate.manage` | Degrades to a static label — the stage is information they're entitled to |
| Bulk: Move to / Reject / Remove | `candidate.manage` | Hidden |
| Bulk: Compare | `ai.use` | Hidden — interviewers keep Compare, viewers lose it |
| Add candidates (header, empty state, `A` shortcut) | `candidate.manage` | Hidden; empty state rewords |
| Edit / Archive role | `campaign.manage` | Hidden |
| Delete role | `campaign.delete` | Hidden; menu disappears entirely if both gone |
| Triage lens | `candidate.manage` | Tab hidden in switcher; `?lens=triage` shows a gate |
| Ask (route + rail + ⌘K) | `ai.use` | Rail entry and palette entry hidden; `/ask` shows a gate |
| Analytics (route + rail) | `usage.view` | Same |
| Approve/Dismiss recommendation (approval card, inbox queue, decision memo) | `agent.manage` | Card stays readable, verdict buttons gone; ⏎ guarded |
| Run agent scan | `agent.manage` | Hidden |

Gates live **inside** shared leaf components (decision bar, stage menu, approval
card, multiselect toolbar) rather than at their call sites, so two surfaces
rendering the same component cannot drift apart.

### Deliberately not gated

- **Export CSV** on Analytics — it serialises the overview already in memory and
  calls nothing. The screen's own `usage.view` gate covers it.
- **`export.py` endpoints** — gated `candidate.view` server-side, which every role
  has, so a UI gate would be theatre. See §8, this is an open question.
- **Talent search, collections, analytics/activity lenses** — reads covered by
  `candidate.view` / `campaign.view`, which every role has.
- **Role delete had no UI at all** before this session; `useDeleteCampaign` had no
  caller. It does now, gated on `campaign.delete`.

### Coverage

`tests/permission-gating.test.tsx` — 25 assertions across all six roles, driven
from `ROLE_PERMISSIONS` rather than per-component, so the question it answers is
"what can a viewer do?" rather than "does this button call useCan".

---

## 3. Bugs found by manual testing (session 2)

All three were invisible to static analysis, `tsc`, ESLint, and the test suite.
Two were introduced by session 1's RBAC sweep and had been sitting in the tree.

### 3.1 Candidate upload was completely broken — P0

`services/api.ts` `analyzeBatchWithProgress` sends no `Authorization` header. Its
own comment said so and was correct at the time: `/batch-analysis` was public
stateless AI. The RBAC sweep added `dependencies=[RequireAiUse]` to that route,
so **every candidate upload answered 401** — that is the entire "Add candidates"
flow, the product's primary intake path.

Fixed by resolving `authHeaders()` before the XHR promise (the session read is
async; `xhr.open` must precede `setRequestHeader`).

Nothing connects a Python decorator to a deliberately header-less TypeScript XHR.
No type, no test, no lint rule. It took reading the access log.

### 3.2 Ask suggestions silently degraded

`fetchCopilotSuggestions` in `services/copilot-api.ts` called bare `fetch` while
every other function in that file used the authenticated `apiFetch`. Same cause:
`/copilot/suggestions` was public until the sweep gated it `RequireAiUse`.

The screen looked fine the whole time, because Ask falls back to the hardcoded
`ASK_EXAMPLES`. Verified fixed in the access log: `401 in 1.3ms` → `200`.

**A sweep of every `services/*.ts` confirmed these two were the only bare-fetch
callers.** Everything else attaches `authHeaders()`.

**§3.1 is now verified live** — see §6. `POST /api/v1/batch-analysis -> 200`,
three candidates analysed, ranked and persisted through the UI.

### 3.4 Résumé binary upload 503s — OPEN, not fixed

Immediately after a successful batch upload, `POST
/campaigns/{id}/candidates/{id}/resume` returned **503 in 1.5s**. The candidate
rows persisted fine (`persist-batch -> 201`, 3 candidates); it is the résumé
*binary* attach that failed.

The 503 comes from `resolve_org_context` in `app/enterprise/context.py`, not from
storage — no Supabase storage call was even attempted. That function fans four
org reads out across a `ThreadPoolExecutor(max_workers=4)`, sharing **one**
`get_user_client` instance between the threads, and converts any exception into
`503 "Organization lookup failed."`.

Two things make this worth attention:

1. **It is very likely the same root cause as the intermittent `/org/context`
   503** that produced §3.3. Same function, same failure mode, and it appears
   under concurrent load — which is exactly when four threads share one
   PostgREST/httpx client that may not be safe for concurrent use.
2. **The cause is unlogged.** `raise HTTPException(...) from exc` discards `exc`
   without logging it, so a 503 leaves no trace of what actually threw. That
   needs fixing first — otherwise diagnosing this is guesswork.

Note the fan-out is a deliberate optimisation with a good comment explaining why
it is concurrency and not caching (authorization must never be stale). The
reasoning is sound; the thread-safety of the shared client is the part to check.
`test_resume_storage` passes in isolation (5/5), so this is load-dependent, not a
broken code path.

### 3.3 The route gates accused innocent users — introduced and fixed same session

First version of the Ask/Analytics gates treated "org context not loaded" as
"permission denied". Caught in the browser: an owner with every permission was
told *"Analytics is available to hiring managers, admins, and owners."* The
`/org/context` request 503s intermittently and that was enough to trigger it.

This is the `Reveal` lesson again, in a new place: **never withhold on the
strength of something you failed to find out.** Hence `usePermissionGate` and its
four distinct states. A denial must be something the server said, not something
we failed to ask. Regression-tested in `permission-gating.test.tsx`.

---

## 4. Verification status

Re-run at end of session 2, 29 Jul 2026.

| Check | State |
|---|---|
| `tsc --noEmit` | clean |
| ESLint | clean |
| `next build` | compiles, 20/20 static pages |
| Frontend tests | **126/126** (101 + 25 new gating assertions) |
| Backend — pytest | 59 passed — **but see §7** |
| Backend — self-runner suites (6 files) | all pass when run as designed |
| Backend — non-destructive uncollected (3 files) | pass (8, 35+5 skipped, all) |
| Backend — tenant isolation (destructive) | **25 pass, 0 fail, 1 skipped** |
| Backend — résumé storage (destructive) | **5 pass, 0 fail** |
| Backend — decision ledger, E2E workflow | **NOT RUN** — stopped mid-run |
| Visual | Inbox, Roles, Ask, Analytics, Settings/Members, Role workspace, Triage — dark |
| **Product workflow, live** | **create role → upload → analyse → rank → review → decide → bulk → triage → delete: all pass** (§6) |
| RBAC end-to-end | session 1: 3 roles × 4 endpoints, real HTTP, 403s where expected |

Tenant isolation is worth calling out: 25/25 across both enforcement layers —
cross-tenant reads 404, writes rejected, RLS returns 0 rows, signed URLs refuse
other tenants' objects, bad-signature and wrong-audience tokens 401.

---

## 5. Open items

| Priority | Item |
|---|---|
| **High** | **Résumé binary upload 503s under load — §3.4.** Open. Start by logging the swallowed exception in `resolve_org_context`, then check whether the shared Supabase client is safe across the four fan-out threads. Probably also the cause of the intermittent `/org/context` 503. |
| **High** | **No gate was ever verified closed in a live browser.** Every permission was tested open (full-permission account) and closed by unit test. Needs a second account or a temporary role change to confirm a recruiter really cannot see Analytics, an interviewer really gets no decision bar. |
| **High** | **`test_decision_ledger` and `test_e2e_workflow` never ran.** Approved, then stopped. |
| Medium | Ask thread against real data, Ledger, Decision memo, interview generation, Talent search and Compare were never exercised — see §6. |
| **High** | **145 uncommitted files.** Suggested split now **six** commits: marketing redesign / typography / polish / density removal / backend RBAC / frontend RBAC + API auth fixes. |
| Medium | 52 of 59 pytest-collected tests assert nothing — §7. |
| Medium | `admin.py` 1/5 gated — needs review. `account.py` 0/3 is correct (self-service, RLS-scoped). |
| Medium | Light-mode nav rail gradient is nearly invisible. Fix by deepening `--hl-bg-subtle`, not by strengthening the gradient. |
| Medium | `/org/context` takes **2.5–8 seconds** and 503s intermittently. Every gated screen now waits on it, so this is on the critical path for perceived performance. The backend makes serial Supabase round-trips per request. |
| Low | DDL-MKT-009 re-filing (see 1.1). |
| Low | CI grep for `text-\[(9\|10\|11)px\]` and `\bh-[89]\b` in `.hl` components. |
| Low | `docs/qa/RUNTIME_VALIDATION_*.md` and `docs/security/RUNTIME_VALIDATION_A1.md` were rewritten by the test runs — they are generated artifacts, expect churn in the diff. |

---

## 6. The workflow pass — what was actually driven

Seeding was approved and done: a role `ZZ-TEST — Senior Backend Engineer (delete
me)` with a real backend job description, and three generated fixture résumés
(fictional people, deliberately spread across strong / partial / poor fit).
**All of it was deleted afterwards; the org is back to zero roles and zero
candidates.** The fixtures live in the session scratchpad, not the repo.

Verified end-to-end, through the UI, against live Supabase:

| Step | Result |
|---|---|
| Create role | 201, appears in list, toast |
| Upload 3 résumés | **`batch-analysis -> 200`** — the §3.1 fix, confirmed live |
| Analysis + persistence | `persist-batch -> 201`, 3 candidates stored |
| Ranking | Ada **70 / Strong Hire** (Go, Python, FastAPI) · Grace **49 / Maybe** (Django, Flask) · Alan **34 / Reject** (CSS, HTML, JS) — exactly the intended ordering, skills correctly extracted |
| Candidate Peek | Verdict, confidence, "what stands out" / "needs a closer look" all drawn from real résumé content |
| Decision bar | Renders for a permitted role; **Advance moved Sourced → Interview**, persisted, peek auto-closed, header went to "2 stages" |
| Bulk toolbar | `2 selected · Compare · Move to · Reject · Remove · Clear` — the rewritten component, all gates open for a full-permission role |
| Triage lens | Correct partition: 1 needs you, 1 review-and-reject, 1 done |
| Role actions menu | Edit / Archive / Delete permanently all present; separator logic correct |
| Delete role | Type-to-confirm guard, cascade delete, "Role deleted", list back to first-run |

Two observations from the run, neither filed as a defect:

- **Candidate names came through as filenames** (`zz-test-ada-lovelace`), and the
  log shows `Missing field: Name could not be extracted`. The fixtures were
  generated by reportlab with a `(TEST FIXTURE - not a real person)` suffix on
  the name line, which plausibly defeated the extractor. Worth one retest with a
  conventionally-formatted résumé before concluding anything about the parser.
- **One AI-generated risk contradicted the résumé** ("lack of specific experience
  with incident response and on-call ownership" against a résumé that says "ran
  the on-call rotation and incident review process"). Single sample, LLM
  variance; noted, not filed.

**What was still not exercised:** the Ask thread against real data, Ledger,
Decision Intelligence memo, interview generation, Talent search, and Compare.
Also nothing was tested as a *restricted* role — every gate was verified open for
a full-permission user and closed by unit test, never closed in a live browser
(that needs a second account or a role change).

---

## 7. What `pytest` actually covers — read before trusting it

`pytest tests/ -q` reports **59 passed**. That number is misleading in two ways.

**52 of the 59 assert nothing.** They are written as `def test_x() -> list[str]`,
build a `failures` list, and `return` it. Pytest treats a returning test as a
pass regardless of content (it warns: `PytestReturnNotNoneWarning`). Only
`test_ai_gateway.py`'s 7 tests actually assert.

These are not broken tests — they are designed for the `__main__` runner at the
bottom of each file, which consumes the returned lists and reports properly. Run
that way (`PYTHONPATH=. python -m tests.test_security_headers_and_limits`), all
six files genuinely pass.

**Seven more files define no pytest-collectable functions at all** and are
invisible to it: `test_ai_reliability`, `test_decision_ledger`, `test_e2e_workflow`,
`test_experience_years`, `test_provider_contract`, `test_resume_storage`,
`test_tenant_isolation` — including every destructive/live suite, which is to say
every test that proves tenant isolation holds.

So the honest summary is: **no backend test fails**, and the checks do pass when
run the way they were built to be. But `pytest` alone is not a gate you can trust
for this repo. Either add `assert not failures` to the 52 (mechanical, preserves
every message), or wire the `__main__` runners into CI explicitly. Do not leave a
green pytest run as the release signal.

Destructive suites need `HL_ALLOW_DESTRUCTIVE_TESTS=1` and non-production
`ENVIRONMENT` (currently `development`). They create and delete real users and
data, with preflight guards and teardown.

---

## 8. Assumptions — four now RESOLVED, the rest still open

### Resolved 29 Jul (confirmed explicitly, implemented, tested)

These four were inferred during the sweep and have since been decided. They are
policy now, recorded in `docs/security/PERMISSION_MATRIX.md` under "Decisions of
record". Do not quietly revert them.

| Was | Now |
|---|---|
| `owner` and `admin` identical — an admin could delete the organization | **`org.manage` is owner-only.** Admin keeps everything else (members, flags, keys, integrations, all product actions). `_OWNER_ONLY` in `rbac.py` is the seam. |
| `export.py` gated `candidate.view` — every reader could bulk-export | **New `Permission.EXPORT`**, granted to owner/admin/hiring_manager/recruiter. Interviewers and viewers can read candidates but not extract them. |
| Recruiters could not see Analytics at all | **Recruiters have `usage.view`.** Analytics is pipeline health for the person running the pipeline. If org spend must be hidden from them later, split `usage.view` — do not take analytics back. |
| `GET /ai/usage` exposed org AI spend to every authenticated member incl. `viewer` | **Gated `usage.view`**, matching `/org/usage`. |

`admin.py` is now fully audited: `/ai/provider` is `org.manage`, `/ai/usage` is
`usage.view`, `/ai/config` and `/ai/health` are authenticated-only (provider
names, capability flags, health counters — no secrets, no spend), and
`/ai/qa/reset` is refused outside development by an `ENVIRONMENT` check.

### Still open

**The remaining endpoint→permission mappings were inferred**, not specified —
derived from HTTP method and route path. Nobody has objected, but nobody has
confirmed them either:

| Endpoint group | Gate chosen | Assumption |
|---|---|---|
| `search.py` | `CANDIDATE_VIEW` | Search is a read. |
| `prediction.py` | `AI_USE` | Predictions are an AI capability. |
| `agent.py` reads / writes | `CANDIDATE_VIEW` / `AGENT_MANAGE` | Approving a recommendation is a mutation. |
| `analyze` / `batch` / `match` / `reports` | `AI_USE` | All are LLM calls. |

### The `interviewer` role was not in the spec
It exists in code (view + AI, no mutations, no export) and its grants were left
untouched. The frontend now has real behaviour for it — interviewers keep
Compare and lose every mutation and every export. Confirm the role should exist
at all; nothing depends on the answer today.

### The UI can lag a role change by up to 60s
`useOrgContext` has no explicit `staleTime`, but React Query's cache means a
demoted user's UI may still render a button briefly. The **backend is immediate**
— they are denied on their next request regardless.

### Route transitions remount the content subtree
`key={pathname}` on the wrapper inside `<main>` in `app-shell.tsx` replays the
entrance animation per route and **remounts everything below it on every
navigation**. Component state is not preserved across routes; mounted queries
re-run. If you later want preserved scroll position or tab state, this is the line.

### Marketing typography was swept with scripted edits
The `.mkt` label/body class migration was applied with `perl`/`sed` across ten
files and spot-checked, not read line by line. A careful diff read of
`components/marketing/` before committing would be reasonable.

### The density `localStorage` key was deliberately left behind
`localStorage['hl-density']` still holds a value in browsers that used the toggle.
Nothing reads it.

---

## 9. Gotchas worth remembering

**The landing page went blank for a day.**
`Reveal` starts content at `opacity: 0` and depended entirely on an
IntersectionObserver callback to reveal it. **Chrome does not deliver IO callbacks
to a document whose `visibilityState` is `hidden`** — not even the initial one. A
page loaded in a background tab stayed blank forever. The first fix was *also*
broken: it used `requestAnimationFrame`, which does not run in a hidden document
either.

The rule now in `motion.tsx`: **this hook may only ever delay content, never
withhold it.** Backstop timer armed *first*, before any branch that can return
early. `setTimeout`, never rAF. Plus a `<noscript>` guard in the marketing layout.

**The same rule now governs permission gates** (§3.3). It generalises: any code
that hides something on the strength of an async result must distinguish "the
answer is no" from "I don't have the answer".

**Gating a route ≠ gating an affordance.** Fail-closed is right for a button and
wrong for a screen. Two different hooks, deliberately.

**Verify in the browser, not by grepping.** Session 1 found a 64px Fraunces serif
in a 180px card this way. Session 2 found a completely broken upload path this
way — and, more pointedly, found it in the *access log* rather than on screen,
because both auth bugs degraded silently.

**Read the access log during manual testing.** A screen that renders is not a
screen that works. Both §3.1 and §3.2 looked fine.

**Browser zoom.** The Chrome instance reports `devicePixelRatio 0.9375` — 125%
Windows scaling × **75% browser zoom**. At that setting 16px body paints at 12
physical px. Almost certainly why typography "still felt small" across three
passes. Confirm at 100% (Ctrl+0) before touching type again.

**Tailwind v4 namespaces.** `h-*` reads `--height-*`, `w-*` reads `--width-*`,
`size-*` reads `--size-*`. A square control needs **all three** registered or
`size-hl-control-md` silently emits nothing and the element collapses.

**Grep before building.** Session 1 wrote a whole `lib/permissions.ts` before
finding `settings/permissions.ts` already existed with `PERMS`/`hasPerm` used by
six sections. Session 2 extended that same file rather than adding a second one.

**Scripted edits need per-item review.** Content-matching decorators assigned
`RequireAiUse` to `DELETE /campaigns/{id}`. Caught only by printing every route
with its gate and reading them individually.

**Watch what a route gate does to a *client* when it changes.** §3.1 and §3.2 are
both the same mistake: a route's auth contract changed and its callers did not.
When gating an endpoint, grep for its callers and check they authenticate.

**`tsc --noEmit` reports errors in `.next/dev/types/*` while the dev server is
running.** They are generated-file artifacts, not your code. Stop the dev server
or ignore that path.

---

## 10. Repository hygiene

- **No debug artifacts** in any changed file — no `console.log`, `debugger`,
  `.only(`, `pdb.set_trace`, `FIXME`/`XXX`/`HACK`.
- **No stray `TODO`s.** Everything provisional is written down here instead.
- **No build junk tracked** — no `__pycache__`, `.pyc`, `.next/`, `node_modules`,
  `.log`, `.tmp`.
- **7 untracked files, all intentional:** `docs/HANDOFF.md`,
  `docs/security/PERMISSION_MATRIX.md`,
  `components/marketing/compression-engine.tsx`, `components/marketing/motion.tsx`,
  `components/hirelens/lib/use-can.ts`,
  `components/hirelens/lib/api/org-context.ts`,
  `tests/permission-gating.test.tsx`.
- **3 deletions, all intentional** (density removal): `lib/density.tsx`,
  `theme/density-toggle.tsx`, `theme/density-toggle.stories.tsx`.
- **No dangling references** to any deleted module.
- **No half-applied refactors:** `campaigns.py` carries 20/20 route gates;
  `enterprise/deps.py` defines all 8 gate constants.
- `docs/qa/RUNTIME_VALIDATION_A4.md`, `RUNTIME_VALIDATION_PROVIDERS.md`,
  `RUNTIME_VALIDATION_A3.md` and `docs/security/RUNTIME_VALIDATION_A1.md` are
  **generated by the test runs** and were rewritten today.

**No commits were made.** Working tree left as-is.
