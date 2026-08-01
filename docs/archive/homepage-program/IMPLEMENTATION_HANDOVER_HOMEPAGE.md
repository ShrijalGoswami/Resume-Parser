# Implementation Handover — HireLens Homepage

**Status:** Production-ready
**Version:** 1.0.0
**Supersedes:** nothing. This is the first handover.
**Companion documents:** `IMPLEMENTATION_PACKAGE_HOMEPAGE.md` (the build contract), `DESIGN_DECISION_LOG.md` (why anything is the way it is)

---

## 0. How to read this document

This is written for the engineer who inherits this code and was not in the room
for any of the decisions. It is deliberately not a tour of the file tree — you
can read the file tree. It is an account of **which things are load-bearing and
what breaks if you change them**, because almost every defect this project
actually hit came from something that looked cosmetic and was not.

Three of those are recorded in §6. Read them before your first change.

---

## 1. What exists

Five of nine storyboard scenes, two product surfaces, and the token and
foundation layer they all sit on.

| Route | Rendering | What it is |
|---|---|---|
| `/landing` | Static | The homepage. Scenes 01–04 stubbed, 05–09 built. |
| `/signup` | Static | Destination for the page's single primary action. |
| `/report` | Dynamic | Destination for "Report this as wrong". Reads context from the query string. |

`/landing` becomes `/` at cutover — see §8. No link in the codebase is
hardcoded to `/landing`, which is what makes that a routing change rather than
a find-and-replace.

### Not built, deliberately

Scenes 01–04 (still in design), navigation, footer, dark theme. Each was
DEFERRED by an explicit decision, not left undone. Do not add any of them
speculatively — §9 covers how to add them when they are approved.

---

## 2. Layout of the code

```
app/globals.css                              .hp token layer (~187 lines, appended, isolated)
app/(marketing-v2)/
  layout.tsx                                 .hp scope root + font variables
  landing/page.tsx                           scene composition + all outbound destinations
  signup/page.tsx                            primary-action destination
  report/page.tsx                            reporting destination, reads context from URL
components/homepage/
  foundation/
    fonts.ts                                 Inter + JetBrains Mono. Fraunces deliberately absent.
    motion.ts                                duration/ease tokens + the three motion commitments
    motion-provider.tsx                      LazyMotion strict + reducedMotion="user"
    container.tsx                            reading | narrow | working | field
    scene-band.tsx                            density registers + SceneHeading
    scene-stub.tsx                           placeholder for 01–04
    homepage-shell.tsx                       skip link, <main>, deferred nav/footer slots
  components/
    primary-action.tsx                       Book II C-01. Exports its class list — see §6.3.
  scenes/
    scene-05-fixtures.ts                     transcription of FIXTURES_SCENE_05.md v1.0.0
    scene-05-trail.tsx                       the only client scene
    scene-06-limits.tsx  scene-07-record.tsx  scene-08-room.tsx  scene-09-close.tsx
  report/
    record-report.ts                         the sink. Read its header comment before changing it.
    actions.ts                               server action
    report-form.tsx                          client form
tests/                                       15 files, 197 tests
```

### The token layer

Three tiers, and components consume **only** the third.

1. **Primitive** — `--hp-neutral-0..11`, `--hp-action-1..4`. Raw values. A
   component that references one of these is a defect; the count is asserted at
   zero and should stay there.
2. **Semantic** — mapped in `@theme inline`. `--color-hp-text-body`,
   `--color-hp-border-standard`, and so on.
3. **Component** — Tailwind utilities generated from tier 2.

Spacing tokens are named after their **register**, not their size:
`space-hp-intra-*` (within a thing), `-inter-*` (between things), `-section-*`
(between parts). This is the single highest-leverage decision in the whole
system, because it makes a rhythm violation legible in a diff — `mt-hp-section-2`
where `mt-hp-inter-4` belongs is visibly wrong to a reviewer who has never seen
the page. Sizes would not have been.

Type tokens bundle size and line-height as one indivisible unit. Do not set
`leading-*` alongside a `text-hp-*` token.

### Isolation

`.hp` is a scope, and nothing crosses it in either direction. The legacy Iris
violet is quarantined and referenced zero times. `mkt-*` and `hl-*` class
families do not appear. All three are asserted in tests, so a leak fails the
build rather than being noticed six months later.

---

## 3. The two product surfaces

### `/signup`

