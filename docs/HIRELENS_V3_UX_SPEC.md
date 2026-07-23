# HireLens V3 — Complete UX Specification

> **Status:** Architecture approved (see [HIRELENS_V3_REDESIGN.md](./HIRELENS_V3_REDESIGN.md)).
> **Purpose:** The single source of truth for building the HireLens V3 frontend. Detailed
> enough that a frontend engineer can build the entire product without further UX decisions.
> **Scope:** Layouts, components, states, interactions, AI behavior, tokens, shortcuts,
> responsive rules, and build order. **No code** — this is the design contract the code implements.
> **Audience:** Frontend engineers, design, PM. **Backend:** unchanged (all capabilities exist).

---

## 0. How to read this spec

- **Regions** are described with ASCII boxes and **exact dimensions in px** (or rem where noted). Treat dimensions as defaults on the `lg` (≥1024px) breakpoint unless a responsive rule overrides them.
- Every screen lists its **five states** (default, loading, empty, error, gated). If a state is omitted it inherits the global pattern in §4.
- **AI behavior** is called out per screen. All AI output obeys the global **AI Output Contract** (§4.6). Never re-specify it — reference it.
- **Component names** are `PascalCase` and map 1:1 to the component inventory (§13). If a component isn't in the inventory, it doesn't exist yet — add it there first.
- Tokens are semantic (`--bg-canvas`, not `#fff`). Raw values live in §3 only.
- **MUST / SHOULD / MAY** are used in the RFC sense.

---

## 1. Design principles (the tie-breakers)

When two designs are equally valid, the earlier principle wins.

1. **Attention over navigation.** The product tells you what matters; it doesn't make you hunt. Home and the Role Workspace surface work; they aren't menus.
2. **Context over destinations.** Capabilities appear where the work is. Prefer a panel/drawer/lens in the current surface over a route change.
3. **One intelligent system.** All AI shares one voice, one trust model (confidence + sources + why), one entry (`⌘K` / Copilot). Never make AI feel like separate products.
4. **Speed is a feature.** Sub-100ms perceived interactions. Optimistic writes. Prefetch on hover. Skeletons, never spinners, on the hot path.
5. **Calm density.** Executive-legible whitespace *and* recruiter-grade information density. One accent. Restrained motion. Nothing decorative.
6. **Decisions are objects.** Anything the AI proposes is an approvable, reversible, auditable object — never a fire-and-forget action.
7. **Keyboard-first, mouse-complete.** Every primary action has a shortcut; every shortcut has a discoverable mouse path.
8. **No dead ends.** Every state (empty, error, gated, offline) proposes the next action.

---

## 2. Product surfaces & routing map

Four hiring surfaces + Settings. The Copilot is a rail, not a route.

| Surface | Route | Primary job |
|---|---|---|
| **Home** | `/` (authed) | "What needs me now" |
| **Roles** (list) | `/roles` | Pick/create a hiring process |
| **Role Workspace** | `/roles/:roleId` | Where ~90% of work happens (lenses below) |
| ↳ Pipeline lens | `/roles/:roleId` (default) | Candidate pipeline + evaluation |
| ↳ Analytics lens | `/roles/:roleId/analytics` | This role's metrics |
| ↳ Forecast lens | `/roles/:roleId/forecast` | This role's predictions |
| ↳ Report lens | `/roles/:roleId/report` | Generate/export exec briefing |
| ↳ Activity lens | `/roles/:roleId/activity` | Notes, collaboration, audit |
| Candidate peek | `?candidate=:candidateId` (overlay on any role route) | Read/evaluate one candidate without leaving |
| **Talent** | `/talent` | Conversational org-wide discovery |
| **Ask** | `/ask` | Org brain · what-if simulator · agent backlog |
| **Settings** | `/settings/*` | Org admin (members, integrations, billing, keys, flags, usage, audit) |
| Auth | `/login` | Sign in |

**Deep-link rule:** every lens, peek, and Ask thread MUST be URL-addressable and shareable (a teammate opening the URL lands on the exact state, subject to permissions). Peek and Compare are query-param overlays so back/forward and share work.

---

## 3. Design tokens

Ship as CSS custom properties + a Tailwind theme. Values are the **defaults**; both light and dark MUST be delivered. Light is default; respect `prefers-color-scheme` and an explicit user toggle (persisted).

### 3.1 Color — neutral (Slate)

| Token | Light | Dark |
|---|---|---|
| `--bg-canvas` | `#FFFFFF` | `#0B0D12` |
| `--bg-subtle` | `#F7F8FA` | `#12151C` |
| `--bg-muted` | `#EFF1F4` | `#1A1E27` |
| `--bg-inset` | `#E7EAEF` | `#232833` |
| `--border-subtle` | `#ECEEF2` | `#1E222B` |
| `--border-default` | `#E2E5EA` | `#2A3039` |
| `--border-strong` | `#D5D9E0` | `#3A424E` |
| `--text-primary` | `#141821` | `#F2F4F8` |
| `--text-secondary` | `#5B616E` | `#A6AEBD` |
| `--text-tertiary` | `#8A909C` | `#6B7382` |
| `--text-disabled` | `#B4B9C2` | `#4A515E` |

### 3.2 Color — accent (Iris) & AI

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent-solid` | `#5B5BD6` | `#7C7CF0` | Primary buttons, active nav, focus |
| `--accent-hover` | `#4F4FC4` | `#8E8EF5` | Hover of accent-solid |
| `--accent-text` | `#4A4AC0` | `#A9A9F7` | Links, accent text |
| `--accent-subtle-bg` | `#EEEEFB` | `#1E1E3A` | Selected rows, accent chips |
| `--ai-from` / `--ai-to` | `#7C3AED`→`#5B5BD6` | `#9D6BFF`→`#7C7CF0` | AI gradient (borders, shimmer, the "✨" mark) |
| `--ai-surface` | `#FAF8FF` | `#15131F` | Background of AI answer blocks |

