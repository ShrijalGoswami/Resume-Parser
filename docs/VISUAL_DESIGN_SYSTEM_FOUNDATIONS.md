# HireLens Visual Design System

## Book I — Foundations

**Version 1.0 · Status: Frozen · Change policy: Amendments only**
Approved 2026-07-25. Structural change requires a Governance Amendment Proposal (`DESIGN_DECISION_LOG.md` §6).
Owner: Design Owner
Authority: **Subordinate to governance.** Where this book and the Bible or the Checklist disagree, they are correct and this book is wrong.
Governing documents: [`MARKETING_DESIGN_BIBLE.md`](./MARKETING_DESIGN_BIBLE.md) · [`DESIGN_REVIEW_CHECKLIST.md`](./DESIGN_REVIEW_CHECKLIST.md) · [`DESIGN_DECISION_LOG.md`](./DESIGN_DECISION_LOG.md)

---

## What this book is

The Bible says what we believe about design. This says what that looks like as a system — the structures, scales, ratios, and rules a designer needs to build a screen without asking a question.

**The Bible deliberately contains no values.** Chapter 8 states it outright: *"No values here. Values belong to the design system and will be revised."* This book is where they live. That division is intentional and load-bearing — the philosophy should hold for a decade, the values will be revised within three years, and mixing them means either freezing things that should move or thawing things that shouldn't.

**Scope of Book I:** the foundations everything else is built from — space, type, color, shape, surface, and the rules governing imagery and data. Components, patterns, motion specifications, and the token file are Book II and beyond. If you are looking for what a button *is*, it is not here. What is here is everything that determines what a button *may be*.

**How to disagree with this book.** It is not frozen. It is a system, and systems improve. But a change is a change to the system, not a local exception — see Chapter 15. The one thing you may not do is treat a rule here as advisory because it is inconvenient on your screen.

---

# Chapter 1 — Visual Philosophy

## The feeling we are building

**Composed. Precise. Unhurried. Slightly serious.**

The room this product should evoke is not a launch keynote. It is a well-lit room where someone competent is reading carefully and is not in a hurry, even though they are behind.

That last clause is the design problem. Our user *is* in a hurry — sixty-one days into an open req, a hiring manager pushing, four candidates decaying. **The interface's job is to be the one thing in their afternoon that is not adding pressure.** Everything below follows from that: the restraint, the absence of motion, the refusal to celebrate, the neutral chrome, the quiet borders.

An interface that is visually energetic is asking the user to match its energy. Ours asks them to slow down by a quarter-second — which, at the moment of a hiring decision, is the entire product.

## The instrument, not the poster

The Bible's governing image (Ch. 6) is that the page is an instrument. Book I takes that literally.

An instrument's appearance is downstream of its function. Nothing on a well-made one exists to impress; the beauty is a byproduct of the discipline. Practically, this means we design the *reading experience* first and accept that the result will be quieter than what wins a design award.

**The consequence people underestimate:** an instrument is judged on its worst reading, not its best. A screenshot that looks superb and a table that is unreadable at row 200 is a failed instrument with good photography. Every foundational decision in this book is tuned for the two-hundredth row, the fourth hour, and the corporate laptop — not for the hero shot.

## Resolution, made structural

`DDL-BRD-001` fixes the organizing metaphor: **Resolution** — the optical ability to distinguish things that are close together, and the state of having decided. It is not a mood board. It produces specific structural obligations, and this book is where they become concrete:

| The metaphor says | Book I encodes it as |
|---|---|
| Resolution is achieved by *removing what blurs*, never by adding brightness | Fix hierarchy and spacing before adding any effect (Ch. 2, Ch. 3) |
| Resolving power *is* separation | Space and borders are the primary system; shadow is secondary (Ch. 3, Ch. 4) |
| Instruments focus: wide, then detail | Register-based spacing and type scales rather than flat ones (Ch. 4, Ch. 5) |
| Deliberate blur is a statement of failure | No decorative blur, haze, bokeh, or soft-focus anywhere (Ch. 3, Ch. 10) |
| Uncertainty is *less resolved*, not *worse* | Confidence rendered as definition, never as warning color (Ch. 6, Ch. 11) |

That last row is the most important sentence in this book. It is developed fully in Chapter 6.

## Three trade-offs we are accepting

Stated plainly so nobody re-discovers them as problems.

**1. We will look plainer than our competitors, and this will be argued internally.**
`DDL-VIS-001` accepted this on the record. The cost is real: in a side-by-side first impression against a product using gradient, glass, and glow, we look less impressive for about eight seconds. The compensation is that we look better at four minutes and still look deliberate in 2031. **We are optimizing for the demo's second half.**

The corollary is uncomfortable and must be said: **with no decoration to hide behind, our execution bar is higher.** Plain done imprecisely is not restraint, it is unfinished. A system this quiet is unforgiving of misalignment, inconsistent spacing, and lazy typography — the very things decoration usually conceals.

**2. Density will be argued against.**
Bible 5.4 makes density a form of respect. Every instinct trained on consumer design says "add whitespace," and that instinct is often condescension in a nice suit. We will be told our screens are busy. Some of them will genuinely be too busy — that is Chapter 2's problem to solve with structure, not Chapter 4's to solve with padding.

**3. We give up the fastest ways to look expensive.**
Gradient meshes, glass, glow, and 3D are all cheap in effort and high in immediate impact. We have none of them. What is left is typography, alignment, spacing rhythm, and restraint — which is where perceived quality actually lives, but which cannot be applied in an afternoon.

## Where we deliberately differ from the products we admire

Not contrarianism. Each of these is a place where a reference product's correct choice would be wrong for us.

**Against dark-first identity.** Several excellent tools ship a dark interface as their signature. We build both themes to one standard and treat neither as canonical (Bible Ch. 8). Two reasons: dark-as-identity has become a costume that signals nothing because everyone wears it, and our content is *documents* — resumes, transcripts, notes — which are legibility-critical and read worse on dark surfaces. It would be an odd trade for a product about reading things carefully.

**Against gradient as brand signature.** Gradient is an outstanding brand device for a company whose product is infrastructure the user never sees. Ours is a product the user stares at. A signature gradient competes with content on every screen and dates on a known schedule.

**Against generous radius and deep surfaces.** Consumer-grade softness reads as approachable, which is a real asset when the emotional job is *welcome*. Our emotional job is *composure*. Soft, deep, floating surfaces read as ungrounded, and we are selling grounded (Ch. 7).

**Against emoji and illustration as a system.** Playful visual vocabulary is a genuine strength in tools for creative and personal work. We are the interface where someone's candidacy is assessed. Whimsy there is not charming; it is tone-deaf (Bible Ch. 3).

**Against motion as personality.** Several reference products use motion as a core signature and do it beautifully. Our metaphor permits motion only as focus adjustment — brief, purposeful, ending settled (Bible Ch. 10). This costs us a memorable signature and buys an interface that is not performing at someone who is trying to concentrate.

---

# Chapter 2 — Layout Philosophy

## The premise: panels, not pages

**We reject the 12-column grid as the product's organizing structure.**

The column grid is a print inheritance, designed for flowing text and images across a page of fixed proportion. It is excellent for marketing surfaces and it is the wrong tool for the workspace, because a workspace is not a page. It is a set of **panels with independent scroll, independent density, and independent lifetime** — a list that persists while a detail changes, an inspector that persists while both change.

Forcing that into columns produces the failure everyone has seen: a detail panel that is "8 columns wide" and therefore has a measure of 140 characters, because the grid was solving for proportion when the content needed a reading width.

**Therefore two layout systems, used in different places:**

| System | Where | Organizing unit |
|---|---|---|
| **Panel system** | All product surfaces | Regions with independent scroll and role |
| **Column grid (12)** | Marketing surfaces only | Columns and gutters |

Marketing keeps the grid because marketing genuinely is a page — linear, scrolled once, composed. Using two systems is a cost we accept deliberately; pretending one system fits both is the more expensive error.

## The panel system

Four canonical regions. A product screen is composed from them; it does not invent new ones.

**Navigation** — persistent, narrow, low-density. The only region that never scrolls with content.
**Index** — the list, the queue, the table. High density. Owns the primary scroll.
**Subject** — the thing being examined. Medium density, reading-optimized. Owns its own scroll.
**Inspector** — evidence, metadata, actions relating to the subject. High density, secondary.

Not every screen uses all four. The rules:

- **A screen has exactly one Subject.** Two things being examined at once is a comparison view, which is a Subject containing a comparison — not two Subjects. This prevents the most common workspace failure, where a screen quietly becomes two screens sharing a scrollbar.
- **Panels do not nest.** An Inspector inside an Inspector is a signal that the information architecture is wrong (Checklist §4.6). The remedy is restructuring, never a third level of panel.
- **Each panel owns its scroll.** Nested scroll regions inside a panel are prohibited except in a data table's body. Nothing produces more user frustration per pixel than a scroll wheel whose target is ambiguous.
- **Panel boundaries are borders, never shadows.** They are structural, not elevated (Ch. 3).

## Container widths

Three named containers. **Named, because a number is forgettable and a name is enforceable** — "that's Working width in a Reading context" is a reviewable sentence.

