# HireLens Visual Design System

## Book II — Components & Design Tokens

**Version 1.0 · Status: Frozen · Change policy: Amendments only**
Approved 2026-07-25. Structural change requires a Governance Amendment Proposal (`DESIGN_DECISION_LOG.md` §6).
Owner: Design Owner
Authority: **Subordinate to governance and to Book I.** Where this book disagrees with the Bible, the Checklist, or Book I Foundations, they are correct and this book is wrong.
Governing documents: [`MARKETING_DESIGN_BIBLE.md`](./MARKETING_DESIGN_BIBLE.md) · [`DESIGN_REVIEW_CHECKLIST.md`](./DESIGN_REVIEW_CHECKLIST.md) · [`DESIGN_DECISION_LOG.md`](./DESIGN_DECISION_LOG.md) · [`VISUAL_DESIGN_SYSTEM_FOUNDATIONS.md`](./VISUAL_DESIGN_SYSTEM_FOUNDATIONS.md) (**Book I**)

---

## What this book is

**A grammar, not a kit.**

A UI kit is an inventory of things you can place. A grammar tells you what may combine with what, what each element means when it appears, and what it commits you to. The difference shows up eighteen months in: a kit produces screens that are individually fine and collectively incoherent, because nothing constrained the combinations.

Book I established the foundations — space, type, color, shape, surface. This book turns them into components and the token layer that makes them enforceable. **Every component here exists to serve Decision Intelligence.** A component that does not help someone decide with more confidence than a minute ago has no place in this system, however conventional it is elsewhere.

## What this book is not

Not screens, layouts, Figma, or code. Not motion behavior — Chapter 9 defines the *hooks* motion will attach to; the **Motion Bible (Book III)** owns durations, curves, and choreography. Where you find a motion value here, it is a placeholder name, not a specification.

## The variant budget

**Every component in this book states a fixed number of variants. Adding one is a change to the system, not a design decision.**

This is the single most important rule in Book II. Component sprawl does not arrive as a decision; it arrives as forty reasonable additions. A button system with four variants stays learnable; the same system after two years of "we just needed a slightly quieter one" has eleven, and nobody can tell you which to use.

**When a component almost fits, the answer is usually that the screen is wrong** — not that the component needs a variant.

## Component index

Components are numbered for citation in reviews and code. **Cite by ID; names get edited, IDs do not.**

`C-##` Core · `N-##` Navigation · `D-##` Data · `A-##` AI

---

# PART I — DESIGN TOKENS

# Chapter 1 — Design Token Philosophy

## The premise: tokens are the enforcement layer

Book I is a set of rules. Rules that live only in a document are followed by people who have read it recently. **Tokens are how a rule becomes structural** — where the correct choice is the available one and the incorrect choice requires visibly going around the system.

That reframing determines the whole architecture below. We are not naming values for convenience. We are building a vocabulary in which certain mistakes are hard to express.

## Three tiers

| Tier | Example | Who may reference it |
|---|---|---|
| **1 · Primitive** | `neutral-7`, `accent-3` | Semantic tokens only. **Never a component.** |
| **2 · Semantic** | `color-text-secondary`, `space-inter-2` | Components, always. This is the working vocabulary. |
| **3 · Component** | `button-height-default` | The one component that owns it |

**The law: components consume semantic tokens. Never primitives, never raw values.**

Why this is strict rather than a guideline: a primitive reference is a decision that the *value* is right rather than the *meaning*. `neutral-7` in a component says "this specific grey," which breaks the moment the ramp is retuned or a theme is added. `color-text-tertiary` says "this is tertiary text," which survives both.

**Tier 3 exists reluctantly.** A component token is admitted only when a value is genuinely local and has no meaning outside that component. If two components want the same Tier 3 token, it was a Tier 2 token all along.

## Naming grammar

```
--<category>-<role>-<modifier?>
```

Three rules, each preventing a specific failure:

**Names describe role, never appearance.** `color-text-secondary`, not `color-text-grey`. An appearance name is a lie the first time a theme changes, and dark theme changes it immediately.

**Names describe role, never location.** `color-surface`, not `color-card-bg`. Location names multiply — you end up with `card-bg`, `panel-bg`, and `modal-bg` holding one value and drifting apart under maintenance.

**Spacing names describe register, never size.** `space-inter-2`, not `space-16`. **This is the most consequential naming decision in Book II.** Book I Ch. 4 establishes that the register law — Section > Inter > Intra — is the mechanism preventing uniform spacing. Encoding the register in the name means a violation is legible in the code itself: `space-section-1` used between a label and its value is visibly wrong to any reviewer, where `space-48` is just a number.

## What is not a token

**Layout.** Panel arrangement and container widths are structure (Book I Ch. 2), not values to be swapped.

**Content.** Strings, labels, and copy are content, governed by Bible Ch. 12.

**One-off values.** A value used once is not a token; it is a defect. Book I Ch. 15 is explicit: a token gap is fixed by adding the token, never by hard-coding — and never by inventing a token nobody else will use.

## Theming

**Two themes, both first-class, neither canonical** (Bible Ch. 8).

Semantic tokens are the theme boundary: they resolve to different primitives per theme, and **nothing above the semantic layer is theme-aware.** A component containing a theme conditional has broken the architecture.

**Dark theme resolves to a separately designed ramp, not an inversion** (Book I Ch. 3). The token names are identical; the primitives behind them are not.

---

# Chapter 2 — Color Token System

## Primitives (Tier 1)

| Set | Steps | Notes |
|---|---|---|
| `neutral` | 0–11 | Slightly cool. Roles fixed in Book I Ch. 6. |
| `accent` | 1–4 | Four steps only — the constraint is the enforcement |
| `success` `warning` `danger` `info` | 1–3 each | bg / border / fg |
| `data-categorical` | 1–6 | Six maximum (Book I Ch. 11) |
| `data-sequential` | 1–7 | Single hue, perceptually even |

**No other primitive sets exist.** A fifth semantic hue means the state taxonomy is wrong, not that the palette is short.

## Semantic tokens (Tier 2)

**Surface**
`color-canvas` · `color-surface` · `color-sunken`

**Text** — every step ≥4.5:1 against its intended background, including tertiary
`color-text-body` · `color-text-secondary` · `color-text-tertiary` · `color-text-placeholder` · `color-text-disabled` · `color-text-inverse`

**Border**
`color-border-subtle` · `color-border-standard` · `color-border-strong` · `color-border-focus`

**Action** — Tier 1 of Book I Ch. 6, roughly one instance per view
`color-action` · `color-action-hover` · `color-action-active` · `color-action-subtle` · `color-action-fg`

**State** — four sets of three
`color-state-{success|warning|danger|info}-{bg|border|fg}`

**Data**
`color-data-categorical-1…6` · `color-data-sequential-1…7`

## Confidence tokens — the exception that proves the architecture

**Confidence has tokens, and none of them are colors** (`DDL-VIS-004`, Book I Ch. 6 Tier 3).

| Token | Resolves to | Meaning |
|---|---|---|
| `confidence-definition-high` | `color-text-body` | Claim at full definition |
| `confidence-definition-medium` | `color-text-body` | Full definition, qualifier required |
| `confidence-definition-low` | `color-text-secondary` | Reduced definition — **never below 4.5:1** |
| `confidence-mark-high` | complete | Resolution mark, closed |
| `confidence-mark-medium` | partial | Resolution mark, partial |
| `confidence-mark-low` | open | Resolution mark, open |

**The reason these are tokens at all:** naming them makes the prohibition enforceable. A designer reaching for `color-state-warning-fg` to express low confidence has to type a token that visibly means *warning*, and a reviewer can see it. If confidence had no vocabulary, it would silently borrow the state palette — which is the §8.11 gate failure Book I Ch. 6 exists to prevent.

`confidence-definition-low` resolving to `color-text-secondary` rather than something fainter is deliberate. Low confidence must be **less resolved, not less readable** — the user needs to read it carefully precisely because we are unsure.

## Prohibited resolutions

- Any component referencing an `accent-*` or `neutral-*` primitive
- Any confidence display referencing a `color-state-*` token
- Any person-related surface referencing a red→green sequence
- Any gradient composed from two tokens

---

# Chapter 3 — Typography Tokens

## Type styles, not sizes

**A typography token bundles size, line-height, and tracking as one indivisible unit.** Exposing size independently guarantees mismatched pairs — 38px type at 1.5 line-height, 12px type at 1.2 — and those pairs are the most common cause of a page that feels subtly wrong.

| Token | Size | Line-height | Register |
|---|---|---|---|
| `type-ui-xs` | 11 | 1.45 | Column labels, timestamps. **Floor — never prose** |
| `type-ui-sm` | 12 | 1.45 | Metadata, dense labels |
| `type-ui-md` | 13 | 1.4 | Table cells, controls — the workhorse |
| `type-ui-lg` | 14 | 1.4 | Default UI text |
| `type-ui-xl` | 16 | 1.35 | Emphasis in UI; hinge into Reading |
| `type-read-sm` | 16 | 1.55 | Prose |
| `type-read-md` | 18 | 1.55 | Marketing body |
| `type-read-lg` | 20 | 1.5 | Lead paragraphs |
| `type-display-xs` | 24 | 1.25 | Section headings |
| `type-display-sm` | 30 | 1.2 | Page titles |
| `type-display-md` | 38 | 1.2 | Marketing sections |
| `type-display-lg` | 48 | 1.15 | Marketing hero |
| `type-display-xl` | 60 | 1.15 | Rare. One per site. |

**Weight:** `weight-regular` · `weight-medium` · `weight-semibold` · `weight-bold`. Four. Emphasis within text uses weight, never a size bump (Book I Ch. 5).

**Family:** `font-sans` · `font-mono`. Mono means *machine value* and nothing else (`DDL-VIS-003`).

**Numerals:** `numeric-tabular` (default) · `numeric-proportional` (flowing prose only). Tabular is the default state, not an opt-in — the opt-out is the exception that must be justified.

**Measure:** `measure-prose` (62–72ch) · `measure-ui` (45–65ch). A prose container without a measure token is a defect.

---

# Chapter 4 — Elevation Tokens

## Elevation is composite

`elevation-ground` · `elevation-raised` · `elevation-overlay`

**Each resolves to a surface colour, a border, and a shadow together.** Components consume elevation; they do not assemble it from parts.

**Why composite, and why this matters more than it looks:** Book I Ch. 3 establishes that dark theme carries elevation primarily through a surface lightness step rather than shadow, because shadow is nearly invisible on dark surfaces. If components composed elevation from a shadow token plus a background token, every component would need theme-aware logic to get this right, and most would get it wrong — producing a dark theme with no perceptible depth at all. A composite token resolves correctly per theme in one place.

**Three tokens. There is no fourth**, and its absence from the vocabulary is the enforcement of Book I's rule. A designer who needs a fourth level cannot express it without visibly leaving the system, at which point the conversation is about the structural problem rather than the shadow.

**`elevation-ground` carries no shadow.** Cards are Ground.

---

# Chapter 5 — Spacing Tokens

## Register-named, deliberately

```
space-intra-1     2px     Optical correction only
space-intra-2     4px     Icon to label
space-intra-3     8px     Label to value, control padding

space-inter-1    12px     Dense rows
space-inter-2    16px     Default between elements
space-inter-3    20px
space-inter-4    24px     Panel padding
space-inter-5    32px     Between element groups

space-section-1  48px     Minimum between distinct ideas
space-section-2  64px
space-section-3  80px
space-section-4  96px
space-section-5 128px     Marketing section breaks
```

