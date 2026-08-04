# Browser QA — outstanding verification before release

**Opened:** 1 Aug 2026 · **Status:** UNBLOCKED 3 Aug 2026 — the harness and the
account both exist now (§0), and a first browser pass has been done. **What was
actually verified, and to what standard, is §0b — start there.** The FREE
journey below (§1) is still largely unworked, because it needs real uploads
against real quota rather than seeded rows.

> **This is the depth, not the master.** The single document to follow before
> release is **`docs/RELEASE_CANDIDATE_CHECKLIST.md`** — it covers backend,
> frontend, responsive, accessibility, performance and regression as well. This
> file holds the blocker diagnosis (§0) and the detailed FREE-journey script
> that RC §3 refers to. Start there; come here for the step-by-step.

This is the running list of everything in the monetization work that has **only**
been verified statically — unit tests against a mocked `/org/context`, source
inspection, or curl. None of it has been seen rendering in a real browser
against the live backend.

Keep it here rather than in a chat log: the list outlived the session it was
written in once already, and the specific risk of the Phase 2 work is that every
surface on it *looks* correct in a test and is wrong for a customer.

---

## 0. The blocker — removed 3 Aug 2026

**Resolution: stop using the extension.** The diagnosis below was right and its
conclusion was a dead end — site-level permission for `localhost` is not
something the repo can grant. Playwright drives a real Chromium directly, has no
such restriction, and is already a devDependency. Nothing about the extension
was ever fixed; it was routed around.

```bash
# 1. account + data (idempotent; --reset rebuilds, --show prints ids)
cd backend && python -m scripts.seed_qa_org

# 2. a build to look at. `next dev` is NOT a valid QA target — see below.
cd resume-hero-section && pnpm build && pnpm start

# 3. every screen, both themes, both widths, into .qa-shots/
node tests/visual/capture.mjs --out .qa-shots --tag rc \
  --role-id <from --show> --candidate-id <any candidate>
```

`capture.mjs` also writes `<tag>__report.json` per screen: horizontal overflow
with the offending elements, console errors, and failed requests. Those are the
checks a screenshot cannot make, and they are the ones worth wiring into CI.

Three things that cost time and will cost it again:

- **QA the production build, not `next dev`.** Under `next dev` the sign-in form
  never advanced past the email step: the page renders and hydration never
  attaches. `pnpm build && pnpm start` is fine, so this is a dev-server problem,
  not a product one — but it makes `next dev` useless for browser QA and the
  failure looks exactly like a broken login form.
- **Pass ids, never paths.** Git Bash rewrites a `--role /roles/<id>` argument
  into `C:/Program Files/Git/roles/<id>` before node sees it. The capture came
  back blank rather than erroring, which reads as a broken page.
- **Turbopack's PostCSS worker dies (`0xc0000142`) when the machine is loaded**
  — usually orphaned `next dev` servers from earlier sessions. It surfaces as a
  bogus `CssSyntaxError` in `globals.css` at a line that is perfectly valid.
  Kill the strays, delete `.next`, retry before believing the error.

The original diagnosis, kept because it is still the evidence that the extension
path is closed:

The Claude in Chrome extension cannot act on any `localhost` page. Every tool
call against one returns `Frame with ID 0 is showing error page`.

Ruled out on 1 Aug 2026, in this order:

| Check | Result |
|---|---|
| `localhost:3000/home` | error page |
| `127.0.0.1:3000/home` | error page |
| `localhost:3000/auth/login`, fresh tab | error page |
| `https://example.com`, same tab | renders, screenshot fine |
| `localhost:3000/auth/login`, that same working tab | error page |
| `localhost:8000/health` (backend, other port) | error page |
| Both URLs over `curl`, concurrently | `200`, ~95 ms |

So the extension works, both servers work, and only the extension→localhost path
fails. Almost certainly **site-level permission for `localhost` not granted in
the extension**. Grant it, then work this list top to bottom.

Also needed before step 1:

