# HireLens Homepage — Implementation Package

**Version 1.0 · For Claude Code · Specification only**
Owner: Design Ops
Authority: **Subordinate to governance and to Books I–II.** Where this package and any governing document disagree, they are correct and this package is wrong.
Sources: `MARKETING_DESIGN_BIBLE.md` · `DESIGN_REVIEW_CHECKLIST.md` · `DESIGN_DECISION_LOG.md` · `VISUAL_DESIGN_SYSTEM_FOUNDATIONS.md` (Book I) · `VISUAL_DESIGN_SYSTEM_COMPONENTS.md` (Book II) · `HOMEPAGE_STORYBOARD.md` · `STITCH_CREATIVE_BRIEF.md`

---

## What this is

Everything needed to begin production on the homepage **without making a design decision**.

Five of nine scenes are frozen and specified here. Four are still in design and are stubbed. Where something is genuinely undecided, it is listed in §0 as a blocker rather than left for implementation to resolve — **if you find yourself choosing between two visual options, stop and escalate.** That is the one rule that matters in this document.

**This package contains no code.** Structure, tokens, semantics, states, and conditions only.

---

# 0 · Before you start

## 0.1 · Hard blocker — the accent hue is not chosen

`color-action` has **no value**. Book I named it as Book II's first deliverable; Book II reported it open pending a brand mark that does not exist.

**Do not pick one.** Not blue, not purple, not "something neutral for now that we'll swap." A chosen-then-swapped accent anchors every judgement made against it in the meantime.

**Instead:** define `color-action` as a single semantic token resolving to a **near-black placeholder** (the same value the Stitch explorations used). Every primary action across all five frozen scenes consumes that one token. When the hue is chosen, one value changes and nothing else does.

**This blocks nothing.** All five frozen scenes render correctly with a near-black action.

## 0.2 · Hard blocker — fixtures do not exist

Scenes 05, 06 and 07 display candidate evidence. **No approved fixture set exists.** Generated content from the exploration passes is explicitly *not* the fixture (`DDL-MKT-003`, `DDL-MKT-006`).

Required before Scene 05 can be built — see §8. Scenes 08 and 09 need no fixtures and are unblocked.

## 0.3 · Decisions you may not make

Escalate rather than choose:

- Any colour beyond the neutral ramp and the four semantic sets
- Any confidence or uncertainty rendering that uses hue, a bar, a gauge, a percentage, or a star
- Any change to Scene 06's or Scene 09's copy — both carry Gate 3 claim boundaries
- Any addition of a badge, seal, shield, padlock, logo or compliance mark to Scene 08
- Any second primary action on Scene 09
- Any motion beyond the three moments in §4
- Any elevation level beyond the three in Book I

---

# 1 · Homepage structure

## 1.1 · Scene order and build state

| # | Scene | State | Build now |
|---|---|---|---|
| 01 | The sentence | In design | **Stub** |
| 02 | The admission | In design | **Stub** |
| 03 | The pile | In design | **Stub** |
| 04 | Resolution | In design | **Stub** |
| 05 | The trail | Frozen — structure | **Yes** |
| 06 | What we don't know | Frozen — structure + copy | **Yes** |
| 07 | The record | Frozen — structure | **Yes** |
| 08 | The room | Frozen — structure + copy | **Yes** |
| 09 | The close | Frozen — structure + copy | **Yes** |

## 1.2 · Stub requirements for Scenes 01–04

A stub is a named, empty region that **reserves vertical space and preserves scene order**. It carries the scene number and name, nothing else. It must not contain placeholder marketing copy, lorem, or a provisional layout — a stub that looks designed will be mistaken for one.

Stubs are removed as each scene is frozen. They are not a fallback state that ships.

## 1.3 · Page-level structure

- One route. No sub-routes, no tabs, no in-page navigation.
- Scenes are **sequential full-width bands** separated by section-register spacing (§6.3).
- Navigation and footer are **out of scope for this package** — neither is designed. Do not invent them.
- No sticky elements except the navigation, when it exists.

