# HireLens V4 — Implementation Playbook

> **Status:** Canonical engineering reference. The design is **frozen**.
> **Companions:** `HIRELENS_V3_DESIGN_BIBLE.md` (visual language), `HIRELENS_V3_UX_SPEC.md` (structural contract), the Unified Design System (Stitch asset `assets/10019264991671263335`), and the frozen Stitch reference screens.
> **This is not a design document.** It defines *how* engineers implement the existing, frozen design — nothing more.

---

## 1. Purpose

### Scope
This handbook governs the frontend implementation of HireLens V4: the marketing site, authentication, onboarding, the app shell, and the six product workflows (Decision Inbox, Triage, Deep Review, Decision Intelligence, Decision Ledger, Learning), across light and dark themes.

### What is frozen (do not change)
- **The Design Constitution** — the six levers: Rack Focus, Prism-is-AI, one-serif-moment, Ink↔Glass, mono-on-readouts, motion-reinforces-judgment.
- **The Unified Design System** — tokens, palette, typography, spacing, radius, elevation, motion.
- **The nine surfaces** — layout, navigation, workflow, states, and copy intent as designed.
- **The interaction signatures** — Rack Focus is the only one. There are no others.

### What is not allowed to change
- No new metaphors, signatures, colors, type families, or visual language.
- No workflow, navigation, or layout redesign — **the single exception** is a genuine, demonstrable usability defect surfaced *by implementation*, which must be raised as a flagged issue (labelled as such), never resolved silently.
- No new dependencies for anything the current stack already does (see §3). Notably: **no animation library** — motion is CSS + the Web Animations API.

### Two frozen-intent reconciliations (record, do not relitigate)
1. **Display serif = Fraunces, not Newsreader.** Fraunces is the committed optical serif (`--font-hl-display` in `globals.css`, Design Bible Appendix A). Stitch prototypes used *Newsreader* only because Fraunces was unavailable in that tool. **Production uses Fraunces.** Treat every "Newsreader" in a reference screen as "Fraunces."
2. **No permanent Copilot rail.** Direction D (frozen shell) removed the persistent AI rail; AI is summoned contextually, with the **Command Palette (`⌘K`) as the primary AI entry**. The existing V3 `copilot/` rail is migrated to a **contextual, dismissible panel** (a Drawer-class surface), never persistent chrome.

---

## 2. Engineering Principles

1. **Translate, don't reinterpret.** The target is the frozen Stitch screen + the Unified DS + the `.hl` tokens. If the design shows it, build exactly that. If it doesn't, it isn't in scope.
2. **Constitution first.** When a framework default and the Constitution disagree, the Constitution wins (e.g., a UI kit's drop-shadow card → hairline card).
3. **Smallest possible deviation.** When an engineering constraint forces a change, choose the minimum edit that preserves intent, and document *which* Constitution rule the constraint touched.
4. **Accessibility is not optional.** WCAG 2.2 AA is a build requirement, not a polish pass. A component that fails a11y is unfinished (§9).
5. **Performance is part of the design.** "Calm, fast instrument" is a design property. Jank, layout shift, and slow interactions violate the design as surely as a wrong color (§11).

**The test on every decision:** *"Is this required to preserve the frozen design, or am I inventing?"* If invention → stop.

---

## 3. Project Structure

### Stack (as-is — do not swap)
| Concern | Tool |
|---|---|
| Framework | **Next.js 16** (App Router), **React 19** |
| Styling | **Tailwind CSS v4** (CSS-first `@theme inline`), CSS variables under `.hl` |
| Theme | **next-themes** — writes `data-hl-theme="light|dark"` (NOT `.dark`) |
| Density | `data-hl-density="comfortable|compact"` attribute on `.hl` |
| Primitives | **Radix UI** (dialog, dropdown-menu, tabs, toast, tooltip, label, slot) |
| Data | **@tanstack/react-query 5**; **@tanstack/react-virtual 3** (virtualization) |
| Icons | **lucide-react** (1.5px stroke; the ✨ sparkle is the only spectral glyph) |
| Variants | **class-variance-authority** + **clsx** + **tailwind-merge** (`cn()` helper) |
| Markdown | **react-markdown** + **remark-gfm** (AIAnswer only) |
| Persistence | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) |
| Docs/QA | **Storybook 10** — every component ships a `.stories.tsx` |
| Motion | **CSS keyframes + transitions + Web Animations API.** No framer-motion, no GSAP. |