**AI shimmer:** a 1.2s linear gradient sweep across `--ai-from`→`--ai-to` at 12% opacity, used only while an AI response streams. Never decorative.

### 3.3 Color — semantic

| Role | Text | Bg | Dark text | Dark bg |
|---|---|---|---|---|
| Success | `#12734F` | `#E6F6EF` | `#4ADE9E` | `#0E2A20` |
| Warning | `#9A5B00` | `#FDF3E3` | `#F5B54A` | `#2C2109` |
| Danger | `#C0392B` | `#FDECEA` | `#F87171` | `#2E1513` |
| Info | `#2563EB` | `#E8F0FE` | `#7AA7FF` | `#0F1D33` |

**Score/fit palette** (candidate match): a 5-stop scale mapped to score bands — `≥85` success, `70–84` a green-teal, `55–69` warning-amber, `40–54` orange, `<40` danger. Always pair color with a number and a label (never color alone — accessibility).

### 3.4 Typography

- **Font:** `Inter var` (UI), `ui-monospace, "JetBrains Mono"` (data/scores/IDs). System-font fallback stack.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Display | 28 / 34 | 600 | Empty-state hero, Ask landing |
| H1 | 22 / 28 | 600 | Page title |
| H2 | 18 / 24 | 600 | Section headers |
| H3 | 16 / 22 | 600 | Card titles |
| Body | 14 / 20 | 400 | Default text |
| Body-medium | 14 / 20 | 500 | Emphasis, labels |
| Small | 13 / 18 | 400 | Secondary text, table cells |
| Caption | 12 / 16 | 500 | Meta, timestamps, badges |
| Mono | 13 / 18 | 500 | Scores, IDs, tokens |

Letter-spacing: `-0.01em` on ≥18px, `0` elsewhere. Numeric tabular figures for all tables and scores.

### 3.5 Spacing, radius, shadow, motion

- **Spacing (4px base):** `0,2,4,8,12,16,20,24,32,40,48,64`. Section padding `24`; card padding `16`; dense table row `8` vertical.
- **Radius:** `sm 6` (chips, inputs), `md 8` (buttons, small cards), `lg 12` (cards, drawers), `xl 16` (modals, hero), `full` (pills, avatars).
- **Shadow (premium, low-spread):** `xs 0 1 2 rgba(16,18,27,.04)`; `sm 0 2 6 rgba(16,18,27,.06)`; `md 0 6 16 rgba(16,18,27,.08)`; `lg 0 16 40 rgba(16,18,27,.12)`. Drawers/modals use `lg`; cards `xs`→`sm` on hover.
- **Motion:** `fast 120ms`, `base 180ms`, `slow 240ms`. Easing: `--ease-out cubic-bezier(.2,0,0,1)` (default), `--ease-emphasized cubic-bezier(.2,0,0,.2)` (entrances). Respect `prefers-reduced-motion` — replace transforms with opacity-only.
- **Z-index:** sticky `100`, dropdown `200`, drawer `300`, modal `400`, command-palette `500`, toast `600`, tooltip `700`.

### 3.6 Breakpoints & density