---

# 2 · Scene specifications

Each scene lists: structure, grid, states, copy status, and the conditions recorded against it. **The conditions are not suggestions** — they were recorded as implementation obligations at freeze.

---

## Scene 05 — The trail
`DDL-MKT-003` · Screen `19f24808` · **Gate 2 applies in full**

### Structure

Three columns, one row, full width, separated by two vertical hairlines.

| Column | Width | Contains |
|---|---|---|
| 1 · Conclusion navigator | 22% | Heading, then 5 rows |
| 2 · Source document | 52% | Filename header, then 5 paragraphs |
| 3 · Evidence inspector | 26% | Heading, 6 fields, provenance note, 2 actions |

**Column 1 — navigator.** Five rows, hairline-separated. Each row: an ordinal, the conclusion text, and a label beneath reading either `read from document`, `inferred`, or `no sources`. Row 1 is selected: solid 3px left edge bar plus a faint field background. **No shadow on the selected row.**

**Column 2 — document.** Filename in mono at the top. Five body paragraphs at reading measure. Paragraph 3 carries a pale neutral highlight and a small mono reference numeral in the right margin.

**Column 3 — inspector.** Six label/value rows, hairline-separated: passage reference, source, location, evidence type, verification state, dimension. Then a hairline, a small provenance note, then two plain text actions bottom-anchored.

### Conditions carried

1. **Fixtures required** (§8). Generated document text is not the fixture.
2. **Second highlighted passage** to be added — one document must yield two conclusions at two locations, or passage-level granularity is asserted rather than shown.
3. **Strengthen the margin numeral → inspector connection.** Currently the relationship is asserted. Use a hairline leader or strict baseline alignment.
4. **`Reference check — not received` in the navigator and `Not supported by this document` in the inspector must render in identical neutral text to every other row.** These are the scene's costliest elements and the most likely to be "improved" into warnings.
5. **Citations resolve to the passage, not the document** (§8.1). A reviewer will follow three at random.
6. **Extraction and inference visibly distinguished** (§8.13).
7. **`Report this as wrong` must genuinely work.** A decorative reporting affordance is worse than none.

### States

Navigator row: default · hover · selected · focused.
Document: static.
Inspector: populated · no-passage-selected.

---

## Scene 06 — What we don't know
`DDL-MKT-004` · Screen `d4bf6ec2` · **Gate 3 — copy frozen**

### Structure

Centred container, 1000px max. Three parts, large gaps between.

**Part 1 — exhibit.** Lead line, hairline, then a four-row table at 30 / 45 / 25. Row 4 reads `Incident response | Nothing on file | No sources` **at identical size, weight and grey to rows 1–3, at full row height.**

**Part 2 — commitments.** Lead line, hairline, then a two-column table at 42 / 58 with a vertical hairline and header labels `The limit` and `What we do`. Two peer-labelled groups: `What we refuse to do` (3 rows) and `What we cannot know` (5 rows).

**Part 3 — closing.** Hairline, then one line of body text.

### Conditions carried

1. **Tighten Part 2 row padding to ~60% of the rendered height.** The section currently runs long.
2. **Close the gap before the closing statement** so it reads as conclusion, not appendix.
3. **Verify the two group labels remain peers** at reduced padding — if they begin reading as a heading hierarchy, the ledger's category confusion returns.
4. **Fallback if it still flattens:** the refusal group moves out as its own three-row block above the table.
5. **Copy may not be altered without Marketing Owner approval.** The three refusal rows are Gate 3 boundaries.

### States

Static. No interaction.

---

## Scene 07 — The record
`DDL-MKT-006` · Screen `871d4f54` · **Gate 2 applies**

### Structure

Centred container, 940px max. Three parts.