### Folder structure (this exists — extend it, don't reorganize)
```
resume-hero-section/
├── app/
│   ├── layout.tsx                 # root; loads fonts, providers
│   ├── (legacy)/                  # FROZEN v1.0 — never touch
│   └── (hirelens)/                # V4 routes live here
│       ├── layout.tsx             # .hl shell wrapper
│       ├── inbox/  roles/  candidates/  ledger/  learning/  ask/  settings/
│       └── (auth, onboarding routes)
├── components/hirelens/
│   ├── ui/            # primitives: button, input, card, drawer, dialog, tabs,
│   │                  #   dropdown-menu, toast, tooltip, kbd, spinner, divider,
│   │                  #   skeleton, badge, avatar, visually-hidden  (+ .stories)
│   ├── domain/        # score-meter, ai-answer, approval-card, confidence-pill,
│   │                  #   role-card, risk-row, activity-row  (+ .stories)
│   ├── states/        # empty-state, error-state, offline-banner, gate-state, loading
│   ├── shell/         # app-shell, breadcrumbs, notifications, account-menu,
│   │                  #   workspace-switcher, skip-link, nav-config, shell-context, providers
│   ├── command-palette/   # command-palette, command-registry
│   ├── copilot/       # contextual AI panel (NOT permanent — see §1 reconciliation)
│   ├── theme/         # fonts.ts, theme-provider, theme-toggle, density-toggle
│   ├── lib/           # use-persisted-state, use-media-query, use-online-status,
│   │                  #   density, format, use-announcer, api/ (query-client, hooks, use-session)
│   └── <surface>/     # per-surface composition (e.g. home/, triage/, deep-review/)
└── app/globals.css    # the .hl token system + motion primitives
```

**Rules:**
- **Component organization:** `ui/` = design-system primitives (no domain knowledge). `domain/` = HireLens concepts (scores, AI answers, approvals). `states/` = empty/loading/error/offline. `shell/` = persistent chrome. `<surface>/` = page composition that assembles the above. Never leak domain logic into `ui/`.
- **Routes:** all V4 under `app/(hirelens)/`. The `(legacy)` group is **frozen v1.0** — off-limits.
- **Shared UI:** import from `ui/` and `domain/` via their `index.ts` barrels.
- **Hooks:** cross-cutting hooks in `lib/`; data hooks in `lib/api/` (React Query). Component-local hooks stay in the component file.
- **Providers:** composed in `shell/providers.tsx` (Theme → Query → Density → Shell context). One provider tree; do not add ad-hoc context.
- **Utilities:** `lib/format.ts` (numbers/dates → tabular strings), `cn()` from the CVA/clsx/tailwind-merge pattern. No lodash for what native does.
- **Animation layer:** CSS in `globals.css` (`@keyframes hl-*`) + a small `lib/motion` for WAAPI helpers (Rack Focus). No component reaches for a motion library.
- **Theme layer:** `theme/` owns fonts + theme/density toggles; theme state via next-themes only.

---

## 4. Token Implementation

**All tokens already live in `globals.css` under `.hl`.** This section maps them; it does not redefine them. **Never redefine `:root`/`.dark`** (frozen legacy). Dark is keyed on `[data-hl-theme='dark'] .hl`, density on `.hl[data-hl-density='compact']`.

### Color tokens (semantic → raw, light/dark)
Use the semantic CSS variables and their Tailwind utilities (`bg-hl-canvas`, `text-hl-fg`, `border-hl-border`, …). Raw hex appears **only** inside `globals.css`.