`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. **Primary target ≥1024 (desktop app).** `md`–`lg` supported (tablet, condensed). `<md` = read-only "on-the-go" mode (§11). A user **Density** setting (`comfortable` default / `compact`) scales table row height `40↔32` and section padding `24↔16`.

---

## 4. Foundations & global patterns

### 4.1 App shell

```
┌──────┬────────────────────────────────────────────────┬───────────────┐
│      │  Top bar (52px)                                 │               │
│ Left │  [breadcrumb / title]        [⌘K] [notif] [me]  │  Copilot rail │
│ nav  ├────────────────────────────────────────────────┤  (360px,      │
│ rail │                                                 │  collapsible) │
│ 240  │              Content region                     │               │
│ px   │              (scrolls independently)            │  push ≥1440   │
│      │                                                 │  overlay <1440│
└──────┴────────────────────────────────────────────────┴───────────────┘
```

- **Left nav rail — 240px** expanded, **56px** collapsed (icon-only; label on hover tooltip). Persisted per user. Contents top→bottom: workspace switcher (if >1) · `Home · Roles · Talent · Ask` · spacer · `Settings` (muted) · user/account. Active item: `--accent-subtle-bg` fill + `--accent-solid` 2px left indicator + accent icon. Rail collapses automatically <1280.
- **Top bar — 52px, sticky.** Left: contextual breadcrumb/title (e.g. `Roles / Senior Backend Engineer`). Right: **⌘K launcher** (a search-shaped button showing "Search or ask… ⌘K"), notification bell (unread dot), account avatar menu. On scroll, a 1px `--border-subtle` bottom border fades in.
- **Content region** scrolls independently of nav and top bar. Max content width: reading surfaces (Ask, Report render, Settings forms) `800px` centered; work surfaces (Home, Roles, Workspace, Talent) full-bleed with `24px` gutters.
- **Copilot rail — 360px.** Push layout ≥1440px (content shrinks); overlay with scrim <1440. Toggle with `⌘J`. Default closed on Home/Roles/Settings; default open in Role Workspace and Talent when the user has used it before (remembered per surface).

### 4.2 Command palette (`⌘K` / `Ctrl+K`) — the spine

The universal entry point. Opens centered, `640px` wide, max-height `70vh`, z `500`, backdrop blur + scrim.

**Modes (auto-detected from input, no mode switch UI):**
- **Navigate** — type a role/candidate/page name → jump. Fuzzy, ranked by recency + frequency.
- **Command** — verbs prefixed by intent: `Compare selected`, `Generate report`, `Shortlist top 5`, `Add candidates`, `Switch provider…`, `Invite member…`. Commands are context-aware (only valid ones for the current surface + selection appear).
- **Ask** — a natural-language question ("who's closest to the JD?", "will we fill Data Eng on time?") → hands to the Copilot/Ask engine and opens the answer inline in the palette with a "open in Ask →" affordance.

**Structure:** input at top; results grouped with section headers (`Jump to`, `Actions`, `Ask AI`); each row: icon · primary label · secondary meta (right-aligned) · shortcut hint. Keyboard: `↑↓` move, `↵` execute, `⌘↵` execute in background/new peek, `Esc` close, `Tab` accept suggestion. Recent items show on empty input. Every command in the palette MUST also be reachable by mouse elsewhere.

### 4.3 Copilot rail (ambient AI)

A context-aware chat/action surface, present on every surface, aware of the current object (role, candidate, selection).

- **Header:** "✨ Copilot" · context chip (e.g. "Senior Backend Engineer" / "3 selected") · overflow (clear thread, open in Ask, close).
- **Body:** message thread. AI messages obey the AI Output Contract (§4.6). Suggested prompts appear as chips when the thread is empty, tailored to context ("Rank this pipeline", "Draft interview questions for the top candidate", "Why is this role at risk?").
- **Composer:** multiline input, `↵` send / `Shift+↵` newline, attach-context toggle (auto-includes current role/candidate), stop button while streaming.
- **Actions in answers:** the Copilot can render **action buttons** inside a message (e.g. "Shortlist these 5", "Generate report", "Add to role"). These are Approval Objects (§4.7) — clicking stages the action with a confirm affordance, never fires irreversibly.
- Thread is per-surface-context and persisted for the session; "open in Ask" promotes it to a full Ask thread.

### 4.4 Peek / drawer system

Right-side overlay for reading a secondary object without losing place (candidate, comparison, report preview, member detail).

- Width **480px** (candidate) / **560px** (comparison, report). Slides in `base` with `--ease-emphasized`. Scrim `rgba(11,13,18,.32)` on content, nav stays interactive. z `300`.
- Header: object title + primary meta · actions (context) · `⤢ open full` (promotes to full route) · `✕`/`Esc` close.
- **Stacking:** max depth 2 (e.g. candidate → its comparison). Deeper navigation MUST promote to a full route. Back/forward and URL reflect peek state.
- Content scrolls within the drawer; header sticky.

### 4.5 Loading, empty, error — global patterns

- **Loading = skeletons, not spinners** on the hot path. Skeletons mirror final layout (same box sizes, `--bg-muted` shimmering `1.4s`). Spinners only for in-button async (`16px`) and rare full-page auth checks. First contentful paint target <400ms with skeletons; interactive data <1.5s.
- **Optimistic writes:** mutations (add note, move stage, shortlist) apply immediately with a subtle pending state; on failure, revert + toast with Retry.
- **Empty states — two kinds:** (1) **First-run** (no data ever): illustration/icon + one-line headline + one sentence + a single primary CTA that starts the core workflow. (2) **Zero-results** (filters/search): "No matches" + the active filters as removable chips + "Clear filters" + (for search) "Ask AI to broaden this".
- **Error states:** inline where possible (a card/section fails → that card shows a compact error + Retry, the page survives). Full-page error only for route-level failure: friendly headline, the request ID (copyable), Retry, and "Contact support". Never show raw stack traces or provider names.
- **Offline / backend-unreachable:** a top-bar amber banner "Can't reach HireLens — reconnecting…" with auto-retry; writes queue and flush on reconnect where safe, otherwise disable with tooltip. (This is the failure mode behind the historical "Failed to fetch" — the UI MUST degrade to this banner, never a dead white screen.)

### 4.6 AI Output Contract (applies to EVERY AI response, everywhere)

Every AI-generated block MUST render, in this order:
1. **Answer** — streamed token-by-token; markdown-rendered; `--ai-surface` background, `--ai-from→--ai-to` 1px left border.
2. **Grounding / sources** — a "Sources" row of chips (candidate, JD line, memory, metric). Clicking a chip opens the exact source (peek/scroll-to). If ungrounded/general, label it "General guidance — not from your data."
3. **Confidence** — a small pill: `High / Medium / Low` (maps to model/agreement signals from the backend). Low confidence MUST also show one line on *why* ("limited data for this role").
4. **Why / reasoning** — a collapsible "Show reasoning" that reveals the rationale (never shown by default; keep answers calm).
5. **Actions** — optional Approval Objects (§4.7).

Streaming: show the AI shimmer while streaming; a "Stop" control; graceful truncation. **Degradation:** if the AI is unavailable/rate-limited, the block shows a calm state — "Copilot is busy (high demand). Your data is unaffected — try again in a moment." — never an error color, never a crash. (Matches the gateway's graceful-degrade behavior.)

### 4.7 Approval Object (decisions are first-class)

Any AI-proposed change renders as an **Approval card**:
- Title (the proposed action) · a concise diff/preview (who/what changes) · **Approve** (primary) / **Modify** / **Dismiss** · provenance ("Proposed by Agent · 2h ago" or "Copilot").
- Approving applies the change **optimistically** and drops a reversible toast ("Shortlisted 5 candidates · Undo"). Every approval writes to Activity/audit.
- Approval cards appear in **Home** (the queue), **inline in the Role Workspace** (per-role nudges), and inside **Copilot/Ask answers**. Same component everywhere.

### 4.8 Core component library (behavioral spec)

| Component | Variants | Key behavior |
|---|---|---|
| `Button` | primary, secondary, ghost, danger, ai · sizes sm(28)/md(32)/lg(40) | `ai` variant carries the gradient border + ✨. Loading = inline 16px spinner, label dims, disabled. Min touch 32px. |
| `IconButton` | ghost, subtle · 28/32 | Tooltip mandatory (label). |
| `Input`/`Textarea` | default, error, ai | 32px height (input), 8px radius, focus = 2px `--accent-solid` ring. `ai` input shows ✨ affix. |
| `Select`/`Combobox` | — | Typeahead, keyboard nav, multiselect chips. |
| `Badge`/`Pill` | neutral, accent, semantic, score | Score badge uses fit palette + number + label. |
| `Avatar` | user, candidate · 20/24/32 | Initials fallback, deterministic color from id. |
| `Card` | default, interactive, ai, approval | Interactive = hover lift `xs→sm` + cursor; whole card clickable with a clear primary target. |
| `Table`/`DataGrid` | — | Sticky header, row hover, row select (checkbox), multiselect toolbar, column sort, sticky first column on scroll, virtualized ≥100 rows, density-aware. |
| `Tabs`/`LensSwitcher` | underline, segmented | Lens switcher = segmented, URL-bound, keyboard `[`/`]` to move. |
| `Drawer`/`Peek` | 480/560 | §4.4. |
| `Modal` | sm(420)/md(560)/lg(720) | Focus-trapped, `Esc` close (unless destructive-dirty → confirm), scrim. |
| `Toast` | info, success, warning, danger · with Undo | Bottom-right stack, auto-dismiss 5s (10s if Undo), pause on hover. |
| `Tooltip` | — | 500ms delay, keyboard-focus triggers it too. |
| `EmptyState` | first-run, zero-results, gated | §4.5 / §4.9. |
| `Skeleton` | text, block, row, card | Mirrors target layout. |
| `KBD` | — | Renders shortcut hints consistently. |
| `ApprovalCard` | §4.7 | Everywhere the agent/AI proposes. |
| `AIAnswer` | §4.6 | The one AI render component. |
| `PipelineBoard` / `PipelineTable` | board, table | The Role Workspace core (§7). |
| `ScoreMeter` | bar, ring | Fit/ATS score viz, palette-mapped. |

### 4.9 Feature-gate (plan/permission) state

When a capability is gated (plan/feature-flag/RBAC), the UI MUST show a **calm upsell/permission state**, never an error: the feature's icon + one line ("Executive Reports is available on the Growth plan" / "You need Recruiter access to view this") + a single CTA ("Upgrade" → billing, or "Request access" → notifies admin). The nav item for a fully-unavailable capability is hidden; a gated-but-visible capability shows a small lock affix. (Maps to the existing `feature_gate` backend behavior.)

---

## 5. Auth — Login

- **Route** `/login`. **Purpose:** get in, fast, trustworthy.
- **Layout:** centered `400px` card on `--bg-subtle`; product mark top; email + password (or magic-link/SSO per config); primary "Sign in"; secondary "Forgot password". No marketing clutter.
- **States:** loading = button spinner; error = inline field errors + a form-level message (never reveal which of email/password was wrong); rate-limited = "Too many attempts, try in Ns". Post-login → `/` (Home) or the deep-link the user arrived from.
- **AI:** none. **Responsive:** full-width card `<sm`. **Shortcuts:** `↵` submits.

---

## 6. Home — the attention surface

**Route** `/`. **Purpose:** answer "what needs me now" in <5s. Not a launcher.

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Good morning, {name}.                          [date · plan]  │  H1 + meta
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✨ AI Briefing                                   [dismiss] │ │  AIAnswer (compact)
│  │ 2–3 sentences: what changed overnight, ranked by impact.  │ │
│  │ [jump chips: Senior Backend ·(risk) Data Eng · 2 new fits]│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Needs your decision (3)                          [review all] │  H2 + count
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │  ApprovalCard ×N
│  │ Approve     │ │ Move to     │ │ Reject 3    │              │  (horizontal, wrap)
│  │ shortlist(5)│ │ interview   │ │ below bar   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                 │
│  Hiring risks (2)                                              │  H2
│  ▸ Data Eng — at deadline risk · thin senior pool  [open][ask]│  RiskRow ×N
│  ▸ Offer acceptance forecast down 8%               [open][ask]│
│                                                                 │
│  Worth your time                Active roles                   │  2-col ≥xl
│  ┌───────────────┐              ┌───────────────────────────┐  │
│  │ new high-fit  │              │ RoleCard: pipeline health │  │  CandidateMini ×N
│  │ candidates    │              │ · avg fit · days-to-fill  │  │  RoleCard ×N
│  └───────────────┘              └───────────────────────────┘  │
│                                                                 │
│  Recent AI activity                               [view all]   │  quiet ledger
└───────────────────────────────────────────────────────────────┘
```