**The register law is enforced by the vocabulary** (Book I Ch. 4, `DDL-VIS-002`): the smallest Section exceeds the largest Inter, which exceeds the largest Intra. Because the register is in the name, a violation reads as wrong in a diff. This is the single highest-leverage naming decision in the token system, and it is why we do not name spacing by pixel value.

**Density:** `density-comfortable` (default) · `density-compact`. Compact reduces Intra and Inter by one step. **Section spacing does not change** — compressing the space between ideas defeats the purpose.

**Gutters:** `gutter-sm` 24 · `gutter-md` 32 · `gutter-lg` 48.

**Components do not accept spacing overrides.** No padding prop, no margin prop, no `className` escape hatch for spacing. This is the rule most likely to erode and the one that keeps two designers' screens looking like one product.

---

# Chapter 6 — Radius Tokens

```
radius-chip        2px    Chips, tags, badges, status marks
radius-control     4px    Buttons, inputs, selects
radius-container   6px    Cards, panels — the default
radius-overlay    10px    Dialogs, popovers, menus
radius-full         —     Avatars and status dots only
```

**Named by role, not by size.** A designer cannot reach for "10px because it looks nicer on this card" without typing `radius-overlay` on a card, which is legibly wrong.

**Nested radius:** inner = outer − padding, floored at `radius-chip`. Equal radii on nested surfaces produce a visible optical gap at the corner — one of those defects nobody can name but everyone perceives as sloppy.

**Radius never changes on interaction.** No hover, no focus, no active. Shape shifting under the cursor is destabilising and causes layout shift.

---

# Chapter 7 — Border Tokens

**`border-width` — 1px. One value, all viewports, all components.**

A single weight means a border is never a hierarchy signal, which keeps it a pure structural one. Emphasis is carried by border *colour*, never by thickness.

| Token | Contrast vs adjacent | Use |
|---|---|---|
| `color-border-subtle` | 1.3–1.6:1 | Table rows, internal division |
| `color-border-standard` | 2–3:1 | Panels, cards, inputs |
| `color-border-strong` | ≥3:1 | Selected, active |
| `color-border-focus` | ≥3:1 both sides | Focus only. Never decorative. |

**Focus ring:** `focus-ring-width` 2px · `focus-ring-offset` 2px. Outside the element, so it never reduces the element's own contrast or shifts layout.

**Two adjacent borders doing the same separation is a defect** (Book I Ch. 3). Collapse one.

---

# Chapter 8 — Shadow Tokens

**Two shadow tokens exist. Ground has none.**

`shadow-raised` — one soft, low, near-achromatic layer
`shadow-overlay` — a deeper layer, plus `scrim-overlay` for modal cases

**Shadows are consumed through `elevation-*`, not directly.** A component referencing `shadow-raised` outside an elevation token is assembling depth by hand and will get dark theme wrong.

**Character:** a single light source, high and slightly forward, consistent system-wide. Largely achromatic. **A shadow you consciously notice is too strong** — it has stopped describing space and started decorating.

**Prohibited:** coloured shadows, accent glows, multiple light sources, shadow as emphasis, shadow on Ground surfaces.

---

# Chapter 9 — Motion Token Hooks

**Reference only. The Motion Bible (Book III) owns all behaviour, values, and choreography.** This chapter defines the attachment points so components can be specified before motion is.

| Hook | Intended role |
|---|---|
| `motion-duration-instant` | Below perceptual threshold — state changes |
| `motion-duration-quick` | Small transitions |
| `motion-duration-settled` | Overlay entrance |
| `motion-ease-settle` | Deceleration into place |
| `motion-ease-exit` | Departure |
| `motion-reduced` | Reduced-motion resolution |

**Book II makes exactly three motion commitments**, all inherited from governance and stated so components can be specified without waiting for Book III:

1. **Every animation ends.** Nothing loops (Bible Ch. 10).
2. **Nothing delays content.** No animation gates reading.
3. **Reduced motion preserves meaning** — cross-fade or instant change, never a deletion leaving a discontinuity (Checklist §14 H4).

Any component below stating a motion behaviour states it as an *intent*. Book III may change the value; it may not change these three commitments.

---

# PART II — CORE COMPONENTS

---

## C-01 · Button

**Purpose** — Commit to an action. The only component that changes the world.

**When to use** — A discrete action with a consequence. **When not to use** — Navigation (that is C-03 Link). Filtering or view switching (C-25 Tabs, N-04 Filters). Toggling a setting (C-13 Toggle).

**Hierarchy** — Four variants, fixed:

| Variant | Meaning | Per view |
|---|---|---|
| `primary` | The one thing to do here | **At most one** |
| `secondary` | A real alternative | Few |
| `tertiary` | Low-consequence action | Several |
| `destructive` | Irreversible, subtractive | Rare |

**One primary per view.** Two primaries mean the screen has not decided what it is for, and the accent's power is entirely a function of its rarity (Book I Ch. 6).

**Density** — Three heights: compact (28), default (32), large (40). Nothing else. Large is for marketing and single-decision moments, never in a workspace.

**States** — default · hover · focus-visible · active · disabled · loading. Loading replaces the label with an indicator **at fixed width** — a button that resizes on click causes layout shift and the second click lands elsewhere.

**Accessibility** — Real button semantics. Focus ring per Ch. 7, never removed. 32px minimum target, 44 on touch. Disabled buttons remain readable and, where the reason is not obvious, are accompanied by it — a disabled control with no explanation is a dead end.

**Book I** — `radius-control`. Sentence case (Ch. 5). No pill shape (Ch. 7). Primary is the accent instance for the view (Ch. 6).

**Common misuse** — Destructive styled as a colour variant of primary. It is not: destructive is defined by *consequence*, and the pattern that matters is the confirmation naming what will happen, not the red fill. Also: buttons used for navigation, which breaks the back button and middle-click.

**Scalability** — Four variants is the budget. A fifth is a system change, and the request almost always means the screen has too many actions — solvable in the layout (N-07 Context Toolbar).

---

## C-02 · Icon Button

**Purpose** — An action whose meaning is unambiguous without a word, in a space where a word does not fit.

**When to use** — Dense toolbars, table row actions, close and dismiss. **When not to use** — When the icon is not genuinely unambiguous. **If a new user would hesitate, use a labelled button.** The space saved is not worth the hesitation, and hesitation compounds across a workday.

**Hierarchy** — Always subordinate. An icon button is never the primary action on a screen.

**Density** — 20px icon in a 28 or 32px target; touch expands to 44 without changing the visual size.

**States** — As C-01. **The icon does not animate on hover** (Book I Ch. 8).

**Accessibility** — Accessible name is mandatory and is the *action*, not the icon ("Dismiss", not "X"). Tooltip on hover and focus, but the tooltip is not the label — a tooltip is not read by every assistive path (C-18).

**Book I** — Icons inherit text colour (Ch. 8). Filled means *currently true*, never emphasis.

**Common misuse** — Icon-only rows of five actions where two are unrecognisable. The honest fix is a menu (C-20) with words.

**Scalability** — As the icon set grows, ambiguity grows faster. New icon buttons are reviewed against the whole set, not the screen.

---

## C-03 · Link

**Purpose** — Navigate. Nothing else.

**When to use** — Moving to another location, in prose or in UI. **When not to use** — Any action. A link that submits, deletes, or mutates is a button wearing the wrong clothes, and it breaks every user expectation about middle-click, back, and copy-link.

**Hierarchy** — Two variants: inline (in prose, underlined) and standalone (in UI, accent-coloured, no underline until hover).

**Density** — Inherits surrounding type.

**States** — default · hover · focus-visible · visited (prose only) · active.

**Accessibility** — Real anchor with a real destination. Link text describes the destination — "the evidence trail", not "click here". Underline in prose is not optional: colour alone is prohibited (Book I Ch. 6).

**Book I** — Standalone links consume the accent, and therefore count against the one-accent-per-view budget. A screen with nine accent links has no accent.

**Common misuse** — Buttons styled as links to make a page look calmer. It hides consequence, which is the opposite of what a consequential action needs.

**Scalability** — If a surface accumulates many standalone links, it is a navigation problem (N-01, N-02), not a link-styling problem.

---

## C-04 · Input

**Purpose** — Capture a single value.

**When to use** — Short, single-line values. **When not to use** — More than roughly one sentence (C-05 Textarea). A value from a known set (C-08 Select, C-09 Combobox) — a free-text field where an enumeration exists guarantees inconsistent data.

**Hierarchy** — One variant. Size follows the three control heights.

**Density** — Label above, not inside. **Placeholder-as-label is prohibited**: it disappears on focus, fails at zoom, is read inconsistently by assistive technology, and leaves a filled form unlabelled.

**States** — default · hover · focus · filled · disabled · read-only · error. Read-only and disabled are different meanings and look different — read-only is *not yours to change*, disabled is *not available yet*.

**Accessibility** — Programmatic label association, always. Errors associated with the field, not floating. Error text is never conveyed by border colour alone. `sunken` background, `border-standard`, focus per Ch. 7.

**Book I** — `radius-control`, `color-sunken`. Numeric inputs use `numeric-tabular`.

**Common misuse** — Validating on keystroke and showing an error before the user has finished typing. Validate on blur or submit; interrupting mid-thought is the interface arguing with someone mid-sentence.

**Scalability** — Prefixes, suffixes, and adornments are slots on the one component, never new components.

---

## C-05 · Textarea

**Purpose** — Capture prose the user composes: notes, feedback, reasoning.

**When to use** — Interview notes, decision rationale, anything where the user is thinking in sentences. **When not to use** — Structured data.

**Hierarchy** — One variant.

**Density** — `measure-ui` maximum width. **A full-panel-width textarea is a defect** — it produces a 140-character measure and makes composed text hard to reread (Book I Ch. 5). Auto-grows to a stated maximum, then scrolls.

**States** — As C-04, plus character count where a limit genuinely exists. **No count where there is no limit** — it implies one.

**Accessibility** — Resizable by the user; never `resize: none`. Focus ring on the field, not the container.

**Book I** — `type-read-sm` for content, because this is prose the user will reread.

**Common misuse** — Using it for AI-generated content. Model output is not editable prose in a form field; it is a claim with provenance (A-01) and it must remain distinguishable from what a human wrote (Checklist §8.5).

**Scalability** — Rich text is a different component with a different review, not a mode of this one.

---

## C-06 · Search

**Purpose** — Find a known or partially-known thing.

**When to use** — Any collection large enough that scanning fails. **When not to use** — As a substitute for structure. Search is not an answer to bad IA (Checklist §4.4).

**Hierarchy** — Two forms: scoped (searches the current Index, inline) and global (searches everything, in N-05 or C-21). **The scope must be visible in the field itself**, because a search that silently changes scope produces results the user cannot interpret.

**Density** — Compact in toolbars.

**States** — empty · typing · loading · results · no-results · error. **No-results is a designed state**, not an empty list — it states what was searched, in what scope, and what to try.

**Accessibility** — `search` role, a real label, results announced on update, and clearing must be reachable by keyboard.

**Book I** — Semantic search results carry confidence like any other inference (A-05). A ranked result list is a ranking (D-05) and inherits its prohibitions.

**Common misuse** — Debouncing so aggressively that the interface feels broken, or so little that it thrashes. And: ranking results by semantic similarity without showing why a result matched, which is a verdict without evidence (Gate 2).

**Scalability** — Filters (N-04) compose with search; they do not merge into it.

