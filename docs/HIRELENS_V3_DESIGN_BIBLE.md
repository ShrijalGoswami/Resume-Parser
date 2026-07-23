# HireLens V3 — Design Bible

> **Status:** Design language, approved for build. Companion to
> [HIRELENS_V3_UX_SPEC.md](./HIRELENS_V3_UX_SPEC.md).
> **Relationship:** The UX Spec is the **frozen structural contract** — routing, surfaces,
> screen layouts, states, keyboard map, and component *behavior*. This Bible is the
> **visual + design-language layer** on top of it: identity, tokens, information density,
> component *visual anatomy*, motion choreography, dataviz, and the AI experience.
> Where the two overlap, the UX Spec wins on **structure/behavior**; this Bible wins on
> **look, feel, motion, density, and color**. Neither invents features, navigation, or workflows.
> **No code.** Semantic tokens only; raw values live in Part III.
> **MUST / SHOULD / MAY** in the RFC sense.

---

## How to read this Bible

- **Parts I–III** define the identity and the token system. Read these first; everything else derives from them.
- **Parts IV–VI** apply the identity to components, the app shell, and each screen. For screen *layout, states, and keyboard shortcuts*, this Bible defers to UX Spec §5–§10 and only specifies the **visual/identity/motion/density treatment** on top. It never re-lays-out a screen.
- **Part VII** is the single AI interaction model (extends UX Spec §4.6/§4.7).
- **Parts VIII–X** are motion, accessibility, and the design-layer build order.
- **Appendix A** is the decisions log — every aesthetic choice I made and why, including the divergence from the committed Iris palette.
- Token names here **supersede** the raw palette in UX Spec §3. Semantic names are stable; if the team keeps Iris, only the hex values in Part III change (see Appendix A).

---

# PART I — DESIGN PHILOSOPHY

## 1.1 The thesis: Optical Clarity

HireLens is named for a **lens** — an instrument that takes a noisy, crowded field and brings exactly one thing into sharp focus. That is also the recruiter's job: sift a high-volume, high-stakes pile of people and resolve it into one confident, evidence-backed decision. The product's entire visual language is built from that single idea.

> **HireLens should feel like looking through a precision instrument, not like reading a dashboard.**

Three consequences drive every decision below:

