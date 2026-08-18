# Hirevo — Release Candidate

**Date:** 2026-07-26 · **Recommendation:** **READY FOR PILOT**

Gates at time of writing:

| Gate | Result |
|---|---|
| TypeScript (strict) | 0 errors |
| ESLint | 0 problems |
| Frontend tests | **101 passing** (14 files) |
| Backend suites | **8/8 passing** |
| Runtime tenant isolation | **25 pass / 0 fail** |
| Production build | clean · 28 routes |
| Client bundle | **2.37 MB** JS · 136 KB CSS |
| Responsive sweep | **44 page × width combinations, 0 defects** |
| DR drill | **PASSED** — 9/9, byte-identical recovery |

---

## 1. What changed in this RC

**Responsive (priority 1).** Verified at 390 / 768 / 1024 / 1440 / 1920 px using a
same-origin sized-iframe harness — a real viewport where media queries evaluate
correctly, confirmed by `innerWidth: 387`, `(max-width: 640px)` matching. The
previous audit could not test this and said so; this one could.

Four defects found and fixed, all hit-area or truncation, none a redesign:

- Breadcrumb crushed to ~12 px of unreadable text at 390 px (the ⌘K launcher takes
  45vw of a 334 px header). Now hidden below `sm`; the in-content `<h1>` and the
  rail already carry the same wayfinding, and a spacer keeps the launcher pinned right.
- Breadcrumb link 18 px tall → 26 px (WCAG 2.5.8 wants 24).
- Marketing footer links 16 px → 28 px; two CTAs 20 px → 28 px.
- Marketing nav links 16 px → 24 px (reachable on tablets).

The rail correctly auto-collapses to 56 px at ≤ 640 px. Zero horizontal overflow at
any width.

**Backup & recovery (priority 2).** Built and *rehearsed* row-level recovery:
`backend/scripts/backup_restore.py` (backup / verify / restore) and
`backend/scripts/dr_drill.py`. Verified run: 28 tables, 412 rows, 1 storage object,
all checksums matching; `verify` proven to detect a single corrupted byte.

The drill caught two real defects that would otherwise have surfaced mid-incident:

1. **Restore silently restored no files.** Uploads without a content type default
   to `text/plain`, which the bucket's MIME allowlist rejects with 415 — while the
   run still reported success. Content type is now captured per object and replayed.
2. **`download()` is not proof of deletion.** Supabase's cache can serve a
   just-deleted object briefly. The bucket listing is authoritative; this is
   documented because it matters for erasure requests.

`docs/DISASTER_RECOVERY.md` marks every procedure **VERIFIED** or **UNVERIFIED**.

**Performance (priority 3).** Org-context resolution issued four independent
queries sequentially; they now fan out concurrently — confirmed by log timestamps
landing in the same millisecond. Deliberately concurrency, not caching: a revoked
role or disabled capability still takes effect on the next request. Bundle is down
to 2.37 MB (from 2.80 MB across this hardening effort).

**Accessibility (priority 4).** Measured contrast on the actual tokens and found
real AA failures, now fixed and pinned by `tests/contrast.test.ts` (16 assertions,
both themes):

| token | before | after |
|---|---|---|
| `--hl-text-tertiary` (light) | 3.43 / 3.22 / 3.00 | **5.24 / 4.92 / 4.57** |
| `--hl-text-tertiary` (dark) | 4.05 / 3.85 / 3.58 | **5.13 / 4.88 / 4.53** |
| white on `--hl-accent-solid` (dark) | 3.50 | **4.56** |
| `--hl-warning` on its tint | 4.30 | **4.52** |
| `--hl-info` on its tint | 4.38 | **4.52** |

Tertiary carries captions, timestamps and metadata — it was the most-read failing
text in the product. Hue and role unchanged; only lightness moved. Disabled text is
pinned *below* AA on purpose (WCAG 1.4.3 exempts inactive controls, and lifting it
would make disabled read as enabled).

Reduced motion was handled for `.hl` and `.mkt` but not the Classic surfaces, which
still animate spinners and bounces — a baseline unscoped rule now covers them.

ARIA validation was clean on every page swept: no invalid roles, no orphaned
`aria-labelledby`/`aria-describedby`, no focusable content inside `aria-hidden`,
correct landmark structure, exactly one `<h1>` per page.

