# Homepage Release Record

**Program:** HireLens Homepage
**Version:** 1.0.0
**Status:** RELEASED — FROZEN
**Date:** 25 July 2026
**Branch:** `feat/hirelens-v3-p0`

---

## 0. Freeze notice

The Homepage Program is closed. This document is the release record, and it is
the last document produced under that program.

The homepage is now a **released product**. It is not a work in progress, it is
not a draft awaiting polish, and it is not open to improvement on the judgment
of whoever next opens the files.

**No change may be made to it — visual, spacing, typographic, motion, copy,
component structure, or token — except through:**

1. A governance conflict review against `MARKETING_DESIGN_BIBLE.md`,
   `DESIGN_REVIEW_CHECKLIST.md`, Book I and Book II; then
2. A `DESIGN_DECISION_LOG.md` entry recording the decision and its rationale;
   then
3. Implementation.

In that order. A change that skips step 1 is a governance violation regardless
of how small it is, and the small ones are the point: this page was built by
refusing dozens of individually reasonable improvements, and it would be
dismantled the same way.

The outstanding items in §9 are **not** an exception to this. They are recorded
because a release record that hides its known defects is worthless, not because
they are pre-authorised work.

---

## 1. Scope delivered

### Built

| Storyboard scene | Component | Frozen as |
|---|---|---|
| 05 — The trail | `scene-05-trail.tsx` | DDL-MKT-003 |
| 06 — What we don't know | `scene-06-limits.tsx` | DDL-MKT-004 |
| 07 — The record | `scene-07-record.tsx` | DDL-MKT-006 |
| 08 — The room | `scene-08-room.tsx` | DDL-MKT-007 |
| 09 — The close | `scene-09-close.tsx` | DDL-MKT-007 |

Plus the token layer, the foundation layer, the C-01 primary action, the Scene
05 fixture set (`FIXTURES_SCENE_05.md` v1.0.0, DDL-MKT-008), and the two
product surfaces in §3.

### Not built — deferred by explicit decision

Scenes 01–04 (in design), navigation, footer, dark theme.

Each was DEFERRED, not left undone. Scenes 01–04 were deliberately **not**
built ahead of 05–09 on the reasoning that pacing cannot be evaluated against a
two-thirds-unbuilt page; the observations that prompted the question were
recorded as six hypotheses under DDL-MKT-005 rather than actioned as defects.

### Build order

Phase 1 foundation, then scenes 09 → 08 → 06 → 07 → 05. Risk-sequenced rather
than page-ordered: Scene 09 is the smallest surface and validated the token
layer, focus handling and the page's one motion moment; Scene 05 went last
because it is the only interactive scene, the only three-column layout, and
carries Gate 2 in full.

---

## 2. Final architecture

### Token architecture — three tiers

1. **Primitive** — `--hp-neutral-0..11`, `--hp-action-1..4`. Raw values, declared
   once in `app/globals.css` under `.hp`.
2. **Semantic** — mapped through `@theme inline`. `--color-hp-text-body`,
   `--color-hp-border-standard`, and so on.
3. **Component** — Tailwind utilities generated from tier 2.

**Components consume tier 3 only.** Primitive references in components: **0**.

Spacing tokens are named for their *register* rather than their size —
`space-hp-intra-*` within a thing, `-inter-*` between things, `-section-*`
between parts. This is the highest-leverage decision in the system: it makes a
rhythm violation legible in a diff to a reviewer who has never seen the page.
Sizes would not have been.

Type tokens bundle size and line-height as one indivisible unit.

### Isolation

`.hp` is a scope and nothing crosses it. The legacy Iris violet is quarantined
at **0** references. `mkt-*` and `hl-*` class families appear **0** times. All
three are asserted in tests, so a leak fails the build.

### Rendering

Server-rendered by default. Four client components in the entire program:

| File | Why it is a client component |
|---|---|
| `scene-05-trail.tsx` | The only interactive scene — conclusion selection. |
| `primary-action.tsx` | Carries the page's single motion moment. |
| `motion-provider.tsx` | `LazyMotion` + `MotionConfig`. |
| `report-form.tsx` | `useActionState` for the reporting form. |

---

## 3. Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/landing` | Static (prerendered) | The homepage. Scenes 01–04 stubbed, 05–09 built. |
| `/signup` | Static (prerendered) | Destination for the page's single primary action. Hands off to `/auth/signup`. |
| `/report` | Dynamic | Destination for "Report this as wrong". Reads investigation context from the query string. |