| Group | Variables |
|---|---|
| Neutral (Ink & Glass) | `--hl-bg-canvas/subtle/muted/inset`, `--hl-border-subtle/default/strong`, `--hl-text-primary/secondary/tertiary` |
| Accent (Iris) | `--hl-accent-solid/hover/text/subtle-bg/border` |
| AI (Prism) | `--hl-prism-from/mid/to`, `--hl-ai-surface`, `--hl-ai-border` |
| Focus scale | `--hl-score-{infocus,sharp,legible,soft,outfocus}(-bg)` |
| Semantic | `--hl-success/warning/danger/info(-bg)` |
| Confidence | `--hl-confidence-high/med/low` (low = neutral gray) |
| Skeleton | `--hl-skeleton-base/sheen` |

### Typography
Fonts wired via `next/font` → CSS vars, mapped in `@theme inline`:
- `--font-hl-display` → `var(--font-fraunces)` → utility `font-hl-display` — **Fraunces** (display only)
- `--font-hl-sans` → `var(--font-inter)` → `font-hl-sans` — **Inter** (all UI)
- `--font-hl-mono` → `var(--font-jetbrains)` → `font-hl-mono` — **JetBrains Mono**, `font-variant-numeric: tabular-nums`

Type recipes are the `.hl-display-xl/.hl-display/.hl-h1…/.hl-mono` component classes in `globals.css` — use them; do not hand-roll sizes.

### Spacing / Radius / Borders / Elevation / Focus
- **Spacing:** 4px scale via Tailwind; density-sensitive paddings read the `--hl-card-pad/section-pad/row-h/control-h-*` variables (they flip under `[data-hl-density='compact']`).
- **Radius:** `--hl-radius-sm/md/lg/xl` → `rounded-hl-sm…`. Never `rounded-full` except pills/avatars.
- **Borders:** 1px hairlines are the depth system. `border-hl-border-subtle` (dividers), `border-hl-border` (edges), `border-hl-border-strong` (in-focus frame/emphasis).
- **Elevation:** `--hl-shadow-xs/sm/md/lg` — low-spread, semantic (a shadow means "floats/dismissible"). Dark adds an inset hairline (already in the token). **Never** a shadow where a border belongs.
- **Focus ring:** the global `.hl :focus-visible` rule (2px `--hl-accent-solid`, 2px offset). Do not restyle per component.

### Motion tokens
`--hl-dur-instant/fast/base/slow/rack` and `--hl-ease-out/emphasized/in`. Consume these; never hardcode `300ms`.

### AI surface tokens
AI blocks: background `--hl-ai-surface`, left edge via `.hl-prism-edge` (or `.hl-prism-border`), shimmer via `.hl-ai-shimmer`. These classes exist — reuse, don't recreate a gradient.

### Dark mode
Add nothing. `[data-hl-theme='dark'] .hl` already overrides every value. Build to the semantic variable and both themes work.

---

## 5. CSS Rules

- **Namespace:** every V4 style lives under `.hl`. A rule that could leak to `:root`/`.dark` is a bug. The app subtree is wrapped in `.hl`.
- **Naming:** semantic token names only (`bg-hl-subtle`, not `bg-[#F4F6F5]`). Arbitrary hex in a component fails review.
- **Layering:** respect Tailwind v4 `@layer base/components/utilities`. Recipes (`.hl-*`) are `@layer components`. Don't fight specificity with `!important` (the reduced-motion block is the only sanctioned use).
- **CSS variables:** read tokens; set only documented per-instance vars (e.g. `--hl-prism-fill` on an AI block).
- **Utility classes:** prefer Tailwind utilities backed by `@theme inline` mappings; drop to the `.hl-*` recipes for typography/AI/skeleton/rack primitives.
- **Responsive strategy:** Tailwind breakpoints, mobile-first. Density (`comfortable/compact`) is **orthogonal** to breakpoints — never conflate them.
- **Container rules:** reading surfaces (Deep Review, Ask, Report) cap at ~680–800px measure; tables/boards go full width. Body must never scroll horizontally — overflow lives in scroll containers.

---

## 6. Typography Implementation