---

## C-07 · Dropdown

**Purpose** — A trigger that reveals a transient surface. The generic parent of C-08, C-09, C-20.

**When to use** — Effectively never directly. Use the specific child.

**Hierarchy** — Structural, not visual.

**Density** — Panel matches its trigger's density.

**States** — closed · open · positioned (flipped when near a viewport edge).

**Accessibility** — Escape closes and returns focus to the trigger. Focus is trapped while open. Click-outside closes. `aria-expanded` on the trigger.

**Book I** — `elevation-overlay`, `radius-overlay`.

**Common misuse** — Using a dropdown for something with three options. Three options are radio buttons or a segmented control — visible, one click, no hidden state.

**Scalability** — All transient overlay surfaces inherit from this one. Positioning logic lives here once.

---

## C-08 · Select

**Purpose** — Choose one from a short, known set.

**When to use** — Fewer than roughly ten options, all known, no search needed. **When not to use** — More than ten (C-09 Combobox). Fewer than four with equal importance (C-12 Radio — visible beats hidden).

**Hierarchy** — One variant. Matches C-04 visually so control rows align.

**Density** — Control heights per C-01.

**States** — As C-04 plus open. Selected option is marked in the list, not merely highlighted — highlight is hover, and the two must be distinguishable.

**Accessibility** — Full keyboard: arrows, type-ahead, Enter, Escape. Current value announced.

**Book I** — `radius-control` on the trigger, `radius-overlay` on the panel.

**Common misuse** — A select with no default forcing a choice the system could have made well. A good default is a decision made once, by us, with more information than the user has in the moment (Checklist §5.3).

**Scalability** — Grouping is supported. Nested submenus are not — that is a menu (C-20), and nesting in a select is unnavigable by keyboard.

---

## C-09 · Combobox

**Purpose** — Choose from a large set, with typing to narrow.

**When to use** — Roles, skills, locations, people — anywhere the set is large but bounded. **When not to use** — Small sets (C-08). Genuinely open values (C-04).

**Hierarchy** — One variant, single- and multi-select modes.

**Density** — Multi-select shows selections as chips (C-14) inside the field, wrapping to a stated maximum height then scrolling.

**States** — empty · typing · loading · results · no-match · selected · max-reached. **No-match offers a route** — create, request, or broaden — never a dead end.

**Accessibility** — The hardest component here to get right. Combobox pattern with active-descendant, results announced with count, Escape reverting to the last committed value. **If the keyboard path is not complete, the component is not done.**

**Book I** — Filtering highlights matched substrings using weight, never background colour — colour here would be decorative and would collide with state (Ch. 6).

**Common misuse** — Fetching on every keystroke with no loading state, so the list flickers between stale and fresh results and the user selects the wrong thing.

**Scalability** — Async, grouped, and creatable are modes of one component. Three separate components would diverge.

---

## C-10 · Checkbox

**Purpose** — Independent binary choice, or multi-selection within a set.

**When to use** — Options that do not exclude each other. Row selection in tables. **When not to use** — Mutually exclusive options (C-12). An immediate setting change (C-13 Toggle) — a checkbox implies a pending submit.

**Hierarchy** — One variant, three states: unchecked, checked, indeterminate.

**Density** — 16px control, 24px minimum target, expanding to 44 on touch. Label is part of the target.

**States** — unchecked · checked · indeterminate · disabled · focus · error.

**Accessibility** — Real checkbox semantics. Label association mandatory. Indeterminate is set programmatically and announced. Group checkboxes have a group label.

**Book I** — Checked uses the accent. In a table with hundreds of checkboxes, they are the accent instance for that panel — nothing else in the Index competes.

**Common misuse** — Indeterminate used as a third value rather than as *some children selected*. It has one meaning.

**Scalability** — Bulk selection composes with N-06, not with a new variant.

---

## C-11 · Radio *(and Segmented Control)*

**Purpose** — Exactly one from a small, visible set.

**When to use** — Two to five mutually exclusive options where seeing all of them helps. **When not to use** — More than five (C-08). Options needing description beyond a label — that is a card-style choice, not a radio.

**Hierarchy** — Two forms: standard radio group (vertical, with descriptions) and segmented control (horizontal, compact, for view switching).

**Density** — Segmented control at compact height in toolbars.

**States** — unselected · selected · disabled · focus.

**Accessibility** — Radio group semantics: arrows move within the group, Tab moves past it. A group label is mandatory — the individual labels do not explain what is being chosen.

**Book I** — Segmented control uses `radius-control` with square internal dividers (Ch. 7).

**Common misuse** — A radio group with no selection and no way to return to none. If none is valid, it is an explicit option.

**Scalability** — Segmented control is capped at four options; beyond that it becomes tabs (C-25) or a select.

---

## C-12 · Toggle

**Purpose** — Turn something on or off, **taking effect immediately**.

**When to use** — Settings, visibility, feature enablement. **When not to use** — Anything requiring submit (C-10). Anything destructive or irreversible — a toggle implies "and back again", and if it does not go back, it is a button with a confirmation.

**Hierarchy** — One variant.

**Density** — 32×18 track, 24px minimum target.

**States** — off · on · disabled · focus · pending. **Pending exists because immediacy can fail.** A toggle that flips optimistically and silently reverts on failure teaches users the interface lies.

**Accessibility** — `switch` role. Label states what it controls, not the current state — "Email notifications", not "Notifications on".

**Book I** — On uses the accent; the knob and track boundary carry the state independently of colour (Ch. 6).

**Common misuse** — Toggles for filters. A filter is a query, it belongs with N-04, and it needs to be visible in a filter summary — a toggle hides it.

**Scalability** — No sizes, no colours, no labels inside the track.

---

## C-13 · Slider

**Purpose** — Select from a continuous or finely-stepped range where *relative* position matters more than the exact number.

**When to use** — Rarely, and honestly. Weighting, thresholds, ranges. **When not to use** — Any value the user knows precisely. **Almost every slider in enterprise software should be a number input.**

**Hierarchy** — One variant, single and range modes.

**Density** — 4px track, 16px handle, 24px target.

**States** — default · hover · dragging · focus · disabled.

**Accessibility** — Arrow keys step, Home/End jump, Page keys move in larger steps. Current value always visible as text — not only in a tooltip while dragging, which is invisible to keyboard users.

**Book I** — The filled portion uses the accent, which means a panel of sliders spends the accent budget many times over. That is a strong argument against panels of sliders.

**Common misuse** — Sliders on assessment weights presented as precise. If a weight is a real parameter, it deserves a number and an explanation of what it does (A-03).

**Scalability** — Deliberately constrained. New slider variants should be resisted; the component is over-used industry-wide because it demos well.

---

## C-14 · Chip

**Purpose** — A **removable** token representing a user's selection.

**When to use** — Applied filters, multi-select values, recipients. **When not to use** — Anything the user cannot remove. That is a Tag (C-15) or a Badge (C-16).

**Hierarchy** — One variant. **Removability is the definition**, and it is why this is a separate component from C-15 and C-16 rather than a variant of them.

**Density** — Compact. `radius-chip`.

**States** — default · hover · focus · removing.

**Accessibility** — The remove control is separately focusable with its own name ("Remove Senior Engineer filter"). The chip itself is focusable if it is interactive beyond removal.

**Book I** — Neutral by default. Chips inherit meaning from context, not from colour.

**Common misuse** — Chips, tags, and badges used interchangeably. Most systems have all three doing one job, which teaches users that visual difference means nothing. **Three words, three meanings, enforced.**

**Scalability** — Chip groups collapse with a count ("+4") that expands rather than truncating silently.

---

## C-15 · Tag

**Purpose** — A **classification** applied to an object, not removable in place.

**When to use** — Skills, categories, sources, labels on a candidate or role. **When not to use** — System-derived status (C-16 Badge). User selections in a filter (C-14 Chip).

**Hierarchy** — One variant with optional accent for system-significant tags — used sparingly.

**Density** — Compact, `radius-chip`, wraps in lists.

**States** — default · hover (if navigable) · focus.

**Accessibility** — If a tag filters on click, it is a control with a name describing what clicking does. If it is purely informational, it is not focusable — focusable non-interactive elements are noise in a keyboard path.

**Book I** — Neutral. A wall of coloured tags is a decorative palette (Ch. 6).

**Common misuse** — Colour-coding tags by category. It exhausts the palette, carries no meaning to a new user, and fails grayscale.

**Scalability** — At high tag counts, tags become a filter dimension (N-04) rather than more visual elements.

---

## C-16 · Badge

**Purpose** — **System-derived state** on an object. Not chosen, not removable.

**When to use** — Stage, status, flags, counts. **When not to use** — Anything the user applied (C-14, C-15).

**Hierarchy** — Two forms: status badge (label with optional state colour) and count badge (numeric).

**Density** — Compact, `radius-chip`. Count badges use `numeric-tabular` so a column of them aligns.

**States** — Static. Badges do not have interaction states because they are not interactive.

**Accessibility** — Colour never alone: the label carries the meaning (Book I Ch. 6). Count badges have accessible text ("3 unread"), not a bare number.

**Book I** — Uses the state palette where the state is genuinely success/warning/danger/info. **A pipeline stage is not a state colour** — it is a category, and colouring it invents a semantic that does not exist.

**Common misuse** — Every stage in a pipeline given its own colour. Seven stage colours plus four state colours produces eleven meanings the user must learn, and by then colour means nothing.

**Scalability** — New badge *values* are content. New badge *colours* are a system change and almost always the wrong answer.

---

## C-17 · Avatar

**Purpose** — Identify a **user of the system** — a recruiter, an interviewer, a note author.

**When to use** — Authorship and presence: who wrote this note, who is assigned, who is in this workspace. **When NOT to use** — **Candidates in any assessment surface.** See below.

**Hierarchy** — Three sizes: 20 (inline), 24 (rows), 32 (headers). `radius-full` — one of only two permitted uses (Book I Ch. 7).

**Density** — Groups overlap with a maximum of five plus a count.

**States** — image · initials fallback · loading. **Initials are a first-class rendering, not a degraded one**, because in this product they are the default (below).

**Accessibility** — Accessible name is the person's name. Decorative avatars beside a visible name are hidden from assistive technology rather than read twice. Initials meet contrast minimums against their background.

**Book I** — Ch. 10 prohibits real candidate data in imagery; this extends the same logic to the running product.

**Common misuse — and the position this system takes:**

**Candidate photographs do not appear on assessment surfaces.** Not in candidate rows, cards, comparison, ranking, or review.

The reasoning is not squeamishness. A photograph adjacent to an assessment is a documented bias vector: it makes inferences about age, ethnicity, gender, and attractiveness available at the exact moment a judgement is formed, and it does so without entering the evidence trail. Bible Ch. 2 commits us to never assessing protected characteristics, and Checklist §8.6 prohibits any assessment referencing them. **A face rendered beside a score is not an assessment referencing a protected characteristic — but it makes one available, unlogged and untraceable, in a product whose entire claim is that reasoning is traceable.**

Recruiter and interviewer avatars are unaffected. The distinction is *who is being evaluated*.

This is an interpretation of governance rather than a rule stated in it, and it is reported as such in the Self-Review and filed as `DDL-VIS-007`.

**Scalability** — If a future workflow genuinely requires candidate imagery (identity verification, for instance), it is a scoped decision with its own record, not a relaxation of this default.

---

## C-18 · Tooltip

**Purpose** — Name or briefly clarify something already visible.