A bridge, not an auth page. It owns no form, no input, no credential capture —
the tests assert all three absences, because the failure mode here is not that
it looks wrong, it is that it quietly grows an email field somebody meant to
wire up later.

It hands off to `/auth/signup`, which already exists. The coupling between
marketing and authentication lives in exactly this one file.

**It does not collect an email**, deliberately. `/auth/signup` does not read a
prefill parameter, so a field here would collect an address and discard it. If
that route ever accepts one, adding the field is a two-line change and worth
doing. Until then, asking someone to type their email twice on the way to
trusting us is a bad trade.

Copy is approved positioning only: the value proposition verbatim from Bible
Ch. 2, and the Gate 3 claim boundaries carried through from Scene 06. The
boundaries are repeated here rather than softened because the last surface
before an account is created is exactly where softening them would be most
tempting.

### `/report`

The real reporting workflow required by Checklist §8.13.

**The shape.** Scene 05's inspector link carries the selected conclusion's
context in the query string — conclusion id, its text as displayed, the source
document, the passage, and the fixture version. `/report` reads those, shows
them back to the reader, and carries them into the record. A report that says
"this is wrong" without naming what "this" was cannot be investigated, and an
uninvestigable report is a discarded one wearing a nicer hat.

**Partial context is treated as absent.** Half a citation is worse than none:
it looks investigable and is not. The reader is told plainly when nothing is
attached.

**The sink is `record-report.ts` and it is deliberately isolated.** Right now it
writes one structured line to the server log and returns a reference. That is a
real destination — it is also the weakest destination that still qualifies as
genuine, and its header comment says so at length. It is not more than that
because "who owns incoming reports and what response is the user owed" is a
product decision, and inventing it would be exactly the kind of undocumented
decision this project stops for.

**What the copy is therefore allowed to say** is bounded by what the sink does:
that the report was recorded, and under what reference. Not "we'll investigate",
not a timeframe, not a thank-you-for-helping-us-improve. If you upgrade the
sink, the copy may grow to match. Never before — and there is a test asserting
none of those phrases appear.

**No submission is ever simulated.** A confirmation is shown only after the sink
has returned a reference. If the write fails the user is told it failed. The
test for this is the most important one in the suite: a confirmation over a
failed write is indistinguishable from a reporting control that was never wired
up, and it is worse, because the reader stops looking for another way to reach
us.

---

## 4. Invariants — what will break if you touch it

Each of these is enforced by a test. The test is the point; the note explains
why the test exists, because a test you do not understand gets deleted.

| Invariant | Why it exists |
|---|---|
| Zero Tier-1 primitives in components | A primitive in a component is a token that will not respond when the system changes. |
| Zero `mkt-*` / `hl-*` / iris-violet references | The quarantine is what lets `.hp` evolve independently. |
| Absence renders identically to presence | §8.15. "No sources on file" is ordinary information. Dimming it inverts the meaning of Scenes 05 and 06. |
| Label and value share one `<tr>` | See §6.1. This is not a preference. |
| Fixture counts reconcile across Scenes 05/06/07 | A fixture edit is a cross-scene change. The tests make it fail the build instead of shipping silently. |
| Exactly one primary action on the page | Its power is entirely a function of its rarity. |
| Confidence never rendered as hue, bar, gauge, percentage or star | DDL-VIS-004. It is a definition channel, not a score. |
| Report context survives to the record | §8.13 is satisfied by the signal arriving in an investigable form, not by the link resolving. |
| No promised response the sink cannot honour | See §3. |

---

## 5. Verification

```bash
pnpm exec tsc --noEmit      # clean
pnpm exec vitest run        # 197 tests, 15 files
pnpm exec next build        # /landing static, /signup static, /report dynamic
```

**Static verification is not sufficient and this project learned that twice.**
Before declaring anything, run `next start` and check the routes actually
respond. Two separate false readings came from skipping this: a stale server
serving hashes from a superseded build, and a contrast figure that was
estimated rather than computed. If you are about to state a fact about the
running page, run the page.

---

## 6. The three failures worth inheriting

### 6.1 Scene 07 rendered a governance statement as its own opposite

The first build used two independent columns — labels in one, values in the
other. A value wrapped to two lines, the columns desynchronised, and the row
`Not known at the time` displayed the value belonging to `Known at the time`.
A §8.15 statement about what the system did not know, rendered as a claim about
what it did.

Every label/value structure in this codebase is now a real table where one
`<tr>` holds both cells. The failure is not guarded against; it is
**unrepresentable**. Recorded as a named failure mode in DDL-MKT-006.