- ~~**A throwaway v1 account.**~~ Provided by `scripts.seed_qa_org`:
  `qa.browser@hirelens.test`, org "Northwind Talent", ruleset `v1`, confirmed at
  creation so no mail is needed. All 68 real orgs are `founding` and show no
  locks or meters, so they still prove nothing — use this one.
- ~~**Test résumés.**~~ Four roles and sixteen candidates are seeded across every
  `campaign_status` and every `pipeline_stage`, scored across the full
  match-category range, plus one role with an empty pipeline. Seeding writes the
  rows directly, so it spends **no Groq tokens** and — importantly — **consumes
  no quota**: the résumé wall stays testable on a populated org. Steps 5–8 still
  need real uploads and real tokens, because the counter write is the thing
  under test.

---

## 0b. Verification status — read this before trusting anything below

Three tiers, kept apart on purpose. They are not equivalent, and collapsing them
is how "we tested that" comes to mean nothing. Last updated 3 Aug 2026.

### Runtime verified — driven in real Chrome, outcome observed

Sign-in (resting, both Tab stops, CTA hover, email→password step, wrong-password
error, submit in flight) · shell nav hover, keyboard focus, rail collapse and its
collapsed tooltip · ⌘K command palette · Roles card hover · **Pipeline table and
Pipeline board: focusable opener, visible focus ring, Enter, Space, focus trap,
focus restoration, mouse — all seven, both surfaces** · candidate drawer entry,
nested scroll, Escape · Analytics resting/hover/scrolled (histogram bars have
height) · Ask empty → composer focus → in flight → answered · Talent search in
flight and its empty-results screen · Settings profile, field focus, emptied
field · live theme toggle · overscroll containment (`main` and `.overflow-y-auto`
both compute to `contain`) · Pricing card baseline alignment, measured in both
themes · a ~170-shot static sweep of every route × light/dark × 1440/1280 with
zero horizontal overflow.

Reproduce with `tests/visual/keyboard-candidates.mjs`, `walkthrough.mjs` and
`capture.mjs`.

### Verified by construction — code applied and typechecked, never executed

- **Talent Search and Collections keyboard + focus-restoration path.** Both
  carry the same `DRAWER_FOCUS_KEY` treatment as the two verified surfaces and
  typecheck, but neither was exercised. See the next section for why.
- **`prefers-reduced-motion` behaviour.** The rules were read, not run with the
  preference actually set. Playwright can do this
  (`newContext({ reducedMotion: 'reduce' })`) — it simply was not done.

### Not verified at all

Motion *quality* — easing, duration, perceived smoothness. Automation can assert
that a transition is 240ms on a decelerate curve; it cannot tell you whether the
drawer feels right. That is a human sitting in front of the product, and it has
not happened. Also unverified: the ~90 captured interaction states nobody opened;
marketing home, Ledger, Notifications, Learning, Foundations; the New role,
upgrade and Add-to-collection dialogs; the real upload path and the résumé wall
end to end; below the fold of the full candidate dossier; and any interaction at
laptop width (the walkthrough runs at 1440 only — the static sweep covers 1280).

---

### Why Talent Search cannot be exercised on the current seed

`scripts/seed_qa_org.py` writes straight into `candidates` and
`candidate_analyses`. It never touches **`candidate_embeddings`** — and semantic
search matches on embeddings, so every Talent query returns zero results no
matter how the data looks on other screens. The Talent screen itself is fine and
was reviewed; what cannot be reached is anything *behind* a non-empty result
list, which includes the result row's keyboard path and focus restoration.

Generating real embeddings means real Groq spend against a 100k/day free tier,
which is why the seed does not do it.

**Recommended fix — a deterministic embedding fixture.** Add an option to
`seed_qa_org.py` that writes a unit vector per candidate derived from a hash of
the candidate id (same id → same vector, every run, no model call). That is
enough to make results render and therefore to exercise the whole downstream UI
path: row focus, Enter/Space, drawer, focus restoration, virtualization.

Be explicit about what it does NOT buy you: hashed vectors are not semantically
meaningful, so ranking and relevance are nonsense. Use the fixture to verify the
*interface*, never to judge match quality — and make sure whatever ships says so
at the call site, or someone will eventually read a QA screenshot as evidence
that search works well.