**Part 1** — one line of small grey text, then a hairline.
**Part 2** — a thirteen-row table at 32 / 68 with a vertical hairline and a horizontal hairline between every row. Compact. Every label on one line.
**Part 3** — hairline, one line of body text, one plain text link.

### Conditions carried

1. **Build as paired table rows.** Each row holds its label and value together, top-aligned. **Do not build as two independent columns** — the first render did, a wrapped value desynchronised the pairing, and `Not known at the time` rendered as its own opposite. This is a recorded failure mode, not a one-off.
2. **Four copy values were shortened during the corrective render** to prevent wrapping — `Bar applied`, `Reasoning 1`, `Reasoning 2`, `Not known at the time`. **Each must be confirmed or reverted against approved wording.**
3. Row 13 reads `Record status | Closed. Not editable.`

### States

Static. No interaction.

---

## Scene 08 — The room
`DDL-MKT-007` · Screen `0495f087` (part one) · **Gate 3 — copy frozen**

### Structure

Centred container, 1000px max.

Lead line, hairline, then a **two-by-two prose grid** with one vertical and one horizontal hairline. Each block: small grey heading plus two or three short sentences. Headings: `Your data`, `What the system may decide`, `What is auditable`, `Where a person is required`.

Then a hairline, a small grey `Specifics` line, then a **five-row table at 34 / 66** with concrete values: data residency, retention, model training, access, export.

### Conditions carried

1. **No badges, seals, shields, padlocks, logos or compliance marks.** Their absence is the decision, not an omission. This section will attract them.
2. **Specifics stay concrete.** No adjectives. If a value is not yet true, remove the row — do not soften it.
3. This is the only organisational-trust content on the page. If thinned, §9.2 is unmet and nothing else covers it.

### States

Static. No interaction.

---

## Scene 09 — The close
`DDL-MKT-007` · Screen `0495f087` (part two) · **Gate 3 — copy frozen**

### Structure

Separated from Scene 08 by a large gap and a hairline. Left-aligned on a 620px measure with substantial empty space to the right.

**Three paragraphs at reading size** — not display type. Generous space between them. Then a generous gap, then **one primary action**.

### Conditions carried

1. **Paragraph 1 reproduces Scene 01's opening sentence verbatim.** Scene 01 is not yet written. **When it is, Scene 09 must be updated to match, or the loop breaks silently.** Flag this as a cross-scene dependency in the build.
2. **One primary action. No secondary link.**
3. **No urgency, countdown, scarcity, exit-intent, or newsletter field.**
4. Paragraph 2 — *"no software will make it otherwise"* — is the most likely sentence on the page to be softened. It carries the most trust. It does not change.

### States

Button: default · hover · focus-visible · active.

---

# 3 · Component mapping

Every element maps to a Book II component. **No new components are required for these five scenes.**

| Scene | Element | Book II |
|---|---|---|
| 05 | Navigator rows | C-31 Table (row semantics) + A-05 Confidence rendering |
| 05 | Document panel | A-04 AI Evidence |
| 05 | Inspector fields | A-04 AI Evidence |
| 05 | Not-supported entry | A-07 Missing Information State |
| 05 | Two actions | C-03 Link |
| 06 | Exhibit table | C-31 Table |
| 06 | `Nothing on file` cell | A-07 Missing Information State |
| 06 | Commitments table | C-31 Table |
| 07 | Register | C-31 Table |
| 07 | `Not known at the time` | A-07 Missing Information State |
| 07 | Closing link | C-03 Link |
| 08 | Prose grid | Layout only — Book I Ch. 2 |
| 08 | Specifics table | C-31 Table |
| 09 | Primary action | C-01 Button, `primary` variant |

**Notes.**
- **C-31 Table, never C-32 Data Grid.** Nothing on this page is editable. C-32's affordances would make these read badly (`DDL-VIS-009`).
- **C-30 Card is not used anywhere.** No element on this page is a card. If a card appears, something was misread.
- **No C-17 Avatar.** No candidate imagery anywhere (`DDL-VIS-007`).
- **No C-22 Toast, C-23 Dialog, C-24 Alert, C-18 Tooltip.** None of these scenes has a use for them.

