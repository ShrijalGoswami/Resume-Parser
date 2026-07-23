# HireLens V4 — Release Notes

HireLens V4 is a ground-up rebuild of the product experience around a single idea:
**bring the few candidates who matter into focus, and help a human make — and defend —
the decision.** It coexists with the frozen V1 app until cutover.

---

## Major changes, V1 → V4

| Area | V1 | V4 |
|---|---|---|
| Mental model | Resume parser / search | Decision pipeline: Inbox → Triage → Deep Review → Decision Intelligence → Decision Ledger |
| Design language | Ad-hoc | "Optical Clarity" design system (`.hl` scope): Fraunces / Inter / JetBrains, Focus scale, Prism AI hairline, hairline-not-shadow depth, dark first-class |
| Shell | — | Persistent Instrument Rail + ⌘K command palette + context-aware top bar |
| Auth | Legacy | Split-Editorial `/auth/*` on Supabase (password, magic link, SSO-ready, reset, invite) |
| Marketing | Legacy hero | Standalone, isolated editorial landing (`/welcome`) |
| Truthfulness | — | Strict truthful-AI contract (see `TRUTHFUL_AI.md`) |

## New workspaces & surfaces
- **Inbox / Arrival** (`/home`) — a morning briefing; a navigational decision launcher (not where work is completed).
- **Role Workspace lenses** — Pipeline · **Triage** (new) · Analytics · Activity, at `/roles/[roleId]`.
- **Triage** — keyboard-driven prioritization (A/R/S/D) with hybrid AI grouping and an executive **Bulk Confirm** rack-focus review.
- **Deep Review (Dossier)** — full-page editorial candidate decision surface (`/roles/[id]/candidates/[cid]`).
- **Decision Intelligence** — the Approve/Override memo for an AI recommendation (`/roles/[id]/decisions/[did]`).
- **Decision Ledger** (`/ledger`) — immutable audit journal of resolved recommendations.
- **Talent** — AI-native candidate discovery (verified into V4).
- **Settings** — full account/org/platform settings (verified into V4).

## AI improvements
- Single-path AI orchestrator preserved; all recommendation/analysis/brief calls flow through the shared services.
- **Confidence is honest** — low confidence renders neutral gray, never red; shown, never hidden.
- **Evidence-first** — Deep Review reads a candidate as evidence with sources, not a bare score.
- **Human-approved** — Decision Intelligence offers a recommendation; a person approves or overrides; every decision is reversible and logged.
- **Hybrid Triage grouping** — the AI's `hire` label gated by a score sanity check; contradictions flow to a human ("NEEDS YOU").

## UX improvements
- Consistent shell, breadcrumbs, and editorial page headers across every surface.
- Rack-focus drawer signature for peeks and bulk review.
- Keyboard-forward workflows (⌘K, Triage A/R/S/D + undo, Deep Review A/S/R, go-to chords).
- Quick-peek Candidate Drawer vs. long-form Dossier — a permanent separation of "who is this?" from "should I trust the recommendation?".

## Breaking changes
- **Nav taxonomy** changed to WORKSPACE (Inbox · Roles · Talent · Analytics) + INTELLIGENCE (Ledger · Learning). "Home" is now **Inbox**; "Ask" left the rail (now ⌘K + contextual).
- **Inline approve/dismiss removed from Home** — relocated to Decision Intelligence (the Inbox is a launcher).
- **Sign-in route** for V4 is `/auth/login` (the legacy `/login` remains only in the frozen legacy app).
- Marketing will move `/welcome → /` at cutover (legacy currently owns `/`).

## Deferred features (not shipped; not "incomplete")
- **Learning / Calibration Loop** — requires outcome-tracking + a calibration backend that does not exist. Ships as an honest "future release" state at `/learning`.
- **Evidence conflicts** (Deep Review), **rich confidence decomposition** (Decision Intelligence), **outcome/regret/90-day** (Ledger) — UI is future-ready/omitted; awaits backend intelligence.
- **Auth:** 2FA, dedicated SSO handoff screen, accept-invite personalization.

See `PRODUCTION_GAPS.md` for the prioritized remaining work and `ARCHITECTURE_FINAL.md` for the final structure.