| Container | Width | Purpose |
|---|---|---|
| **Reading** | 640–720px, optimum **680px** | Prose. Long-form. Anything read in sentences. |
| **Working** | 1120–1440px, optimum **1280px** | Composed product surfaces and marketing sections. |
| **Field** | Fluid to viewport minus gutters | Tables, timelines, comparison — content whose value increases with width. |

**Gutters:** 24px below 1024, 32px to 1440, 48px above.

**The rule that matters:** *Reading width is a maximum, not a suggestion.* Prose never exceeds it regardless of available space (Ch. 5, measure). A Subject panel 1100px wide contains a 680px reading column and lets the remainder be margin. This looks wasteful to people who have not read Chapter 5. It is not; it is the difference between text that gets read and text that gets skimmed.

**Field width exists to prevent a specific bad habit** — constraining a table to a comfortable-looking width and then truncating four columns to fit. A comparison table is more useful at 1800px than at 1280. Content whose value scales with width gets the width.

## Whitespace

**Space is punctuation, not atmosphere** (Bible Ch. 6). Two operating rules, and the second is the one that is violated constantly.

**Rule 1 — space between ideas, tightness within them.** A heading sits close to what it introduces and far from what precedes it. Uniform padding flattens structure and hands the grouping work to the user.

**Rule 2 — emphasis is a budget.** A generous field before a claim slows the reader and makes it land. Used everywhere, the eye normalizes and the emphasis evaporates. **Spend it four or five times on a long page, not forty.**

The practical form of both is in Chapter 4 as the register system, which is the mechanism that makes non-uniform spacing systematic rather than intuitive.

## Density

Density is not the opposite of quality — **uniformity is**. A surface should breathe differently in different places, and the variation should carry meaning.

| Register | Where | Character |
|---|---|---|
| **Sparse** | Marketing hero, section transitions, empty states, single-decision moments | Room to feel. One idea per viewport. |
| **Working** | Subject panels, forms, most product surfaces | Comfortable but not padded. |
| **Dense** | Index panels, tables, comparison, Inspector | Full strength. Maximum information per fixation. |

**Never simplify a product surface to make it look calmer.** A stripped mockup with four rows of tidy data communicates *toy*, and it sets an expectation first login violates (Bible 5.7, Checklist §14 C3). If a dense surface is genuinely unreadable, the fault is hierarchy — fix the structure, not the row height.

**The transition between registers is itself a tool.** Moving from sparse to dense signals *now I am showing you the real thing*, which is exactly the beat marketing needs between Movement II and Movement III (Bible Ch. 4).

## Alignment

**One vertical rhythm line per panel.** Every element in a panel aligns to a single left edge unless it has a reason not to. Optical exceptions — an icon's visual left edge versus its bounding box — are corrected optically, not mathematically.

**Numbers align right in any vertical set.** Always. This is not aesthetic; a column of right-aligned tabular figures can be compared at a glance, and the same column left-aligned cannot (Ch. 5, Ch. 11).

**Misalignment is perceived as carelessness before it is identified as misalignment**, and for a company selling precision that is the single most damaging cheap mistake available.

## Responsive posture

Covered fully in Chapter 13. The one thing that belongs here: **layout adapts by removing panels, never by reducing density.** A narrow viewport gets fewer regions, not the same regions with bigger text and fewer rows.

---

# Chapter 3 — Surface Language

## The premise: borders do the work

**We are a border-first system** (`DDL-VIS-001`). Shadows indicate elevation and nothing else.

The reasoning is on the record and worth restating because it is a live temptation: borders are *honest*. A border states a boundary exactly, at any scale, in any theme, at any zoom, in a screenshot, on a projector. A shadow *implies* a boundary and becomes imprecise the moment context changes. For a product about precision and traceability, the surface language should be precise — the medium agreeing with the message.

The shadow-first default is comfortable, contemporary, and produces surfaces that photograph well. It is also why so many products look identical.

## Backgrounds

**Three background levels. That is the entire vocabulary.**

| Level | Role |
|---|---|
| **Canvas** | The application background. Most of the screen. |
| **Surface** | Panels, cards, tables, anything holding content. |
| **Sunken** | Wells, input fields, code blocks, inset regions. |

The step between them is small — a **perceptibly different but not obviously different** lightness change. Large steps produce a striped, compartmentalized interface where every region shouts its boundary; too small and grouping fails.

**In light themes, Surface is lighter than Canvas. In dark themes, Surface is lighter than Canvas as well.** This is not symmetrical and it is not an error. Dark interfaces read elevation as *emitted light*, so "raised" means "lighter" in both directions. Inverting the relationship in dark mode is the most common theming mistake and it makes every dark surface feel inside-out.

**No background carries a gradient.** None. Not subtle, not a "barely visible" vertical fade, not a radial glow behind a hero. Bible Ch. 6 prohibits it and Chapter 14 of this book restates it as a never.

## Borders

**One hairline weight — 1px — at all viewports.** Not 2px for emphasis, not 0.5px for subtlety. A single border weight means a border is never a hierarchy signal, which keeps it a pure structural one.

Three border roles:

| Role | Contrast against adjacent surface | Use |
|---|---|---|
| **Subtle** | ~1.3–1.6:1 | Table row separation, internal division within a group |
| **Standard** | ~2–3:1 | Panel edges, card boundaries, input outlines |
| **Strong** | ≥3:1 | Focus, selected state, active boundary |

**A border should be the quietest line that still does its job.** If you notice the border before the content it contains, it is too strong.

**Two adjacent borders doing the same separation is a defect, not a style.** A card with a border inside a panel with a border, touching, produces a 2px line that reads as heavier emphasis nobody intended. Collapse one.

**Dark-theme borders are lighter than their surface, not darker.** A darker border in a dark theme reads as a gap or a crack rather than an edge.

## Elevation

**Exactly three levels** (Bible Ch. 6, `DDL-VIS-001`). Elevation is semantic — it answers *what is on top of what, and why* — and that is its whole job.

| Level | Meaning | Treatment |
|---|---|---|
| **Ground** | Part of the page. Most things. | Border only. **No shadow.** |
| **Raised** | Persists above content because it outlives it — sticky headers, floating toolbars, the command surface | Border + one soft, low, near-achromatic shadow |
| **Overlay** | Has interrupted you — dialogs, popovers, menus | Border + a deeper shadow, plus a scrim for modal cases |

**Cards are Ground.** This is the rule most likely to be broken, because elevating a card is the reflexive way to make it feel like an object. A card is grouped, not lifted — grouping is a job for border and space. A page of elevated cards is a page where elevation means nothing.

**A fourth level indicates a structural problem** being papered over with shadow. The remedy is restructuring.

**Shadow character:** shadows read as light behavior, not glow. Soft, low, largely achromatic, physically plausible — a single light source high and slightly forward, consistent across the system. **A shadow you consciously notice is too strong**; it has stopped describing space and started decorating.

**Dark theme carries elevation differently, and this must be designed rather than derived.** Shadows are weak against dark backgrounds — a dark shadow on a dark surface is invisible. In dark themes, elevation is carried primarily by a **surface lightness step plus border**, with shadow reduced to a faint contact indication. A dark theme generated by mechanically inverting light-theme shadow values will have no perceptible elevation at all.

## Glass and translucency

**Permitted only when the layered content is meant to be seen through.**

That single sentence eliminates roughly ninety percent of its use in contemporary software. A sticky header over scrolling content: correct — sensing motion beneath is the point. A card with a frosted background on a flat page: decorative, and prohibited.

The deeper reason is brand-level, not stylistic. **Glass says ephemeral, floating, ungrounded. We say grounded, evidenced, solid.** Reaching for it because it looks technically sophisticated is borrowing a competitor's signal at the cost of our own.

Where translucency is used, it is accompanied by a border, because a translucent edge is not a reliable boundary over arbitrary content.

## Texture

**None.** No noise, no grain, no paper, no scanlines, no subtle patterns.

Texture is the most common way a flat system is "warmed up," and it fails on our terms specifically: it adds visual information carrying no meaning (Bible 5.3), it degrades text rendering at small sizes where most of our surface area lives, and it is a per-era signature that will date the product precisely.

**The one permitted exception is content-derived:** a document preview showing an actual scanned page has whatever texture that page has. That is content, not chrome.

---

# Chapter 4 — Spacing System

## Base unit: 4px

Everything is a multiple of 4. Not 8 — an 8px base is too coarse for the dense surfaces this product needs, and it forces designers into either 8 (too tight) or 16 (too loose) at exactly the scale where our Index and Inspector panels live.

**The scale is non-linear**, tighter at the bottom where precision matters and looser at the top where the eye cannot distinguish adjacent steps anyway:

```
2   4   8   12   16   20   24   32   40   48   64   80   96   128
```

`2` exists only for optical correction — icon-to-label gaps, badge padding — never for layout.

## The register system

**This is the most important structure in the chapter, and it is what prevents uniform spacing** (Checklist §14 D5).

A flat scale tells you what values are available. It does not tell you which to use, so teams default to consistency — the same padding everywhere — which flattens structure and reads as tidy rather than organized.

Three registers, each with an assigned range:

| Register | Range | Governs |
|---|---|---|
| **Intra** | 2 – 8 | Space *within* a single element: icon to label, label to value, input to its hint |
| **Inter** | 12 – 32 | Space *between* related elements: rows, fields in a group, cards in a set |
| **Section** | 48 – 128 | Space between distinct ideas: content blocks, page sections |

**The governing law, and the single most useful sentence in this chapter:**

> **The smallest Section gap must exceed the largest Inter gap, which must exceed the largest Intra gap.**

Stated so plainly it sounds trivial. It is violated on most interfaces, because uniform section padding is easier than thinking about relationships. It is directly checkable in review (Checklist §6.3), and checking it catches more structural problems than any other single test in this book.

**Practical consequence:** a heading has asymmetric space around it — larger above (separating it from the previous idea), smaller below (binding it to what it introduces). Equal space above and below a heading is a defect. It makes the heading belong to neither neighbor and turns the page into a stack of unrelated blocks.

## Vertical rhythm

Vertical rhythm is systematic, not eyeballed per section. The eye detects inconsistency it cannot locate, and that undetectable wrongness is most of what separates a composed page from a stacked one.

**Rhythm is built on the spacing scale, not on a fixed baseline grid.** A strict baseline grid is a beautiful idea that survives contact with mixed content — tables, images, form controls, embedded data — for about one screen. We take the useful half: consistent spacing values applied consistently to the same relationships.

**Rule:** the same relationship gets the same value everywhere. Field-to-field spacing in a form is one value across the product. If two forms differ, one is wrong.

## Horizontal rhythm

Horizontal space is asymmetric by nature, because reading is left-to-right and scanning is vertical.

- **Panel padding** is uniform on left and right and matches gutter conventions at the container level.
- **Label-to-value** spacing in an Inspector is Intra — these belong together and reading them as a pair is the point.
- **Column gaps in tables** are Inter, and they are the most under-considered spacing in most products. Columns too close read as one field; too far and the eye loses the row.
- **Never use horizontal space to imply hierarchy.** Indentation implies containment and nothing else. An indented item is *inside* something; if it is not, do not indent it.

## Component, content, and page spacing

**Component spacing (Intra + Inter)** is fixed by the component and is not overridden by consumers. A card does not accept a padding prop. This is the mechanism that keeps two screens built by two designers looking like one product — and it is the one most often eroded, one reasonable override at a time.

**Content spacing (Inter)** — the relationship between prose elements — follows one rule: **space is proportional to the size of the type it separates.** A gap after a 38px heading is larger than after a 16px paragraph. Fixed spacing between mixed type sizes reads as arbitrary because it is.

**Page spacing (Section)** provides the pacing described in Chapter 2. Sections vary in length and spacing; uniform sections read as a template (Bible Ch. 11).

## Density modes

The system supports two densities, chosen by surface type — **not by user preference, and not globally.**

**Comfortable** is default. **Compact** reduces Intra and Inter by roughly one scale step and is used only where scanning volume is the primary task: Index panels, tables, comparison views.

**Section spacing does not change between densities.** Compressing the space between ideas defeats the purpose — the user is scanning more rows, not reading a denser argument.

**Why not a global user toggle:** it doubles the review surface for every screen, and it lets a user "fix" a badly structured dense screen by loosening it, which hides the defect from us. Density is a design decision per surface, and if a surface is uncomfortable at Compact, the surface is wrong.

---

# Chapter 5 — Typography System

**In a text-dense product, typography is the interface.** It is also where perceived quality actually resides: readers cannot articulate why one screen feels considered and another feels assembled, and the difference is almost always measure, rhythm, and restraint in the number of styles.

## Type families

**Two families. No display face.**

| Family | Role |
|---|---|
| **Sans** | Everything. UI, prose, headings, data, numbers. |
| **Mono** | Machine identifiers only — IDs, hashes, file paths, code, API values. |

**Why no display face.** Pairing a distinctive display face with a neutral text face is the standard route to a "premium" feel, and it is a trap for us. A display face has personality, personality competes with content, and it dates on a visible schedule. Our headings are *large*, not *different*, and scale carries all the emphasis they need. This also removes an entire class of consistency failure — nobody has to decide when the display face applies.

**Mono is not a texture.** It carries exactly one meaning: *this is a machine value, character-exact, safe to copy*. Using it to signal technical credibility is a costume, and currently the most over-worn one in the category (Bible Ch. 9). A metric is not code. A candidate name is not code.

## Typeface selection criteria

Faces are chosen against criteria, so the choice can be remade in five years without abandoning the system:

1. **Neutral, not characterful.** Personality comes from what we say and how we structure it.
2. **Exceptional at 11–14px.** More of our surface area is small text — labels, metadata, table cells — than large. A face beautiful at 60px and muddy at 12px is the wrong trade for this product.
3. **True tabular figures.** Non-negotiable. See below.
4. **At least five usable weights**, with genuinely distinguishable adjacent steps. Hierarchy through weight requires the weights to exist.
5. **Disambiguated glyphs** — `1`/`l`/`I`, `0`/`O`, `5`/`S`. Our users read IDs, dates, and scores. Ambiguity here is a correctness problem, not an aesthetic one.
6. **Fast, self-hosted, subset.** Late-arriving type causes layout shift, and layout shift in the first second is the most quality-destroying thing that can happen to a page (Checklist §12.4).

## The type scale

One scale, three registers — the same structural idea as spacing, for the same reason.

```
11   12   13   14   16   18   20   24   30   38   48   60
```

| Register | Sizes | Use |
|---|---|---|
| **UI** | 11 – 16 | Labels, metadata, table content, controls, dense panels |
| **Reading** | 16 – 20 | Prose, descriptions, documentation, marketing body |
| **Display** | 24 – 60 | Headings, marketing hero, single-number emphasis |

**16 belongs to both UI and Reading deliberately** — it is the hinge, the size at which a UI string and a sentence can sit adjacent without a visible seam.

**11 is a floor, not a size to reach for.** It is legible only at high contrast for short strings — a column label, a timestamp. Prose never occurs at 11 or 12.

## Line height and measure

**Line height moves inversely to size.** Display tightens; body opens.

| Register | Line height |
|---|---|
| Display (24+) | 1.15 – 1.25 |
| Reading (16–20) | 1.5 – 1.6 |
| UI (11–14) | 1.35 – 1.45 |
| Table cells | 1.3, fixed |

**Measure is a hard constraint, not a preference.**

| Content | Measure |
|---|---|
| Long-form prose | 62 – 72 characters |
| UI prose, descriptions, help | 45 – 65 characters |
| Table cell text | Unconstrained; truncation handles overflow |

**Full-width body text on a wide screen is a defect** regardless of how architectural it looks. Line length is the most under-attended variable in web typography and one of the largest determinants of whether long-form content is read at all.

## Hierarchy through restraint

**Three heading levels maximum on any surface.** A fourth means the content needs editing, not another size.

Hierarchy is built from **weight, scale, and space — with space doing more work than teams expect.** A heading is not important because it is large; it is important because there is room around it.

**Weight is preferred to size for emphasis within text.** It is quieter, more precise, and does not disturb vertical rhythm. Bumping a size to create emphasis is how a surface ends up with fourteen type styles (Checklist §14 D6).

**Two levels distinguishable only by a small size delta are not distinguished.** If the difference is not obvious at a glance, collapse them or separate them properly.

**Large type is a claim.** The hero may be large because it is the most important sentence on the site. A mid-page heading at the same scale has told the reader those two things matter equally, which is almost never true.

## Numbers

**The most consequential typographic decision in this product**, because our surfaces are full of scores, counts, dates, and comparisons.

**Tabular figures are the default everywhere.** Proportional figures are permitted only in flowing prose. In any vertical set — a table column, a list of scores, a stack of metrics — figures that shift position between rows destroy the sense of precision we are selling and make column comparison require reading rather than scanning.

**Numbers align right in vertical sets.** Always.

**Precision matches the underlying signal.** Rendering `73%` when the system distinguishes three tiers is a false claim expressed as a number (Checklist §8.11). If we have three tiers, we show three tiers, in words.

**Large single numbers use Display sizes but never the heaviest weight.** A very large, very bold number reads as a scoreboard. Our numbers are evidence, not results.

## Tables

Tables are our primary data visualization (Ch. 11), and they are typographic objects before they are visual ones.

- **Column headers:** UI register, 11–12px, medium weight, sentence case. Not uppercase — uppercase costs legibility and reads as institutional.
- **Cell content:** 13–14px, regular weight.
- **Numeric cells:** tabular, right-aligned.
- **Text cells:** left-aligned, truncated with ellipsis, full value available on demand — never wrapped to two lines in a dense table, which destroys row scanning.
- **Row separation:** hairline borders, not zebra striping. Striping adds a background pattern carrying no information and interferes with genuine row-state highlighting (selected, focused, flagged), which is information.

## Metadata

Metadata — timestamps, authorship, counts, provenance labels — is the connective tissue of a product built on traceability, and it is systematically under-designed.