**When to use** — Icon button labels, truncated text, abbreviation expansion. **When not to use** — **Anything containing unique information.** A tooltip is unavailable on touch, transient, unprintable, and unreachable for many users. If the content matters, it belongs on the surface (Checklist §11.9).

**Hierarchy** — Lowest. Never contains actions or links.

**Density** — Single line where possible; two maximum. A paragraph in a tooltip is a popover (C-19) that was mis-specified.

**States** — hidden · visible. Appears on hover **and on focus** — focus-only-on-hover excludes keyboard users entirely.

**Accessibility** — Not a substitute for an accessible name. Dismissible with Escape. Persists while the pointer is over the tooltip itself, so a user can read a long one.

**Book I** — `elevation-overlay`, `radius-control` (small surface, small radius).

**Common misuse** — Explaining a confusing interface with tooltips. That is a clarity failure being patched (Checklist §14 C2). Also: tooltips on everything, which makes the pointer a source of constant interruption.

**Scalability** — As surfaces get denser the temptation grows. The rule holds: tooltips name, they do not inform.

---

## C-19 · Popover

**Purpose** — Present secondary content in place, without leaving context.

**When to use** — Evidence detail, a compact form, a preview. **When not to use** — Content that deserves a panel (Book I Ch. 2 Inspector). Anything requiring a decision with consequence (C-23 Dialog).

**Hierarchy** — Above the surface, below dialogs. Non-modal: the page remains usable.

**Density** — Matches its trigger's context. Maximum height, then scrolls internally.

**States** — closed · open · positioned.

**Accessibility** — Focus moves in on open and returns to the trigger on close. Escape closes. Not a focus trap, because it is not modal — but Tab must eventually leave it.

**Book I** — `elevation-overlay`, `radius-overlay`.

**Common misuse** — Popovers inside popovers. A second layer is unreachable by keyboard and unreadable on a laptop. If a popover needs a popover, the content needs a panel.

**Scalability** — Evidence popovers (A-04) are the highest-traffic use in this product and are specified there.

---

## C-20 · Menu

**Purpose** — A list of actions on a specific object or context.

**When to use** — Row actions, contextual operations, overflow. **When not to use** — Navigation (N-01, N-02). Selecting a value (C-08).

**Hierarchy** — Grouped with separators. Destructive actions are last, separated, and labelled with their consequence.

**Density** — Compact. Icons optional and only where genuinely aiding recognition (C-02 logic).

**States** — closed · open · item hover · item focus · item disabled.

**Accessibility** — Menu semantics, arrow navigation, type-ahead, Escape, focus return. Disabled items state why, or are omitted — a permanently greyed item the user cannot understand is worse than its absence.

**Book I** — `elevation-overlay`. Destructive items use `color-state-danger-fg` — one of the few legitimate state-colour uses in a menu.

**Common misuse** — Overflow menus as a dumping ground. A menu with fourteen items is an information architecture problem (Checklist §4.4), and burying a frequently-used action there costs more than the toolbar space it saved.

**Scalability** — One nesting level maximum, and only for genuine sub-choices. Deep nesting is unnavigable by keyboard and unusable on a trackpad.

---

## C-21 · Command Palette

**Purpose** — Keyboard-first access to navigation, actions, and search.

**When to use** — **As primary navigation for experienced users, not as a power-user extra.** Our users work at volume, on keyboards, all day (Book I Ch. 12) — for them the palette is the fastest path to everything, and treating it as a bonus feature under-invests in the interaction that most defines expert use of this product.

**When not to use** — As a replacement for visible navigation. Discoverability requires visible structure; the palette accelerates people who already know what they want.

**Hierarchy** — Above everything. The only overlay permitted to cover the workspace entirely.

**Density** — Compact rows, grouped by kind (Go to / Do / Find), with the group visible.

**States** — closed · open · empty · typing · results · no-match · executing.

**Accessibility** — Full keyboard by definition. Results announced with counts. Escape closes and returns focus exactly where it was — **exactness matters here**, because the palette is used mid-task and losing position defeats the purpose.

**Book I** — `elevation-overlay`. Results are ranked, so ranking rules apply (D-05): matched substrings emphasised by weight, no relevance scores displayed as numbers.

**Common misuse** — Making it a search box only. Its value is that *actions* live there too. Second misuse: results ordered by fuzzy-match score with no grouping, so the user cannot predict what the top result will be — and unpredictability destroys the speed that justifies the component.

**Scalability** — Every new surface registers its actions here. The palette is the one place where completeness across the product is enforceable, and it degrades quietly if new features skip registration.

---

## C-22 · Toast

**Purpose** — Notify that an **asynchronous** operation completed or failed.

**When to use** — Background work finishing: an import, an export, a batch analysis. **When NOT to use** — Confirming a direct action the user just took. That feedback belongs **inline, at the site of the action** (Bible Ch. 13: feedback proportional to consequence, at the point of consequence).

This is a deliberate departure from common practice. Toasts are the default success-feedback pattern in most systems, and they are the wrong one: they appear away from where the user is looking, they disappear on a timer, they stack, and they are frequently missed. A saved field should say "saved" where the field is.

**When never to use** — Errors requiring action, or anything the user must read. A transient message is not a reliable channel (C-24 Alert).

**Hierarchy** — Lowest priority surface. Never covers the primary action area.

**Density** — One line plus optional single action. Maximum three stacked; beyond that, collapse to a count.

**States** — entering · visible · exiting · persistent (error toasts do not auto-dismiss).

**Accessibility** — Polite live region for success, assertive for failure. **Never the only notification of an important event.** Dismissible by keyboard, and hoverable to pause any timer.

**Book I** — `elevation-overlay`. Motion intent: enter and exit quickly, settle, never bounce (Ch. 9).

**Common misuse** — "Saved!" on every keystroke-autosave. Beyond the noise, it trains users to ignore the channel, which then costs us the one toast that mattered.

**Scalability** — Filed as `DDL-VIS-008`. The restriction is the point; relaxing it returns us to notification noise.

---

## C-23 · Dialog

**Purpose** — Interrupt to obtain a decision that cannot proceed without one.

**When to use** — Irreversible actions, genuine confirmations, focused sub-tasks. **When not to use** — Reversible actions. **Confirmations on safe actions are actively harmful**: they train reflexive dismissal, which disarms the confirmations that matter (Checklist §14 C1). Where undo exists, prefer undo.

**Hierarchy** — Modal. Highest interruption cost of any component, and it should feel expensive to add one.

**Density** — Title, body, actions. Reading measure applies to the body. Maximum height, then internal scroll with actions pinned visible.

**States** — closed · open · submitting · error.

**Accessibility** — Focus trapped, moved to the first meaningful element (not always the close button), returned to the trigger on close. Escape closes unless data would be lost, in which case it prompts. `aria-modal`, labelled by its title. Background inert.

**Book I** — `elevation-overlay`, `radius-overlay`, `scrim-overlay`.

**Common misuse** — Confirmation text that does not name the consequence. "Are you sure?" is not a confirmation; "Reject 4 candidates? They will be notified." is. In this product, consequences frequently reach people outside the room, and the dialog is the last place we can say so.

**Scalability** — One size, one shape. Nested dialogs are prohibited; a dialog that needs a dialog is a flow that needs a surface.

---

## C-24 · Alert

**Purpose** — Persistent, in-place communication about a condition affecting what the user is looking at.

**When to use** — Validation summaries, degraded service, permission limits, data that could not be loaded. **When not to use** — Transient confirmation (inline feedback). Marketing messages — an alert component used for promotion permanently devalues it.

**Hierarchy** — Four levels matching the state palette, plus a neutral informational form for conditions that are not good or bad.

**Density** — Inline within the affected region, not floating. Positioned where the condition applies.

**States** — Static, optionally dismissible. **Dismissal must not remove information the user still needs** — a dismissed alert about degraded results leaves a user reading degraded results with no indication.

**Accessibility** — `role="alert"` only when it appears dynamically and is urgent. Static page-load alerts are ordinary content with a heading. Colour never alone (Book I Ch. 6).

**Book I** — State palette per Ch. 6. **Never used for confidence** — Tier 3 has its own channel (A-05), and an alert around a low-confidence assessment says *warning* where we mean *unresolved*.

**Common misuse** — An alert on every screen. Alerts are for conditions, not for orientation, and a permanent alert is a layout element that has stopped being read.

**Scalability** — Four levels. A fifth means the taxonomy is wrong.

---

## C-25 · Drawer

**Purpose** — A panel entering from an edge for a task adjacent to, but not replacing, the current context.

**When to use** — Detail that would otherwise be a route, on narrower viewports where the Inspector cannot persist (Book I Ch. 13). Multi-step sub-tasks preserving background context. **When not to use** — At Standard width and above, where an Inspector panel is the honest structure. **A drawer is not a way to add a fourth panel** (Book I Ch. 2).

**Hierarchy** — Above content, below dialogs. Modal or non-modal, stated per use.

**Density** — Working density. Reading measure enforced within it.

**States** — closed · open · submitting.

**Accessibility** — As C-23 when modal. Non-modal drawers must not trap focus but must be escapable and must not strand the user behind them.

**Book I** — `elevation-overlay`. Motion intent: enters from the edge it belongs to and returns there — spatial honesty (Bible Ch. 10).

**Common misuse** — Drawers as a home for anything without a place. It is the workspace equivalent of an overflow menu, and it accumulates.

**Scalability** — One drawer at a time. Stacked drawers are prohibited.

---

## C-26 · Tabs

**Purpose** — Switch between **peer views of the same subject**.

**When to use** — Facets of one candidate: Overview, Evidence, Interviews, Activity. **When not to use** — Steps in a sequence (that is a flow). Navigation between different subjects (N-01). Hiding content that should be visible together — tabs are the most common way a comparison gets broken up into things that cannot be compared.

**Hierarchy** — One level. **Nested tabs are prohibited** — they are unnavigable and they indicate the subject is really two subjects (Checklist §4.6).

**Density** — Compact in workspaces. Labels are nouns, sentence case.

**States** — inactive · active · hover · focus · disabled · with-count.

**Accessibility** — Tab-list semantics: arrows move between tabs, Tab moves into the panel. Active tab is programmatically and visually current. Panels labelled by their tab.

**Book I** — Active state carries `color-border-strong` on the edge plus weight change — never colour alone.

**Common misuse** — A count badge on every tab, so the counts stop meaning anything. Counts belong where the number changes a decision about where to go.

**Scalability** — Six tabs maximum. Beyond that the subject has too many facets, which is an IA finding.

---

## C-27 · Accordion

**Purpose** — Progressive disclosure of independent sections in a long, scannable list.

**When to use** — FAQ-shaped content, long forms with optional sections, evidence grouped by source. **When not to use** — Hiding primary content. Accordions used to make a page look shorter are concealment, not disclosure (Checklist §4.5) — **the user must be able to tell what they are not seeing** from the collapsed header alone.

**Hierarchy** — One level. Nested accordions are prohibited.

**Density** — Headers compact; content at working density.

**States** — collapsed · expanded · hover · focus · disabled.

**Accessibility** — Header is a real button with `aria-expanded`. Content is associated with it. Multiple sections may be open simultaneously by default — forcing single-open prevents comparison, which is our users' most common reason for opening two things.

**Book I** — Chevron rotates as a state change, under 150ms (Ch. 8 exception).

**Common misuse** — Collapsed by default when the content is the reason the user came. Default state is a decision, and the default should be whatever the majority of users need first.

