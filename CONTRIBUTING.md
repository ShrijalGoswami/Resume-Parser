# Contributing to HireLens

**The V4 architecture is frozen.** The Release Candidate is the baseline for all
future development. This document is what that means in practice.

If you are looking for how the system works, start with
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 1. What the freeze means

Every change must fall into one of five categories:

| # | Category | Example |
|---|---|---|
| 1 | **Bug fix** | A button that does nothing; a query that returns the wrong rows |
| 2 | **Backend integration** | Wiring a real endpoint behind a UI seam that already exists |
| 3 | **Production deployment** | Container config, CI, monitoring, runbooks |
| 4 | **User-requested enhancement** | Explicitly asked for, explicitly scoped |
| 5 | **Performance improvement backed by a measurement** | With a before and an after |

If a change is not one of these, it does not land. In particular:

- **Never redesign a working system.**
- **Never rewrite code because it could be cleaner.** "Cleaner" is not a
  measurement.
- **Every change must have a measurable reason** — a failing test, a user report,
  a number that moved, or an explicit request.

### Six things that must survive every change

| Preserve | What that rules out |
|---|---|
| **Architecture** | New layers, new state managers, restructured route groups |
| **API contracts** | Renamed fields, changed status codes, altered response shapes |
| **Database schema** | Any migration without explicit approval |
| **Design system** | New tokens where an existing one fits; ad-hoc colours; component forks |
| **Accessibility** | Contrast below AA; removing focus indicators; hit areas under 24×24 |
| **Performance** | New sequential round-trips; new blocking work on a hot path |

Several of these are enforced by tests rather than by review — see §4.

### Why the rules are shaped like this

They are not process for its own sake. Each one is a lesson from this codebase:

- **Contrast is a token, not a screen.** One `--hl-text-tertiary` value carries
  every caption, timestamp and metadata line in the product. A palette tweak is
  the cheapest possible way to make text unreadable everywhere at once, which is
  why `tests/contrast.test.ts` asserts the floors against `globals.css` itself.
- **Concurrency is not caching.** The four org-context queries run concurrently and
  are deliberately *not* cached, because a revoked role must take effect on the
  very next request. If you "optimise" that with a cache you have introduced a
  security bug that looks like a speedup.
- **Silent success is the dangerous failure.** The restore path once reported
  success while restoring zero files. The Render blueprint once produced a healthy
  service with no database. Prefer loud failure to convenient success.
- **Layered defences exist because earlier ones were bypassed.** The prompt
  injection defences are three layers deep because each of the first two was
  measurably defeated. Do not simplify them without reproducing the attacks.

---

## 2. Before you change anything

Read the code around it, then read what already documents it:

| Working on | Read first |
|---|---|
| Anything | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Auth, RLS, tenant isolation | [docs/SECURITY.md](./docs/SECURITY.md) |
| Schema, RLS policies, storage | [docs/DATABASE.md](./docs/DATABASE.md) |
| Prompts, providers, orchestration | [docs/AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md) |
| Deployment, env vars, CI | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| Logs, alerts, health | [docs/MONITORING.md](./docs/MONITORING.md) |
| Backups, restores, incidents | [docs/OPERATIONS.md](./docs/OPERATIONS.md) · [docs/DISASTER_RECOVERY.md](./docs/DISASTER_RECOVERY.md) |
| What is knowingly incomplete | [RELEASE_CANDIDATE.md](./RELEASE_CANDIDATE.md) §7 |

`RELEASE_CANDIDATE.md` §7 matters more than it sounds. If you have found a
"problem", check there first — it may be a documented, accepted trade-off, and
re-fixing it silently is how accepted debt turns into churn.

---

## 3. Local setup

```bash
# Backend
cd backend
python -m venv .venv && .venv/Scripts/activate     # or bin/activate
pip install -r requirements.lock.txt               # the LOCK, not requirements.txt
cp .env.example .env.local                         # fill in
uvicorn app.main:app --reload

# Frontend
cd resume-hero-section
pnpm install --frozen-lockfile
cp .env.example .env.local                         # fill in
pnpm dev
```

Both run with **zero** Supabase configuration (stateless mode): the public AI pages
work, and auth/persistence routes stay disabled. Fill in the Supabase vars to get
the authenticated product.

`pnpm` is canonical. Do not add a `package-lock.json`.

Install from `requirements.lock.txt`, not `requirements.txt` — the latter has open
lower bounds, so it installs a different application on different days. See
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) §2.

---

## 4. The gate

Everything below must pass. CI runs all of it
(`.github/workflows/ci.yml`); run it locally first.

```bash
# Frontend — from resume-hero-section/
pnpm typecheck        # 0 errors. Strict mode; no `any` escape hatches
pnpm lint             # 0 problems
pnpm test             # 101 tests across 14 files
pnpm build            # must compile clean

# Backend — from backend/
python -m tests.test_ai_gateway
python -m tests.test_ai_reliability
python -m tests.test_provider_contract
python -m tests.test_experience_years
python -m tests.test_prompt_injection
python -m tests.test_security_headers_and_limits
python -m tests.test_feature_flag_enforcement
python -m tests.test_copilot_dashboard_context
python -m tests.test_production_logging
python -m tests.test_deployment_config
```

Backend tests are standalone scripts, not pytest. Each exits non-zero on failure.