**Treatment:** UI register, 11–13px, reduced contrast but **never below 4.5:1**. Metadata is often the most important text on the screen — *"assessed 3 days ago from 2 of 5 expected signals"* is the sentence that makes an assessment trustworthy. It is quiet, not weak.

## Case and punctuation

- **Sentence case for everything** — headings, buttons, labels, table headers. Title Case is a formality that adds distance; we are a colleague, not a press release (Bible Ch. 12).
- **No all-caps** except two-to-four-character abbreviations. All-caps labels are an institutional-software tic that costs legibility for zero information.
- **No exclamation points**, anywhere, including success states.
- **Numerals for numbers**, always. Faster to scan, and scanning is what our users do.

---

# Chapter 6 — Color Philosophy

## The premise: color is meaning

**Every color that appears is answering a question the user is asking.** What is actionable? What is a warning? What state is this in? How much do we know?

The moment color starts answering *what mood is this brand*, it stops reliably answering the others — because the user can no longer tell whether a colored element is significant or merely styled. In a product where a color might indicate a confidence level, that ambiguity is not an aesthetic flaw. It is a functional failure.

**A color used decoratively anywhere weakens it everywhere.**

## The neutral foundation

The overwhelming majority of every surface is a neutral ramp — text, backgrounds, borders, structure. **Color is a guest.**

**The neutral is slightly cool, and this is a derived decision rather than a taste one.** Our content is documents: resumes, transcripts, scanned pages, photographs. That content is warm — paper white, cream, skin tones. A cool-neutral chrome recedes behind warm content and lets it read as the subject; a warm-neutral chrome sits in the same tonal family and produces mud. The frame should be a different temperature from the picture.

**Twelve neutral steps**, with fixed roles so that a designer never picks a step by eye:

| Step | Role |
|---|---|
| 0 | Canvas (light theme) |
| 1 | Surface |
| 2 | Sunken / hover |
| 3 | Subtle border |
| 4 | Standard border |
| 5 | Strong border, disabled text |
| 6 | Placeholder |
| 7 | Metadata, tertiary text |
| 8 | Secondary text |
| 9 | Body text |
| 10 | Emphasis text |
| 11 | Maximum contrast (rare) |

**Dark theme is a separately designed ramp, not an inversion.** Perceptual lightness does not invert linearly, and a mechanically flipped ramp produces dark surfaces where text is either glaring or muddy, with borders reading as cracks. Both themes are built to the same standard; neither is canonical (Bible Ch. 8).

## The four color tiers

Color earns its place in this order. Each tier must be resolvable without color by anyone who cannot perceive it.

### Tier 1 — Action

**One accent. It means: this is what you do next.**

Its power is entirely a function of its rarity. **Roughly one accent element per view.** Spending it on a decorative underline, an icon, or a section heading spends our most valuable communication asset on nothing.

Accent selection criteria — the hue anchor itself is the first deliverable of Book II, chosen against the brand mark:

1. Distinguishable from all four semantic hues at a glance and at 12px.
2. Holds ≥4.5:1 against Surface at the same relative step in both themes.
3. Not a category default. The two obvious choices — enterprise blue and AI purple — are both currently doing the opposite of differentiating.
4. Survives adjacency to warm document content without vibrating.

**Four accent steps only:** subtle background, border, primary fill, and a pressed/active step. An accent with a twelve-step ramp will be used as a decorative palette; the constraint is the enforcement.

### Tier 2 — State

Success, warning, danger, information. **Conventional in hue, because convention here is comprehension.** Being original with a warning color is a self-indulgence paid for by the user.

Three steps each — background, border, foreground — which is sufficient for every legitimate use and insufficient for decorative use. That asymmetry is intentional.

**State color always accompanies a shape, label, or position.** Never alone.

### Tier 3 — Confidence

**This is the tier that distinguishes HireLens, and it is defined by what it may not do.**

Confidence is an axis of *certainty*. Every available visual vocabulary for it — red-amber-green, progress bars, star ratings, percentage badges — reads as an axis of *quality*. A candidate shown with a red confidence indicator is read as a bad candidate, not as a candidate we know little about. **The user's misreading is not their error; it is our design defect** (Checklist §8.11).

**Therefore confidence has its own channel, and that channel is not hue.**

| Confidence carries | Confidence never uses |
|---|---|
| A word — the tier, stated | Hue of any kind |
| **Definition** — how sharply the claim is rendered | The state palette (success/warning/danger) |
| **Explicitness** — how much qualification accompanies it | A percentage, unless calibrated (§8.10) |
| A **resolution mark** — a small glyph whose completeness encodes tier | Anything shaped like a score |

**The mechanism, stated once, because everything downstream depends on it:**

> **Low confidence renders as less resolved, not as worse.** A high-confidence claim is rendered at full definition — full text contrast, a complete resolution mark, no qualifier. A low-confidence claim is rendered at reduced definition — the claim itself at secondary contrast, an incomplete mark, and an explicit qualifier naming what is missing.

This is the Resolution metaphor doing structural work rather than decorating. It is honest to the epistemics — *we can see this less clearly* — and it makes the misreading structurally unavailable, because reduced definition does not look like a warning. It looks like something out of focus, which is exactly what it is.

**The one absolute:** *"we are confident this candidate does not meet the bar"* and *"we do not know"* are opposite epistemic states and must be visually opposite. Any treatment that puts them in the same bucket has failed, whatever it is labelled.

**Three tiers, named in words, never four.** More tiers imply a precision we do not have. Where calibration is not validated, we show **evidence sufficiency** instead — *"based on 2 of 5 expected signals"* — which describes inputs rather than claiming accuracy (`DDL-AIX-001`).

### Tier 4 — Data

Categorical distinction in charts and comparison. Functionally constrained, never chosen for prettiness. Full treatment in Chapter 11.

**Nothing outside these four tiers gets color.**

## Two non-negotiable constraints

**Color never carries meaning alone.** Every state distinguished by color is also distinguished by shape, label, position, or weight. This is an accessibility requirement and equally a robustness one: our screenshots get pasted into decks, printed, projected badly, and captured in grayscale. **A meaning that survives only in ideal conditions is not a meaning.**

**Contrast is a floor, not a target.** Meeting the accessibility minimum is the entry condition. The real test is whether reading is comfortable at hour three (Ch. 12).

## On brand color in product

We do not "brand" the product surface with color. There is no accent-tinted header, no branded sidebar, no colored chrome. **The product is recognizable by its structure, typography, and restraint** — which is a harder identity to build and a much harder one to copy.

---

# Chapter 7 — Shape Language

## The premise: radius should be unnoticeable

Corner radius is where a lot of products locate their personality, and it is the wrong place for us to locate ours. **Sharp corners read brutalist and cold. Heavy rounding reads consumer and soft. We want neither read — we want no read at all** (Bible Ch. 6).

If a user can describe our product by its corners, we have spent identity on geometry instead of on structure.

## The radius scale

Five values. **Nothing above 10px except full-round, which has exactly two uses.**

| Radius | Applies to |
|---|---|
| **2px** | Chips, tags, badges, small status marks |
| **4px** | Buttons, inputs, controls, table cells with state |
| **6px** | Cards, panels, containers — the default |
| **10px** | Overlays: dialogs, popovers, menus |
| **Full** | Avatars and status dots **only** |

**The governing rule: radius scales with surface size, not with importance.** A larger surface takes a larger radius so the corner reads as the same optical curvature. A small element with a large radius reads as a pill and implies a different interactive affordance than intended.

**Nested radius rule:** an inner element's radius equals the outer radius minus the padding between them, floored at 2px. Equal radii on nested surfaces produce a visible optical gap at the corner — one of those defects nobody can name but everybody perceives as sloppy.

## Geometry

**Right angles. No diagonals, no organic shapes, no asymmetric containers, no rotation.**

This follows directly from the metaphor. An optical instrument's geometry is orthogonal because orthogonal geometry is what makes precise separation legible. A diagonal section divider, a tilted card, a blob background — each introduces an axis carrying no information, and each fights the alignment that does all our structural work (Ch. 2).

It is also a durability decision. Diagonal section dividers and organic blobs are the two most precisely datable visual devices of the last decade.

## Button and control shape

**One shape family.** Buttons, inputs, selects, and dropdowns share a radius (4px) and a height rhythm, so that a control row aligns without adjustment.

**Three heights**, mapping to the density registers: compact, default, and large. Nothing else. A one-off button height is a defect and it will propagate.

**Full-round (pill) buttons are prohibited.** They read consumer, they make horizontal padding ambiguous, and they align badly beside square inputs. This is a place we deliberately diverge from products whose emotional register is *welcome*; ours is *composure*.

**Shape does not encode hierarchy.** A primary and a secondary button are the same shape, distinguished by fill and contrast. Distinguishing them by shape as well is redundancy that makes both harder to scan in a row of actions.

## Consistency rules

- One radius per element type, product-wide. A card is 6px on every screen.
- Radius is never used for emphasis.
- Radius does not change on hover, focus, or active. Shape changing under the cursor is destabilizing and produces layout shift.
- Dividers, rules, and table borders are square. Always.
- **When in doubt, use the smaller radius.** Errors toward sharpness read as precise; errors toward roundness read as unconsidered.

---

# Chapter 8 — Iconography