---

# 4 · Motion mapping

`DDL-MKT-002` · Book II Ch. 9 · Bible Ch. 10

## The budget

**Three motion moments on the entire homepage. All user-triggered. Nothing animates on load or on scroll.**

| # | Scene | Moment | Duration | Trigger |
|---|---|---|---|---|
| 1 | 02 | Confidence state change | `motion-duration-instant` | User |
| 2 | 04 | Separation | `motion-duration-quick` | User |
| 3 | 09 | Primary action feedback | `motion-duration-instant` | User |

**Scenes 05, 06, 07 and 08 have zero motion.** Moments 1 and 2 belong to scenes still in design.

**In this build phase, implement moment 3 only.**

## Prohibited page-wide

Scroll-triggered reveals · staggered entrances · parallax · scroll-jacking · pinned sections · ambient loops · shimmer · pulse · skeleton shimmer · counting numbers · chart load animation · typing effects · scanning lines · **anything implying the system is thinking** (§7.8, **Gate 4**).

## Libraries

**Framer Motion** for moment 3 — a simple state transition. **GSAP is not used anywhere on this page.** Its strengths are timeline choreography and scroll sequencing, both prohibited. Adding it would contradict frozen governance.

## Reduced motion

`prefers-reduced-motion` resolves moment 3 to an instant state change. **Nothing is lost**, because no motion on this page carries meaning the layout does not already carry — which is the §14 H4 test, passed by construction.

---

# 5 · Responsive notes

`DDL-VIS-005` · Book I Ch. 13

**Marketing surfaces are responsive-first**, unlike the workspace. But the adaptation rule still holds: **adapt by removing regions, never by reducing density or type size.**

## Breakpoints

| Name | Range |
|---|---|
| Wide | ≥1536 |
| Standard | 1280–1535 — **author here** |
| Laptop | 1024–1279 |
| Tablet | 768–1023 |
| Compact | <768 |

## Per-scene collapse

| Scene | Laptop | Tablet | Compact |
|---|---|---|---|
| **05** | 3 cols hold | **Inspector moves below the document.** 2 cols | Single column: navigator → document → inspector, stacked |
| **06** | Holds | Commitments table: limit above consequence per row | Both tables become stacked label/value pairs |
| **07** | Holds | Holds | Register becomes stacked label/value pairs |
| **08** | Holds | 2×2 grid → 1×4 stack | 1×4 stack; specifics table stacks |
| **09** | Holds | Holds | Holds — measure narrows only |

**Scene 05's three-column layout is the only genuinely difficult case.** Below Tablet the document must remain readable at full type size — it is the evidence, and shrinking it defeats the scene.

## Never changes across viewports

Type sizes · border weight (1px) · radius · contrast targets · hit-target minimums · information hierarchy.

---

# 6 · Design token references

Book II Ch. 1–8. **Components consume semantic tokens only.** No primitives, no raw values.

## 6.1 · Colour

**Surface** — `color-canvas` · `color-surface` · `color-sunken`
**Text** — `color-text-body` · `-secondary` · `-tertiary` · `-placeholder` · `-disabled` · `-inverse`
**Border** — `color-border-subtle` · `-standard` · `-strong` · `-focus`
**Action** — `color-action` · `-hover` · `-active` · `-subtle` · `-fg` ← **`color-action` is the open blocker, §0.1**
**State** — `color-state-{success|warning|danger|info}-{bg|border|fg}` — **not used on this page**

## 6.2 · Confidence — non-hue

`confidence-definition-high` → `color-text-body`
`confidence-definition-medium` → `color-text-body`
`confidence-definition-low` → `color-text-secondary` — **never below 4.5:1**
`confidence-mark-{high|medium|low}` → complete / partial / open

