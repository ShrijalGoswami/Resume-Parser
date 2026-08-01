# Browser QA — outstanding verification before release

**Opened:** 1 Aug 2026 · **Status:** BLOCKED, nothing on this list has been verified in a browser

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

## 0. The blocker

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

- **A throwaway v1 account.** Every new signup is `v1`; all 68 existing orgs are
  `founding` and will show **no locks and no meters at all**. Testing against a
  real account proves nothing. Signup may require email confirmation.
- **Test résumés.** Steps 6–13 spend real Groq tokens against a 100k/day free
  tier.

---

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

## 2. Locked surfaces (each renders `FeatureLock`; none seen)

- Ask → `ai_copilot`
- Analytics → `advanced_analytics`
- Compare → `candidate_comparison` (locked button, tooltip, click → dialog)
- Talent Search → `semantic_search` *(Phase 2.5)*
- Interview Intelligence → `interview_intelligence` *(Phase 2.5)*

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