## The premise: icons are labels, not decoration

An icon exists to make something recognizable faster than a word would. When it is doing anything else — filling space, adding color, decorating a heading, restating an adjacent label — it is failing Bible 5.3 and should be removed.

**An icon beside a label that means the same thing is a duplicate**, not reinforcement. The most common icon defect in enterprise software is a settings page where every row has a decorative glyph that carries zero information and costs a scan.

## Specification

| Property | Value |
|---|---|
| **Grid** | 20px, with 16px and 24px variants at the same optical weight |
| **Stroke** | 1.5px at 20px, scaled proportionally |
| **Caps** | Butt (square) |
| **Joins** | 2px radius |
| **Style** | Outline by default |
| **Fill** | Reserved — see below |

**Why a 20px grid rather than 24px.** Our interface runs dense. A 24px icon inside a 28px row forces padding decisions that fight Chapter 4's Intra register, and it makes every dense control taller than it needs to be. 20px sits comfortably in a 32px control and reads correctly beside 13–14px text, which is where most of our icons live.

**Why 1.5px stroke.** 1px disappears at 20px on standard-density displays and reads as fragile. 2px reads as heavy and consumer at our type sizes. 1.5 holds against 13px text at the same optical weight — the test is that an icon beside a label should not draw more attention than the label.

**Why butt caps and softened joins.** Round caps read friendly and slightly soft; fully mitred joins read brittle and technical. Butt caps with a 2px join radius reads *precise* — the same register as our borders and our 6px containers. Small choice, but it is the difference between an icon set that looks like it belongs to this system and one that looks licensed.

## Outline versus filled

**Outline is the default and carries no state.**

**Filled has exactly one meaning: this is currently true.** An active navigation item, a selected state, a status indicator that is *on*. Filled is a state channel, not an emphasis channel, and using it for emphasis destroys its reliability the same way decorative elevation destroys elevation (Ch. 3).

**No duotone, no two-color icons, no gradient fills.** An icon carries at most one color, and by Chapter 6 that color is almost always the surrounding text color.

## Color in icons

**Icons inherit text color by default.** An icon beside secondary text is secondary; beside body text, body.

Colored icons are permitted only where the color is already carrying meaning — a status icon in the state palette, an accent icon inside the single accent element per view. **A colored icon that is colored to look nice is spending Tier 1 or Tier 2 color on decoration** (Ch. 6).

## Animation

**Icons do not animate.** No spin on hover, no morph on toggle, no bounce on activation.

This follows from Bible Ch. 13: hover reveals affordance, not delight. An icon that animates on hover costs attention every time the pointer crosses it — which, in a dense Index panel, is dozens of times per minute. It is the clearest possible case of first-viewing charm against two-hundredth-viewing irritation.

**Two exceptions, both informational:** a loading indicator, which ends when the operation does; and a disclosure chevron rotating to indicate open state, which is a state change and completes in under 150ms.

## Set consistency

- One set, one source. Mixing icon libraries is immediately visible and impossible to fix incrementally.
- New icons are drawn on the grid at the same stroke and reviewed against the set, not against the screen that needed them.
- **Optical weight matters more than geometric accuracy.** A circle at 1.5px reads heavier than a square at 1.5px; correct optically.
- If a concept has no good icon, use a word. **A bad icon is worse than no icon** — it costs the space and adds a decoding step.

---

# Chapter 9 — Illustration Philosophy

## The default: no illustration

Not a stylistic preference — a direct consequence of Bible 5.2, *show, then claim*.

**Illustration appears where we have nothing specific to show, and its most common function is to conceal that fact.** A hero illustration on a product page is usually there because the product surface was not ready or not impressive enough. Removing it exposes an emptiness the team would then have to fix, which creates a quiet incentive to leave it (Checklist §14 D1).

**Where the thing exists, show the thing.** A screenshot of a real interface with real data outperforms any illustration of that interface, always, because it is evidence rather than depiction (Ch. 10).

## Absolutely prohibited

Stated as prohibitions so each does not require a fresh debate:

- **Abstract AI imagery of any kind** — glowing orbs, neural meshes, particle fields, node graphs as decoration, gradient brains. Banned by Bible 5.2 and restated here because it is the single most likely thing to be proposed.
- **Character illustration.** People with laptops, stylized recruiters, candidate avatars as art. We are the interface where a person's candidacy is assessed; cartoon people in that context read as flippant.
- **Blob, wave, and organic background shapes.**
- **Isometric scenes.**
- **Spot illustration as page decoration** — the small drawing beside a section heading.
- **Empty-state illustration.** An empty state is a marketing surface at the moment of maximum intent (Bible Ch. 12). It should explain what will appear here and how to make it appear. A drawing of an empty box tells the user nothing and takes the space where the explanation should be.

## The one permitted form: the diagram

**Governance prohibits decoration and abstract AI imagery. It does not prohibit explanation** — and I will not invent a stricter principle than the governing documents contain.

A diagram is permitted where it explains a **structure or a sequence that prose explains worse**: how evidence flows from source to conclusion, how a decision record is assembled, the stages of a pipeline.

Criteria — all must hold:

1. **It carries information no sentence carries as efficiently.** If a diagram can be replaced by two sentences with no loss, it is decoration.
2. **Every element is labelled and every label means something.** No unlabelled connecting lines, no decorative nodes.
3. **Monochrome plus at most one accent**, following Chapter 6's tiers. Diagrams are not an exemption from the color system.
4. **Built from the system's own geometry** — same radii, same borders, same type scale, same stroke weight as icons. A diagram should look like our interface drawn schematically, not like clip art placed inside it.
5. **Legible at final rendered size**, in both themes, in grayscale.
6. **No perspective, no 3D, no isometry.**

**A diagram is authored like a component, not drawn like an image.** It is reviewed against Chapter 14 and gets the same consistency scrutiny as any other surface.

## When a screenshot replaces an illustration

**Always, where the interface exists.** The only legitimate cases for a diagram over a screenshot:

- The subject is a *process* spanning several screens or a period of time, so no single screenshot shows it.
- The subject is a *relationship* between things the interface does not visually connect.
- The interface does not exist yet — and in that case the diagram is temporary, with a note saying so, and it is replaced when the surface ships.

That third case has a failure mode worth naming: temporary diagrams outlive their reason, and nobody notices because they were never wrong, only superseded.

---

# Chapter 10 — Product Imagery

## The premise: a screenshot is evidence

Our differentiators are all about verifiability (Bible Ch. 2). A page that asserts traceability while showing a stylized rendering has contradicted itself in its own layout.

**Therefore product imagery is documentary, not promotional.** Its job is to let a skeptical reader verify a claim, not to make the product look impressive. Those two goals conflict more often than people expect, and when they do, verification wins.

## Plane-true rendering

**Screenshots are shown flat, front-on, at true proportion. No perspective, no rotation, no 3D, no floating devices.**

This is governance, not preference — Bible Ch. 6 prohibits 3D renders and floating devices explicitly, and Chapter 7 of this book prohibits rotation on the same grounds. **A perspective screenshot is unreadable by design**: it says *look at this object* when we need *read this evidence*.

It is also the fastest-dating device in software marketing. A floating, tilted, glowing device mockup is precisely datable to a two-year window.

## Device frames and browser chrome

**Omit both by default.**

A browser frame adds pixels, carries no information, and implies the product is a website when the reader's question is what it does. A laptop bezel does the same and adds the implication that we are showing a photograph of a screen rather than the screen.

**The permitted exception:** where the *device itself is the claim* — demonstrating genuine mobile behavior, for instance. Then the frame is minimal, flat, plane-true, and monochrome. Never a rendered product photograph.

## Cropping

**Crop to the evidence.** The most common failure is showing an entire screen at a size where nothing on it is legible — which proves the product has an interface and nothing more.

Rules:

1. **Legibility is the constraint.** If body text in the image is below roughly 11px at final rendered size, crop tighter or show less. An illegible screenshot is decoration (§14 D1).
2. **Crop on structural boundaries** — a panel edge, a section border — never mid-component. A card sliced in half reads as a rendering error.
3. **A crop may not misrepresent.** Cropping out a state that would change the reader's interpretation is a Bible Ch. 14 trust failure, not a design choice.
4. **Prefer one legible region over three illegible ones.** Depth over breadth applies to imagery exactly as it does to copy (Bible Ch. 11).

## Presentation

**Product images sit on the page as content, using the elevation system** — Ground with a border, or Raised where they genuinely float above scrolling content. Never a marketing glow, never a colored shadow, never a gradient backdrop.

**No mockup furniture:** no floating notification cards, no orbiting UI fragments, no partially-visible panels arranged for composition. These are illustrations wearing screenshots' clothing.

## Content in screenshots

**The rule that matters most, and the one most often broken:**

**Data in a screenshot is realistic, complete, and plausible.** Real-length names, real-length titles, full fields, realistic counts (Checklist §14 C3). A marketing screenshot showing four tidy rows sets an expectation the product violates at first login, and that gap is the most reliable predictor of the "overhyped" narrative.

Consequently: **the screenshots used in marketing are drawn from the same fixtures used in design review.** If the review requires worst-case realistic data, marketing does not get a tidier version.