- **Ordering is priority, top→bottom:** Briefing → Decisions → Risks → Worth-your-time → Active roles → Activity ledger. Sections with zero items **collapse to nothing** (no empty shells) except when the whole Home is empty (first-run).
- **AI Briefing** = compact `AIAnswer` (§4.6), regenerated on load, cached ~15min, dismissible for the day. Jump-chips are sources.
- **Needs your decision** = `ApprovalCard` queue (the Agent lives here). Empty → section hidden. "Review all" opens Ask → Agent backlog.
- **Hiring risks** = `RiskRow` (from Digital Twin): title · one-line cause · `[open]` (to the role/forecast) · `[ask]` (opens Copilot pre-seeded "why is this at risk?").
- **Worth your time** = new high-fit candidates across roles; each `CandidateMini` opens a peek.
- **Active roles** = `RoleCard` sorted by *movement/risk*, not alphabetically: title, stage counts as a mini pipeline bar, avg fit, forecasted days-to-fill (with risk color), last activity.
- **Recent AI activity** = compact ledger (searches, reports, comparisons, approvals) for trust; each links to its result.

### States
- **First-run (no roles):** Display hero — "Let's fill your first role." + one sentence + primary CTA "Create a role" + a secondary "Import candidates". Briefing replaced by a one-time "Here's how HireLens works" 3-step hint (dismissible).
- **Loading:** skeletons for briefing (2 lines), 3 approval cards, role cards.
- **Error:** each section fails independently (§4.5). Briefing failure → calm "Briefing unavailable right now" (no red).
- **Gated:** if Agent feature is off → "Needs your decision" hidden; a subtle "Enable the AI Agent to get proactive recommendations" card appears once.