`/landing` becomes `/` at cutover — a routing change only. No link in the
codebase is hardcoded to `/landing`.

`/signup` owns no authentication logic, no form, no input and no credential
capture; all four absences are asserted in tests. It collects no email
deliberately, because `/auth/signup` does not read a prefill parameter and a
field here would take an address and discard it.

`/report` carries the disputed conclusion, its text as displayed, the source
document, the passage and the fixture version. Partial context is treated as
absent and the reader is told — half a citation looks investigable and is not.

---

## 4. Components

### Foundation

`fonts.ts` (Inter + JetBrains Mono; Fraunces deliberately absent) · `motion.ts`
· `motion-provider.tsx` · `container.tsx` (`reading | narrow | working | field`)
· `scene-band.tsx` (density registers + `SceneHeading`) · `scene-stub.tsx` ·
`homepage-shell.tsx` (skip link, `<main>`, deferred nav/footer slots).

### Interface

`primary-action.tsx` — Book II C-01, `primary`/`large`. **At most one per view**;
its power is entirely a function of its rarity. `href` is required with no
default, so the destination stays a visible decision. Its class list is exported
so the report form's submit control is the *same* button rather than a lookalike
rebuilt from tokens — two definitions of one component drift.

### Scenes

Five, listed in §1. Each is independently testable and takes its outbound
destinations as required props.

### Reporting

`record-report.ts` (the sink, isolated) · `actions.ts` (server action) ·
`report-form.tsx` (client form).

The sink writes a structured record and returns a reference. It is deliberately
the weakest destination that still qualifies as genuine, because who owns
incoming reports and what response the user is owed is a product decision. **The
copy is bounded by what the sink does** — it says the report was recorded and
under what reference, and nothing about investigation or response. A test
asserts those phrases stay absent.

No submission is simulated. Confirmation appears only after a reference returns;
a failed write is reported as a failure.

---

## 5. Tokens used

Measured across `components/homepage` and `app/(marketing-v2)`.

### Type

| Token | Uses | Role |
|---|---|---|
| `text-hp-ui-sm` | 34 | Labels, metadata, captions |
| `text-hp-text-body` / `-tertiary` / `-secondary` | 26 / 34 / 4 | Colour, listed here as they co-occur |
| `text-hp-ui-lg` | 19 | **Every data value on the page** |
| `text-hp-read-sm` | 11 | Prose |
| `text-hp-display-sm` | 2 | The two visible page headings |
| `text-hp-ui-xs` | 1 | Margin reference numeral |

`text-hp-ui-md`: **0**. Normalised away during stabilization so that identical
semantic roles use identical tokens; density was preserved by tightening
spacing rather than by shrinking type.

### Colour

`text-hp-text-tertiary` 34 · `text-hp-text-body` 26 ·
`border-hp-border-standard` 24 · `border-hp-border-subtle` 16 ·
`text-hp-text-secondary` 4 · `bg-hp-sunken` 3 · `bg-hp-canvas` 2 ·
`bg-hp-action` 2 · `text-hp-action-fg` 2 · `border-hp-text-body` 1 ·
`bg-hp-action-hover` 1 · `hp-border-strong` 1.

**No hue anywhere on the page.** The accent primitive `--hp-action-4` remains a
placeholder; the accent hue was never chosen and the page did not need it. That
is a finding, not an omission.

### Spacing

`intra-2`, `intra-3` · `inter-1` … `inter-5` · `section-1` … `section-5`.

Section rhythm: `section-1` for part→part throughout; `section-2` appears once,
in Scene 09, where the relationship is content→action rather than part→part.

---

## 6. Motion used

**One animated element in the entire program.**

`primary-action.tsx`:

```tsx
initial={false}
whileTap={{ backgroundColor: 'var(--color-hp-action-active)' }}
transition={{ duration: motionDuration.instant, ease: motionEase.settle }}
```

DDL-MKT-002 allocates three motion moments; **one is used**. Scene 05 — the only
interactive scene — has **zero** motion by design: a conclusion resolving to its
source should feel like turning to a page, not like a reveal.

`MotionConfig reducedMotion="user"` resolves the press to an instant change, and
nothing is lost, because the state change carries the meaning rather than the
transition. Hover is a background shift only — no scale, no shadow bloom, no
layout shift.

A fourth motion moment is a design decision, not an implementation one.

---

## 7. Accessibility status

**Gate 1: PASS.**

### Contrast — computed, not estimated