### Tests that will stop you on purpose

These are not incidental coverage; they are the freeze, expressed as code.

| Test | Refuses |
|---|---|
| `tests/contrast.test.ts` | Any token change that drops text below WCAG AA — in either theme. It also pins disabled text *below* AA, so nobody "fixes" it into looking enabled |
| `backend/tests/test_prompt_injection.py` | Weakening any of the three injection defences |
| `backend/tests/test_deployment_config.py` | An env var that nothing reads, a secret in the blueprint, a deploy path that drifts off the lockfile, a `--proxy-headers` flag dropped from one of the three start commands |
| `backend/tests/test_production_logging.py` | Duplicate access logging, an unvalidated inbound request ID, a reworded log string that an alert depends on |
| `backend/tests/test_feature_flag_enforcement.py` | A flag enforced only in the UI |
| `lib/auth-routing` tests | Quietly unprotecting a route |

If one of these fails, the test is almost certainly right. Read the docstring —
each one records the defect it was written after.

### Destructive suites — staging only

`test_tenant_isolation`, `test_decision_ledger`, `test_resume_storage`,
`test_e2e_workflow` and `scripts/dr_drill` create and delete real rows, users and
storage objects. They require `HL_ALLOW_DESTRUCTIVE_TESTS=1` and a **dedicated
staging Supabase project**. They run through `release-gate.yml`, never in CI, and
**never against production**.

`test_tenant_isolation` (25 checks) is the authoritative answer to "can one
customer see another's data". Run it after any change to auth, RLS, org context or
repositories — and always after a restore.

---

## 5. Schema changes

Migrations are **forward-only**. There are no down scripts, and a bad migration is
recovered by restoring, not by un-migrating.

Therefore:

1. **Get explicit approval** before writing one. This is the one category the
   freeze does not let you self-authorise.
2. Add a new numbered file in `supabase/migrations/`. Never edit an applied one.
3. Additive changes only where possible. A dropped column is unrecoverable without
   a restore.
4. Update [docs/DATABASE.md](./docs/DATABASE.md).
5. Rehearse on staging, then run the isolation suite — a new table without RLS is a
   cross-tenant leak, and the suite is what catches it.
6. Never pair a migration with an app change in a single un-rehearsed deploy step.

---

## 6. Design system changes

Use existing `--hl-*` tokens. If none fits, **add a token** rather than a one-off
value — a hard-coded colour is invisible to the contrast test and to dark mode.

Adding or adjusting a token is legitimate when it makes the implementation match
the design; keeping a mismatch as an "intentional deviation" is not.

Component work: extend the shared primitive, do not fork it. `DataTable`,
`AIAnswer`, `ScoreMeter` and the shell components are shared on purpose. Shared
primitives get lifted when duplication actually appears, not preemptively.

Both `.hl` (product) and `.mkt` (marketing) scopes are isolated deliberately.
Nothing crosses between them.

---

## 7. Accessibility

Non-negotiable, and cheaper to keep than to retrofit:

- **Contrast:** AA (4.5:1) for text, 3:1 for non-text. Pinned by test.
- **Keyboard:** every interactive element reachable and operable. Focus must be
  visible — never remove an outline without replacing it.
- **Hit areas:** 24×24 px minimum, except genuinely inline links.
- **Reduced motion:** honour `prefers-reduced-motion` in all three scopes (`.hl`,
  `.mkt`, and the unscoped Classic surfaces).
- **Semantics:** real headings, `scope="col"` on table headers, `aria-sort` on
  sortable ones, no focusable content inside `aria-hidden`.

Not yet done, and honestly labelled: **no screen-reader pass.** If you have NVDA or
VoiceOver, that is the highest-value accessibility contribution available.

---

## 8. Commits and pull requests

Conventional-commit prefixes, matching the existing history:

```
fix(scope):   a bug fix
feat(scope):  a requested enhancement
perf(scope):  a measured improvement — include the numbers
docs(scope):  documentation
chore(scope): tooling, deps, CI
test(scope):  tests
```

A pull request should state:

1. **Which of the five categories** this is.
2. **The measurable reason** — the failing test, the report, the number.
3. **What you verified**, and how. Not "should work".
4. **What you did not verify**, and why. This is worth more than a confident
   summary; an unstated gap is the one that bites.
5. For `perf`: before and after, with the measurement method.

Report outcomes faithfully. If a test fails, say so and include the output. If you
skipped a step, say which. This codebase's docs mark procedures `VERIFIED` or
`UNVERIFIED` for the same reason — an unrehearsed procedure that reads as tested is
worse than one honestly labelled untested.

---

## 9. Adding a monitoring signal

If you add a log line an alert should fire on, add it to `ALERT_SIGNALS` in
`backend/tests/test_production_logging.py` and to
[docs/MONITORING.md](./docs/MONITORING.md) §3.

An alert wired to a message that has since been reworded is worse than no alert: it
is silent, and it reads as coverage.

---

## 10. Release checklist

1. CI green on `main`.
2. `release-gate.yml` green against staging — including the DR drill.
3. Backup taken **and verified**.
4. `CHANGELOG.md` updated.
5. Deploy per [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) §3 — migrations first.
6. Production smoke test (§7 of the same doc) before announcing.
7. Tag the release.