**Scalability** — Evidence grouping is the highest-traffic use here (A-04).

---

## C-28 · Breadcrumbs

**Purpose** — Show position in a hierarchy and offer a route back up.

**When to use** — Genuinely nested structures three or more levels deep. **When not to use** — Flat structures. **A breadcrumb with two items is decoration.** Also not a history trail — breadcrumbs show structure, not the path taken.

**Hierarchy** — Low. Small, secondary text, never competing with the page title.

**Density** — Compact, `type-ui-sm`, collapsing the middle with an expandable ellipsis when long.

**States** — default · hover · current (not a link).

**Accessibility** — `nav` with a label, current item marked `aria-current` and not focusable as a link.

**Book I** — Separator is a chevron at `color-text-tertiary`. Not a slash — a slash reads as part of a path string, especially beside our mono usage.

**Common misuse** — Duplicating the sidebar's information. If the sidebar already shows position, breadcrumbs add nothing and cost a row.

**Scalability** — If the hierarchy exceeds four levels, the IA is too deep (Checklist §4.4).

---

## C-29 · Pagination

**Purpose** — Move through a large result set in bounded pages.

**When to use** — Result sets where **position matters and the user needs to return to it** — the common case in our Index panels, where a recruiter works through a queue over hours and may come back tomorrow. **When not to use** — Feeds and timelines, where continuity matters more than position (infinite scroll is honest there).

**Hierarchy** — Low, but always visible at the end of a list and never hidden behind scroll on a virtualised table.

**Density** — Compact. Total count is shown, not just page numbers. **"Page 3 of 12" is less useful than "61–90 of 347"** for someone tracking how much of a queue remains.

**States** — default · current page · disabled ends · loading.

**Accessibility** — `nav` with a label. Current page marked. Controls named by destination ("Next page"), not by glyph.

**Book I** — Numbers use `numeric-tabular` so the control does not shift width as page numbers grow.

**Common misuse** — Infinite scroll on a work queue. It makes position unrecoverable, breaks the browser back button, and makes "where was I" unanswerable — which for a recruiter working a pipeline over several days is a genuine productivity failure, not a preference.

**Scalability** — Cursor-based pagination changes the implementation, not the component's contract.

---

## C-30 · Card

**Purpose** — Group related content into a single addressable object.

**When to use** — When items are genuinely objects with several attributes, and comparison across them is not the primary task. **When NOT to use** — **When the user needs to compare across items. That is a table** (C-31).

This is the most consequential misuse in enterprise product design. Converting a table to cards makes a screen look calmer and destroys column alignment, which is the entire mechanism of comparison. Book I Ch. 2 and Checklist §14 A2 both name it: cleanliness achieved by relocation.

**Hierarchy** — `elevation-ground`. **Cards are not elevated** (Book I Ch. 3) — this is the rule most often broken, because lifting a card is the reflexive way to make it feel like an object.

**Density** — Working. Internal spacing uses `space-inter-*`; content within a field uses `space-intra-*`.

**States** — default · hover (if navigable) · selected · focus.

**Accessibility** — If the whole card is clickable, it is one control with one accessible name — not a div with a click handler and three nested links, which produces an unusable keyboard path.

**Book I** — `radius-container`, `color-border-standard`, no shadow.

**Common misuse** — Beyond the table substitution: nested cards. A card inside a card means the grouping is wrong.

**Scalability** — Card *content* varies by context (D-04, D-07); card *chrome* does not.

---

## C-31 · Table

**Purpose** — **Compare and scan structured data across rows.** Our primary data visualisation (Book I Ch. 11).

**When to use** — Any collection where the user's question involves comparing a value across items. This is most of our Index panels and it should be the default rather than the fallback. **When not to use** — Editing many cells (C-32 Data Grid). Fewer than three attributes per item, where a list is lighter.

**Hierarchy** — The dominant element of an Index panel. Chrome is minimal so data reads first.

**Density** — Compact by default in Index panels. Row height fixed; **text truncates rather than wrapping** — a wrapped cell breaks row scanning, which is the reason the table exists.

**States** — Row: default · hover · selected · focused · flagged. Table: loading · empty · error · filtered-empty. **Filtered-empty is distinct from empty** and says so, offering to clear filters — "no results" when the user has four filters applied is an unhelpful truth.

**Accessibility** — Real table semantics with header associations. Sortable headers are buttons announcing the sort state. Row selection is a labelled checkbox per row. **Sticky header on any table taller than the viewport** — a column you cannot identify is a column you cannot read.

**Book I** — `numeric-tabular`, numbers right-aligned (Ch. 5). Hairline row borders, **no zebra striping** — striping is a background pattern carrying no information that interferes with genuine row state (Ch. 11).

**Common misuse** — Three failures, in order of frequency:
1. **Replacing it with cards** to look modern (above).
2. **Truncating columns** to fit a comfortable width instead of using Field width (Book I Ch. 2). Content whose value scales with width gets the width.
3. **Ambiguous empty cells.** *No data*, *zero*, and *not applicable* are three meanings; rendering all three blank destroys information we already have.

**Scalability** — Column configuration, sorting, and virtualisation extend it. Editing does not — see C-32.

---

## C-32 · Data Grid

**Purpose** — **Edit** structured data in place.

**When to use** — Bulk correction, structured annotation, anything where the user's job is changing values across many rows. **When not to use** — Reading and comparing. That is C-31.

**Hierarchy** — Distinct component, not a mode of Table. **Most design systems conflate the two, and it is a mistake with real cost** — the affordances directly conflict. A read table wants minimal chrome, truncation, and row-level selection. An edit grid needs visible cell boundaries, cell-level focus, an editing state, validation per cell, and undo. Merging them produces a table that is noisy to read and a grid that is unsafe to edit. Filed as `DDL-VIS-009`.

**Density** — Compact, with visible cell boundaries — the one place `color-border-subtle` appears on every cell rather than only between rows.

**States** — Cell: readonly · focused · editing · invalid · saving · saved · conflicted. **Conflicted is required**: concurrent editing is real, and silently overwriting someone's change is a data-integrity failure presented as a UI convenience.

**Accessibility** — Grid semantics with two-dimensional arrow navigation. Enter enters edit mode, Escape cancels and reverts, Tab commits and advances. Validation announced per cell. This is among the most demanding keyboard patterns in the system and it is not optional.

**Book I** — Inherits Table's typography and alignment. Editing state uses `color-border-focus`; invalid uses the danger state with a message, never colour alone.

**Common misuse** — Optimistic save with no failure path. If a save fails, the cell must show it and retain the user's input — discarding typed work is the least forgivable failure in this component.

**Scalability** — Editing is the boundary. Anything requiring a workflow around the change belongs in a form or a dialog.

---

## C-33 · Timeline

**Purpose** — Show ordered events with their temporal relationships.

**When to use** — Candidate history, decision provenance, audit trail — where *when* and *in what order* carry meaning. **When not to use** — Unordered lists. A timeline treatment on non-chronological content invents a sequence.

**Hierarchy** — Chronological spine; events are peers. Recency at top for active work, oldest first for narrative reconstruction — stated per surface, never mixed.

**Density** — Compact rows. Time is `type-ui-sm`, `numeric-tabular`, at a consistent width so the spine aligns.

**States** — default · expanded · hover · current.

**Accessibility** — Ordered list semantics. Dates in a machine-readable form as well as a human one. Relative times ("3 days ago") carry the absolute date accessibly — relative time alone is unusable for anyone reconstructing a sequence.

**Book I** — The spine is `color-border-subtle`. Event markers are shape-differentiated, not colour-differentiated (Ch. 6).

**Common misuse** — Mixing system events and human actions without distinction. In a product built on traceability, **who did this** — a person, the system, or a model — is the most important attribute of any event (Checklist §8.5).

**Scalability** — Grouping by day or by stage is a display mode; the underlying component is one.

---

## C-34 · Activity Feed

**Purpose** — Show recent events across many objects.

**When to use** — Workspace-level awareness: what changed while you were away. **When not to use** — As a notification system. A feed is passive; anything requiring action needs a route to that action, not a mention in a list.

**Hierarchy** — Secondary. A feed never occupies the Subject panel.

**Density** — Compact, grouped by day, collapsing repetitive events ("Sam moved 6 candidates to Screen") rather than listing six rows.

**States** — loading · empty · loaded · new-items-available. **New items do not insert themselves into a list the user is reading** — they announce themselves and insert on request.

**Accessibility** — Polite live region for new-item announcements, never assertive. Each item independently navigable.

**Book I** — Actor distinction as C-33: model-generated activity is visually distinguishable from human activity, always.

**Common misuse** — Feeding every event into it until it is unreadable. A feed with no filtering is a log, and users stop reading logs (Checklist §14 A3 logic applied to feeds).

**Scalability** — Filtering by actor, object, and type extends it. More event types do not.

---

## C-35 · Empty State

**Purpose** — Explain what belongs here and how to make it appear.

**When to use** — Every collection surface, every panel, every table. **This is not optional** (Checklist §5.7).

**When not to use** — Never omitted. A blank region is a defect.

**Hierarchy** — Occupies the region it explains, centred, at Reading measure.

**Density** — Sparse register. Heading, one or two sentences, one action where an action exists.

**States** — Four distinct kinds, and conflating them is the most common failure:

| Kind | Message |
|---|---|
| **Never had data** | What this is, and how to get the first one |
| **Filtered to nothing** | What was filtered, with a clear-filters action |
| **Permission** | That access is the reason, and who to ask |
| **Error** | What failed, and a retry |

**Accessibility** — A real heading so the region is navigable. Any action is a real button.

**Book I** — **No illustration** (Ch. 9). An empty state is a marketing surface at the moment of maximum intent (Bible Ch. 12); a drawing of an empty box occupies the space where the explanation should be and tells the user nothing.

**Common misuse** — "No data" as the entire message. It states what the user can already see and withholds everything they need.

**Scalability** — Every new collection surface ships its four empty states. This is a review gate, not a follow-up.

---

## C-36 · Loading State

**Purpose** — Communicate that something is happening, honestly.

**When to use** — Any operation above the perceptual threshold. **When not to use** — Below it: a spinner flashing for 80ms is worse than no spinner.

**Hierarchy** — Three forms by duration:

| Duration | Form |
|---|---|
| Instant | Nothing |
| Brief | Indeterminate indicator |
| Extended | **Named progress** — what is happening, and progress where it is knowable |

**"Reading 47 resumes" is a fundamentally different experience from a spinner**, because the user can calibrate their patience (Bible Ch. 13).

**States** — idle · loading · succeeded · failed · partial. **Partial is required** for batch operations — silently returning 43 of 47 results is a correctness failure the interface is concealing.

**Accessibility** — Polite live region. Loading regions marked busy. Focus is not stolen on completion.

**Book I** — Motion intent per Ch. 9: the indicator ends when the operation does.

**Common misuse — and a blocking gate** — **Fake progress and artificial thinking delay are prohibited absolutely** (Checklist §7.8, **Gate 4**; §14 F3). No progress bar unconnected to progress. No deliberate pause to make AI feel considered. This is not a strong preference — it is a lie the interface tells about a product whose entire positioning is honest output, and a review encountering it terminates unscored.

**Scalability** — As operations get longer, named progress becomes more important, not less.

---

## C-37 · Skeleton

**Purpose** — Reserve layout during load to prevent shift.

**When to use** — Where the final layout is known in advance and load is brief. **When not to use** — When the final layout is unknown or variable. **A skeleton resolving into a different shape is worse than a spinner**, because it promises a structure and then reflows — and layout shift in the first second is the most quality-destroying event on a page (Checklist §12.4).