### Keyboard / responsive
- `G then H` → Home (global nav shortcuts, §10). `R` on a focused approval → Approve, `X` → dismiss.
- ≥xl: two-column lower area. lg: single column. <md: read-only stack, approvals show but actions require confirm.

---

## 7. Role Workspace — the primary surface

**Route** `/roles/:roleId` (+ lens sub-routes). **Purpose:** everything for one hire, one surface, minimal navigation. This is the most important screen — build it well.

### 7.1 Header (sticky, 64px)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Senior Backend Engineer   ●Open   ~3 wks to fill  ⚠thin senior pool     │
│ 42 candidates · 5 stages                         [+ Add candidates ▾]   │
│ ┌ Pipeline │ Analytics │ Forecast │ Report │ Activity ┐   [✨ Copilot]  │  LensSwitcher
└───────────────────────────────────────────────────────────────────────┘
```

- Title (editable inline for owners) · **status pill** (Open/Paused/Filled/Closed) · **live forecast chip** (days-to-fill + top risk, color-coded, click → Forecast lens) · counts.
- **Primary action** `+ Add candidates ▾`: upload résumés (drag-drop or picker), paste, or "pull from Talent". This is the only always-visible primary action.
- **LensSwitcher** (segmented, URL-bound, `[`/`]` to move): Pipeline (default) · Analytics · Forecast · Report · Activity.
- Copilot toggle (context = this role).

### 7.2 Pipeline lens (default)

Two view modes, user-toggle (persisted per user): **Board** and **Table**. Table is default for >30 candidates.

**Board mode**
```
┌ Sourced (18) ┐ ┌ Screened (9) ┐ ┌ Interview (7)┐ ┌ Offer (2) ┐ ┌ Hired (1) ┐
│ CandidateCard│ │ CandidateCard│ │              │ │           │ │           │
│  fit 88 ●    │ │  fit 74 ●    │ │   …          │ │   …       │ │   …       │
│  ✨"top fit" │ │              │ │              │ │           │ │           │
│  [peek]      │ │              │ │              │ │           │ │           │
└──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ └───────────┘
```
- Columns = pipeline stages (configurable in Settings). Drag a card between columns → optimistic stage move + Activity entry. Column header shows count + collapse.
- **CandidateCard:** avatar · name · current title · `ScoreMeter` fit (palette) · up to 2 skill chips · optional inline AI tag ("✨ strongest fit", "⚠ entry-level for bar"). Whole card → peek; overflow menu (compare, interview pack, move, reject, add note).

**Table mode**
- Columns: checkbox · Candidate (avatar+name+title) · Fit (`ScoreMeter` bar + number, sortable) · ATS · Top skills · Stage (inline editable) · AI note · Last activity · ⋯. Sticky header, sticky Candidate column on horizontal scroll, virtualized. Row click → peek; row hover reveals quick actions.
- **Multiselect toolbar** (appears on selection): "N selected · Compare · Move to… · Reject · Shortlist · Add to… · Clear". **Compare** opens the Compare panel (§7.3) — never a route change.
- **Filter/sort bar** above table: quick filters (stage, min fit, skills, source, "AI-recommended only"), sort, and a scoped **"🔎 Search into this role"** input (semantic — §8 engine, role scope). Active filters render as removable chips.

**Inline AI (per-role nudges):** an `ApprovalCard`/`AIAnswer` strip MAY appear above the pipeline ("Copilot ranked your pipeline — top 5 highlighted. Shortlist them?"). Dismissible; obeys §4.6/§4.7.

**States:** first-run (no candidates) → "Add candidates to start" dropzone hero + "pull from Talent". Loading → table/board skeleton. Zero-results (filtered) → §4.5. Analysis-in-progress → candidates appear immediately with a "Analyzing…" shimmer on the Fit cell, resolving as scores arrive.

### 7.3 Compare (panel, not a page)

- Trigger: multiselect (2–5) → Compare. Opens a **560px peek** or a full-width overlay for ≥3.
- Layout: candidates as columns, attributes as rows (fit, ATS, key skills matched/missing vs JD, experience, availability, AI verdict). Best-in-row highlighted. Top: a `AIAnswer` executive summary ("Aarav leads on backend depth; Sneha is stronger on system design but junior on tenure"). Actions per column: advance stage, interview pack, peek. Export → PDF (Report engine).

### 7.4 Candidate peek/detail

**Route** `?candidate=:id` overlay (or `/roles/:roleId/candidates/:id` full). **480px drawer**, tabs:
- **Overview:** header (avatar, name, title, contact, source, stage control) · `ScoreMeter` fit + ATS · AI verdict (`AIAnswer`) · matched/missing skills vs JD · experience timeline · one-click "Interview pack" / "Compare" / "Advance".
- **Analysis:** full parsed breakdown — skills, experience, education, ATS factors with the deterministic scoring rationale (cited). This is read-only truth, not chat.
- **Interview:** generated question packs + scorecard template; "Generate pack" (`AIAnswer` → produces questions grouped by competency, each with what-to-listen-for); export/share.
- **Notes:** threaded notes, @mentions (teammates), rich text; optimistic; feeds Activity.
- **Activity:** per-candidate audit (stage changes, who did what, AI actions).

**States:** loading → drawer skeleton (header + 3 rows). Missing/parsed-failed → "We couldn't fully parse this résumé" + re-upload + partial data shown. Gated tab (e.g. Interview on a plan) → §4.9 inside the tab.

### 7.5 Analytics lens

Role-scoped metrics (replaces a slice of old Insights): time-in-stage funnel, pass-through rates, source effectiveness, avg fit distribution, diversity of pipeline (if enabled). Each chart is calm (line/bar, one accent), hover tooltips, and has an "✨ Explain this" that opens Copilot with the chart as context. "Export" → adds to a Report.

### 7.6 Forecast lens

Role-scoped predictions (replaces a slice of old Predictions): projected days-to-fill (with confidence band), offer-acceptance likelihood, pipeline-health risk, and drivers ("thin senior pool", "slow screening"). Each driver has a **suggested action** (Approval Object) — e.g. "Broaden sourcing → open Talent with a prefilled query". A compact **"What-if"** control lets the user tweak inputs (add N candidates, change bar) and see the delta *inline* — the full simulator lives in Ask (§9.2) but role-scoped what-if is here.

### 7.7 Report lens

- **Purpose:** generate an executive briefing for this role on demand (Reports has no nav item; it's an action here + from Home/Talent/Ask).
- Layout: a "Generate report" panel (choose audience: Hiring Manager / Exec / Detailed; date range) → `AIAnswer` assembles a grounded briefing (pipeline status, top candidates with rationale, risks, recommendation). Live preview in a `560px` document canvas. Actions: **Export PDF**, **Copy**, **Share link**, **Save to library**. Saved reports listed below with timestamp/author.
- **States:** generating → streamed section-by-section with skeletons for pending sections. AI-down → calm degrade (§4.6). Empty → "Generate your first report for this role".

### 7.8 Activity lens

Chronological role activity: stage moves, notes, approvals, reports generated, AI actions, member changes. Filter by type/person. Each entry links to its object. This is the collaboration + audit home for the role.

### 7.9 Workspace keyboard / responsive
- `[` `]` switch lens · `V` toggle board/table · `/` focus search-into-role · `C` compare selection · `A` add candidates · `J` toggle Copilot · `↑↓` move row focus, `↵` peek, `Space` select, `E` advance stage, `⌘↵` open peek in background.
- ≥xl: board shows all stages; table shows all columns. lg: board horizontal-scrolls; table hides ATS/skills behind a "+" expander. md: table only, essential columns, actions in overflow. <md: read-only pipeline list, peek is full-screen, no drag (use stage dropdown).

---

## 8. Talent — conversational discovery

**Route** `/talent`. **Purpose:** find people across the whole org pool by describing who you want.

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│  🔎 Describe who you're looking for…                    [scope▾]│  large AI input
│  e.g. "Senior Python engineers, FastAPI + fintech, remote, 5+" │
├───────────────────────────────────────────────────────────────┤
│  ✨ Found 23 candidates. Strongest matches first.  [refine ▾]  │  AIAnswer header
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Aarav S. · Sr Backend · fit 91                            │ │  ResultRow
│  │ ✨ Why: FastAPI 6y · fintech (2 roles) · remote · matches │ │   (evidence chips)
│  │    JD lines: "distributed systems", "payments"            │ │
│  │ [peek] [add to role ▾] [compare] [find similar]           │ │
│  └───────────────────────────────────────────────────────────┘ │
│  … more rows …                                                 │
└───────────────────────────────────────────────────────────────┘
```