**Deployment (priority 5).** Env vars, infra, steps, rollback, monitoring, health
checks, backup verification, incident response and the production smoke test. Since
this report was written that material has been split into its final homes —
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) (getting there),
[docs/OPERATIONS.md](./docs/OPERATIONS.md) (running it) and
[docs/MONITORING.md](./docs/MONITORING.md) (what to watch) — and extended with the
container and CI/CD paths.

## 2. Remaining known issues

| # | Issue | Severity | Why it is not fixed |
|---|---|---|---|
| 1 | **No PITR on Supabase free tier** | **High** | Requires a plan upgrade — a purchasing decision, not a code change. Row-level backup mitigates but does not replace it. |
| 2 | Full-cluster restore never rehearsed | **High** | Needs Docker or a staging project; neither available here. DR §4.2 documents it as UNVERIFIED. |
| 3 | Backgrounded tab can show a fabricated empty state | Medium | React Query pauses retries while hidden; `isLoading` is `isPending && isFetching`, so surfaces fall through to "no data". Clean fix is `isPending` across 28 files and risks permanent skeletons on intentionally-disabled queries. Documented in `tests/query-failure-surfaces.test.tsx`. |
| 4 | In-process rate limiter does not span replicas | Medium | Documented in code; edge WAF is the real control. |
| 5 | Org context still costs 2 sequential round-trips | Low | The `recruiters` lookup must precede the rest. Collapsing further means caching authorization state. |
| 6 | International phone extraction | Low | UK `+44 20 7946 0332` missed; 2 of 5 fixtures. Cosmetic — email and name extract correctly. |
| 7 | Unknown settings slug renders Profile | Low | Silent fallback rather than 404. Defensible; no user-visible wrong claim. |
| 8 | 7 endpoints have no frontend caller | Low | Public API surface, kept deliberately. |
| 9 | Supabase latency from a distant host | Info | ~2 s per query observed here vs tens of ms co-located. An environment property, not a defect — but it is why absolute latency wins look small. |

## 3. Accepted technical debt

- **Two design systems.** `.hl` (V4) and the frozen legacy base tokens coexist;
  five Classic routes still ship. A base-token bridge inside `.hl` lets shared
  chart primitives render correctly in both. Retiring Classic is a product call.
- **Forward-only migrations.** None of the 15 has a down script. Schema rollback
  means restore. Acceptable with a rehearsed restore; item 2 above is the gap.
- **Interview packs are not persisted.** Generated on demand, no scheduling or
  saved scorecards. The UI says so plainly rather than faking it.
- **Role-scoped reports deferred.** The generator is org-wide; the Report lens says
  so instead of pretending.
- **Learning surface is a placeholder.** No backend.
- **`audit_logs` grows unbounded.** Append-only by design; needs an archival policy
  before it becomes a cost item.

## 4. Security status

**Sound.** Every finding from the security audit is fixed and regression-tested.

- **Prompt injection (was Critical).** A résumé for a one-year frontend developer
  carrying instructions scored **63/100** against a senior distributed-systems role
  — above a genuine mid-level backend engineer — with `matching_skills` fabricated
  to five technologies it did not have. Now **27/100**, `matching_skills` empty,
  real gaps surfaced. Four layers: nonce-fenced untrusted blocks, guardrails on all
  four candidate-facing prompts, scrubbing at the single parser chokepoint, and
  grounding claims against the scrubbed document. **Zero false positives** across
  honest résumés; ranking preserved. 14 assertions.
- **Storage orphaning (was High).** "Delete permanently" left every résumé binary
  unreachable in the bucket. Fixed for campaign and bulk-candidate deletion.
- **Rate-limit proxy keying (was High).** All traffic shared one bucket behind
  Render's TLS terminator — one abusive client could lock out everyone.
- **Auth (verified).** 25 runtime checks: expired, bad-signature and wrong-audience
  tokens all 401; cross-tenant reads return 0 rows; cross-tenant signed URL 404.
  Re-run after the JWKS rewrite and after the org-context change.
- **Feature flags.** All six now enforce; four previously did not, letting a
  lower-plan org keep capabilities its plan excluded.