**Hierarchy** — Invisible by intent. Neutral, low contrast, no shimmer.

**Density** — Matches the real content exactly: same row heights, same column widths, same count where known.

**States** — visible · replaced.

**Accessibility** — Marked busy, hidden from assistive technology, announced on completion. A screen reader must never read skeleton placeholders as content.

**Book I** — `color-sunken`. **No shimmer animation** — it is ambient motion, which is prohibited (Bible Ch. 10, Book I Ch. 14 never 36 logic). A static placeholder communicates the same thing without a loop running in peripheral vision.

**Common misuse** — Skeletons for slow operations. Beyond a couple of seconds, a skeleton is a promise the interface is not keeping; use named progress (C-36).

**Scalability** — Each new layout that loads asynchronously ships its skeleton alongside it, not afterwards.

---

# PART III — NAVIGATION

---

## N-01 · Sidebar

**Purpose** — Persistent primary navigation and workspace context.

**When to use** — Every workspace surface. **When not to use** — Marketing (N-02). Secondary navigation within a subject (C-26 Tabs).

**Hierarchy** — The Navigation panel of Book I Ch. 2. The only region that never scrolls with content. Visually recessive: it is the least important thing on screen once the user knows where they are.

**Density** — Compact. Sections separated by `space-inter-5`, items by `space-inter-1`.

**States** — expanded · rail (icons + accessible labels) · hidden. Item: default · hover · active · focus · with-count.

**Accessibility** — `nav` with a label. Active item marked `aria-current`. In rail mode, labels remain accessible and appear on hover and focus. Rail mode is not a licence to remove names.

**Book I** — Active state uses weight and `color-border-strong`, plus a filled icon (Ch. 8: filled means currently true). **The sidebar is not accent-branded** — Ch. 6 prohibits branding chrome with colour, and it would spend the accent on every screen permanently.

**Common misuse** — Growing without limit. A sidebar with eleven top-level items has an IA problem (Checklist §4.4). Counts on every item is the second: a count belongs where the number changes where you would go.

**Scalability** — New product areas take a sidebar slot only after the IA review confirms they are peers of existing ones (Checklist §4.1).

---

## N-02 · Top Navigation

**Purpose** — Marketing and public-surface navigation.

**When to use** — Marketing pages only. **When not to use** — The workspace, which uses N-01. Two navigation systems on one surface is a structural failure.

**Hierarchy** — Present but subordinate to the page's argument. Sticky, using `elevation-raised` — one of the few legitimate translucency cases, because sensing the content move beneath is the point (Book I Ch. 3).

**Density** — Sparse. Marketing register.

**States** — top · scrolled · mobile-expanded.

**Accessibility** — `nav` with a label. Mobile menu is a real disclosure with focus management. Skip-to-content link first in the tab order.

**Book I** — At most one accent element: the primary call to action (Ch. 6).

**Common misuse** — A mega-menu on a site with nine pages. It signals more than exists.

**Scalability** — Grows with the marketing site, not with the product.

---

## N-03 · Workspace Header

**Purpose** — Identify the current subject and expose the actions that apply to it.

**When to use** — At the top of any Subject panel. **When not to use** — As a second navigation layer. The header describes *what you are looking at*, not *where you can go*.

**Hierarchy** — Title is the most prominent element in the panel. Metadata beneath at `type-ui-sm`. Actions right-aligned, at most one primary.

**Density** — Working. Collapses to a compact form on scroll, retaining title and primary action — the two things a user needs when deep in a long subject.

**States** — default · scrolled-compact · loading · error.

**Accessibility** — Title is the panel's `h1`. Actions are a labelled group. On scroll-collapse, focus order does not change — a reordering tab sequence mid-scroll is disorienting.

**Book I** — `type-display-sm` for the title. Status carried by C-16 Badge, never by title colour.

**Common misuse** — Accumulating actions until there are nine. Beyond about four, group into N-07 or a menu, ordered by frequency rather than by importance-as-imagined.

**Scalability** — Actions register into a defined set of slots — primary, secondary, overflow — so a new feature cannot simply append.

---

## N-04 · Filters

**Purpose** — Narrow a collection to a working set.

**When to use** — Any Index panel over roughly fifty items. **When not to use** — As a substitute for good defaults. If most users apply the same filter every time, that is the default and should not need applying (Checklist §5.3).

**Hierarchy** — Above the Index, below the header. **Applied filters are always visible as chips (C-14)** — a hidden active filter is the single most common cause of "the data is wrong", and the user has no way to discover the cause.

**Density** — Compact. Filter controls collapse into a menu; **applied state never collapses.**

**States** — none · applied · loading · invalid-combination.

**Accessibility** — Each filter is a labelled control. Result count is announced on change. Clear-all is a single reachable action.

**Book I** — Chips are neutral (Ch. 6). The result count uses `numeric-tabular` so it does not jitter as it updates.

**Common misuse** — Filters that persist across sessions without saying so, producing a user who is confident they are looking at everything and is not.

**Scalability** — Saved filter sets are a feature built on this component, not a variant of it.

---

## N-05 · Search Bar

**Purpose** — The persistent, always-available entry point to search.

**When to use** — Workspace header or sidebar, one per surface. **When not to use** — Duplicated alongside a scoped search (C-06) without a visible scope distinction.

**Hierarchy** — Visible but not prominent. **Its keyboard shortcut is displayed in the field** — this is the primary way users discover that C-21 exists, and discovery of the palette is worth the pixels.

**Density** — Compact.

**States** — As C-06, plus a focused state that may escalate into the command palette.

**Accessibility** — Reachable by keyboard shortcut from anywhere, and the shortcut is discoverable without documentation.

**Book I** — Neutral. Search is not an accent element.

**Common misuse** — A search bar that only searches the current page while looking global. Scope must be legible before the user types, not inferred from results.

**Scalability** — The bar is the visible affordance; C-21 is the capability. They stay coupled.

---

## N-06 · Bulk Action Bar

**Purpose** — Act on a multi-row selection.

**When to use** — Any Index supporting multi-select. **When not to use** — For destructive actions without per-item confirmation showing scope. **"Reject 23 candidates" must state the number and what happens to those people**, because bulk actions in this product reach people outside the room (Bible Ch. 14).

**Hierarchy** — Appears on selection, anchored to the Index, replacing nothing. It does **not** float over content and it does not cover the last row — a bar covering the row you are about to select is an easy and infuriating failure.

**Density** — Compact. Selection count first, then actions ordered by frequency, then clear-selection.

**States** — hidden · visible · executing · partial-success. **Partial success is mandatory**: 20 of 23 succeeded must be reported per item, not as a single ambiguous toast.

**Accessibility** — Selection count announced on change. Focus is not stolen when the bar appears. The bar is reachable in tab order immediately after the selection.

**Book I** — `elevation-raised` — genuinely persists above content it outlives. Destructive actions use the danger state and always confirm (C-23).

**Common misuse** — Applying an irreversible action to a filtered selection where the filter is not visible in the confirmation. The confirmation states the filter, the count, and the consequence.

**Scalability** — Actions register from the surface; the bar does not maintain its own list.

---

## N-07 · Context Toolbar

**Purpose** — Actions applying to the current view rather than to a specific object.

**When to use** — Density switching, column configuration, export, view mode. **When not to use** — Object actions (N-03 or row menus). Navigation (N-01).

**Hierarchy** — Subordinate to the header. Icon buttons with tooltips, or compact labelled controls.

**Density** — Compact, right-aligned.

**States** — default, plus per-control states.

**Accessibility** — `toolbar` semantics with arrow navigation between controls, so it is one tab stop rather than seven.

**Book I** — Neutral. No accent — these are never the primary action.

**Common misuse** — Mixing view actions with object actions. The user then cannot predict what a control will affect, which is worse than either grouping alone.

**Scalability** — The natural home for controls that would otherwise accumulate in N-03.

---

# PART IV — DATA COMPONENTS

---

## D-01 · Metric Card

**Purpose** — Present a single number that answers a specific question.

**When to use** — When the number **changes a decision**. **When not to use** — Anywhere else. A metric card that does not change behaviour is training the user to ignore the region, which then costs us the metrics that matter (Checklist §14 A3).

**Hierarchy** — Label first, value second, context third. **The label is a question or a claim, not a noun**: "Candidates awaiting review" beats "Candidates".

**Density** — Compact. Value at `type-display-xs`, never the heaviest weight — a very large bold number reads as a scoreboard, and our numbers are evidence, not results.

**States** — loading · loaded · no-data · stale. **Stale is required.** A number from a cached computation must say when it was computed; an out-of-date number presented as current is a small dishonesty that undermines every other number beside it.

**Accessibility** — Label and value programmatically associated. Trend indicators are not colour-only — direction is carried by an arrow and by text.

**Book I** — `numeric-tabular`. No sparkline without the value present (Ch. 11).

**Common misuse** — A row of six metric cards because the space existed. Each one must answer §3.1: what decision changes based on this?

**Scalability** — New metrics justify themselves individually. The card does not become a dashboard by accumulation.

---

## D-02 · Analytics Card

**Purpose** — A metric with its supporting visualisation, in context.

**When to use** — When the *shape* of the data matters — a trend, a distribution — and a bare number would hide it. **When not to use** — When the number alone answers the question (D-01). When a table would answer it more precisely (C-31).

**Hierarchy** — Title, then the chart, then the value. Chart supports the number; it does not replace it.

**Density** — Working. Chart legible at its rendered size or it is not shown.

**States** — As D-01, plus insufficient-data — **which is not an error**. Not enough data to show a trend is a true and useful statement.

**Accessibility** — Chart has a text alternative conveying the finding, not the shape. Underlying values available as a table on demand — this is the accessible path and it is also frequently the *better* path for a precise user.

**Book I** — Ch. 11 governs entirely: single accent per chart, direct labelling over legends, grayscale-survivable, no prohibited chart types.

**Common misuse** — Charting three data points. A trend line over three weeks is noise presented as a pattern.

**Scalability** — New chart types are a Book I Ch. 11 change, not a card variant.

---

## D-03 · Chart *(philosophy only)*

**Purpose** — Show a shape a table forces the reader to compute.

**Governance** — Book I Ch. 11 is authoritative and complete. Book II adds no chart rules; it only fixes the component contract:

- Every chart consumes `color-data-*` semantic tokens. No chart references a primitive or an accent step.
- Every chart states its uncertainty via the definition channel — extent, band, open mark — **never hue** (Book I Ch. 6, `DDL-VIS-004`).
- Every chart has a text alternative stating the finding.
- Every chart survives grayscale.
- **No animation on load.** Motion that delays reading is prohibited (Ch. 9 commitment 2).
- Prohibited types are prohibited at the component layer, not by convention: pie, donut, radar, 3D, dual-axis, truncated-axis bars, word clouds.

**Common misuse** — Building a chart because a surface looked empty. The remedy for an empty surface is content, not encoding.

---

## D-04 · Candidate Row

**Purpose** — Represent one candidate in a scannable list, at a density supporting comparison across rows.

**When to use** — Index panels, queues, search results, shortlists. **When not to use** — When fewer than five attributes matter — then it is a simpler list.

**Hierarchy** — Fixed left-to-right order, **constant across every surface in the product**: identity → stage → assessment → confidence → recency → actions. Constancy is what makes rows scannable; a row whose column order varies by screen forces re-reading every time.