## 1. The FREE journey (Phase 2 core — none of it verified)

| # | What | Why it needs a browser |
|---|---|---|
| 1 | Sign up → new org resolves `v1` | Only proven via API on a throwaway account, never through the UI |
| 2 | Dashboard (Inbox) loads | The quota meter was added to this screen; layout unverified |
| 3 | Plan badge in the account menu | Renders from `plan_state`; never seen |
| 4 | Résumé meter silent at 0 of 2 | Silence is the hard thing to test — a meter wrongly *absent* looks identical to correct |
| 5 | Upload résumé 1 | Real AI pipeline, real counter write |
| 6 | Meter appears at 1 of 2 (last-unit rule) | The rule added in 2.4; never seen fire |
| 7 | Upload résumé 2 | Counter reaches the limit |
| 8 | Third upload blocked **before** processing | **The résumé wall. Never verified end to end, in any phase.** Handoff §8 flagged this in Phase 1 and it is still true |
| 9 | Wall answers what / why / what-changes | Asserted in unit tests only |
| 10 | CTA opens the upgrade dialog | Provider mounted in `providers.tsx`; never exercised in a real tree |
| 11 | Batch overflow: 5 files, 2 remaining → 2 analyzed | Truncation logic and its warning copy |
| 12 | Quota figures update after upload | Depends on context invalidation actually refetching |

## 2. Locked surfaces (each renders `FeatureLock`)

Checked in a browser on 3 Aug 2026, signed in as the FREE/`v1` seed org:

- Ask → `ai_copilot` — **locked correctly.** "AI Copilot is available on the Pro
  plan", CTA, and the lock mark on the rail item.
- Analytics → `advanced_analytics` — **locked correctly**, same treatment.
- **Talent Search → `semantic_search` — NOT LOCKED.** The full search surface
  renders and is usable on FREE.
- **Interview Intelligence → `interview_intelligence` — NOT LOCKED.** The full
  Interviews screen renders, with the candidate table and role picker.
- Compare → `candidate_comparison` — still unseen.

Both unlocked features are `minPlan: 'pro'` in
`components/hirelens/lib/entitlements/catalog.ts`, and the pricing page sells
both as Pro-and-above in the comparison table. So a FREE org gets two paid
features, and neither screen shows a lock mark on its rail item either. This is
a monetization hole, not a visual one — it needs an owner's decision on whether
the gate goes on the screen, the route, or both, which is why it was reported
rather than patched during a visual pass.

## 3. Navigation

- Permission-hidden items stay hidden (viewer role)
- Entitlement-locked items stay **visible** with the lock mark
- Locked rail item still navigates to its lock surface
- Collapsed rail: tooltip carries "not included in your plan"

## 4. Consistency and regressions

- No screen falls back to a generic 402 toast
- One visual language across every lock — guard tests enforce the *code* rule,
  not that the result looks right
- No layout regression from the Inbox meter, the Settings meters replacing the
  limits table, or the plan badge in the account menu
- Founding org (flip one with `scripts/set_org_plan.py`, flip it back): **no
  locks, no meters, no badge change** anywhere

## 5. Known-unverified from earlier phases (carried forward)

- The résumé wall end to end — open since Phase 1
- `/ats-analysis` and `/match-analysis` metering at runtime — unit/source only
- Multi-user concurrent quota behaviour through the full request path
- Migration rollback (forward-only was tested)

---

## Verified WITHOUT a browser (do not re-do)

For completeness, so this list is not read as "nothing works":

- Backend 140 tests, frontend 253 tests, `tsc` clean
- Catalog parity proven bidirectionally by deliberate mutation
- Schema reads against the live DB: 68/68 `founding`, both RPCs callable
- 24-thread concurrency on `increment_usage` → no lost updates
- Self-upgrade hole closed: `PATCH /org/subscription` → 405
- Audit gates 9/9 live across FREE / PRO / ENTERPRISE on a throwaway account

The gap is **the rendered product**, not the server.