**And the obligation that costs us something:** at least one product image on the marketing site shows a **low-confidence state** (Checklist §10.8, `DDL-AIX-001`). Our calibration claim is our strongest differentiator; a page showing only the happy path makes the competitor's claim, not ours. This is the clearest case in this book of the Bible's principle that trust is bought with voluntary constraint.

**Privacy:** all data is synthetic. No real candidate information appears in any image, ever, regardless of consent or redaction.

---

# Chapter 11 — Data Visualization Philosophy

## The premise: most of our data visualization is a table

**Tables are under-respected and over-replaced.** For our users' actual questions — *which candidates, on what evidence, ranked how* — a well-built table outperforms every chart, because it is precise, scannable, sortable, and shows the underlying values rather than an encoding of them.

**The default is a table. A chart requires justification**, and the justification is that the question is about a *shape* — a trend, a distribution, a difference — that a table forces the reader to compute mentally.

This inverts the usual product instinct, which reaches for charts because charts look like analytics. A dashboard of charts that answer no question is a catalogued smell (§14 A3).

## The ethical constraint that shapes everything here

**We visualize evidence about people.** That imposes constraints no generic charting guidance contains:

1. **No visual encoding may imply that a person is good or bad.** We assess evidence against a stated bar (Bible Ch. 2, differentiator 4). A red-to-green scale applied to candidates makes exactly the claim we have committed never to make.
2. **Rank is not worth.** A candidate ranked fourth is fourth *on this evidence, against this bar*. Visual treatments that dramatize rank — podiums, medals, size-scaled avatars, leaderboards — are prohibited.
3. **Uncertainty is always visible.** A chart that plots scores without showing evidence sufficiency presents inference as measurement (Checklist §8.13).

## Color in data

**Sequential over categorical wherever possible.** Most of our data is ordered — scores, counts, recency — and ordered data takes a single-hue sequential ramp. Categorical palettes applied to ordered data destroy the ordering, and are the most common charting error in products like ours.

**Categorical: six colors maximum.** Beyond six, humans cannot reliably match legend to mark. If a chart needs more than six categories, it needs grouping or a table.

Every categorical set must pass three tests, all three:

1. **Grayscale** — distinguishable in print and in a pasted screenshot.
2. **Deuteranopia and protanopia** — the two most common deficiencies.
3. **Small-mark legibility** — distinguishable at 4px, which is the size of a real data point, not the size of a legend swatch.

**Prohibited:** red-to-green diverging scales on anything person-related; rainbow and spectral ramps (perceptually non-uniform, so they invent structure that is not in the data); gradient fills under lines; more than one accent per chart.

**Direct labelling beats legends.** A legend forces a lookup on every read. Label the series where it sits.

## Confidence in charts

Chapter 6's rule applies without exception: **confidence is rendered as definition, never as hue.**

| Represent uncertainty as | Never as |
|---|---|
| A band, range, or interval around the mark | A warning color |
| Reduced definition — lighter stroke, open rather than filled mark | A separate red/amber/green series |
| An explicit annotation of what is missing | A hidden footnote |
| Evidence count adjacent to the value | Silence |

**A point estimate rendered at full definition when the underlying evidence is thin is a lie told by a chart.** This is the visualization form of §14 F7, and it is a Gate 2 concern when the value came from a model.

## Scores

The most sensitive object in the product.

- **Never a percentage unless calibrated** (§8.10). Where calibration is unvalidated, show evidence sufficiency — *"2 of 5 expected signals"* — which describes inputs rather than claiming accuracy.
- **Never a five-star or letter-grade encoding.** Both import consumer-review semantics onto a person.
- **Always adjacent to its evidence path.** A score with no route to its source is a verdict (Bible Ch. 2, differentiator 1; Gate 2).
- **Never the largest thing on the screen.** Visual weight maps to importance (Checklist §6.2), and the score is not more important than the reasoning behind it.

## Comparison

Comparison is our highest-value visualization and the one most often built wrong.

**When the question is "how do these differ," plot the difference, not two absolutes side by side.** A dot plot or slope chart answers it directly. Paired bars require the reader to measure two lengths and subtract — work we should have done.

- **Align on the dimension, not the candidate.** The reader's question is *where do these two diverge*, and dimension-aligned rows answer it in one scan.
- **Show where evidence is missing**, explicitly, as a distinct visual state — not as a zero and not as a gap. Absence of evidence and evidence of absence look identical if we are careless, and the difference is the whole point.
- **No composite "overall" mark that hides its components.** If an aggregate is shown, its parts are one interaction away.

## Charts we do not use

| Prohibited | Why |
|---|---|
| Pie and donut charts | Humans compare angles poorly. A sorted bar or a table is strictly better. |
| 3D anything | Distorts the encoding it exists to communicate. |
| Dual-axis charts | Manufactures correlations by choice of scale. |
| Truncated value axes on bars | Bar length *is* the encoding; truncating it misrepresents. |
| Radar and spider charts | Area scales with the square of the value and depends on category order — genuinely misleading for candidate profiles, which is where they are always proposed. |
| Word clouds | Encodes frequency as area, which reads as importance. |
| Animated chart transitions on load | Motion that delays reading (Bible Ch. 10). |

## Heatmaps

Permitted where the question is genuinely two-dimensional — coverage across candidates and dimensions, for instance.

Constraints: single-hue sequential ramp only, at most five perceptible steps, always accompanied by the underlying values on demand, and it must survive grayscale. **A heatmap that only works in color is a decorative grid.**

## Tables as visualization

Because the table is our primary chart, it gets visualization discipline:

- **Sortable on every meaningful column**, with the current sort visible without hovering.
- **Inline micro-visualization is permitted** — a small bar in a cell, a sparkline — where it aids scanning and the number remains present. The visual is an aid; it never replaces the value.
- **Row state uses the state palette; row content does not.** Selected, focused, and flagged are states. A cell tinted by value is a heatmap and follows heatmap rules.
- **No zebra striping** (Ch. 5). Hairline borders separate rows and leave background available for genuine state.
- **Sticky header** on any table taller than the viewport. A column you cannot identify is a column you cannot read.
- **Empty cells say what they mean** — *no data* is different from *zero* and different from *not applicable*, and rendering all three as blank destroys information we have.

---

# Chapter 12 — Accessibility Philosophy

## The premise: this is not a compliance chapter

Two reasons, and the second is the one that changes decisions.

**First, the conditions accessibility addresses are our users' normal conditions.** Hours of dense reading, time pressure, whatever laptop the company issued, in a room with the wrong lighting. Fatigue, keyboard-only working, and motion sensitivity are not edge cases in this audience; they are Tuesday.

**Second, accessibility failures are almost always hierarchy failures wearing a different hat.** An interface with coherent structure, honest semantics, and real focus management is easier to make accessible because it was already clearer. When this chapter is hard to satisfy, the usual cause is not missing markup — it is that the structure was never resolved and markup is being asked to describe something incoherent.

## Contrast

**Contrast is a floor, not a target** (Bible Ch. 8). Minimums are the entry condition; comfort at hour three is the standard.

| Element | Floor | Target |
|---|---|---|
| Body text | 4.5:1 | **7:1** |
| Secondary text | 4.5:1 | 5.5:1 |
| Metadata, tertiary | 4.5:1 | 4.5:1 — **never lower** |
| Large text (≥20px semibold, ≥24px) | 3:1 | 4.5:1 |
| Meaningful borders and control edges | 3:1 | 3:1 |
| Decorative separators | 1.3:1 | — |
| Focus indicator | 3:1 | 4.5:1 |
| Chart marks against background | 3:1 | 3:1 |

**The most-broken row is metadata.** Timestamps, provenance labels, and evidence counts are habitually rendered at whatever looks appropriately quiet. In this product that text is often the most important on the screen — it is what makes an assessment trustworthy — and it is never below 4.5:1.

**Disabled states are exempt from contrast minimums and must still be identifiable.** A disabled control that is invisible is a control the user cannot find to understand why they cannot use it.

## Color independence

**Every meaning carried by color is also carried by shape, label, position, or weight** (Bible Ch. 8).

**Test procedure, applied at review:** render the surface in grayscale. If any meaning is lost, the surface fails. This is not a simulation of an edge case — it is the state our screenshots reach the moment they are printed, projected, or pasted into a deck.

Confidence is already immune by construction, because Chapter 6 puts it on a non-hue channel.

## Focus

**Every interactive element has a visible focus indicator**, and *visible* means visible to a person on a laptop screen at normal brightness — not merely present enough to satisfy a checker (§14 H3).

**Specification:** a 2px indicator with a 2px offset, at ≥3:1 against both the element and the surrounding surface, in both themes. It sits outside the element so it never reduces the element's contrast or shifts layout.

**Focus is never removed. Ever.** Not on mouse users, not on "polish" grounds, not on a single component that looked better without it. Suppressing focus for pointer users and restoring it for keyboard is acceptable only where it is genuinely reliable; when in doubt, always show it.

**Focus order follows visual order.** A mismatch means the DOM and the layout disagree, which is a structural defect surfacing as an accessibility one.

## Hit targets