- **Fraunces (display):** empty-state heroes, greetings, the single hero number, report/memo titles, candidate name, the one editorial line per surface. Variable axes: high `opsz`, low `SOFT`, weight 500–600. **Max one moment per surface** (two only on Decision Intelligence + Learning).
- **Inter (UI):** everything else — H1–H3, nav, buttons, labels, tables, body.
- **JetBrains Mono (data):** every number, score, ATS, ID, timestamp, KBD hint, readout — always `tabular-nums`.

**Examples**
```tsx
<h1 className="hl-display">Let’s fill your first role.</h1>      // Fraunces hero
<h2 className="hl-h2">Needs your decision</h2>                   // Inter section
<span className="hl-mono">88 · In focus</span>                  // mono readout
```

**Anti-patterns (reject):** Fraunces in a table/nav/button; two serif moments on a non-document surface; a bare number in Inter (must be mono/tabular); hardcoded `font-family`.

---

## 7. Motion Implementation

**Library policy:** CSS transitions + `@keyframes` (in `globals.css`) + the Web Animations API for orchestrated sequences (Rack Focus). No motion dependency.

- **Rack Focus (the signature):** on opening a decision object — the receded surface gets desaturate→~70% + dim→~50% + 2px blur over `--hl-dur-rack` (200ms) `--hl-ease-emphasized`; the incoming object slides+fades over `--hl-dur-base`. Use `.hl-rack-scrim` for the backdrop. **Only on decision objects** (peek, Compare, report preview, approval, palette). Never on menus/tooltips/tabs.
- **Skeletons:** `.hl-skeleton` (neutral sheen, 1.4s). This is "loading." Never use the Prism shimmer for loading.
- **AI shimmer:** `.hl-ai-shimmer` (prism, 1.2s) — this is "thinking," AI streaming only.
- **Count-ups:** allowed on Inbox live deltas and Learning metrics (WAAPI, tabular figures to prevent width jitter). **Forbidden on the Ledger** (permanence).
- **Confidence / compression bars fill** as the value resolves — the judgment-reinforcing motion.
- **Reduced motion:** honored globally in `globals.css` (transforms/blur/shimmer collapse). Rack Focus degrades to **dim-only**. Do not re-implement per component; do add `prefers-reduced-motion` guards for any new WAAPI you write.
- **Durations:** only the `--hl-dur-*` tokens.
- **Sequencing:** stagger caps at 6 items, 12ms step, first load only (none on return/cached).
- **Performance constraints:** animate **only `transform` and `opacity`** (and `filter` for the rack blur, which is intentional and rate-limited). Never animate layout properties (width/height/top/left) or `box-shadow`. Keep concurrent animations minimal; Rack Focus ≤200ms perceived.
- **GPU-friendly:** promote animating layers deliberately (`will-change: transform, opacity`) and remove the hint after.

---

## 8. Component Standards

General: every component is theme-aware, density-aware, keyboard-operable, and ships a Storybook story with light/dark + empty/loading/error where applicable. Use Radix for anything with focus/roving/portal semantics.