- **Input** is a large natural-language field (answer-first, Perplexity-style), not a keyword box. `↵` searches; example prompts as ghost text + chips on empty.
- **Scope toggle:** "Whole org pool" (default here) vs a specific role (when arrived from a workspace). Same engine, different scope.
- **Results = `ResultRow`** with **evidence** (why this person: matched skills, experience, the JD/query lines satisfied) + one-line AI rationale — never a raw table. Ranked by fit with the fit palette.
- **Conversational refine:** a persistent "refine" input under the header ("only fintech", "more senior", "also knows Kubernetes") narrows results and shows what changed ("Narrowed to 9 · added filter: Kubernetes"). Refinements are chips (removable).
- **Actions per result:** peek · add to role (choose) · compare · find similar. "Find similar" reruns with that candidate as the seed.
- Selecting multiple → the same Compare panel (§7.3).

### States
- **First-run (empty pool):** "Your talent pool grows as you analyze candidates in roles. Add candidates to a role to start." + CTA to Roles.
- **Empty query:** show recent searches + suggested queries.
- **Zero-results:** "No strong matches" + the parsed filters as chips + "Ask AI to broaden" (relaxes constraints and explains what it relaxed).
- **Loading:** result-row skeletons; the AIAnswer header streams ("Searching your talent pool…").
- **AI-down:** falls back to a labeled keyword search ("Semantic search is busy — showing keyword matches") — never a dead end.