| Pair | Ratio | Floor | Result |
|---|---|---|---|
| Body text on canvas | 18.32:1 | 4.5 | PASS |
| Secondary text | 6.17:1 | 4.5 | PASS |
| Tertiary text | 5.08:1 | 4.5 | PASS |
| `border-strong` | 3.31:1 | 3.0 | PASS |
| `border-subtle` | 1.16:1 | ~1.3–1.6 (Book I Ch. 3) | Below range — see §9 |
| `border-standard` | 1.26:1 | ~2–3 (Book I Ch. 3) | Below range — see §9 |

`--hp-neutral-7` was corrected from `#767d86` (4.16:1 — **below the floor**) to
`#686f78` during stabilization. It had been reported at ≈4.6:1 in two
consecutive reviews on an estimate rather than a computation. Compute relative
luminance; do not eyeball a ratio.

### Structure

- Skip link to `<main id="homepage-main">`.
- Every scene band has an accessible name; the heading outline read alone
  describes the page correctly.
- **Responsive tables carry explicit `role="table"/"rowgroup"/"row"/"rowheader"/
  "cell"`** — `display: block` at narrow widths drops the implicit ARIA roles,
  and Scene 07's thirteen label/value pairs would have read as an
  undifferentiated run.
- Every label/value pair shares one `<tr>`. See §11.
- Scene 05's inspector is `aria-live="polite"`.
- Focus ring 2px/2px, never removed.
- Absence renders identically to presence — same size, weight, colour and row
  height. §8.15 and anti-pattern A-07.

### Not done

No manual screen-reader walkthrough and no keyboard-only pass by a human. The
structure is asserted by tests; it has not been *used* by a person with
assistive technology. That is the honest state.

---

## 8. Performance status

| Property | State |
|---|---|
| `/landing` | Prerendered static |
| `/signup` | Prerendered static |
| `/report` | Dynamic (reads `searchParams`) |
| Client JS | Four client components; the rest server-rendered |
| Motion library | `LazyMotion` with `domAnimation`, `strict` — the full Framer bundle never loads |
| Fonts | Two families, self-hosted via `next/font` |
| Images | None on the page |
| Third-party scripts | None |
| Network requests to external hosts | None |

**Bundle size is unmeasured.** The Turbopack build emits no size column, and no
alternative measurement was run. No Lighthouse or Core Web Vitals run has been
performed. Those numbers are simply not known, and no figure should be quoted
for them until someone measures.

---

## 9. Outstanding Minor items

Five. **None blocking.** None pre-authorised — each requires the §0 process.

| # | Item | Owner |
|---|---|---|
| m3 | `border-subtle` 1.16:1 and `border-standard` 1.26:1 sit below Book I Ch. 3's ranges. `border-strong` was fixed (3.31:1) because ≥3 is a firm floor; the other two were left because moving `border-standard` to ~2.2 changes every panel edge and table divider from near-invisible to clearly visible. **That is a change of visual character, not a fix.** | Design Owner |
| m5 | Tertiary→secondary step is 1.21:1. Narrow, not failing. Watch it if either token moves. | Design Owner |
| m6 | The report form needs JavaScript. Verified: without it nothing is recorded and the reader gets an error — no false confirmation. A `<noscript>` notice says so plainly. | Engineering |
| m7 | `OPEN_DOCUMENT_HREF` points at `/signup` while labelled "Open full document". Reads as gating a document behind an account, which is honest and conventional — but was never formally decided. | Product |
| m8 | `EVIDENCE_LABELS` in `scene-05-trail.tsx` is unused. Dead code, left only because the stabilization brief forbade unrequested edits. | Engineering |

---

## 10. Known future enhancements

Not commitments. Not a backlog. A record of what was consciously left, so the
next person does not mistake absence for oversight.

- **Scenes 01–04.** Scene 09 exports `SCENE_01_OPENING_SENTENCE`; Scene 01 must
  use it, because the page closes by returning to the sentence it opened with.
  That is the structure of the piece, not a nice touch. Scene 02 carries
  Direction C's reassigned Resolution Mark.
- **Navigation and footer.** Slots exist in `homepage-shell.tsx`. Both were
  DEFERRED with an explicit instruction not to adopt the existing `MarketingNav`
  and not to invent a temporary one. That instruction stands.
- **Dark theme.** The `.hp` neutral ramp is structured to invert, but no pass has
  been made and nothing verified.
- **Accent hue.** `--hp-action-4` is still a placeholder. The page shipped without
  one and did not need it.