- **Also verified:** no secrets in git or history · RLS complete · upload validation
  (allowlist + magic bytes + streaming cap + UUID names) · XSS (all interpolations
  escaped) · SQL injection (parameterized) · SSRF (fixed provider registry) · CSRF
  (N/A, Bearer) · HSTS · wildcard CORS fails closed at startup.

## 5. Performance status

| Metric | Before hardening | Now |
|---|---|---|
| `/api/v1/me` (median) | 2858 ms | **1244 ms** |
| `/api/v1/activity` | 2900 ms | **1319 ms** |
| `/api/v1/org/context` | 2558 ms | **2253 ms** |
| Client JS bundle | 2.80 MB | **2.37 MB** |
| npm packages | baseline | **−99** |
| Résumé parse | — | 3–18 ms |
| Field extraction | — | 2–5 ms |
| DB query counts | — | bounded, no N+1 |

The auth win came from implementing JWKS verification: the local verifier was
HS256-only while the project issues ES256, so *every* authenticated request paid a
round-trip to Supabase Auth. AI latency (compare 13.6 s, interview 10.4 s, report
8.2 s) is inherent to the model calls.

## 6. Accessibility status

**WCAG 2.1 AA on the swept surfaces**, with the caveats below.

Verified: contrast (16 assertions, both themes) · keyboard reachability and named
controls on every page · focus-visible ring at 3:1 against canvas in both themes ·
skip link reveals to 111 × 36 px on focus · landmarks and single `<h1>` per page ·
ARIA validity · reduced motion across all three scopes · tap targets ≥ 24 px on
touch widths.

Not verified: **screen-reader announcement with an actual screen reader.** Semantics
were validated structurally (roles, names, live regions, `aria-current`), which is
necessary but not sufficient — NVDA or VoiceOver would be needed to confirm reading
order and live-region behaviour in practice. Focus *trapping* inside dialogs was
also not exercised, because the automation iframe cannot take real focus.

## 7. Production checklist

- [x] Migrations applied and forward-only understood
- [x] `ENVIRONMENT=production`, `ALLOWED_ORIGINS` explicit (wildcard aborts startup)
- [x] `TRUST_PROXY_HEADERS=true` + `--proxy-headers` in the start command
- [x] `/health` reports all three dependencies `configured`
- [x] HSTS on TLS, absent on plaintext
- [x] Isolation suite green
- [x] Feature-flag enforcement green
- [x] Injection defences green
- [x] Backup taken **and verified**
- [x] DR drill passed
- [x] 16-step smoke test documented
- [x] Monitoring signals defined, including injection-attempt alerts
- [ ] **PITR enabled** (needs a paid plan)
- [ ] **Full-cluster restore rehearsed** against staging
- [ ] Edge WAF in front of the unauthenticated AI endpoints
- [ ] Screen-reader pass with NVDA/VoiceOver
- [ ] `audit_logs` archival policy

## 8. Deployment recommendation

# READY FOR PILOT

**Evidence for.** Tenant isolation is proven behaviourally at both the API and RLS
layers, re-verified after every change that touched auth. The injection hole that
let an unqualified candidate outrank a real one is closed, measured, and
regression-tested. Accidental deletion — the incident that actually happens — is
recoverable, and that claim comes from a drill that runs in two minutes and caught
two real bugs. Responsive layout is verified at five widths rather than assumed.
Contrast meets AA and is pinned by tests. Every failure path has a predictable
recovery: retries with backoff, error boundaries at four levels, per-candidate
degradation, honest `degraded` flags.

**Why not READY FOR PRODUCTION.** Two items, both about durability rather than
correctness:

1. **No PITR, and full-cluster restore has never been rehearsed.** Row-level
   recovery is verified, but if the cluster is damaged the runbook is untested and
   the free tier has no automated backup. For a signed enterprise contract holding
   candidate PII, "we have not tested a full restore" is not an answer that
   survives procurement.
2. **No screen-reader pass.** Semantics validate structurally, but AA conformance
   claims for a product that will face accessibility review should be confirmed
   with a real assistive-technology run, not inferred from the DOM.

Both are hours of work, not weeks, and neither blocks design partners on a pilot
where the data set is small and recoverable. Close them and this becomes READY FOR
PRODUCTION.

**What I would not wait for.** Items 3–9 in §2 are real but none of them can lose
data, leak across tenants, or mislead a hiring decision.