**No confidence display may reference a `color-state-*` token, a hue, a bar, a gauge, a percentage, or a star** (`DDL-VIS-004`, §8.11).

## 6.3 · Spacing — register-named

`space-intra-{1,2,3}` = 2, 4, 8 · `space-inter-{1..5}` = 12, 16, 20, 24, 32 · `space-section-{1..5}` = 48, 64, 80, 96, 128

**The register law:** smallest Section > largest Inter > largest Intra. Encoded in the names so a violation is legible in review.

Scene boundaries use `space-section-*`. Within-scene part gaps use `space-section-1` or `-2`. Table rows use `space-inter-*`. Label-to-value uses `space-intra-*`.

**Components accept no spacing overrides.** No padding prop, no margin prop, no class escape hatch.

## 6.4 · Type

`type-ui-{xs,sm,md,lg,xl}` = 11, 12, 13, 14, 16 · `type-read-{sm,md,lg}` = 16, 18, 20 · `type-display-{xs..xl}` = 24, 30, 38, 48, 60

Each token bundles size, line-height and tracking as one unit. **Do not expose size independently.**

Weights: `weight-{regular,medium,semibold,bold}`.
Numerals: `numeric-tabular` is the **default**; proportional is the opt-out.
Measure: `measure-prose` 62–72ch · `measure-ui` 45–65ch.
Family: `font-sans` everywhere. `font-mono` **only** for filenames, dates, identifiers and the margin numeral in Scene 05.

## 6.5 · Elevation, radius, border, shadow

`elevation-ground` — **everything on this page.** No scene uses Raised or Overlay.
`radius-chip` 2 · `radius-control` 4 · `radius-container` 6 · `radius-overlay` 10 — this page uses **control and container only**.
`border-width` 1px, all viewports, all components.
`focus-ring-width` 2px · `focus-ring-offset` 2px.
Shadows: **none used on this page.**

---

# 7 · Accessibility requirements

Book I Ch. 12 · Checklist §11 — **Gate 1, blocking, no deferral path.**

## Contrast

| Element | Floor | Target |
|---|---|---|
| Body text | 4.5:1 | **7:1** |
| Secondary | 4.5:1 | 5.5:1 |
| Metadata, tertiary | 4.5:1 | **never lower** |
| Large text | 3:1 | 4.5:1 |
| Meaningful borders | 3:1 | 3:1 |
| Focus indicator | 3:1 | 4.5:1 |

**Metadata is the most-broken row.** Timestamps, provenance labels and evidence counts on this page are frequently the most important text present. Never below 4.5:1.

## Keyboard

- Every interactive element reachable, activatable and escapable by keyboard.
- **Scene 05's navigator must be fully keyboard-operable** — arrow between rows, Enter to select.
- Focus order follows visual order. A mismatch means the DOM and layout disagree.
- **Focus is never removed.** Not on mouse users, not for polish, not on one component.

## Semantics

- Scene 05's navigator: list semantics with a marked current item.
- All four tables: real table semantics with header associations.
- Scene 05's inspector: label/value pairs programmatically associated.
- Scene 09's action: a real button with an accessible name describing what happens.
- Heading outline read alone must describe the page correctly.

## Colour independence

**Every meaning carried by colour is also carried by shape, label, position or weight.** Test procedure: render in grayscale. If any meaning is lost, it fails. Confidence is immune by construction.

## Targets and zoom

24px minimum in dense contexts, 32px default, 44px touch. Content reflows at 200% zoom without horizontal scroll or loss of function. **Nothing is hover-only.**

---

# 8 · Fixtures

**Required before Scene 05 can be built.** All synthetic. No real candidate data, ever, regardless of consent or redaction.