- **A durable reporting sink.** Server logs are real but weak — not queryable,
  not durable beyond retention, nobody paged. Upgrading it is what would license
  stronger confirmation copy. Copy may not move first.
- **Cutover to `/`.** Move `landing/` to `page.tsx`, retire or redirect
  `/welcome`, confirm no collision with `app/(hirelens)/home`.

---

## 11. Release checklist

| # | Item | Result |
|---|---|---|
| 1 | TypeScript compiles clean | PASS — `tsc --noEmit`, no output |
| 2 | Full test suite | PASS — 197 tests, 15 files |
| 3 | Production build | PASS — compiled, 34 static pages generated |
| 4 | Routes respond at runtime | PASS — `/landing` `/signup` `/report` all 200 |
| 5 | Every link on the homepage resolves | PASS — 0 dead links (was 4 × 404) |
| 6 | Tier-1 primitives in components | PASS — 0 |
| 7 | Quarantined Iris violet references | PASS — 0 |
| 8 | `mkt-*` / `hl-*` leakage | PASS — 0 |
| 9 | Gate 1 — accessibility | PASS — see §7 |
| 10 | Gate 2 — AI experience (§8, 16 checkpoints) | PASS — §8.13 satisfied by a genuine reporting path |
| 11 | Gate 3 — claim boundaries | PASS — copy frozen, asserted in tests |
| 12 | Gate 4 — interface honesty | PASS — no simulated submission, no unhonourable promise |
| 13 | Gate 5 — undeclared debt | PASS — §9 declares all five |
| 14 | Fixture Stability Contract (21 invariants) | PASS — enforced in CI |
| 15 | Critical issues | **0** |
| 16 | Major issues | **0** |

### Verified at runtime, not statically

Two findings surfaced only because the server was actually run: a CSS chunk
500 that turned out to be a **stale server** serving hashes from a superseded
build, and confirmation that the report form requires JavaScript. Static
verification would have reported one false failure and missed one real
limitation.

**If you are about to state a fact about the running page, run the page.**

### Not verified

- Full browser click-through of the report form. The record layer is proven by
  tests against the real sink and the transport by driving the live server
  action over HTTP; a submission from a real browser was not completed.
- Manual screen-reader and keyboard-only walkthrough.
- Bundle size, Lighthouse, Core Web Vitals.

---

## 12. Three failures worth inheriting

Recorded here because they are the most transferable output of the program.

**Scene 07 rendered a governance statement as its own opposite.** Two
independent columns; a value wrapped, the columns desynchronised, and `Not known
at the time` displayed the value belonging to `Known at the time`. Every
label/value structure is now a real table where one `<tr>` holds both cells —
the failure is not guarded against, it is *unrepresentable*.

**A contrast figure was estimated instead of computed, twice.** Reported ≈4.6:1;
actual 4.16:1, below the floor. A Gate 1 failure carried through two reviews.

**Colour was used to differentiate two things that must not be ranked.** Scene
06's stacked response cell was tinted `text-hp-text-secondary`; the scene's
whole idea is that neither column is the problem and neither is the solution.
Replaced with a hairline and an indent. In this system **structure
differentiates and colour does not**, because colour implies valence and most
of what this page distinguishes has none.

---

## 13. The standing rule

> If implementation requires a design decision that is not explicitly
> documented, stop and report it instead of inventing one.

This governed every phase. It is why §9 is short and specific rather than long
and invisible: `/signup` sat unbuilt through five scenes rather than be
defaulted to something plausible, and the reporting sink is deliberately
unambitious rather than quietly inventing a support process nobody agreed to
own.

The rule survives the program. It applies to whoever changes this page next.

---

## 14. Sign-off

| Role | Scope of approval | Name | Date | Signature |
|---|---|---|---|---|
| Product Owner | Scope delivered (§1); outstanding items accepted (§9) | | | |
| Design Owner | Visual system, tokens, motion (§2, §5, §6); m3 and m5 accepted as released | | | |
| Marketing Owner | Copy and claim boundaries; Gate 3 | | | |
| Engineering Owner | Architecture, routes, components (§2–§4); release checklist (§11) | | | |
| Accessibility Reviewer | Gate 1 status and its stated gaps (§7) | | | |

**Release recommendation:** RELEASE.
Critical = 0. Major = 0. Five Minor items declared and owned.

**Program status on signature:** CLOSED — PERMANENTLY.

Reopening requires a governance amendment under §0. It is not reopened by a
bug, by a Minor item in §9, or by a good idea.

---

*Homepage Program — closed. This is the final document.*