This is also why the responsive tables carry explicit
`role="table"/"rowgroup"/"row"/"rowheader"/"cell"`: setting `display: block` at
narrow widths drops the implicit ARIA roles, and Scene 07's thirteen pairs
would have read as an undifferentiated run.

### 6.2 A contrast figure was estimated instead of computed — twice

`--hp-neutral-7` was reported at ≈4.6:1 in two consecutive reviews. It was
4.16:1: below the 4.5 floor, a Gate 1 failure rather than a thin margin. Compute
relative luminance. Do not eyeball a ratio and do not trust a remembered one.

### 6.3 Colour was used to differentiate two things that must not be ranked

During stabilization, Scene 06's stacked response cell was differentiated with
`text-hp-text-secondary`. Scene 06's whole idea is that neither column is the
problem and neither is the solution — the pairing is what turns a caveat into a
commitment. Tinting one side ranked them. It was replaced with structural
differentiation only: a hairline and an indent.

The general lesson: in this system, **structure differentiates and colour does
not**, because colour almost always implies valence and most of what this page
distinguishes has none.

Related: `primary-action.tsx` exports its class list so the report form's submit
control is the *same* button rather than a lookalike rebuilt from tokens. Two
independent definitions of one component drift, and the drift surfaces as a
design defect long after the commit that caused it is forgotten.

---

## 7. Open items

None blocking. All four are Minor and each names its owner.

| # | Item | Owner | Note |
|---|---|---|---|
| m3 | `border-subtle` 1.16:1 and `border-standard` 1.26:1 sit below Book I Ch. 3's ~1.3–1.6 and ~2–3 | Design Owner | `border-strong` was fixed to 3.31:1 because ≥3 is a firm floor. The other two were left alone: moving `border-standard` to ~2.2 changes every panel edge and table divider from near-invisible to clearly visible, which is a change of visual character, not a fix. |
| m5 | Tertiary→secondary step is 1.21:1 | Design Owner | Narrow, not failing. Watch it if either token moves. |
| m6 | The report form needs JavaScript | Engineering | Verified: without it, nothing is recorded and the reader gets an error — no false confirmation. A `<noscript>` notice says so plainly. A no-JS path would need a second submission route. |
| m7 | `OPEN_DOCUMENT_HREF` points at `/signup` while labelled "Open full document" | Product | Reads as gating a document behind an account, which is honest and conventional. It has still never been formally decided. |
| m8 | `EVIDENCE_LABELS` in `scene-05-trail.tsx` is unused | Engineering | Dead code, left in place only because the stabilization brief forbade unrequested edits. Delete it. |

---

## 8. Cutover to `/`

1. Move `app/(marketing-v2)/landing/` to `app/(marketing-v2)/page.tsx`.
2. Retire or redirect `/welcome` (the pre-governance V4 marketing page).
3. Confirm no collision with `app/(hirelens)/home` — the authenticated home.

No component changes. Nothing links to `/landing`, which is the whole reason
this is three steps.

---

## 9. Extending it

**Scenes 01–04.** Replace the `SceneStub` calls in `landing/page.tsx`. Scene 09
exports `SCENE_01_OPENING_SENTENCE` — Scene 01 must use it, because the page
closes by returning to the sentence it opened with, and that is the structure of
the whole piece rather than a nice touch. Scene 02 is where Direction C's
Resolution Mark was reassigned.

**Navigation and footer.** `homepage-shell.tsx` has slots. Both were DEFERRED
with the explicit instruction not to adopt the existing `MarketingNav` and not
to invent a temporary one. That instruction stands until it is lifted.

**Dark theme.** Not built. The `.hp` primitives are structured for it — the
neutral ramp inverts — but no pass has been made and nothing has been verified.

**Motion.** Three moments are allocated, total (DDL-MKT-002). Only one is in
scope and it is press feedback on the primary action. If you are adding a
fourth, you are making a design decision, not an implementation one.

---

## 10. The standing rule

> If implementation requires a design decision that is not explicitly
> documented, stop and report it instead of inventing one.

This governed every phase of the build and it is the reason the open items in
§7 are *small and named* rather than *invisible and everywhere*. `/signup` sat
unbuilt for five scenes rather than be defaulted to something plausible, and
the reporting sink is deliberately unambitious rather than quietly inventing a
support process nobody had agreed to own.

Inherit the rule along with the code.