| Context | Minimum |
|---|---|
| Dense interfaces (table rows, compact controls) | 24×24px |
| Default controls | 32×32px |
| Primary actions and all touch contexts | 44×44px |

Targets may overlap their visual bounds. **A 16px icon button with a 32px target is correct**, and it is how a dense interface stays operable without becoming loose.

**Nothing is hover-only.** Information or actions that exist only on hover do not exist on touch, do not exist for keyboard users, and are undiscoverable for everyone else (§14 H2). Hover reveals affordance; it never reveals content.

## Zoom and reflow

**200% zoom is a first-class requirement**, not an edge case — it is the most-used accessibility feature in existence and the least-tested.

At 200%, content reflows without horizontal scrolling and without loss of function. Panels collapse in the order Chapter 13 defines. **Tables are the permitted exception**: a wide data table may scroll horizontally within its own container, provided the page does not.

## Motion

`prefers-reduced-motion` is honored completely, and **the correct implementation preserves the information the motion carried** — cross-fade instead of transition, instant state change instead of animated (Bible Ch. 10).

Disabling animation and leaving a discontinuity is a worse experience, not an accessible one: the users who most need the accommodation get a *more* confusing interface than everyone else (§14 H4).

**Design test:** with all motion removed, is the interface still comprehensible? If not, the motion was carrying meaning the layout should carry.

Because our motion vocabulary is minimal by governance, this chapter is cheap for us to satisfy — which is a genuine benefit of restraint, not a coincidence.

## The density tension, stated honestly

**Dense interfaces and accessibility are in real tension, and pretending otherwise produces bad decisions.**

Our position: **density is achieved by reducing space, never by reducing size or contrast.** Compact mode tightens padding; it does not shrink type below the UI floor or lighten text below its contrast target. A surface that only fits at 11px body text or 3:1 contrast is a surface with too much on it — an information architecture problem (Checklist §4.6), not a typography one.

That is the trade we accept: **we will sometimes fit less on a screen than a competitor.** In exchange, what is on the screen is readable in hour four by everyone.

---

# Chapter 13 — Responsive Philosophy

## Desktop-first, and why that is the honest choice

Most systems are mobile-first, for good reasons that do not apply to us.

**Our primary user works at volume, on a laptop, in a browser, alongside other tools, for hours.** The workspace — Index, Subject, Inspector — has no meaningful mobile analogue, because its value comes from seeing evidence and subject simultaneously. Designing it mobile-first would mean designing the least important experience first and expanding it into the important one, which produces exactly the loose, oversized, under-informative desktop screens that plague products built that way.

**Marketing surfaces are a separate case and are designed responsive-first**, because a meaningful share of that traffic is mobile and the content is linear.

**Being honest about the trade:** desktop-first means mobile requires deliberate, separate design work rather than falling out of the process. Where that work has not been done, we say so rather than shipping a degraded workspace and calling it responsive.

## Breakpoints

| Name | Range | Posture |
|---|---|---|
| **Wide** | ≥1536px | Full panels; Field content uses the extra width |
| **Standard** | 1280–1535px | Reference viewport — **designs are authored here** |
| **Laptop** | 1024–1279px | Inspector becomes on-demand |
| **Tablet** | 768–1023px | Two panels maximum |
| **Compact** | <768px | Single panel; workspace becomes read-and-triage |

**Designs are authored at Standard, not at Wide.** Authoring at 1600px produces layouts that feel correct nowhere, because the most common real viewport is a 13–14" laptop with browser chrome and often a sidebar from another app.

## The adaptation rule

**Adapt by removing panels, never by reducing density.**

This is the chapter's central rule and it inverts the common instinct. As the viewport narrows, most systems keep every region and shrink everything. That produces a screen with all the same information at unusable size.

We do the opposite: **fewer regions, each at full density.** An Inspector does not become a squeezed column; it becomes a panel opened on demand. A three-panel workspace becomes two, then one.

**Panels collapse in a fixed priority order:** Inspector first, then Navigation (to a rail, then to a menu), then Index (to a route rather than a panel). **Subject is never collapsed** — it is what the user came for.

## Progressive adaptation

Each step is a designed state, not a media query fallback:

**Wide → Standard.** Field content contracts to its comfortable maximum. No structural change.

**Standard → Laptop.** Inspector becomes on-demand — a toggle, not a drawer that covers the Subject. Navigation may narrow to a rail with icons and accessible labels.

**Laptop → Tablet.** Two panels maximum. Index and Subject become sibling routes rather than simultaneous panels where the task allows. Tables begin horizontal scroll within their container.

**Tablet → Compact.** One panel. Navigation becomes a menu. **The workspace becomes a reading and triage surface, not a full workspace** — and that is a decision, not a limitation. Some tasks are not available at this size. **Saying so plainly is better than offering a version that will produce worse decisions**, which for this product is the actual risk.

## What never changes across viewports

- **Type sizes.** The UI register is the same at every breakpoint. Scaling type with viewport is a magazine technique that makes an application feel like a website.
- **Border weight.** 1px everywhere.
- **Radius.** A card is 6px at every size.
- **Contrast targets.** Never relaxed for space.
- **Hit target minimums.** Only ever increased, at touch sizes.
- **Information hierarchy.** What is most important at Wide is most important at Compact.

## Touch

Touch is treated as an input mode, not a breakpoint — a large tablet may be touch-primary at a wide viewport.

Where touch is detected or likely: hit targets to 44px, hover-dependent affordances made persistent (they should not exist anyway, per Ch. 12), and hover-only tooltips given a tap equivalent.

---

# Chapter 14 — Consistency Rules

The nevers. Each is a rule someone will want to break, with the reason it exists. **A designer may not grant themselves an exception to this list**; a change to it is a change to the system (Ch. 15).

## Surface and depth

1. **Never add a fourth elevation level.** It signals a structural problem being papered over with shadow.
2. **Never elevate a card.** Cards are Ground. Grouping is border and space.
3. **Never use a gradient on a background.** Not subtle, not "barely visible," not behind a hero.
4. **Never use glass decoratively.** Only where the layered content is meant to be seen through.
5. **Never add noise, grain, or texture** to any chrome surface.
6. **Never place two borders adjacent doing the same separation.**
7. **Never make a dark theme by inverting light values.** It is a separately designed ramp.

## Space and layout

8. **Never give a heading equal space above and below.**
9. **Never let an Intra gap exceed an Inter gap, or an Inter gap exceed a Section gap.**
10. **Never exceed Reading measure for prose**, however much width is available.
11. **Never use indentation for anything but containment.**
12. **Never nest panels.**
13. **Never create a nested scroll region** outside a table body.
14. **Never simplify a product surface to make it look calmer.** Fix hierarchy instead.

## Typography

15. **Never introduce a third type family.**
16. **Never use mono as a texture.** It means *machine value*, nothing else.
17. **Never use all-caps** beyond two-to-four-character abbreviations.
18. **Never use Title Case** for headings, buttons, or labels.
19. **Never use proportional figures in a vertical set.**
20. **Never left-align numbers in a column.**
21. **Never use more than three heading levels on a surface.**
22. **Never bump a type size to create emphasis.** Use weight.
23. **Never show more decimal places or precision than the underlying signal supports.**

## Color

24. **Never use the accent decoratively.** One accent element per view, on the action.
25. **Never let color carry meaning alone.**
26. **Never use hue to express confidence.** Definition, weight, explicitness, and words only.
27. **Never use red-amber-green on anything person-related.**
28. **Never brand the product chrome with accent color.**
29. **Never invent a new semantic hue.** Four states exist; a fifth means the taxonomy is wrong.
30. **Never lower metadata contrast below 4.5:1** to make it feel quieter.

## Shape and icons

31. **Never exceed 10px radius** except full-round on avatars and status dots.
32. **Never use pill-shaped buttons.**
33. **Never change radius on hover, focus, or active.**
34. **Never use diagonals, rotation, or organic shapes.**
35. **Never mix icon sets.**
36. **Never animate an icon** except loading and disclosure state.
37. **Never place an icon beside a label that means the same thing.**
38. **Never use filled icons for emphasis.** Filled means *currently true*.

## Imagery and data

39. **Never use abstract AI imagery.** Ever, anywhere, in any form.
40. **Never use character illustration or empty-state drawings.**
41. **Never show a screenshot in perspective, rotated, or in a device render.**
42. **Never use demo data in a screenshot** — marketing or product.
43. **Never crop a screenshot in a way that changes its meaning.**
44. **Never use pie, donut, radar, 3D, or dual-axis charts.**
45. **Never truncate a bar chart's value axis.**
46. **Never show a score without a route to its evidence.**
47. **Never render a point estimate at full definition when the evidence is thin.**
48. **Never zebra-stripe a table.**
49. **Never leave an empty cell ambiguous** between *no data*, *zero*, and *not applicable*.

## Accessibility

50. **Never remove a focus indicator.**
51. **Never rely on hover to reveal content.**
52. **Never relax a contrast target to fit more on a screen.**
53. **Never reduce type size below the UI floor to achieve density.**
54. **Never implement reduced motion by deleting the animation** and leaving a discontinuity.

## The meta-rule