1. **Focus is the interface.** The object of the current decision is razor-sharp and fully saturated; everything else recedes — dimmer, softer, quieter. Attention is expressed *optically*, not with badges and red dots fighting for the eye. (This is the UX Spec's "attention over navigation" principle, made visual.)
2. **The product is glass; the intelligence is light.** The UI itself is a calm, near-monochrome instrument (ink, paper, glass). The AI is the **light passing through** it — rendered as a restrained spectral "prism," never a purple gradient slapped on a button. When you see spectral color, intelligence is present. Nowhere else.
3. **Measurements, not opinions.** Scores, fit, forecasts, and confidence are rendered like **instrument readouts** — tabular, precise, monospaced, with fine tick marks — because the product's promise is evidence over gut-feel. A number always carries a label and a source.

## 1.2 Visual language

| Dimension | Choice | Why |
|---|---|---|
| **Neutrals** | "Ink & Glass" — near-white with the faint cool-green cast of optical glass edges; ink-black text with a cool undertone | Distinct from both the generic cool-slate SaaS default and the warm-cream editorial default. Ties the neutral to the lens. |
| **Accent** | **Iris** — a single confident violet | The committed HireLens accent; calm, precise, trustworthy. One accent only, applied with restraint. |
| **AI color** | "Prism" — a restrained violet→cyan spectral shift, used only as hairlines, shimmer, and the ✨ mark | Meaningful color: AI = light through glass. Never a fill, never decorative. |
| **Type** | A three-voice system: **Fraunces** (optical-size serif) for editorial moments, **Inter** for all UI, a **mono** for data | Fraunces is literally an *optical* typeface — apt for "Lens" — and gives premium editorial gravitas to heroes/reports without slowing the dense UI, which stays Inter. |
| **Shape** | Moderate radius, hairline borders, low-spread shadows | Instrument-precise, calm, never pill-heavy or glassmorphic. |
| **Density** | Executive-legible whitespace *and* recruiter-grade information density, switchable (Part II) | One product serves both the recruiter (all day, dense) and the hiring manager (glance, summary). |

## 1.3 Emotional feeling

**Calm confidence under volume.** The recruiter is drowning in candidates; the product should make them feel *unhurried and in control*. The reference emotion is holding a high-end instrument — a Leica, a studio mixer, a good microscope: quiet, tactile, precise, and trustworthy. Not "enterprise power tool," not "playful startup," not "AI toy." Understated luxury that earns trust by being fast, legible, and honest.

## 1.4 Product personality

**The quiet expert.** HireLens speaks like a great research assistant, never a hype-man:

- **Evidence-first.** It shows its work (sources, confidence, reasoning) and never asserts without grounding.
- **Economical.** It says the one useful thing, then stops. No filler, no exclamation, no "Great question!"
- **Never salesy.** Gated features are stated plainly, once, and calmly (UX Spec §4.9). The product never nags.
- **Deferential to the human.** Every AI proposal is a reversible object the recruiter approves (UX Spec §4.7). The AI advises; the recruiter decides. The visual language reinforces this — AI surfaces are *offered* (soft prism border, set slightly apart), never *asserted* (never a solid AI-colored block demanding action).

**Voice rules for all UI copy** (extends UX Spec's writing guidance): sentence case everywhere; active voice; name things by what the recruiter controls ("Move to Interview," not "Update stage enum"); an action keeps its verb through the whole flow (button "Shortlist" → toast "Shortlisted"); errors explain and never apologize; empty states invite the next action. Never expose provider names, model IDs, tokens, or stack traces.

## 1.5 Interaction philosophy

1. **Keyboard-first, mouse-complete.** Every primary action has a shortcut (UX Spec §15); every shortcut has a visible mouse path. The command palette (`⌘K`) is the spine.
2. **Speed is a visible feature.** Sub-100ms perceived latency, optimistic writes, prefetch on hover, skeletons never spinners on the hot path. Motion is *fast and intentional* (Part VIII) — it confirms causality, it never entertains.
3. **Context over destinations.** Capabilities appear as panels/drawers/lenses in the current surface. A route change is the last resort, and when it happens it's instant.
4. **Rack focus, not page loads.** Opening a secondary object (candidate, compare, report) racks focus optically — the current surface recedes, the object resolves sharp — instead of navigating away. This is the signature interaction (§1.7).
5. **Every state proposes a next action.** No dead ends. Empty, error, gated, offline, zero-results all point forward.

## 1.6 AI philosophy

**One intelligence, one voice, one trust model, wherever it appears.** The Copilot rail, `⌘K` "Ask," the Ask surface, inline nudges, the Agent backlog, and generated reports are *the same system* rendered in different frames. All of it obeys the **AI Output Contract** (UX Spec §4.6): Answer → Sources → Confidence → Reasoning (collapsed) → Actions. This Bible adds the *visual* trust language (Part VII):

- **Presence:** AI is signalled by the prism hairline + ✨ mark and the `--ai-surface` tint — nothing else in the product uses these. If you see the prism, it's AI. If you don't, it isn't.
- **Trust is legible, not loud.** Confidence is a quiet pill; low confidence is **neutral, never red** (uncertainty is not an error). Sources are always one click from the claim.
- **AI is offered, not imposed.** Proposals arrive as calm cards a human approves; they never auto-fire, never use alarm color, and degrade to a calm "busy" state under load (never an error screen).

## 1.7 The signature: Rack Focus

Every product should have **one** memorable, brand-embodying element. Everything else stays quiet so this one lands. For HireLens it is **Rack Focus** — the optical transition when you open any object for a decision (candidate peek, Compare, report preview, approval detail):

```
   BEFORE (list in focus)              DURING rack (120–180ms)            AFTER (object in focus)
┌───────────────────────────┐      ┌───────────────────────────┐      ┌──────────────┬────────────┐
│ ▓▓ Aarav S.    fit 88  ●  │      │ ░░ Aarav S.    fit 88     │      │ ░ dimmed    │  Aarav S.  │
│ ▓▓ Sneha R.    fit 74  ●  │  ──▶ │ ░ (canvas desaturates,    │  ──▶ │ ░ desat.    │  ● fit 88  │
│ ▓▓ Priya M.    fit 69  ●  │      │ ░  dims, 2px blur)        │      │ ░ 2px blur  │  [sharp]   │
└───────────────────────────┘      └───────────────────────────┘      └──────────────┴────────────┘
```

- The underlying surface **desaturates to ~70%, dims to ~50% luminance-weighted, and takes a 2px blur** over `base` (180ms) with `--ease-emphasized`. The incoming object arrives fully saturated, sharp, framed by a 1px `--border-strong` "in-focus" hairline.
- The recruiter's *place* is never lost — the receded surface stays visible behind the drawer, just optically pushed back.
- **Reduced motion / low-power:** the blur and desaturate are **dropped**; only the dim (opacity) remains, and the drawer arrives with opacity+small-translate replaced by opacity only. Rack Focus MUST degrade gracefully — the dim scrim is the floor.
- It appears **only** on decision objects (peek, Compare, report preview, approval detail, command palette). Menus, tooltips, and toasts do **not** rack focus — overuse would make it noise. This restraint is the point.

A secondary, quieter signature is the **Focus Reading** score meter (§4.11) — fit rendered as an instrument light-meter. Rack Focus is the bold move; the Focus Reading is the recurring texture that reminds you this is an instrument.

---

# PART II — INFORMATION DENSITY

The brief names six density concepts. They resolve into **two orthogonal axes** — a decision documented here because conflating them is the usual source of density chaos:

- **Axis A — Density preference** (global, user-set, persisted): **Comfortable** ⇄ **Compact**. A single knob affecting row heights, paddings, and secondary-text size across the whole app.
- **Axis B — Display mode** (per-surface, context-driven, not user-set): **Executive**, **Table**, **Comparison**, **Analysis**. These are *how a given surface presents information* for its job. A surface picks its mode; the user's Density preference then tunes it.

> **Rule:** A surface is always exactly one Display mode × one Density preference. E.g. the pipeline table is `Table × Compact` for a power recruiter; a hiring manager's Home is `Executive × Comfortable`.

## 2.1 Axis A — Density preference

| Token group | Comfortable (default) | Compact |
|---|---|---|
| Table row height | `40px` | `32px` |
| Card padding | `16px` | `12px` |
| Section padding | `24px` | `16px` |
| List item gap | `8px` | `4px` |
| Secondary text | `13/18` | `12/16` |
| Control height (input/button md) | `32px` | `28px` |
| Avatar default | `24px` | `20px` |

- Set in Settings → Preferences; persisted per user; respected everywhere. Default **Comfortable** (premium, calm). Recruiters processing large pipelines will choose Compact.
- Density MUST NOT change type *hierarchy* (H1 stays H1), only secondary/tertiary sizes and spatial rhythm. Focus, color, and the identity are density-invariant.

## 2.2 Axis B — Display modes

### Executive
- **Job:** answer "how is this going?" in one glance for a hiring manager or exec.
- **Where:** Home when the viewer's role is Hiring Manager/Exec; the Report canvas; the Role header summary; Analytics KPI row.
- **Treatment:** summary-first. Big **Fraunces** numbers with small mono labels; at most 3–5 objects visible; prose kept to 1–2 sentences; tables replaced by KPI tiles and one calm chart. Generous whitespace (`32–48px` section rhythm even in Compact). No bulk actions, no dense rows. Everything links *down* into detail but nothing forces it.
- **Density interaction:** Executive always renders at least Comfortable spacing even if the user set Compact — a summary is not the place to save pixels.

### Table
- **Job:** maximum legible information density for processing many candidates.
- **Where:** Pipeline table (default >30 candidates), Talent results in "table" toggle, Audit log, Usage.
- **Treatment:** spreadsheet discipline — sticky header, sticky first (Candidate) column on horizontal scroll, `--border-subtle` row separators, zebra **off** by default (borders do the work; zebra only in Compact if requested), tabular mono for all numerics, right-aligned numbers, virtualized ≥100 rows. Row hover reveals quick actions inline; selection shows the multiselect toolbar. Fit uses the **bar** ScoreMeter (§4.11), not the ring.
- **Density interaction:** this is where Compact earns its keep (32px rows, 12px numerics).

### Comparison
- **Job:** decide between 2–5 candidates side by side.
- **Where:** the Compare panel (UX Spec §7.3).
- **Treatment:** candidates are **columns**, attributes are **rows**; the best cell in each attribute row is highlighted with `--accent-subtle-bg` + a fine `--accent-border` left edge (never color-only — also a "▲ best" caption). A single `AIAnswer` executive summary sits above the grid. Column headers are sticky; the attribute (first) column is sticky. Ring ScoreMeters at the top of each column, bar meters within rows. Max 5 columns; ≥6 forces a "select up to 5" prompt.
- **Density interaction:** always Comfortable row rhythm (comparison is a considered read, not a scan).

### Analysis
- **Job:** understand one object deeply — the evidence behind a candidate, a forecast's drivers, a report section.
- **Where:** the candidate peek "Analysis" tab, the Forecast lens drivers, the Report canvas body, "Show reasoning" expansions.
- **Treatment:** single-column, generous measure (max `680px` reading width), evidence-forward. Claims are paired with their source chip *inline*; skills matched/missing render as two clear lists (not a wall); the scoring rationale is shown as labeled factors with mono values. Whitespace is generous; this mode is calm on purpose. Fraunces used only for the object title and any single headline number.
- **Density interaction:** Compact tightens vertical rhythm but never the reading measure.

## 2.3 Density decision matrix (per surface)

| Surface | Default Display mode | Notes |
|---|---|---|
| Home (recruiter) | mixed: Executive briefing + Table-lite queues | Approval queue is card, not table |
| Home (hiring manager) | Executive | fewer sections, summary tiles |
| Roles list | Table | one row per role, health mini-bars |
| Role Workspace · Pipeline (board) | — (board is its own layout) | cards, not rows; see §6.3 |
| Role Workspace · Pipeline (table) | Table | default >30 candidates |
| Compare | Comparison | §2.2 |
| Candidate peek · Overview | Analysis-lite | summary + verdict |
| Candidate peek · Analysis | Analysis | §2.2 |
| Talent | Table ⇄ evidence-rows toggle | evidence-rows default (answer-first) |
| Ask | Analysis | reading canvas, 800px |
| Analytics / Forecast | Executive (KPIs) + Analysis (drivers) | |
| Report canvas | Executive + Analysis | document feel |
| Settings | Comfortable forms | not a "mode," standard forms |

---

# PART III — DESIGN TOKENS

All values below are the **defaults** for the "Optical Clarity" identity. Both light and dark MUST ship. Light is default; respect `prefers-color-scheme` + an explicit persisted user toggle. Semantic token *names* are the contract; the *values* are swappable (Appendix A).

## 3.1 Color — neutral (Ink & Glass)

Near-white carries a faint cool-green cast (the green edge of optical glass); ink text carries a matching cool undertone. This distinguishes the neutral from both generic cool-slate and warm cream.

| Token | Light | Dark |
|---|---|---|
| `--bg-canvas` | `#FCFDFC` | `#0B0D0D` |
| `--bg-subtle` | `#F4F6F5` | `#111413` |
| `--bg-muted` | `#EBEEED` | `#181C1B` |
| `--bg-inset` | `#E1E5E4` | `#202523` |
| `--border-subtle` | `#E9EDEC` | `#1B201F` |
| `--border-default` | `#DCE1E0` | `#272D2C` |
| `--border-strong` | `#CBD1D0` | `#38403E` |
| `--text-primary` | `#131817` | `#EDF1F0` |
| `--text-secondary` | `#545C5A` | `#A3ACAA` |
| `--text-tertiary` | `#828B89` | `#6B7472` |
| `--text-disabled` | `#AEB5B3` | `#474F4D` |

## 3.2 Color — accent (Iris)

One accent. Used for primary actions, active nav, focus rings, and selection. **Never used to mean "success"** — see §3.5. (The "in-focus" score band is its own teal family in §3.4, deliberately independent of the UI accent.)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent-solid` | `#5B5BD6` | `#7C7CF0` | Primary buttons, active nav fill, focus ring |
| `--accent-hover` | `#4F4FC4` | `#8E8EF5` | Hover of accent-solid |
| `--accent-text` | `#4A4AC0` | `#A9A9F7` | Links, accent text on canvas (meets ≥4.5:1) |
| `--accent-subtle-bg` | `#EEEEFB` | `#1E1E3A` | Selected rows, accent chips, best-in-row |
| `--accent-border` | `#D9D9F6` | `#34356F` | Accent chip/edge borders |

**Contrast note:** white label on `--accent-solid` (light `#5B5BD6`) meets AA for normal text (~5:1). If a lighter accent tint ever bears text, switch the label to `--text-primary`.

## 3.3 Color — AI (Prism)

The only spectral color in the product. Renders as **hairlines, the streaming shimmer, and the ✨ mark** — never as a fill or a solid button background.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--prism-from` | `#6E5CF0` | `#9282FF` | Gradient start (violet) |
| `--prism-mid` | `#4C8FE0` | `#6FA8F5` | Gradient mid (blue) |
| `--prism-to` | `#2FB8C6` | `#57D6E2` | Gradient end (cyan) |
| `--ai-surface` | `#F6F8FD` | `#0E1319` | Background of AI answer blocks |
| `--ai-border-static` | `#C9D2F0` | `#2A3350` | 1px AI border when gradient can't render |

- **AI hairline:** a 1px left border using the `--prism-from → --prism-to` gradient on every `AIAnswer` block and the Copilot composer focus.
- **AI shimmer:** the prism gradient swept across the streaming block at **10–12% opacity, 1.2s linear**, once per stream. Removed on `prefers-reduced-motion`.
- **✨ mark:** the AI presence glyph. Uses `--prism-mid` as its base tint. Appears on Copilot, the AI button variant, AIAnswer headers, and AI tags on cards. Nowhere else.

## 3.4 Color — score / fit (the Focus scale)

Fit is a **focus reading**: strong fit is "in focus" (a clear teal, its own score family independent of the Iris UI accent); weak fit is "out of focus" (desaturated warm). Not a rainbow — the ramp encodes the metaphor. **Always** paired with the number and a one-word label (color alone is never the signal).

| Band | Label | Text/fill (light) | Subtle bg (light) | Dark fill |
|---|---|---|---|---|
| `≥85` | In focus | `#0C7C86` | `#E4F3F4` | `#33C2CD` |
| `70–84` | Sharp | `#2E9E86` | `#E6F4EE` | `#4FD6A8` |
| `55–69` | Legible | `#B78514` | `#FBF2D8` | `#EAC15A` |
| `40–54` | Soft | `#C6702E` | `#FBEEE1` | `#E89A5E` |
| `<40` | Out of focus | `#B4463C` | `#FBEBE8` | `#F0847A` |

ATS score uses the same scale. When both fit and ATS show together, fit is primary (larger, first).

## 3.5 Color — semantic

Kept distinct from the accent (success is clearly green, not the Iris violet) so "accent" never reads as "good."

| Role | Text (light) | Bg (light) | Text (dark) | Bg (dark) |
|---|---|---|---|---|
| Success | `#1E7A52` | `#E7F5EE` | `#4FD69B` | `#0E2A1F` |
| Warning | `#9A6800` | `#FBF1DC` | `#F0B84A` | `#2A2008` |
| Danger | `#B4443A` | `#FBEBE8` | `#F08479` | `#2C1512` |
| Info | `#2C6BD6` | `#E8F0FD` | `#79A8F5` | `#0F1D33` |

Status is **never color-only**: every semantic state pairs color with an icon + text (e.g. ● Open, ⚠ At risk).

## 3.6 Color — confidence (AI trust readout)

A deliberate decision: **low confidence is neutral, not red.** Uncertainty is honest, not an error, and must never alarm.

| Level | Token | Light | Dark | Rendering |
|---|---|---|---|---|
| High | `--confidence-high` | `#1E7A52` | `#4FD69B` | pill, quiet |
| Medium | `--confidence-med` | `#9A6800` | `#F0B84A` | pill, quiet |
| Low | `--confidence-low` | `#82786A` | `#9A9184` | neutral pill + one-line "why" (UX Spec §4.6) |

## 3.7 Color — loading / skeleton

| Token | Light | Dark |
|---|---|---|
| `--skeleton-base` | `#EBEEED` (=`--bg-muted`) | `#181C1B` |
| `--skeleton-sheen` | `#F4F6F5` | `#20242 3` |

- Skeleton shimmer: a `1.4s` ease-in-out sweep of `--skeleton-sheen` across `--skeleton-base`, mirroring the final layout's box sizes. Neutral, **not** prism — skeletons are "loading," AI shimmer is "thinking." Removed on `prefers-reduced-motion` (static `--skeleton-base`).

## 3.8 Typography

A three-voice system. The distinctiveness is the *pairing and restraint*, not novelty — the dense UI stays on the calm workhorse; the serif appears only where an editorial moment earns it.

| Voice | Family | Where | Never |
|---|---|---|---|
| **Display** | `Fraunces` (variable; `opsz` high, low `SOFT`, `wght` 500–600) | Empty-state heroes, Ask landing, the single hero number on a Metric card, Report canvas titles, Executive KPI numbers | Tables, nav, buttons, dense body |
| **UI / Body** | `Inter var` | All interface text, controls, tables, labels, body copy | Decorative use |
| **Data / Mono** | `ui-monospace, "JetBrains Mono"` | Scores, ATS, IDs, tokens, timestamps, any tabular numeric | Prose |

System fallback stacks required for all three (Fraunces → `Georgia, serif`; Inter → system-ui; mono → `ui-monospace`).

**Scale** (unchanged hierarchy from UX Spec §3.4, with the Display voice reassigned to Fraunces):

| Style | Size / line | Weight | Family | Use |
|---|---|---|---|---|
| Display-XL | 40 / 46 | 560 | Fraunces | Executive KPI hero number, Ask landing |
| Display | 28 / 34 | 560 | Fraunces | Empty-state hero, Report title |
| H1 | 22 / 28 | 600 | Inter | Page title |
| H2 | 18 / 24 | 600 | Inter | Section header |
| H3 | 16 / 22 | 600 | Inter | Card title |
| Body | 14 / 20 | 400 | Inter | Default |
| Body-medium | 14 / 20 | 500 | Inter | Emphasis, labels, button labels |
| Small | 13 / 18 | 400 | Inter | Secondary, table cells |
| Caption | 12 / 16 | 500 | Inter | Meta, timestamps, badges |
| Mono | 13 / 18 | 500 | Mono | Scores, IDs |
| Mono-L | 20 / 24 | 500 | Mono | Prominent score readouts |

Letter-spacing: `-0.015em` on Fraunces ≥28px; `-0.01em` on Inter ≥18px; `0` elsewhere. **Tabular figures mandatory** on all tables, scores, and Executive numbers.

## 3.9 Spacing, radius, elevation, borders

- **Spacing (4px base):** `0,2,4,8,12,16,20,24,32,40,48,64`. Rhythm per Part II density.
- **Radius:** `sm 6` (chips, inputs, badges), `md 8` (buttons, small cards), `lg 12` (cards, drawers), `xl 16` (modals, hero, report canvas), `full` (pills, avatars). Instrument-calm — moderate, never pill-dominant.
- **Elevation (low-spread, premium):**
  - `xs` `0 1 2 rgba(10,14,13,.05)` — resting cards
  - `sm` `0 2 6 rgba(10,14,13,.07)` — hover cards, popovers
  - `md` `0 6 16 rgba(10,14,13,.09)` — dropdowns, floating actions
  - `lg` `0 16 40 rgba(10,14,13,.14)` — drawers, modals, command palette
  - Dark mode adds a `0 0 0 1px rgba(255,255,255,.04)` inset hairline to all elevated surfaces (shadows read weakly on dark; the hairline defines the edge).
- **Borders:** default weight 1px. `--border-subtle` for internal dividers, `--border-default` for card/control edges, `--border-strong` for the in-focus frame and emphasis. Focus ring is 2px `--accent-solid` at 2px offset (§9).

## 3.10 Icons

- **Set:** Lucide (consistent, open, line-based). 1.5px stroke, rounded joins to echo the radius language.
- **Sizes:** `16` (dense/table), `20` (default), `24` (hero/empty-state).
- **Fills:** line by default. **Filled** variants only for **active nav item** and **selected** states. The ✨ AI mark is the sole spectral icon (§3.3).
- **Color:** inherit `--text-secondary` at rest, `--text-primary` on hover, `--accent-solid` when active. Semantic icons take their role color.

## 3.11 Tables

- Header: `--bg-subtle`, `--text-tertiary`, Caption weight, sticky, `--border-default` bottom.
- Row: `--border-subtle` separators; hover `--bg-subtle`; selected `--accent-subtle-bg` + 2px `--accent-solid` left edge.
- Numerics right-aligned, tabular mono. Sort indicator a small chevron in `--accent-text` on the active column.
- Sticky first column casts `sm` shadow to its right on horizontal scroll. Virtualized ≥100 rows. Density per Axis A.

## 3.12 Charts (dataviz tokens)

Charts are **calm instruments**, not decoration. One primary series in accent; supporting series in a restrained categorical set; grid barely there.

- **Categorical palette (max 6, in order):** `--accent-solid` (Iris), `--text-secondary` (ink-gray), `#9A6800` (amber), `#B4443A` (rust), `#2C6BD6` (slate-blue), `#0C7C86` (teal). Beyond 6 series → aggregate an "Other" bucket, don't add colors.
- **Sequential (one metric, low→high):** a teal ramp `#E4F3F4 → #0C7C86 → #084C53`.
- **Diverging (below/above target):** rust `#B4443A` ↔ neutral `#EBEEED` ↔ teal `#0C7C86`.
- **Confidence bands (forecasts):** the series line at full opacity; its band at 12% opacity of the same hue.
- **Grid/axes:** grid lines `--border-subtle`; axis labels Caption/`--text-tertiary`; no chart borders, no drop shadows, no 3D, no gradients-as-fill.
- **Every chart:** has an accessible data-table fallback, direct labels over legends where space allows, and an "✨ Explain this" affordance opening Copilot with the chart as context (UX Spec §7.5).

## 3.13 Motion tokens

- **Durations:** `instant 90ms`, `fast 120ms`, `base 180ms`, `slow 240ms`, `rack 200ms` (the signature).
- **Easing:** `--ease-out cubic-bezier(.2,0,0,1)` (default), `--ease-emphasized cubic-bezier(.2,0,0,.2)` (entrances, rack focus), `--ease-in cubic-bezier(.4,0,1,1)` (exits).
- **Reduced motion:** all transforms/blurs become opacity-only; shimmer and rack-blur are removed. See Part VIII.

## 3.14 Z-index

Sticky `100` · dropdown `200` · drawer `300` · modal `400` · command-palette `500` · toast `600` · tooltip `700`. (Aligned with UX Spec §3.5.)

---

# PART IV — COMPONENT VISUAL ANATOMY

These layer **visual treatment** onto the behavioral contract in UX Spec §4.8/§13. Behavior (states, keyboard, variants) lives there; look/feel lives here. Every component is theme-aware and density-aware.

## 4.1 Button

| Variant | Fill | Text | Border | Notes |
|---|---|---|---|---|
| Primary | `--accent-solid` | white | none | hover `--accent-hover`; active scale `.98` |
| Secondary | `--bg-canvas` | `--text-primary` | `--border-default` | hover `--bg-subtle` |
| Ghost | transparent | `--text-secondary` | none | hover `--bg-subtle`, text→primary |
| Danger | `#B4443A` | white | none | destructive-confirmed only |
| AI | `--bg-canvas` | `--text-primary` | 1px prism gradient | ✨ affix; hover raises prism opacity |

Sizes `sm 28 / md 32 / lg 40` (heights shift with Density). Label is Body-medium. Loading = inline 16px spinner + dimmed label, width locked. Focus ring per §9. Corners `md 8`.

## 4.2 Card (base) and interactive card

- Base: `--bg-canvas`, 1px `--border-default`, radius `lg 12`, `xs` shadow, padding per Density.
- **Interactive:** whole card clickable with one clear primary target; hover lifts `xs → sm` and border → `--border-strong` over `fast`; cursor pointer; focus ring on the card.
- **AI card:** adds the 1px prism left hairline + `--ai-surface` tint; ✨ in header.
- **Approval card:** see §4.5.

## 4.3 Domain cards

### CandidateCard (pipeline board)
```
┌────────────────────────────┐
│ (av) Aarav Sharma       ⋯  │  H3 name · overflow menu
│      Senior Backend Eng     │  Small, --text-secondary
│  ▉▉▉▉▉▉▉░░  88  In focus    │  Focus Reading bar (§4.11)
│  Python · FastAPI           │  ≤2 skill chips
│  ✨ strongest fit           │  optional AI tag (prism ✨, only if present)
└────────────────────────────┘
```
- Radius `md 8`, `xs` shadow, padding 12. Whole card → peek (rack focus). AI tag only when the model actually flagged it; otherwise the line is absent (no empty slot).

### PipelineCard (a stage column header/summary)
- Column header: stage name (H3), count pill (`--bg-muted`), collapse chevron. A 3px stage-health bar under the header (green→amber→rust by aging/volume). Body is the CandidateCard stack.

### ApprovalCard (§4.5 — decisions are objects)

### InsightCard (analytics/observation)
- `--bg-canvas`, `--border-default`. Header: small metric label (Caption/`--text-tertiary`) + optional "✨ Explain." Body: one Fraunces number or a sparkline + one plain-language takeaway sentence. No jargon.

### PredictionCard (forecast)
- Like InsightCard but the number carries a **confidence band** micro-viz (the value ± band, §3.12) and a `--confidence-*` pill. Drivers listed below as chips; each driver may carry a suggested action (Approval Object).

### MetricCard (KPI, Executive mode)
- Big **Fraunces** Display-XL number, mono unit/label beneath, a delta chip (▲/▼ + %, semantic color, never color-only), optional sparkline. Generous padding. This is the calmest, most premium tile — one number, one meaning.

## 4.4 Timeline (experience / activity)
- A single 1px `--border-default` spine on the left; nodes are 8px dots (`--accent-solid` for current/active, `--border-strong` otherwise). Each entry: mono timestamp (`--text-tertiary`), actor avatar (16px), one-line description with the object linked. AI actions carry the ✨ mark. Grouped by day with a sticky day label.

## 4.5 ApprovalCard (the decision object)
```
┌─────────────────────────────────────────────┐
│ ✨ Shortlist top 5 candidates        [⋯]     │  H3 + prism mark
│ ┌───────────────────────────────────────┐    │
│ │ + Aarav S., Sneha R., Priya M., …     │    │  concise diff/preview
│ └───────────────────────────────────────┘    │
│ Proposed by Agent · 2h ago   [High conf.]     │  provenance + confidence
│ ┌────────┐ ┌────────┐ ┌────────┐              │
│ │Approve │ │Modify  │ │Dismiss │              │  Approve=primary
│ └────────┘ └────────┘ └────────┘              │
└─────────────────────────────────────────────┘
```
- AI card treatment (prism hairline + `--ai-surface`). **Approve** is the only primary button. Approving applies optimistically and drops a reversible Undo toast (§4.9). Same component in Home queue, inline in the workspace, and inside Copilot/Ask answers (UX Spec §4.7).

## 4.6 Tables / DataGrid
Visual spec per §3.11. The multiselect toolbar slides down from the header row (`fast`, `--bg-subtle`, `sm` shadow) showing "N selected · [actions] · Clear." Quick actions on row hover fade in at the row's right edge over `fast`.

## 4.7 Filters, Dropdowns, Tabs, Badges

- **FilterBar:** a horizontal row of Combobox chips above a list. Active filters render as removable chips (`--accent-subtle-bg`, `--accent-border`, ✕). "Clear filters" appears only when ≥1 active. The scoped search input ("Search into this role") sits at the left with a 🔎 affix.
- **Dropdown/Popover:** `--bg-canvas`, `--border-default`, `md` shadow, radius `md`, 4px item padding, `--bg-subtle` hover, `--accent-subtle-bg` selected. Section headers Caption/`--text-tertiary`. Keyboard-navigable.
- **Tabs / LensSwitcher:** LensSwitcher is a **segmented** control (`--bg-muted` track, `--bg-canvas` active thumb with `xs` shadow, `--accent-text` active label), URL-bound, `[`/`]` to move. Content tabs (peek) use an **underline** style (2px `--accent-solid` under the active label).
- **Badges/Pills:** radius `full`, Caption weight. Neutral (`--bg-muted`), accent (`--accent-subtle-bg`/`--accent-text`), semantic (role bg/text), score (Focus scale + number + label).

## 4.8 AIAnswer (the one AI render)
```
┃ ✨ answer text streams here, markdown-rendered…        │  ← prism left hairline
┃                                                        │     on --ai-surface
┃ Sources  [Aarav S.] [JD: "payments"] [memory: 2023]   │  source chips
┃ [High confidence]                    [Show reasoning ▸]│  confidence pill + collapse
┃ ┌ Approve ┐ ┌ Modify ┐   (optional Approval actions)  │
```
- Prism 1px left hairline, `--ai-surface` background, radius `lg`. Streams token-by-token with the prism shimmer; a **Stop** control while streaming. Sources are chips that open the exact source (peek/scroll-to). Reasoning is collapsed by default. Full contract: UX Spec §4.6. Degraded/busy state is a calm neutral message, never red (Part VII).

## 4.9 Drawers, Dialogs, Toasts

- **Drawer / Peek:** right overlay, 480 (candidate) / 560 (compare, report), radius `xl` on the left corners, `lg` shadow, sticky header. Enters with Rack Focus (§1.7). Scrim `rgba(11,13,13,.32)`.
- **Dialog / Modal:** centered, `sm 420 / md 560 / lg 720`, radius `xl`, `lg` shadow, focus-trapped, `Esc` closes (confirm if destructive-dirty). Backdrop = the rack-focus treatment (scrim + dim; blur only on capable devices).
- **Toast:** bottom-right stack, `--bg-canvas`, `--border-default`, `md` shadow, radius `md`. Info/success/warning/danger take a 3px left semantic edge + icon. **Undo** toasts persist 10s (others 5s), pause on hover. Undo is a text button in `--accent-text`.

## 4.10 Skeletons, Empty, Loading, Error, Offline

- **Skeleton:** mirrors the target layout with `--skeleton-base` blocks + the neutral sheen sweep (§3.7). Never a spinner on the hot path.
- **Empty (first-run):** centered, a 24px line icon in `--text-tertiary`, a **Fraunces Display** headline, one sentence of Body/`--text-secondary`, one primary CTA. Calm, generous.
- **Empty (zero-results):** "No matches," the active filters as removable chips, "Clear filters," and (search) "Ask AI to broaden."
- **Error (inline):** the failed card/section shows a compact `--danger`-edged block with one plain sentence + Retry; the rest of the page survives.
- **Error (route):** friendly Fraunces headline, copyable request ID (mono), Retry, "Contact support." Never a stack trace or provider name.
- **Offline:** a top-bar amber banner "Can't reach HireLens — reconnecting…" with auto-retry; writes queue and flush on reconnect. Never a dead white screen.

## 4.11 ScoreMeter — the Focus Reading (secondary signature)

The instrument texture that recurs across the product. Two forms:

- **Bar** (tables, cards): a track (`--bg-muted`) with a filled portion in the Focus-scale color for the band; **fine tick marks** at 25/50/75; the number in Mono to the right; the one-word band label in Caption. Fill has a subtly *softer edge at low bands* (the "out of focus" metaphor) — a 1px feathered edge below 55; crisp above.
- **Ring** (Compare column heads, candidate Overview): a 44px ring, Focus-scale stroke, the number centered in Mono-L, band label beneath. Used sparingly (one per object).

Always number + label + color together (never color alone). Tabular figures. Same component renders ATS.

---

# PART V — APP SHELL (visual treatment)

Structure/behavior: UX Spec §4.1–§4.3. This is the look.

## 5.1 Left nav rail (240 / 56)
- `--bg-subtle` surface, 1px `--border-subtle` right edge. Items: 20px line icon + Body-medium label, 8px radius, 4px inset. **Active:** `--accent-subtle-bg` fill + a 2px `--accent-solid` left indicator + **filled** icon + `--accent-text` label. Hover: `--bg-muted`. Collapsed (56px): icon-only, label on hover tooltip. Workspace switcher at top (§5.4); Settings + account pinned bottom, `--text-tertiary`. The active indicator animates position over `fast` when nav changes.

## 5.2 Top bar (52, sticky)
- Transparent over canvas; on scroll a 1px `--border-subtle` bottom border fades in over `fast`. Left: breadcrumb (`--text-tertiary` separators, `--text-primary` current). Right: the `⌘K` launcher (a search-shaped Secondary button, `--bg-subtle`, showing "Search or ask… ⌘K" with a KBD hint), notification bell (unread = a 6px `--accent-solid` dot, never red unless the notification is an error), account avatar.

## 5.3 Breadcrumbs
- `Roles / Senior Backend Engineer`. Each segment is a link (`--text-tertiary`), current is `--text-primary` Body-medium, `/` separators in `--border-strong`. Truncates the middle with an ellipsis menu when deep.

## 5.4 Workspace switcher
- Top of the rail (only if >1 workspace): the workspace name + a small chevron; opens a Popover listing workspaces (avatar/initial + name + role), search on top, "Create workspace" at the bottom. Current workspace has the `--accent-solid` check.

## 5.5 Notifications
- Bell → a 400px Popover (right-aligned). Grouped by day; each row: actor/AI avatar, one-line description, mono timestamp, unread `--accent-subtle-bg` tint. AI/agent notifications carry ✨. "Mark all read." Errors in a notification use `--danger` icon + text, not the whole row.

## 5.6 Profile / account menu
- Avatar → Popover: name + email, theme toggle (light/dark/system), Density toggle (Comfortable/Compact), Settings, Sign out. The theme toggle is a 3-segment control; changing it cross-fades the whole app over `base`.

## 5.7 Command palette (the spine)
- 640px centered, `--bg-canvas`, radius `xl`, `lg` shadow, backdrop = rack-focus (scrim + blur-if-capable). Input at top (Body, ✨ affix when in Ask mode). Results grouped (`Jump to` / `Actions` / `Ask AI`) with Caption headers; each row: 16px icon · label · right-aligned meta · KBD hint. Active row `--accent-subtle-bg`. Ask-mode answers render inline as a compact `AIAnswer` with an "open in Ask →" affordance. Enters over `fast` (opacity + 4px rise; opacity only on reduced motion). Full behavior: UX Spec §4.2.

## 5.8 Copilot rail (360, collapsible)
- Right side, `--bg-subtle`, 1px `--border-subtle` left edge, push ≥1440 / overlay + scrim <1440, toggle `⌘J`. Header: "✨ Copilot" + a context chip (`--accent-subtle-bg`, the current role/selection) + overflow. Thread body = `AIAnswer` messages. Empty thread shows context-tailored suggestion chips. Composer: multiline, prism focus hairline, attach-context toggle, Stop while streaming. Slides in over `base` with `--ease-emphasized`.

## 5.9 Global search & floating actions
- **Global search** is not a separate box — it *is* `⌘K` (navigate mode). The top-bar launcher is its visible entry (§5.2). This avoids two competing search fields (documented decision).
- **Floating actions:** none by default (no FAB clutter). The single always-visible primary action lives in each surface's header (e.g. "+ Add candidates" in the Role Workspace). The only floating element is the toast stack. This keeps the canvas calm — a deliberate rejection of dashboard-FAB overload.

---

# PART VI — SCREEN IDENTITY APPLICATION

For each screen: **layout, states, and keyboard live in the UX Spec (cited).** Here is how the identity, density mode, motion, and signature manifest. No screen is re-laid-out.

## 6.1 Home — UX Spec §6
- **Density:** Executive briefing (Fraunces on the greeting + any headline number) over calmer queues. Hiring-manager viewers get full Executive mode (fewer sections, MetricCards).
- **Identity:** the AI Briefing is an `AIAnswer` with prism hairline; jump-chips are sources. "Needs your decision" is the ApprovalCard queue. Risks use `--danger`/`--warning` icons (never red text walls). Active roles are RoleCards sorted by movement/risk with stage-health mini-bars.
- **Motion:** sections stagger in over `base` (12ms step, capped at 6) on first load; none on return (cached). Approve/dismiss on a card animates it out over `fast` and reflows the queue.
- **Empty (first-run):** Fraunces "Let's fill your first role." hero.

## 6.2 Roles (list) — UX Spec §2
- **Density:** Table. One row per role: name, status pill, stage-health mini-bar, avg fit (Focus bar), forecast days-to-fill (color-coded), last activity. Row → Role Workspace (instant route, no rack — this is navigation, not a decision object).
- **Identity:** calm table (§3.11); "+ Create role" primary in the header.

## 6.3 Role Workspace — UX Spec §7 (the primary surface)
- **Header (64, sticky):** editable Fraungces-free H1 title (keep UI Inter here — dense header), status pill, the live forecast chip (color-coded, → Forecast lens), counts. Primary "+ Add candidates ▾." LensSwitcher = segmented (§4.7), `[`/`]`.
- **Pipeline · Board:** stage columns with PipelineCard headers (health bar) + CandidateCard stacks. Drag = optimistic move; the card lifts to `md` shadow while dragging and the target column shows an `--accent-subtle-bg` drop zone. Card → peek via **Rack Focus**.
- **Pipeline · Table:** Table mode (§2.2), the densest surface, Focus-bar fit column, multiselect toolbar, "Search into this role."
- **Analysis-in-progress:** candidates appear immediately; the Fit cell shows the neutral skeleton shimmer (not prism — it's computing, and results resolve into the Focus bar as they arrive). AI *nudges* above the pipeline use the prism `AIAnswer`/ApprovalCard strip.
- **Compare (§7.3):** Comparison mode, opens as a 560 peek (2) or full overlay (≥3) via Rack Focus; best-in-row highlight per §2.2.
- **Candidate peek (§7.4):** Rack Focus drawer, 480. Overview = Analysis-lite (Focus ring + AI verdict). Analysis tab = full Analysis mode. Interview/Notes/Activity per spec.
- **Analytics/Forecast/Report/Activity lenses:** Executive KPIs (MetricCards, Fraunces numbers) + Analysis drivers; charts per §3.12; Report canvas is a 560 document with Fraunces title. Lens switches cross-fade content over `fast` (URL-bound).

## 6.4 Candidate Drawer — UX Spec §7.4
- The clearest expression of the identity: the list behind racks out of focus; the candidate resolves sharp with the `--border-strong` in-focus frame. Focus ring meter at top. AI verdict is an `AIAnswer`. Tabs are underline style. Full-screen on `<md` (no rack — mobile is a route).

## 6.5 Compare — UX Spec §7.3
- Comparison mode; the `AIAnswer` executive summary on top in `--ai-surface`; ring meters per column; best-in-row `--accent-subtle-bg`. Print stylesheet for the PDF export path.

## 6.6 Talent — UX Spec §8
- **Identity:** answer-first. A large natural-language input (Perplexity-style, prism focus hairline, ghost example). Results are **evidence rows** (default) — name, Focus bar, and a "✨ Why" line with matched-skill/JD source chips — not a raw table. A Table toggle exists for scanning. Refine chips show what changed. AI-down → labeled keyword fallback (calm, never a dead end).
- **Density:** evidence-rows (Analysis-lite) default; Table on toggle.

## 6.7 Ask — UX Spec §9
- **Identity:** a reading canvas (800px, Analysis mode). Landing hero in Fraunces ("Ask anything about your hiring"). One input; the system routes to Org-Brain / What-if / Agent modes — **no mode tabs**, the routing *is* the intelligence. Every answer is an `AIAnswer`. What-if shows deltas + confidence bands (§3.12) + an inline re-run control. Agent backlog = ApprovalCards. Left rail: threads + agent badge + suggested prompts.
- **Motion:** thread messages stream with the prism shimmer; new thread cross-fades.

## 6.8 Settings — UX Spec §10
- **Identity:** Stripe-calm forms. Left sub-nav + 800px content. No AI chat except the AI Gateway section which *visualizes* health/usage (calm charts §3.12) and offers the audited provider switch. Secrets are masked (last 4). Destructive actions require typed confirmation (Danger button). Density = Comfortable forms (not a display mode). Preferences hosts the theme + Density controls and pipeline-stage config.

---

# PART VII — THE AI EXPERIENCE (one system)

Extends UX Spec §4.6/§4.7. Every AI touchpoint — Copilot, `⌘K` Ask, the Ask surface, inline nudges, Agent, reports — is the **same system in a different frame**, with the same visual trust language.

| Facet | Specification |
|---|---|
| **Presence** | Prism hairline + `--ai-surface` tint + ✨ mark. These three appear *only* on AI. If absent, it isn't AI. |
| **Streaming** | Token-by-token into the answer block with the prism shimmer (10–12%, 1.2s). A **Stop** control is always present while streaming. Truncates gracefully at a clean breakpoint. |
| **Thinking** | Before first token, a calm "Thinking…" line with a 3-dot prism pulse (not a spinner). For long tasks (reports, simulations), a labeled progress with the scenario/section summary. |
| **Confidence** | A quiet `--confidence-*` pill after the answer. **Low = neutral gray + one-line "why"** (never red). High/Medium quiet. |
| **Sources** | A "Sources" chip row; each chip opens the exact source (peek / scroll-to). Ungrounded output is explicitly labeled "General guidance — not from your data." |
| **Reasoning** | "Show reasoning ▸" — collapsed by default; reveals rationale in Analysis mode. Answers stay calm; the work is available, not forced. |
| **Actions** | Rendered as **ApprovalCards** (§4.5) inside answers. Never auto-fire. Approve = optimistic + Undo. |
| **Approvals** | Every proposal is a first-class object (Home queue / inline / in-answer). Approving writes to Activity/audit. |
| **Undo** | Every AI-applied change drops a 10s Undo toast; the action is reversible and audited. |
| **Retry** | On failure, a calm inline "Try again" (never a red crash). Retries are idempotent where possible. |
| **History** | Copilot threads persist per-surface-context for the session; Ask threads persist and are URL-addressable/shareable; "open in Ask" promotes a Copilot thread. |
| **Context awareness** | The Copilot header shows the current context chip (role/selection); the composer auto-attaches it (toggleable). `⌘K` commands are filtered to the current surface + selection. |
| **Background jobs** | Long AI work (report, bulk analysis, simulation) runs in the background; the trigger shows a subtle "running" state; completion arrives as a notification (✨) + the result becomes available in place. Never blocks the UI. |
| **Notifications** | AI/agent notifications carry ✨ and link to their result. Errors within them use `--danger` icon+text, not the whole row. |
| **Degradation** | If AI is unavailable/rate-limited: a calm neutral block — "Copilot is busy (high demand). Your data is unaffected — try again in a moment." Never error color, never a crash. Semantic search degrades to labeled keyword search. |
| **Model switching** | Not exposed to end users as a chat control (no model picker in the flow — provider names are never surfaced, UX Spec §12). The only model/provider control is the **org-admin AI Gateway** in Settings (audited). The recruiter experiences "one intelligence," not a model menu. |

---

# PART VIII — MOTION SYSTEM

Motion is **fast and intentional**: it confirms causality and directs attention. It never entertains. Tokens: §3.13. Everything below respects `prefers-reduced-motion` (transforms/blur → opacity-only; shimmer/rack-blur removed).

| Interaction | Spec |
|---|---|
| **Page/route transition** | Instant content swap; a 90ms opacity settle. No slide between routes (speed reads as no transition). |
| **Lens switch** | Content cross-fades over `fast` (120ms); the segmented thumb slides over `fast`. URL-bound. |
| **Rack Focus (signature)** | Underlying surface: desaturate→70% + dim→50% + 2px blur over `rack` (200ms) `--ease-emphasized`. Incoming drawer: 480/560 slide-in + opacity over `base`. Reduced motion: dim only, drawer opacity only. |
| **Drawer / Peek** | Enter `base` `--ease-emphasized` (slide + fade); exit `fast` `--ease-in` (fade + 8px slide-out). Header sticky, content scroll. |
| **Panel (Copilot rail)** | Slide-in `base` `--ease-emphasized`; push-layout reflow eased over `base`. |
| **Modal** | Backdrop rack-focus over `fast`; dialog opacity + 8px rise over `base`. |
| **Hover** | Card lift `xs→sm` + border→strong over `fast`. Button fill shift over `fast`. Row quick-actions fade in over `fast`. |
| **Selection** | Checkbox/row select `--accent-subtle-bg` fills over `instant` (90ms); the multiselect toolbar drops over `fast`. |
| **Loading** | Skeleton neutral sheen 1.4s; in-button spinner 16px. Never a full-page spinner on the hot path. |
| **AI streaming** | Prism shimmer 1.2s while streaming; "Thinking" 3-dot prism pulse before first token. |
| **Command palette** | Open: scrim + opacity + 4px rise over `fast`. Result navigation: active-row highlight moves instantly (no lag). Close: `fast` fade. |
| **Focus** | The 2px accent ring appears instantly (no transition — focus must be immediate for a11y). |
| **Toast** | Slide-up + fade `base`; auto-dismiss fade `fast`; pause on hover. |
| **Optimistic write** | The change applies instantly with a subtle pending tint; on success the tint clears over `fast`; on failure it reverts + a Retry toast. |
| **Nav active indicator** | The 2px left indicator + segmented thumb slide to the new position over `fast`. |
| **Number transitions** | Executive/Metric numbers tween over `slow` (240ms) when data updates live (count-up), tabular figures preventing width jitter. Disabled on reduced motion. |

**Global restraint rule:** if a motion doesn't confirm a cause or guide the eye to a consequence, it is removed. No parallax, no ambient loops, no decorative easing. This is an instrument.

---

# PART IX — ACCESSIBILITY

Meets/extends UX Spec §12 (WCAG 2.2 AA). Identity-specific additions:

- **Focus visibility:** 2px `--accent-solid` ring at 2px offset on every interactive element; appears instantly. On `--ai-surface` and dark, the ring keeps ≥3:1 against its background (the Iris accent qualifies both themes).
- **Color independence:** the Focus scale, semantics, and confidence are **never color-only** — always number+label or icon+text. The "out of focus" soft-edge treatment on low scores is decorative reinforcement, not the sole signal.
- **Contrast:** all text tokens meet ≥4.5:1 (≥3:1 for large/UI). `--accent-text` (`#4A4AC0` / `#A9A9F7`) is the accessible link color; `--accent-solid` bears only white 14px-medium+ labels (verified §3.2).
- **Rack Focus & reduced motion:** the blur and desaturate are **removed** on `prefers-reduced-motion`; the dim scrim remains as the accessible focus signal. No essential information is conveyed by blur alone.
- **Screen readers:** semantic landmarks; live-regions announce AI stream completion ("Copilot finished responding"), toasts, and async results; drag has a keyboard equivalent (stage dropdown); the Focus scale exposes "88, In focus" to AT, not just color.
- **Keyboard:** full parity (UX Spec §15); focus trapped in modals/drawers and restored on close; skip-to-content link; the command palette reachable from anywhere.
- **Density & zoom:** layouts reflow to 400% zoom / 320px without loss; Compact never drops below AA hit-target (min 32px touch, 28px pointer with 8px spacing).
- **Motion budget:** no flashing >3Hz; shimmer is a slow gradient, not a strobe.

---

# PART X — IMPLEMENTATION BLUEPRINT (design-layer)

This maps the **design-layer** work onto the frozen build order in UX Spec §14 (P0–P8). Structure/behavior tickets live there; these are the identity/token/motion deliverables and their dependencies.

| Phase | Design-layer deliverables | Depends on |
|---|---|---|
| **P0 — Foundations** | Token system (Part III) in light+dark; Fraunces/Inter/mono loaded; icon set; elevation/radius/border scales; **Rack Focus primitive** + reduced-motion fallback; skeleton/empty/error/offline visuals; focus-ring system; Density Axis-A knob | Nothing — build first; everything derives from tokens |
| **P1 — Workspace visuals** | ScoreMeter (Focus Reading, bar+ring); CandidateCard/PipelineCard; Table visual system (§3.11) + Table display mode; peek Rack Focus; Analysis-in-progress shimmer | P0 tokens + Rack Focus |
| **P2 — AI visual language** | AIAnswer visual (prism hairline, `--ai-surface`, shimmer, ✨); ApprovalCard; confidence/source/reasoning treatment; "Thinking" pulse; degraded state | P0; needs P1 surfaces to host it |
| **P3 — Home / Executive mode** | MetricCard + Executive display mode; Fraunces numeric treatment; RiskRow; queue reflow motion | P2 (ApprovalCard, AIAnswer) |
| **P4 — Talent** | Evidence-row visual; large NL input + prism focus; refine chips; keyword-fallback calm state | P2 AI language |
| **P5 — Ask** | Reading-canvas (Analysis mode) + Fraunces landing; thread visuals; What-if delta + confidence-band viz | P2; §3.12 charts |
| **P6 — Lenses & Compare** | Comparison display mode + best-in-row; chart/dataviz system (§3.12); Report canvas (Executive+Analysis, print CSS); Analytics/Forecast visuals | §3.12 tokens; P1 tables |
| **P7 — Settings** | Calm form system; masked-secret pattern; AI Gateway health/usage charts; audited-switch UI | §3.12 charts |
| **P8 — Polish** | Mobile read-review-approve visual pass; print stylesheets; full motion pass + reduced-motion audit; a11y/contrast audit; empty-state illustrations; number count-up | everything above |

**Dependencies, plainly:** tokens (P0) gate all; Rack Focus (P0) gates every decision-object surface; the AI visual language (P2) gates Home/Talent/Ask/lenses; the chart system (§3.12) gates Analytics/Forecast/Report/Settings. **MVP visual line = P0–P3** (identity + workspace + AI language + Executive Home) is a coherent, premium, demoable product; P4–P8 are additive, matching the UX Spec's MVP line.

---

# APPENDIX A — DECISIONS LOG

Every non-obvious aesthetic decision, and why. (The brief instructs: when a UX decision is ambiguous, decide, document, explain.)

1. **Accent = Iris (committed).** A "Lens Bloom" optical teal accent was explored during design, but the stakeholder decision is to retain the original committed **Iris** accent (`#5B5BD6` / `#7C7CF0`). The revert was a value-only change: every semantic `--accent-*` token name is unchanged, so nothing structural moved. Teal survives in the product only as the **Focus Scale** "in-focus" score family (§3.4) and as one chart hue (§3.12) — deliberately independent of the UI accent.
2. **AI color = restrained "Prism" (violet→cyan), not a purple gradient fill.** Meaningful color: AI is light through glass. Confining spectral color to hairlines/shimmer/✨ keeps the UI calm and makes AI presence unmistakable. Rejected: AI-colored buttons/blocks (they make AI feel like a separate loud product).
3. **Warm-cream vs cool-slate neutrals → "Ink & Glass" (faint cool-green white).** Cream is the editorial-serif default; pure cool-slate is the SaaS default (what the old spec used). The green-edge-of-glass neutral is subtle, distinctive, and ties to the lens. Rejected pure warm paper (drifts to the cream cluster) and pure slate (generic).
4. **Fraunces (optical serif) for editorial moments; Inter stays the UI workhorse.** Distinctiveness via *pairing and restraint*, not by swapping the dense-UI face (Inter is genuinely optimal there and was committed). Fraunces is literally an *optical-size* typeface — apt for "Lens" — and adds premium gravitas to heroes/reports/KPIs without slowing tables/nav. Rejected Inter-everywhere (templated) and serif-everywhere (slows dense work).
5. **Low AI confidence is neutral gray, never red.** Uncertainty is honest, not an error. Red would punish the AI for admitting limits and train users to distrust the (valuable) low-confidence signal.
6. **The Focus scale is a metaphor ramp (in-focus teal → out-of-focus warm), not a rainbow.** Encodes the thesis and reads as an instrument. Always number+label for a11y.
7. **Rack Focus as the single signature.** One bold, brand-embodying interaction (optical depth-of-field on decision objects); everything else stays quiet so it lands. Restricted to decision objects and given a full reduced-motion fallback so it's premium, not gimmicky.
8. **Density = two axes (preference × display mode).** The brief's six terms conflate a user knob (comfortable/compact) with context modes (executive/table/comparison/analysis). Splitting them removes ambiguity and prevents contradictory rules.
9. **No FAB; global search = ⌘K.** A single header primary action per surface + the palette as the search/command spine avoids dashboard-FAB clutter and two competing search fields. Matches "calm, keyboard-first."
10. **No user-facing model picker.** "One intelligence" (UX Spec §1.3) + "never surface provider names" (§12) → model/provider control lives only in the audited admin AI Gateway. The recruiter never sees a model menu.

---

*End of Design Bible. This document is the visual/design-language contract; [HIRELENS_V3_UX_SPEC.md](./HIRELENS_V3_UX_SPEC.md) is the structural contract. Together they leave frontend build as a mechanical exercise. Changes here are design decisions requiring sign-off; gaps are spec gaps to raise, not resolve ad hoc in code.*