| Component | Implementation rules |
|---|---|
| **Sidebar** | 240px (`shell/app-shell`); `bg-hl-subtle`, 1px right hairline. Active = `accent-subtle-bg` + 2px Iris left indicator + filled icon. Key-hints hover-revealed. Collapsible to 56px (icons + tooltip). |
| **Top Bar** | 52px, transparent → 1px bottom hairline on scroll. Breadcrumb, ⌘K launcher, bell (6px Iris dot, never red), avatar. |
| **Command Palette** | Radix Dialog; 640px; backdrop = Rack Focus. Groups Jump/Actions/**Ask AI** (Prism hairline on Ask only). Full keyboard nav; the primary AI entry. |
| **Drawer** | `ui/drawer` (Radix Dialog, side). Right, radius `xl` left corners, `lg` shadow, sticky header, Rack-Focus backdrop, focus-trapped, `Esc` closes. |
| **Focus Overlay** | The Rack-Focus primitive (§7). One sharp object framed by `border-hl-border-strong`; environment receded. Reduced-motion = dim only. |
| **Cards** | `ui/card`: `bg-hl-canvas`, 1px `border-hl-border`, radius `lg`, `xs` shadow. Interactive lifts `xs→sm` + border→strong over `fast`. AI card adds Prism left hairline + `ai-surface`. |
| **Tables** | Sticky header `bg-hl-subtle`; `border-subtle` rows; zebra off; tabular mono right-aligned; sticky first column casts `sm` shadow on x-scroll; **virtualize ≥100 rows with @tanstack/react-virtual**. |
| **Forms** | Bottom-border inputs where the design shows them (auth/onboarding); labels in mono caption; inline validation; never color-only errors. |
| **Buttons** | `ui/button` (CVA variants: primary Iris / secondary / ghost / danger / **AI** with prism hairline). Sizes track density. Loading = inline 16px spinner, width locked. |
| **Inputs** | `ui/input`/`textarea`; focus ring from the global rule; mono for numeric fields. |
| **Charts** | Calm instruments. Iris primary + the restrained categorical set; teal sequential; **no gradient fills, no 3D, no Prism in charts**; grid `border-subtle`; direct labels; ship an accessible data-table fallback + "✨ Explain this". |
| **Notifications** | `shell/notifications` popover; grouped by day; ✨ on AI rows; unread `accent-subtle-bg`; errors use `danger` icon+text, not the whole row. |
| **Toasts** | `ui/toast` (Radix); bottom-right; 3px left semantic edge; **Undo** in `accent-text`, persists 10s, pause on hover. |
| **Loading** | `states/loading` + `ui/skeleton`; neutral sheen mirroring final layout; **never** a full-page spinner on the hot path. |
| **Empty states** | `states/empty-state`; 24px line icon, Fraunces headline, one sentence, one CTA; first-run gets the faint Aurora. |
| **Error states** | `states/error-state`; inline `danger`-edged block + Retry (page survives); route error = friendly Fraunces headline + copyable mono request ID; never a stack trace/provider name. |
| **AI surfaces** | `domain/ai-answer`: Prism left hairline, `ai-surface`, markdown via react-markdown, streaming shimmer, Stop control, source chips, confidence pill (low = neutral), reasoning collapsed. Actions render as `domain/approval-card`. |

---

## 9. Accessibility Contract (WCAG 2.2 AA — build requirement)

- **Keyboard:** full parity with pointer; every primary action has a shortcut and a visible mouse path; the palette reachable from anywhere; a skip-to-content link (`shell/skip-link`).
- **Focus:** 2px Iris ring at 2px offset, appears instantly (no transition); focus trapped in modals/drawers and restored on close; visible on `ai-surface` and dark (≥3:1).
- **ARIA:** use Radix (correct roles/labelling out of the box); label icon-only controls; `aria-live` for AI stream completion, toasts, async results (`lib/use-announcer`).
- **Screen readers:** the Focus scale exposes "88, In focus" (not color); drag has a keyboard equivalent (stage dropdown); landmarks on shell regions.
- **Reduced motion:** honored globally; Rack Focus → dim only; no info conveyed by blur alone.
- **Contrast:** all text ≥4.5:1 (≥3:1 large/UI); `accent-text` is the link color; `accent-solid` bears only white ≥14px-medium labels.
- **Touch targets:** ≥44px on touch; Compact never below 32px touch / 28px pointer with 8px spacing.
- **Zoom / responsive:** reflow to 400% zoom / 320px width without loss or horizontal body scroll.
- **Color independence:** score/semantic/confidence always carry number+label or icon+text.

---

## 10. Responsive Rules

Breakpoints (Tailwind): `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

| Surface element | Desktop / Laptop (≥1024) | Tablet (768–1023) | Mobile (<768) |
|---|---|---|---|
| **Sidebar** | 240px expanded | 56px collapsed (icons + tooltip) | off-canvas sheet via top-bar menu |
| **Drawer / Peek** | right overlay (Rack Focus) | right overlay, wider | **full-screen route** (no rack — mobile is a route) |
| **Tables** | full width, sticky first column | horizontal scroll in an `overflow-x:auto` container | stack to key rows / cards; retain mono alignment |
| **Command Palette** | 640px centered | 640px | near-full-width sheet, same groups |
| **Charts** | full instrument + data-table fallback | reflow, keep direct labels | single-column, scrollable, data-table one tap away |
| **Decision Intelligence / memo** | two-column | single column, sticky decision CTAs → bottom bar | single column, CTAs docked bottom |

Density (comfortable/compact) is a user setting, independent of these breakpoints.

---

## 11. Performance Budget

- **Animation limits:** transform/opacity/filter only; Rack Focus ≤200ms; ≤6 concurrent staggered items; 60fps target; zero CLS on load (reserve skeleton boxes at final size).
- **Bundle strategy:** RSC by default; `"use client"` only where interaction requires it. Code-split per route via App Router. Keep the shell bundle lean; lazy-load heavy surfaces.
- **Lazy loading:** `next/dynamic` for Charts, the Copilot panel, Report canvas, and any Recharts-class weight. Palette results load on open.
- **Virtualization:** **@tanstack/react-virtual** for any list/table ≥100 rows (Triage, Ledger, Talent). Non-negotiable at recruiter volume.
- **Image strategy:** `next/image`; avatars sized exactly; no layout shift; inline SVG for icons (lucide) — no icon fonts.
- **Memoization:** memo the expensive row/card renderers; stabilize callbacks feeding virtualized lists; React Query caches server state (don't duplicate in local state).
- **Streaming:** stream RSC where it helps first paint; AI answers stream token-by-token into `ai-answer` (with the shimmer); skeletons on the hot path, never spinners.
- **Perceived latency:** optimistic writes with a pending tint; prefetch on hover; sub-100ms interaction feedback.

---

## 12. Implementation Order

| Phase | Deliverable | Gate |
|---|---|---|
| **P0 · Foundations** | Extend `globals.css` `.hl` to the Unified DS (display scale, dark values); confirm Fraunces/Inter/JetBrains wiring; token audit; Rack-Focus primitive + reduced-motion; skeleton/empty/error/offline; focus ring; density knob | Everything derives from this — build first |
| **P1 · Shell** | `shell/app-shell` (Instrument Rail, quiet-at-rest, hover key-hints, context-aware), top bar, workspace switcher, notifications, user menu, command palette, Focus Overlay, toasts, keyboard cheatsheet, light+dark | P0 |
| **P2 · Authentication** | Split Editorial (Glass form / Ink Living Window), email-first progressive, returning-user fast path, SSO/magic-link/2FA/invite, calm edge states | P0 (shell optional) |
| **P3 · Onboarding** | Role → Candidates → outcome Processing → Arrival at first Inbox; deferred admin; honest cold-start | P1, P2 |
| **P4 · Inbox** | Briefing, overnight deltas, Start-Here, Start Focus Run execution | P1 |
| **P5 · Triage** | Pre-Sorted Ledger + compression header + trustworthy bulk-review + Focus Flow; **virtualized** | P1 |
| **P6 · Deep Review** | Open-Questions confidence model + Evidence Board on demand (drawer, promotable) | P1, P5 |
| **P7 · Decision Intelligence** | Memo + Regret Analysis + honest confidence + approval/override dialog | P1, P6 |
| **P8 · Ledger** | Permanent mono record + Rack-Focus record with archived Prism snapshot; **virtualized**, near-static motion | P1 |
| **P9 · Learning** | Calm dataviz + Prism-only insight + count-ups + calibration detail | P1 |
| **P10 · QA** | Cross-surface Constitution audit, a11y sweep, perf budget, responsive/mobile pass, reduced-motion audit, dark-mode parity | All above |

**MVP line = P0–P4** (foundations + shell + activation flow) is demoable and coherent.

---

## 13. Pull Request Checklist

Every PR must confirm (paste and check):

- [ ] **Tokens** — only semantic `hl-*` tokens/utilities; zero arbitrary hex/px for design values.
- [ ] **Constitution** — Prism only on AI (never fill/chart); ≤1 serif moment (≤2 on doc surfaces); Rack Focus only on decision objects; mono on all numerics; hairlines not shadows; no glassmorphism; low confidence neutral (never red).
- [ ] **Accessibility** — keyboard parity; focus visible + trapped/restored; ARIA/roles; `aria-live` for async; contrast AA; targets; color never sole signal.
- [ ] **Performance** — transform/opacity(/filter) motion only; no CLS; virtualization ≥100 rows; lazy-load heavy; RSC-first.
- [ ] **Responsive** — desktop/laptop/tablet/mobile verified; drawer→route on mobile; no horizontal body scroll.
- [ ] **Motion** — `--hl-dur-*` tokens; reduced-motion path; count-up rules (yes Inbox/Learning, **no Ledger**).
- [ ] **Typography** — Fraunces/Inter/JetBrains in their lanes; tabular numerals.
- [ ] **No new design** — no new metaphor/signature/color/type/workflow. If a usability defect was found, it's flagged as an issue, not silently "fixed."
- [ ] **Story** — Storybook story added/updated (light+dark, key states).

---

## 14. Common Implementation Mistakes

| Mistake | Avoid by |
|---|---|
| Using **Newsreader** because a reference screen shows it | Display serif is **Fraunces** (§1). |
| Reaching for **framer-motion** | Motion is CSS/WAAPI (§7). No new motion dep. |
| **Prism gradient on a button/badge/chart** | Prism = AI hairline/sparkle only. Charts = Iris/teal. |
| **Two serif moments** on a normal surface | One per surface (two only on Decision Intelligence/Learning). |
| **Drop shadow doing a border's job** | Depth = hairlines; shadow means "floats/dismissible" only. |
| **Glassmorphism / backdrop-blur** panels | Removed by consolidation. Only the Rack-Focus scrim blurs. |
| **Rack Focus on a menu/tooltip/tab** | Decision objects only. |
| **Count-up/stagger on the Ledger** | Ledger is near-static (permanence). |
| **AI shimmer used for plain loading** | Neutral `.hl-skeleton` for loading; prism shimmer for AI thinking. |
| **Red for low AI confidence** | Neutral gray, always. |
| Bare number in **Inter** | All numerics in JetBrains Mono, tabular. |
| Editing `:root`/`.dark` or the `(legacy)` group | Frozen v1.0 — never touch. Work under `.hl` / `(hirelens)`. |
| Animating **width/height/box-shadow** | transform/opacity only; no CLS. |
| **Non-virtualized** big tables | `@tanstack/react-virtual` ≥100 rows. |
| Rebuilding a **permanent Copilot rail** | AI is contextual; ⌘K is the entry (§1). |
| Hardcoding **300ms** / arbitrary easing | Use `--hl-dur-*` / `--hl-ease-*`. |
| Re-styling the **focus ring** per component | Use the global `.hl :focus-visible`. |

---

## 15. Definition of Done

A component / surface is **Done** only when **all** hold:

1. **Matches the frozen design** — layout, tokens, states, copy intent, per the Stitch reference + Unified DS (Newsreader→Fraunces reconciliation applied).
2. **Passes accessibility** — the §9 contract, verified with keyboard + screen reader + contrast + reduced-motion.
3. **Passes responsiveness** — the §10 matrix across desktop/laptop/tablet/mobile; no horizontal body scroll.
4. **Passes performance** — the §11 budget; virtualized where required; zero CLS; transform/opacity motion.
5. **Passes Constitution review** — the §13 checklist, green.
6. **Contains no invented behavior** — nothing added beyond the frozen design; any usability defect raised as a flagged issue, not smuggled in as a fix.
7. **Ships a Storybook story** — light + dark + key states.

If any item fails, the component is unfinished — regardless of how it looks.

---

*This handbook is the canonical implementation reference for HireLens V4. It translates the frozen Design Constitution into engineering rules; it does not extend the design. When in doubt: preserve, don't invent.*