55. **Never introduce a novel pattern for one screen.** Either it is better and belongs everywhere — which is a project to scope now — or it is not, and it is noise (Checklist §5.8, §14 C4). *"We'll roll it out later"* is not a third option.

---

# Chapter 15 — Future Scalability

## Three layers, three lifespans

| Layer | Content | Expected life | Changed by |
|---|---|---|---|
| **Philosophy** | Ch. 1, and the governance it derives from | 5–10 years | GAP against the Bible |
| **System** | Ch. 2–8, 12–14 — structures, scales, ratios, rules | 3–5 years | Versioned change to this book |
| **Values** | Specific hues, exact sizes, token names (Book II) | 1–3 years | Ordinary design work |

**The most common failure is misfiling a decision's layer** — defending a value as though it were philosophy, or revising philosophy to accommodate a campaign. Before arguing about a change, establish which layer it belongs to. That question resolves most of these arguments before they start.

## What must not fragment

**The single largest risk to this system over five years is sub-branding.**

As HireLens extends into interviewing, calibration, offers, and post-hire loops, each area will want its own identity. Every request will be locally reasonable and well-argued: *this area is different, it has different users, it deserves its own feel.*

**New capabilities extend this language. They do not get their own** (Bible Ch. 15). Sub-brands are how design systems die — each one is defensible and collectively they are fatal. The system's whole value is that learning one surface teaches you the next.

**The correct response to "this area is different" is to ask what structure it needs**, not what style. Usually the answer is a new panel arrangement or a density register, both of which this system already provides.

## Named pressures, with the answer decided in advance

**Enterprise aesthetics.** Large buyers will ask for denser dashboards, more configuration, more chrome. Some of that is correct capability and should be absorbed. **We adopt enterprise capability; we do not adopt enterprise aesthetics.** Being taken seriously by large organizations is not achieved by resembling the software they already regret buying.

**The AI narrative changing.** Within a few years AI will be assumed infrastructure. This system is already built for that world — there is no AI-specific visual vocabulary in it, no sparkle iconography, no purple. When the market stops caring, nothing here changes (`DDL-POS-002`). Every quarter that "make it feel more AI" seems like the obvious move, this is the paragraph to reread.

**Internationalization.** 30–40% text expansion in some languages, RTL layouts, different numeral and date conventions. Our reliance on structure over composition is an advantage — structural layouts survive translation; layouts tuned to specific string lengths do not. Concretely: no layout depends on a specific label length, and no component breaks when its text doubles.

**Team growth.** More designers means more variance, and variance is managed by shared reasoning rather than more rules. **Onboarding teaches Chapters 1, 4, and 6 before it teaches components** — space, color meaning, and the reason for restraint. A designer who understands those three will make defensible decisions in cases this book never anticipated.

**Density pressure from both directions.** Some users will want more on screen; some stakeholders will want it calmer. The answer to both is Chapter 2: density is a design decision per surface, driven by the task. Neither a global preference toggle nor a uniform loosening is a real answer.

## How this book changes

**Versioned, not edited.** Book I is not frozen — a system that cannot improve is a system that will be worked around. But a change is a change to the system, applied everywhere it belongs, in one pass. It is never a local exception.

**Adding a value is normal work.** A new spacing step, a new semantic step, a new icon on the grid — ordinary, provided it follows the existing structure.

**Changing a structure is a versioned change**, requiring: what changes, why the current structure fails, what it affects across the product, and a migration plan. Structures are Chapter 4's registers, Chapter 5's scale, Chapter 6's tiers, Chapter 3's three levels.

**Contradicting governance is a GAP.** If this book ever needs to do something the Bible or the Checklist prohibits, that is not a design decision — stop and file it (`DESIGN_DECISION_LOG.md` §6). Never resolve a governance conflict inside a design system change.

## The five-year test

Someone joins this team in 2031, reads this book, and looks at what we shipped.

**They should be able to tell that the constraints were load-bearing** — that the restraint was a position rather than an absence, that the plainness was chosen, and that the parts of the product built after this book still look like the parts built before it.

That last clause is the actual measure. Everything above is in service of it.

---

# Self-Review

Performed against governance before release, as required.

## Against `MARKETING_DESIGN_BIBLE.md`

| Chapter | Check | Result |
|---|---|---|
| Ch. 1 (Vision) | No speed-led or AI-led framing | Pass — Ch. 6 and 15 restate AI as supply chain |
| Ch. 2 (Positioning) | No prohibited claims; category language | Pass |
| Ch. 5.1 (Clarity first) | Structures serve legibility over appearance | Pass — Ch. 1 trade-offs stated explicitly |
| Ch. 5.2 (Show, then claim) | No abstract AI imagery; screenshots over illustration | Pass — Ch. 9, Ch. 10 |
| Ch. 5.3 (Earn every element) | Decoration prohibited throughout | Pass — Ch. 8, Ch. 9, Ch. 14 |
| Ch. 5.4 (Density as respect) | Density registers; no dilution | Pass — Ch. 2, Ch. 4 |
| Ch. 5.6 (Restraint) | No gradient, glass, glow, texture, 3D | Pass — Ch. 3, Ch. 14 |
| Ch. 5.7 (Honesty) | Real data in imagery; low-confidence shown | Pass — Ch. 10 |
| Ch. 6 (Visual philosophy) | 3 elevation levels; border-first; translucency limited | Pass — Ch. 3 |
| Ch. 7 (Resolution metaphor) | Metaphor structurally encoded | Pass — Ch. 1, Ch. 6 confidence channel |
| Ch. 8 (Color) | Neutral foundation; 4 tiers; confidence non-hue; both themes equal | Pass — Ch. 6 |
| Ch. 9 (Typography) | Measure, tabular figures, restraint, small-size quality | Pass — Ch. 5 |
| Ch. 13 (Interaction) | Hover = affordance only; no hover-only content | Pass — Ch. 8, Ch. 12 |
| Ch. 14 (Trust) | Provenance adjacency; voluntary constraint | Pass — Ch. 10, Ch. 11 |
| Ch. 15 (Scalability) | No sub-brands; survives AI commoditization | Pass — Ch. 15 |

## Against `DESIGN_REVIEW_CHECKLIST.md`

| Checkpoint | Result |
|---|---|
| §6.1–6.4 (focal point, weight, grouping, type restraint) | Encoded in Ch. 2, 4, 5 |
| §6.8–6.10 (depth, translucency, color) | Encoded in Ch. 3, 6 |
| §6.13 (not the generic solution) | Ch. 1 differentiation; Ch. 2 panel-over-grid; Ch. 6 confidence channel |
| §8.11 (confidence visualization) | **Directly addressed** — Ch. 6 Tier 3, Ch. 11 |
| §8.13 (hallucination handling) | Ch. 11 — uncertainty always visible, evidence adjacency |
| §10.7–10.8 (claim boundaries, imperfect state) | Ch. 10, Ch. 11 |
| §11 (accessibility, **Gate 1**) | Ch. 12 — contrast, focus, targets, zoom, motion |
| §12.2 (token compliance) | Ch. 15 — token gaps fixed, not tolerated |
| §14 D1–D6 (visual smells) | Ch. 14 nevers 1–30 |
| §14 H1–H4 (accessibility smells) | Ch. 12, nevers 50–54 |
| §15 Gates 1–5 | No structure in this book bypasses any gate |

## Conflicts found

**None requiring a GAP.** Three points required interpretation of frozen text rather than extension of it, recorded here for transparency:

**1. Device frames in marketing imagery.** Bible Ch. 6 prohibits *"3D renders and floating devices."* It does not mention flat, plane-true device frames. **Resolved by following governance conservatively:** frames are omitted by default and permitted only where the device itself is the claim, flat and monochrome. No new principle invented.

**2. Illustration.** Governance prohibits abstract AI imagery (5.2) and unjustified decoration (5.3). It does not prohibit explanatory diagrams. **I did not invent a stricter rule than governance contains** — Ch. 9 permits diagrams under six criteria and prohibits everything governance prohibits. Stated explicitly in Ch. 9 so a future reader does not mistake the permission for drift.

**3. Desktop-first.** Governance is silent on responsive posture; Checklist §11.8 requires 200% zoom and narrow-viewport function. Desktop-first is compatible, and Ch. 12–13 satisfy §11.8 explicitly. Recorded because the choice is consequential and derived from user context rather than from governance.

**One boundary observed:** Bible Ch. 8 states *"No values here. Values belong to the design system and will be revised."* Book I is that design system, so specifying values is the delegated behavior, not a contradiction. The accent hue remains open by decision (Ch. 6) and is the first deliverable of Book II.

## Decisions recorded

Four architectural decisions filed in `DESIGN_DECISION_LOG.md`, status **Proposed** pending approval of this book:

- `DDL-VIS-002` — 4px base unit with a three-register spacing system
- `DDL-VIS-003` — Two type families, no display face, tabular figures by default
- `DDL-VIS-004` — Confidence rendered on a non-hue definition channel
- `DDL-VIS-005` — Desktop-first with density-preserving adaptation

---

*HireLens Visual Design System · Book I — Foundations · v1.0*
*Subordinate to governance. Book II (Components & Tokens) follows.*