**Density** — Compact. Single line height, truncation over wrapping.

**States** — default · hover · selected · focused · viewed · flagged. **Viewed** matters more than it appears: a recruiter working a queue over days needs to know what they have already looked at, and its absence causes real duplicated work.

**Accessibility** — A row is one navigable unit with an accessible name including the candidate's name and stage. Row actions are reachable without a pointer.

**Book I** — **No candidate photograph** (C-17). Confidence uses the definition channel (A-05). Assessment is never the visually dominant element in the row — visual weight maps to importance, and identity outranks score.

**Common misuse** — Sorting by score with no confidence shown, producing a ranking whose top entries may be the ones we know least about. **A ranked list without confidence is a verdict list** (Gate 2).

**Scalability** — Column configuration extends it. New always-visible attributes require removing one — the row has a fixed budget, and defending it is what keeps the Index scannable.

---

## D-05 · Ranking List

**Purpose** — Present candidates in an order derived from evidence against a stated bar.

**When to use** — When order genuinely helps and the basis is explainable. **When not to use** — When the ordering cannot be explained. **An unexplainable ranking is a verdict** (Bible Ch. 2, Gate 2).

**Hierarchy** — Position is shown as a number, quietly. **Prohibited: podiums, medals, trophies, size-scaled entries, leaderboard framing, colour ramps from best to worst.** Rank is not worth (Book I Ch. 11) — a candidate ranked fourth is fourth on this evidence against this bar, and dramatising that is a claim we have committed never to make.

**Density** — Compact rows (D-04).

**States** — As D-04, plus re-ranking, which is announced and never animates rows past each other — watching people reshuffle is both distracting and tonally wrong.

**Accessibility** — Ordered list semantics. Rank announced as part of each row's name.

**Book I** — **The ranking basis is stated adjacent to the list**, not buried in settings. Every entry carries its confidence. Ties are shown as ties rather than broken arbitrarily — an arbitrary tiebreak presented as an order is a small fabrication.

**Common misuse** — Top-N truncation with no indication of what was excluded. Silent truncation reads as "these are the candidates" when it means "these are the first ten by one ordering".

**Scalability** — New ranking dimensions extend the basis statement, which must remain a sentence a recruiter can read.

---

## D-06 · Comparison Table

**Purpose** — Show where candidates genuinely differ.

**When to use** — Two to five finalists. **When not to use** — More than five, where no layout supports real comparison. Single-candidate review (A-01, A-04).

**Hierarchy** — **Dimension-aligned rows, candidates as columns.** The user's question is *where do these diverge*, and dimension-aligned rows answer it in one scan (Book I Ch. 11).

**Density** — Dense. Field width — this is the canonical case for content whose value increases with width (Book I Ch. 2).

**States** — default · dimension-highlighted · evidence-expanded.

**Accessibility** — Real table semantics with both row and column headers. Divergent dimensions are marked by text and shape, never by colour alone.

**Book I** — **Missing evidence is a distinct visual state — not a zero, not a blank.** Absence of evidence and evidence of absence look identical if we are careless, and the difference is the entire point of the comparison. Confidence per cell via the definition channel.

**Common misuse** — A composite "overall" row that hides its components. If an aggregate appears, its parts are one interaction away (Book I Ch. 11).

**Scalability** — Custom dimensions extend rows. The column budget stays at five.

---

## D-07 · Comparison Card

**Purpose** — A single candidate's summary within a comparison context.

**When to use** — Side-by-side review where each candidate needs several attributes visible together. **When not to use** — Instead of D-06 when the question is dimensional. Cards make each candidate legible and cross-candidate comparison harder — the exact trade Book I Ch. 2 warns about.

**Hierarchy** — Identical internal structure across all cards in a set. **Any variation in field order destroys comparison**, which is the only reason the cards exist.

**Density** — Working. Fixed height so cards align; overflow scrolls internally rather than making one card taller.

**States** — default · selected · dismissed · expanded.

**Accessibility** — Each card is a labelled region. Corresponding fields are reachable in a consistent order across cards.

**Book I** — `elevation-ground`. No photograph (C-17). Confidence per A-05.

**Common misuse** — Different fields shown per card depending on available data. Missing data is shown as missing, in position (D-06 logic).

**Scalability** — Field sets are configured per comparison, applied uniformly to every card in the set.

---

## D-08 · Score Presentation

**Purpose** — Present an assessment value against a stated bar.

**When to use** — Where a numeric or tiered assessment genuinely aids a decision. **When not to use** — As a headline. **A score is never the largest thing on a screen** (Book I Ch. 11): visual weight maps to importance, and the reasoning outranks the number.

**Hierarchy** — Value, then bar reference, then confidence, then evidence route. **All four, always.** A score without its bar is meaningless; without its confidence it is overclaimed; without its evidence route it is a verdict (Gate 2).

**Density** — Compact inline (D-04) or expanded (A-01).

**States** — scored · insufficient-evidence · not-assessed · overridden. **Overridden shows both the system value and the human's, with the human's primary** — the human decided (Bible Ch. 2, differentiator 4).

**Accessibility** — Accessible text conveys value, bar, and confidence together: "72 against a bar of 65, limited evidence." A bare number read aloud is uninterpretable.

**Book I** — **Never a percentage unless calibrated** (Checklist §8.10). Where calibration is unvalidated, show evidence sufficiency: "based on 2 of 5 expected signals". **Never five-star, letter-grade, or red-to-green** — all three import consumer-review semantics onto a person (Ch. 11).

**Common misuse** — A large, bold, coloured score at the top of a candidate view. It is the single most seductive design in this product and it converts us into the category we positioned against.

**Scalability** — New assessment dimensions get their own scores with their own bars. A composite is permitted only if its components are one interaction away.

---

# PART V — AI COMPONENTS

**Every component in this part is subject to Checklist §8 — sixteen blocking checkpoints, no proportionality clause (Gate 2).** These are the surfaces where the company's central claims either hold or break at pixel level.

---

## A-01 · AI Summary

**Purpose** — A condensed, traceable account of what is known about a subject.

**When to use** — Entry point to a candidate or a decision, where the alternative is reading everything. **When not to use** — As a replacement for evidence. A summary is a *route into* evidence, not a substitute for it.

**Hierarchy** — Present but never dominant. Below identity, above detail.

**Density** — Working. `measure-ui`. Short — a summary requiring scrolling has failed.

**States** — generating · complete · insufficient-evidence · stale · failed. **Stale is required**: a summary generated before three new interviews were added is describing a candidate who no longer exists in our data, and presenting it as current is dishonest.

**Accessibility** — A labelled region announced as generated content. Never announced as authoritative.

**Book I / Governance** —
- **Visibly attributed as generated** and distinguishable at a glance from human-written notes (Checklist §8.5). Blending the two launders inference into the permanent record (§14 F6).
- **Every claim reaches its source in one step** (§8.1) — see A-04.
- **Confidence per claim, not per summary** (§8.11). A summary-level confidence badge tells the user nothing about which sentence to trust.
- **No model vendor named, no "AI-powered" labelling, no sparkle iconography** (§8.9, `DDL-POS-002`).

**Common misuse** — A fluent paragraph with a single citation at the end. That is provenance theatre (§14 F4): the citation resolves to a document rather than to the sentence, and the reader cannot check the specific claim that matters.

**Scalability** — Summaries become more capable, not longer. Length is a design constraint, not a model output.

---

## A-02 · AI Recommendation

**Purpose** — Propose a next action, with its basis.

**When to use** — Where a recommendation genuinely narrows the decision space. **When not to use** — Where the system cannot explain the recommendation. **An unexplainable recommendation is a verdict** (§14 F1).

**Hierarchy** — Never the most prominent element. A recommendation the interface pushes is a decision the interface is making.

**Density** — Compact: proposed action, one-line basis, evidence route, override.

**States** — proposed · accepted · overridden · dismissed · insufficient-evidence.

**Accessibility** — Announced as a suggestion, not an instruction. Accept and override are equally reachable — and this is checkable: count the keystrokes.

**Book I / Governance** —
- **Override is no harder than acceptance** (§8.4). If disagreeing costs more friction than agreeing, we have built a decision-maker with a consent flow (§14 F5).
- **Overriding produces no warning treating the human as mistaken.** The system was wrong; the human is not filing an exception.
- **Reasoning capture on override is offered, never required** (§8.14) — §8.4 wins the tension, and the prompt is specific ("what did we miss?") rather than an empty box.
- **Never predicts job performance. Never claims to eliminate bias.** (Bible Ch. 2, Gate 3.)

**Common misuse** — A prominent "Recommended" badge with reasoning behind a disclosure. If the reasoning is worth having, it is worth showing; if it is not, the recommendation is not worth making.

**Scalability** — More recommendation types share this contract exactly. The contract is what makes them trustworthy.

---

## A-03 · AI Reasoning

**Purpose** — Explain **why this conclusion rather than another**.

**When to use** — Wherever a conclusion carries consequence. Depth scales with consequence (Bible Ch. 3). **When not to use** — Never omitted where a conclusion affects a person.

**Hierarchy** — Adjacent to the conclusion it explains, not one level down. For high-consequence conclusions it is visible by default, not disclosed on request.

**Density** — Working. Structured, not a paragraph: dimension, evidence, comparison.

**States** — available · expanded · insufficient-evidence · unavailable.

**Accessibility** — Programmatically associated with its conclusion. Reachable from it in one step by keyboard.

**Book I / Governance — the grading test (§8.12):**

| Grade | Example | Verdict |
|---|---|---|
| **Restatement** | "Ranked highly due to strong relevant experience." | **Unacceptable** — restates the conclusion |
| **Input listing** | "Based on resume, interview feedback, and notes." | **Unacceptable** — names ingredients, not reasoning |
| **Causal** | "Ranked above the other finalists on systems design — the take-home showed distributed-systems ownership, which the other three addressed only in general terms." | **Acceptable** |

**The counterfactual test is the reviewable one:** does the explanation let the user predict what would change the conclusion? If a recruiter cannot tell what a candidate would have needed to be assessed differently, we have narrated rather than explained.

**Common misuse** — Reasoning that is longer but not more causal. Length is not explanation.

**Scalability** — As models improve, reasoning gets more causal, not more verbose. The grading test does not change.

---

## A-04 · AI Evidence *(Evidence Panel)*

**Purpose** — Show the source material a conclusion rests on. **The architectural foundation of every claim in this product** (Bible Ch. 2, differentiator 1).

**When to use** — Reachable from every AI conclusion, everywhere, in one step. **When not to use** — Never optional, never behind two interactions, never summarised in place of shown.

**Hierarchy** — Inspector panel (Book I Ch. 2) or popover (C-19) depending on context. **Evidence proximity scales with consequence**: one click away from a low-stakes summary is fine; one click away from the assertion driving a rejection is not.

**Density** — Dense. Grouped by source, with the source named and dated.

**States** — available · empty · partial · unavailable · conflicting. **Conflicting is required**: two sources disagreeing is one of the most decision-relevant facts we can surface, and averaging it away is the least honest thing this product could do.

**Accessibility** — Each evidence item independently navigable. Source, date, and type in the accessible name.

**Book I / Governance** —
- **Citations resolve to the passage, not the document** (§8.1). A link to a 4-page resume is not provenance (§14 F4).
- **Extraction is visibly distinguished from inference** (§8.13). "Worked at X, 2019–2022" (read) and "likely has team leadership experience" (inferred) carry different error profiles and must not render identically.
- **A reporting path exists on every evidence item**, in one action (§8.13). A product that cannot hear about its errors cannot improve, and users learn quickly that telling us is pointless.
- **Corrections propagate.** A corrected fact must not reappear elsewhere in its original form — users lose faith faster from a correction that did not stick than from the original error.

