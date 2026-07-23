# HireLens V4 — Final Architecture

The state of the frontend architecture after the V4 migration. Complements the
backend-focused `ARCHITECTURE.md` / `AI_ARCHITECTURE.md`.

## Route structure & groups

Root layout (`app/layout.tsx`) is a minimal document skeleton; each **route group**
supplies its own layout, providers, and chrome.

```
app/
├─ (legacy)/        HireLens V1 — FROZEN. Owns `/` until cutover.
├─ (hirelens)/      V4 authenticated product. Mounts HireLensProviders + the `.hl` shell.
│   ├─ home/                         → Inbox / Arrival
│   ├─ roles/[roleId]/               → Role Workspace (lenses via ?lens=)
│   │   ├─ candidates/[candidateId]/ → Deep Review (Dossier)
│   │   └─ decisions/[decisionId]/   → Decision Intelligence (memo)
│   ├─ ledger/                       → Decision Ledger
│   ├─ talent/                       → Talent discovery
│   ├─ learning/                     → Deferred placeholder
│   ├─ settings/[[...slug]]/         → Settings
│   ├─ ask/  foundations/            → Ask · dev showcase
├─ auth/            V4 authentication (`/auth/login|signup|forgot|reset|accept|callback`)
└─ (marketing)/     Public landing — isolated. `welcome/` (→ `/` at cutover).
```

Two nav targets are currently unbuilt: `/roles` (index) and `/analytics` — see `PRODUCTION_GAPS.md` (P0).

## Design system

**Optical Clarity** — scoped under `.hl` in `app/globals.css`:
- **Type:** Fraunces (editorial display), Inter (UI), JetBrains Mono (data/scores/IDs). Utilities: `.hl-display-*`, `.hl-body*`, `.hl-mono`, `font-hl-*`.
- **Color tokens:** `--hl-*` (canvas/subtle/muted, borders, fg, accent Iris `#5B5BD6`), **Focus scale** (`--hl-score-*`, shared via `components/hirelens/lib/focus-scale.ts`), **Prism** AI gradient, editorial (Deep Ink) tokens. Light + first-class dark.
- **Signatures:** hairline-not-shadow depth, Prism = AI-only, Rack Focus (dim+desaturate+blur) on decision objects, Newsreader/Fraunces rationed to one editorial moment per surface.

## Marketing separation (isolation)

The `(marketing)` group mounts **no** `.hl` shell, providers, or auth. It uses a
separate `mkt-*` palette (added to `@theme` in `globals.css`, applied only under the
marketing group) and reuses the global font utilities. This guarantees the dark,
cinematic marketing language cannot leak into the authenticated product, and the
product's Optical Clarity cannot bleed into marketing. Marketing is a single scrolling
editorial page with smooth-scroll anchor nav (`components/marketing/`).

## Shared components / primitives

- **Shell:** `AppShell`, `LeftNav` (Instrument Rail), `TopBar`, `WorkspaceSwitcher`, `CommandPalette`, `ShellProvider` (`useShell`).
- **UI primitives:** `Button`, `Drawer` (rack-focus), `Dialog`, `Tabs`, `Avatar`, `Kbd`, `Badge`, toasts, `EmptyState`/`ErrorState`/`LoadingScreen`.
- **Domain:** `AIAnswer` (the single AI render surface), `ScoreMeter`, `ConfidencePill`, `ApprovalCard`.
- **Cross-feature shared:** `lib/focus-scale.ts` (Focus band), `decision-intelligence/confidence-chip.tsx` (`ConfidenceChip`, reused by the Ledger).
- Extraction principle: shared primitives are lifted whenever duplication appears (Focus-scale was lifted out of Triage into `lib/`).

## Data flow

- **React Query** over shared `@/services/*` (reused as-is). Hooks live in `components/hirelens/lib/api/*` (`hooks.ts`, `workspace.ts`, `candidate.ts`, `ask.ts`, `talent.ts`, `settings.ts`, `use-session.ts`).
- **Auth/session:** Supabase browser client; `useSession` gates every authenticated surface.
- **Normalization:** candidates flow through `lib/candidate.ts` `toRow` (`CandidateRow`); analysis is the verbatim `CandidateResult`.
- **Mutations:** optimistic with rollback (`useUpdateStage`, `useUpdateRecommendation`, notes).

## AI architecture (frontend view)

- **Recommendations** (agent): `usePendingRecommendations`, `useAllRecommendations`, `useUpdateRecommendation`. These power the Inbox, Decision Intelligence memo, and the Ledger (resolved recommendations).
- **Candidate analysis:** `CandidateResult` (fit, ATS, strengths/weaknesses, skills, recommendation, confidence, interview questions, score components) — powers Triage grouping, Deep Review, and DI hiring signals.
- **Brief:** `useGenerateBrief` (on-demand agent scan) → the Inbox headline/summary.
- **The single AI render** is `AIAnswer` (prism edge + sources + collapsible reasoning). AI is presented *around* the document, never dominating it.

## Backend interaction

- **Supabase:** auth, RLS-isolated per-workspace data (campaigns/candidates/notes/settings), storage (résumés).
- **FastAPI AI backend** (`NEXT_PUBLIC_API_URL`): recommendations, candidate analysis, ask/agent, activity, AI gateway/usage. The AI orchestrator is single-path and was **not modified** by this migration.

## Future extension points

- **Outcome-tracking backend** → unlocks Learning, Ledger outcomes, regret analysis (all UI-deferred today).
- **Signal-level confidence** → the `RecommendationSignal[]` model + conditional Confidence panel populate without redesign.
- **Source-conflict engine** → the `EvidenceConflict[]` renderer in Deep Review lights up (empty today).
- **Bulk-stage / get-by-id endpoints** → replace client list-scans and per-item mutation loops.
- **`/inbox`, `/roles` index, `/analytics`** routes slot into the existing nav taxonomy.