**Keyboard:** `/` focus input · `↑↓`/`↵` peek results · `R` refine. **Responsive:** rows reflow; evidence chips wrap; <md single column, actions in overflow.

---

## 9. Ask — one intelligent system

**Route** `/ask`. **Purpose:** the dedicated deep AI surface. Merges the old Agent, Knowledge, and Predictions into one. 80% of AI use is ambient (Copilot/⌘K); Ask is the 20% for exploration, org-brain browsing, simulation, and agent auditing.

### 9.1 Layout — a conversational canvas with three "lenses" the system routes between automatically

```
┌──────────────┬────────────────────────────────────────────────┐
│ Threads      │  ✨ Ask anything about your hiring              │  centered, 800px
│  · Q3 plan   │  ── past · present · future ──                  │
│  · backend   │                                                 │
│    learnings │  ┌──────────────────────────────────────────┐  │
│  ─────────   │  │ "What did we learn from last year's       │  │  AIAnswer
│ Agent (3)    │  │  backend hires?"                          │  │  (brain mode,
│  backlog     │  │ ✨ …grounded answer with citations…       │  │   citations)
│ Suggested:   │  │ [sources: 3 memories · 2 decisions]        │  │
│  · what-if…  │  │ [High confidence] [show reasoning]         │  │
│  · brain…    │  └──────────────────────────────────────────┘  │
│              │  [ask a follow-up…]                             │
└──────────────┴────────────────────────────────────────────────┘
```

- **Left column (240px):** thread history · **Agent backlog** (badge with pending count) · suggested prompts (brain + what-if examples).
- **Center (800px reading width):** the conversation. One input; the system detects intent and answers in the right **mode**, always via `AIAnswer` (§4.6). No mode tabs — the intelligence is the routing.

### 9.2 The three modes (auto-routed, one voice)

1. **Org Brain (Knowledge):** "What worked in past backend hires?", "What's our stance on remote?" → grounded answer with **citations** to memories/decisions/preferences. The knowledge **graph/timeline** appear only under "Show sources → view graph" (supporting, never the front door). A "Browse the org brain" affordance opens a searchable memory/decision explorer for power users.
2. **What-if Simulator (Predictions/Digital Twin):** "What happens to Q3 time-to-fill if I raise senior salary 15% and open 2 more reqs?" → the twin answers with **deltas, confidence bands, and drivers**, plus a compact inline control to tweak inputs and re-run. Scenario is saveable/shareable. (Role-scoped what-if also lives in the Forecast lens §7.6; org-wide lives here.)
3. **Agent (proactive):** the backlog of the agent's recommendations with full reasoning ("why did it suggest shortlisting X?"). Each is an `ApprovalCard`. Decisions here also surface in Home; this is the audit/whole-picture view.

### States
- **First-run:** Display hero "Ask anything about your hiring" + 6 example prompts (2 per mode) + "The more you use HireLens, the smarter this gets."
- **Streaming/loading:** per §4.6. Simulator shows a "Running simulation…" progress with the scenario summary.
- **AI-down:** calm degrade; saved threads/brain browsing remain available (read-only).
- **Gated:** if a mode is plan-gated (e.g. Predictions), that mode's answers show §4.9 upsell while brain/agent still work.

**Keyboard:** `⌘↵` new thread · `↑↓` threads · `/` focus input. **Responsive:** left column collapses to a threads drawer <lg; center stays 800px max; <md single-column chat.

---

## 10. Settings — organization admin

**Route** `/settings/*`. **Purpose:** everything administrative, out of the hiring hot path. Feels like Stripe settings — clean, sectioned, forms.

- **Layout:** left sub-nav (settings sections) + `800px` content forms.
- **Sections:** **Members & roles** (invite, RBAC assign, remove — audited) · **Workspaces** · **Integrations** (email/calendar/Slack/ATS/webhooks + automation rules) · **AI Gateway** (active provider, per-role models, health snapshot from `GET /ai/health`, usage/cost from `GET /ai/usage`, runtime provider switch — org-admin, audited) · **Billing & plan** · **API keys** · **Feature flags** · **Usage & audit log** · **Preferences** (theme, density, notifications) · **Pipeline stages** (configure the stages used by the Role Workspace board).
- **Patterns:** forms save on explicit "Save" with dirty-state guard; destructive actions (remove member, revoke key, delete workspace) require typed confirmation; every change writes to the audit log. Secrets (API keys, provider keys) are **write-only / masked** — show last 4, never the full value; "reveal" is not offered for stored secrets.
- **States:** gated sections show §4.9 by role (a non-admin sees a read-only or "request access" state). Loading → form skeletons.
- **AI:** minimal — the AI Gateway section visualizes health/usage (from existing endpoints) but doesn't chat.
- **Keyboard/responsive:** standard forms; sub-nav collapses to a top dropdown <lg.

---

## 11. Responsive & platform behavior

- **≥1024 (primary):** full app shell, push-Copilot ≥1440, board views, multi-column Home.
- **768–1023 (tablet/condensed):** nav auto-collapses to icon rail; Copilot is overlay; tables drop non-essential columns; board horizontal-scrolls.
- **<768 (mobile — "on the go"):** **read-review-approve**, not full editing. Home briefing + approvals (approve/dismiss with confirm), role pipeline as a list, candidate peek full-screen, Ask as single-column chat, Copilot full-screen. Bulk editing, drag-reorder, and report authoring are disabled with a "best on desktop" note. Bottom tab bar replaces the left rail: Home · Roles · Ask · Me.
- **Print:** Reports and Compare have print stylesheets (the export path).