**Common misuse** — An evidence panel that summarises the evidence. The summary is A-01; this shows the source.

**Scalability** — New evidence types extend the panel. The one-step rule does not bend for any of them.

---

## A-05 · Confidence Rendering

**Purpose** — Communicate how much we know, without implying how good the person is.

**When to use** — Adjacent to **every** model-derived claim. **When not to use** — Aggregated to a screen level. A page-level "87% confident" tells the user nothing about which part to trust (Book I Ch. 6).

**Hierarchy** — Adjacent to the claim it qualifies, subordinate to it.

**Density** — Inline: a word plus a resolution mark. Expanded: plus the qualifier.

**States** — high · medium · low · not-assessed. **Three tiers, never four** — more implies precision we do not have.

**Accessibility** — Tier is in the accessible name as a word, never as a mark alone. Immune to grayscale and colour-vision deficiency **by construction**, because it uses no hue.

**Book I / Governance — the mechanism** (`DDL-VIS-004`, Book I Ch. 6, Checklist §8.11):

> **Low confidence renders as less resolved, not as worse.**

| High | Low |
|---|---|
| `confidence-definition-high` — full contrast | `confidence-definition-low` — secondary contrast, **never below 4.5:1** |
| Complete resolution mark | Open resolution mark |
| No qualifier | Explicit qualifier naming what is missing |

**Prohibited absolutely:** any hue; any state-palette token; any bar, meter, gauge, star, or percentage-shaped rendering. Anything shaped like a score is read as a score regardless of its colour, which reintroduces the good/bad misreading through form.

**The reviewable test** (§8.11): show the low-confidence rendering to someone unfamiliar with the product and ask what it says about the candidate. **If they say "weak candidate" rather than "not enough information", it has failed** — whatever the label says.

**Common misuse** — Confidence as decoration: a number produced by output length, token probability, or a fixed heuristic (§14 F7). If the tier is not derived from something measurable, use A-07 evidence sufficiency instead. A dishonest signal in the one place we claim honesty is the worst available outcome.

**Scalability** — When calibration is validated against outcomes, numeric confidence becomes possible and this component gains a mode. Until then, tiers and words.

---

## A-06 · Low Confidence Rendering

**Purpose** — The specific presentation when the system does not know enough.

**When to use** — Whenever evidence is thin. **This state must exist and be reachable in normal use** — if it does not exist in the design, the calibration claim is marketing rather than architecture (§8.2, §14 F2).

**When not to use** — Never suppressed. Hiding low-confidence results to make the product look more capable is the failure our positioning is built to avoid.

**Hierarchy** — Same position as A-05. **Not visually demoted** — a low-confidence assessment is not less important, it is less certain, and demoting it hides the thing the recruiter most needs to act on.

**Density** — Slightly expanded: the claim, the qualifier, and the route to resolve it.

**States** — low-confidence · resolvable (we know what would help) · unresolvable (nothing available would help).

**Accessibility** — The qualifier is part of the accessible name, not a visual-only annotation.

**Book I / Governance** —
- **Says what would raise it** (§8.3). "Limited evidence — no technical interview on file" is actionable; a low score alone is just a worse score.
- **Never rendered in an error or warning treatment.** Low confidence is the product working correctly and saying so — our strongest trust signal (Bible Ch. 14). Rendering it as an error converts that signal into a bug report (§8.15).
- **Appears in marketing** (Checklist §10.8, `DDL-AIX-001`). A site showing only the happy path makes the competitor's claim.

**Common misuse** — Grouping "we are confident this candidate does not meet the bar" with "we do not know" in one visual bucket. These are opposite epistemic states and must be visually opposite (Book I Ch. 6).

**Scalability** — As evidence coverage improves this state appears less. It never disappears, and designing as though it will is how §14 F2 happens.

---

## A-07 · Missing Information State

**Purpose** — Show what we do not have, as a first-class fact.

**When to use** — Wherever expected evidence is absent. **When not to use** — Never rendered as zero, blank, or an error.

**Hierarchy** — In position, where the evidence would be. **Absence in place is information; absence by omission is a gap the user must notice.**

**Density** — Compact: what is missing, why it matters, how to obtain it.

**States** — missing-expected · missing-optional · pending · unavailable-by-policy. Four distinct meanings, four distinct renderings — collapsing them forces the user to guess which applies (§8.15).

**Accessibility** — Read as a statement of absence, not skipped. A screen reader encountering silence where a value should be conveys nothing.

**Book I / Governance** —
- **Evidence sufficiency is the honest alternative to uncalibrated confidence** (§8.10, `DDL-AIX-001`): "based on 2 of 5 expected signals" describes inputs rather than claiming accuracy, and it is better product because it tells the user what to do.
- **Absence of evidence and evidence of absence are visually distinct** (Book I Ch. 11). *No technical interview conducted* and *technical interview conducted, no signal found* are opposite findings.
- **Never styled as an error.** Missing information is normal, expected, and frequently the most decision-relevant thing on the screen (§8.15).

**Common misuse** — Rendering missing evidence as a zero in a comparison, which silently converts "we do not know" into "this candidate scored nothing" — the most damaging single defect available in this product.

**Scalability** — As expected-signal taxonomies grow, this component carries more meaning, not less. It is the counterpart to A-05 and the two are designed together.

---

# PART VI — SYSTEM RULES

## Composition rules

**1. Components consume semantic tokens only.** No primitives, no raw values, no exceptions (Ch. 1).

**2. Components do not accept spacing or colour overrides.** No padding prop, no colour prop, no style escape hatch. This is the rule most likely to erode, and it is what keeps two designers' screens looking like one product.

**3. Variant budgets are fixed.** Every component states its count. Adding one is a system change with a written case, not a design decision.

**4. One accent instance per view.** Buttons, links, toggles, sliders, and checked states all draw on the same budget (Book I Ch. 6). A view with nine accent elements has no accent.

**5. Overlays do not nest.** No popover in a popover, no dialog in a dialog, no drawer over a drawer.

**6. Every collection surface ships four empty states** (C-35) and its loading states (C-36, C-37). This is a review gate, not follow-up work.

**7. Every AI surface satisfies all sixteen §8 checkpoints** before it ships. Gate 2 has no proportionality clause.

**8. A component that almost fits means the screen is wrong**, not that the component needs a variant. Check Book I Ch. 2 before requesting a change here.

## Future scalability

**New components** require: the decision they improve (§3.1), evidence no existing component fits, and a commitment to generalise (Checklist §12.1). A component built for one screen is design debt with a delivery date attached.

**New variants** are harder than new components, because a variant is invisible in the inventory and discoverable only by reading code. The bar is higher, not lower.

**New product areas extend this language. They do not get their own** (Bible Ch. 15, Book I Ch. 15). Sub-branding is the largest five-year risk to this system, and it always arrives as a locally reasonable request.

**Book III (Motion)** attaches to the Ch. 9 hooks. It may set values; it may not violate the three commitments in that chapter.

---

# Self-Review

## Against governance

| Source | Check | Result |
|---|---|---|
| Bible Ch. 1 | No AI-led framing; no vendor naming | Pass — A-01 §8.9 restated |
| Bible Ch. 2 | Claim boundaries; evidence over verdicts | Pass — A-02, A-04, D-05, D-08 |
| Bible 5.2 | Show before claim | Pass — A-04 provenance; C-35 no illustration |
| Bible 5.3 | Earn every element | Pass — C-02, C-18, D-01 |
| Bible 5.4 | Density as respect | Pass — C-30/C-31 card-vs-table position |
| Bible Ch. 8 | Colour is meaning; confidence non-hue | Pass — Ch. 2 confidence tokens; A-05 |
| Bible Ch. 13 | Feedback at point of consequence | Pass — C-22 toast restriction |
| Bible Ch. 14 | Trust; candidate as stakeholder | Pass — C-17, N-06, A-04 |
| Checklist §5.6 | Confirmation only where irreversible | Pass — C-23 |
| Checklist §5.7 | All states designed | Pass — C-35, C-36, and per-component states |
| Checklist §7.8 **Gate 4** | Interface honesty | Pass — C-36 states the prohibition explicitly |
| Checklist §8.1–8.16 **Gate 2** | All sixteen | Pass — Part V, each mapped |
| Checklist §11 **Gate 1** | Accessibility | Pass — per-component expectations |
| Checklist §14 | Anti-patterns | Pass — C-14/15/16, C-22, C-30, C-31, D-05 |
| Book I Ch. 3 | Three elevations; cards not elevated | Pass — Ch. 4, C-30 |
| Book I Ch. 4 | Register law | Pass — Ch. 5 encodes it in token names |
| Book I Ch. 5 | Type, tabular figures, measure | Pass — Ch. 3 |
| Book I Ch. 6 | Radius by role | Pass — Ch. 6 |
| Book I Ch. 11 | Data visualisation | Pass — D-03 defers entirely |
| Book I Ch. 14 | The 55 nevers | Pass — no component contradicts one |

## Conflicts reported

**One interpretation, one unfulfilled commitment. Neither requires a GAP.**

### 1 · Candidate photography — interpretation, not a stated rule

**The conflict.** C-17 prohibits candidate photographs on assessment surfaces. **Governance does not say this.** Bible Ch. 2 commits us to never assessing protected characteristics, and Checklist §8.6 prohibits any assessment *referencing* them. A rendered photograph is not an assessment referencing a protected characteristic — it makes inferences about them *available*, unlogged, at the moment of judgement.

**Why it exists.** This is a well-documented bias vector, and it sits directly against our central claim: that reasoning is traceable. A face beside a score influences a decision through a channel that never enters the evidence trail.

**Recommendation: Follow existing governance, conservatively.** I have applied the prohibition as a Book II default and filed it as `DDL-VIS-007` so the reasoning is on the record and the decision is reviewable. **I have not amended governance and I am not claiming governance requires this** — it is a design-system decision consistent with governance, and it is labelled as such. If you disagree, it is one record to reject, not a governance change.

### 2 · The accent hue remains unspecified

**The commitment.** Book I Ch. 6 named the accent hue anchor as "the first deliverable of Book II."

**It is not delivered.** Book II specifies the accent's *structure* (four steps), its *criteria*, and its *budget* (one instance per view) — but not the hue.

**Why.** The criteria require it to be chosen against the brand mark, which does not exist. Picking a hue now means picking one that a future mark must accommodate, which inverts the dependency.

**Recommendation: Follow, with the gap named.** Every component here is specified against `color-action`, so the token resolves whenever the hue is chosen and nothing downstream changes. **Reported rather than quietly satisfied with a guess** — an invented hex would be exactly the confident-invention failure the Checklist catalogues at §14 J4.

## Decisions recorded

Four filed in `DESIGN_DECISION_LOG.md`, status **Proposed** pending approval of Book II:

- `DDL-VIS-006` — Three-tier token architecture; components consume semantic tokens only
- `DDL-VIS-007` — No candidate photography on assessment surfaces
- `DDL-VIS-008` — Toasts restricted to asynchronous completion; inline feedback is the default
- `DDL-VIS-009` — Table and Data Grid are distinct components

---

*HireLens Visual Design System · Book II — Components & Design Tokens · v1.0*
*Subordinate to governance and to Book I. Book III (Motion) follows.*