| Fixture | For | Requirement |
|---|---|---|
| One take-home document | 05 | 5+ paragraphs of genuine technical prose. Two passages must be citable at named page and paragraph locations. |
| One interview transcript | 05 | Referenced in the navigator; need not render in full |
| Conclusion set | 05 | Exactly 5, including one `inferred` and one `no sources` |
| Dimension set | 06 | Exactly 4, one with `Nothing on file` |
| Decision register | 07 | 13 fields per the frozen structure |

**Fixture quality is a governance matter, not a content chore.** Demo data — four tidy rows, short names, complete fields — is a catalogued smell (§14 C3) and would undercut Scene 05's entire argument. Long names, realistic titles, genuine technical argument.

---

# 9 · Implementation priorities

Sequenced by risk, not by page order. **Prove the pipeline on the simplest scene, end on the hardest.**

| P | Work | Blocked by | Gate |
|---|---|---|---|
| **P0** | Token layer — all semantic tokens, both themes, `color-action` as placeholder | — | — |
| **P0** | Page shell, scene bands, section spacing, stubs for 01–04 | — | — |
| **P1** | **Scene 09** — smallest surface, one component, proves tokens + button + focus | P0 | Gate 3 |
| **P2** | **Scene 08** — static, no fixtures, four prose blocks + one table | P0 | Gate 3 |
| **P3** | **Scene 06** — static, two tables, needs the 4-row exhibit fixture | P0, fixtures | Gate 3 |
| **P4** | **Scene 07** — one table, needs the register fixture. **Paired rows** | P0, fixtures | Gate 2 |
| **P5** | **Scene 05** — three columns, interactive navigator, full document fixtures | P0, fixtures | Gate 2 |

**Why this order.** Scene 09 is one paragraph block and one button — it validates the token layer, focus handling and the sole motion moment in the smallest possible surface. Scene 05 is last because it is the only interactive scene, the only three-column layout, has the longest fixture lead time, and carries Gate 2 in full.

## Definition of done, per scene

A scene is done when: it renders at all five breakpoints; it passes Gate 1 by manual keyboard and screen-reader pass, not by scanner; it survives grayscale; its recorded conditions in §2 are each satisfied or explicitly deferred in writing; and — for Scenes 05, 06, 07 — a reviewer can run §8.1–8.16 against it as though it were product.

**Gate 2 has no marketing exemption.** Scenes 05, 06 and 07 render model-derived content to a user.

---

# 10 · Self-review

## Against governance

| Source | Result |
|---|---|
| Bible Ch. 8, Ch. 10, Ch. 12, Ch. 14 | Pass — §4, §6, §7 |
| Checklist §7.8 **Gate 4** | Pass — §4 prohibitions |
| Checklist §8 **Gate 2** | Pass — §2, §9 definition of done |
| Checklist §10.7 **Gate 3** | Pass — copy frozen on 06, 08, 09 |
| Checklist §11 **Gate 1** | Pass — §7 |
| Checklist §12.2 | Pass — §6, semantic tokens only |
| Book I Ch. 12, Ch. 13, Ch. 14 | Pass |
| Book II Ch. 1–9, components | Pass — §3, §6 |
| `DDL-VIS-004`, `-005`, `-007`, `-009` | Pass |
| `DDL-MKT-002` … `-007` | Pass — conditions carried verbatim |

## Conflicts

**None.** No new decision is made in this package; it applies existing ones. No `DDL` record is required.

## Open items carried forward, not resolved

1. **`color-action` has no value** (§0.1). The single unresolved value in the whole system. Blocks nothing; must not be guessed.
2. **Fixtures do not exist** (§8). Blocks Scenes 05, 06, 07.
3. **Scene 09 is bound to Scene 01's unwritten copy** (§2). A cross-scene dependency that will silently break if unflagged.
4. **Six pacing hypotheses remain open** (`DDL-MKT-005`), to be discharged at V2 assembly.
5. **Navigation and footer are not designed.** Out of scope. Do not invent them.

---

*HireLens Homepage Implementation Package v1.0 — specification only, no code.*