---

## 12. Accessibility & quality bars (non-negotiable)

- **WCAG 2.2 AA:** contrast ≥4.5:1 text / 3:1 UI; never color-only (scores always show number+label; status always has an icon+text).
- **Keyboard:** every interactive element reachable/operable; visible focus ring (2px `--accent-solid`, 2px offset); logical tab order; focus trapped in modals/drawers and restored on close; skip-to-content link.
- **Screen readers:** semantic landmarks; live-regions announce streaming AI completion ("Copilot finished responding"), toasts, and async results; drag operations have keyboard equivalents (stage dropdown).
- **Motion:** honor `prefers-reduced-motion` (opacity-only, no shimmer sweep).
- **Performance budgets:** route JS ≤200KB gzip initial; LCP <2.0s on mid-tier laptop; interaction latency <100ms perceived (optimistic); virtualization for any list >100 rows; prefetch role/candidate on hover.
- **Trust:** never expose provider names, stack traces, tokens, or raw errors to end users; request IDs are the only diagnostic surfaced.

---

## 13. Component inventory (build checklist)

**Primitives:** Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Badge, Pill, Avatar, Tooltip, KBD, Skeleton, Divider, Tag/Chip (removable).
**Composites:** Card (default/interactive/ai/approval), Table/DataGrid (sortable/selectable/virtualized/sticky), Tabs, LensSwitcher, Drawer/Peek, Modal, Toast/Toaster, DropdownMenu, Popover, FilterBar, ScoreMeter (bar/ring), EmptyState (first-run/zero-results/gated), Banner (offline/gate).
**Domain:** AppShell, LeftNav, TopBar, CommandPalette, CopilotRail, AIAnswer, ApprovalCard, RiskRow, RoleCard, CandidateCard, CandidateMini, PipelineBoard, PipelineTable, ComparePanel, CandidatePeek (Overview/Analysis/Interview/Notes/Activity), TalentResultRow, AskThread, AskModeRouter, ScenarioSimulator, ReportCanvas, MetricChart, HealthPanel (settings), AuditTable.

Each MUST implement all states from §4 and be theme-aware (light/dark) and density-aware.

---

## 14. Implementation priority (build order)

Ship in slices; each slice is usable. Do **not** build all screens before shipping.

| Phase | Scope | Why first |
|---|---|---|
| **P0 — Foundations** | Design tokens, theme (light/dark), AppShell (nav+topbar), core primitives, Toast, Skeleton/Empty/Error patterns, offline banner, auth/login | Nothing renders correctly without these; the offline banner fixes the class of "dead white screen" failures. |
| **P1 — The workspace** | Roles list, **Role Workspace** (Pipeline table+board, Candidate peek Overview/Analysis, add candidates, stage moves), ScoreMeter | The core loop (evaluate a pipeline) delivers value on its own. |
| **P2 — The spine** | Command palette (⌘K), Copilot rail, AIAnswer + AI Output Contract, ApprovalCard | Turns it from an ATS into AI-native; unlocks contextual AI everywhere. |
| **P3 — Home** | Attention surface (Briefing, Decisions queue, Risks, Active roles, Activity) | Needs P1/P2 data + approval objects to be real, not a shell. |
| **P4 — Talent** | Conversational discovery, evidence rows, refine, find-similar | Sourcing beyond the current pipeline. |
| **P5 — Ask** | Unified Ask (brain + what-if + agent backlog), thread history | Deep AI surface; reuses AIAnswer/ApprovalCard from P2. |
| **P6 — Workspace lenses** | Analytics, Forecast, Report, Activity lenses; Compare panel; Interview/Notes peek tabs | Rounds out the workspace; contextual reports kill the old Reports page. |
| **P7 — Settings** | Members/roles, Integrations, AI Gateway (health/usage/switch), Billing, Keys, Flags, Audit, Preferences, Pipeline-stage config | Admin; needed for real orgs but not for the core demo. |
| **P8 — Polish** | Mobile read-review-approve, print styles, motion pass, a11y audit, perf budgets, empty-state illustrations | Premium finish. |

**MVP line:** P0–P3 is a coherent, demoable AI-native product (workspace + spine + attention). P4–P8 are additive.

---

## 15. Global keyboard shortcuts (reference)

| Key | Action | Scope |
|---|---|---|
| `⌘K` / `Ctrl+K` | Command palette (navigate/command/ask) | Global |
| `⌘J` | Toggle Copilot rail | Global |
| `G` then `H/R/T/A/S` | Go to Home/Roles/Talent/Ask/Settings | Global |
| `⌘/` | Show shortcut cheatsheet | Global |
| `Esc` | Close palette/drawer/modal (confirm if dirty) | Global |
| `[` `]` | Previous/next lens | Role Workspace |
| `V` | Toggle board/table | Pipeline |
| `/` | Focus search/filter input | List surfaces |
| `↑ ↓` | Move row/result focus | Lists |
| `↵` | Open peek | Lists |
| `Space` | Toggle row select | Tables |
| `C` | Compare selection | Pipeline/Talent |
| `A` | Add candidates | Role Workspace |
| `E` | Advance stage | Pipeline (focused row) |
| `R` / `X` | Approve / dismiss | Focused ApprovalCard |
| `⌘↵` | Secondary execute (background / new thread / bg peek) | Palette/Ask/Lists |

A `⌘/` cheatsheet modal MUST list all of the above, grouped by scope.

---

*End of specification. Changes to this document are UX decisions and require design sign-off. Engineering questions that this spec doesn't answer should be raised as spec gaps, not resolved ad hoc in code.*
