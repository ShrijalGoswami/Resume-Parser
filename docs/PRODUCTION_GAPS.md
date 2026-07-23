# HireLens V4 — Production Gaps

All remaining work, prioritized. **P0** = must fix before public launch · **P1** =
soon after launch · **P2** = future roadmap (mostly backend-dependent).

## P0 — Must fix before launch

| Gap | Where | Action |
|---|---|---|
| Dead nav: **Roles** | `Roles → /roles` (only `/roles/[roleId]` exists) | Build a `/roles` index, or hide/relabel the nav item |
| Dead nav: **Analytics** | `Analytics → /analytics` (no route) | Build `/analytics`, or hide the nav item |
| **`/welcome → /` cutover** | legacy owns `/` | Retire/repoint legacy landing; move marketing to root (routing only — no component changes) |
| **Env vars** | Supabase URL/anon key, `NEXT_PUBLIC_API_URL` | Verify set in prod; confirm RLS enabled |
| **Dev showcase route** | `/foundations` | Remove or gate for production |

## P1 — Soon after launch

| Gap | Notes |
|---|---|
| Legal pages | Privacy / Terms / Security (marketing footer omits links until they exist) |
| SEO / sitemap / robots / OG images | `robots.ts`, `sitemap.ts`, OG image for marketing; audit product metadata |
| Monitoring | Error monitoring (frontend + AI backend), uptime/health, 429/provider alerts |
| Analytics + consent | `@vercel/analytics` mounted; confirm consent + prod project |
| Inbox canonical route | Decide `/home` vs `/inbox` (nav + `inbox-meta`) |
| Auth completeness | 2FA, dedicated SSO handoff screen, accept-invite personalization |
| List-scan reads | Deep Review / Decision Intelligence / Ledger scan `useAllRecommendations`; add a get-by-id endpoint |
| Ledger pagination | Currently client-side; add server pagination when volume grows |
| Bulk actions | Triage bulk = per-candidate `updateStage` loop; add a bulk-stage endpoint (atomicity) |

## P2 — Future roadmap (backend-dependent)

| Capability | Unlocks | Frontend readiness |
|---|---|---|
| **Outcome-tracking backend** | Learning / Calibration Loop; Ledger outcomes; regret analysis | Learning placeholder in place; Ledger/DI omit outcome UI by design |
| **Source-conflict engine** | Evidence conflicts in Deep Review | `EvidenceConflict[]` renderer ready (empty today) |
| **Signal-level confidence** | Rich Confidence panel in Decision Intelligence | `RecommendationSignal[]` model + conditional panel ready |
| **Enterprise SSO / MFA** | Real SSO handoff, 2FA | `signInWithSSO` wired (degrades gracefully); MFA screen deferred |
| **Ledger-scoped AI retrieval** | "Ask the ledger" | Intentionally omitted (no fabricated query surface) |
| **Recommendation decider field** | "By" attribution in the Ledger | Omitted (no fabricated decision-maker) |

## Notes
- No `TODO`/`FIXME`/`HACK` markers remain in the migrated code.
- TypeScript, ESLint, and production build are clean across the repo.
- The frozen legacy app (`(legacy)`, `components/hero/*`, `/login`) is intentional and untouched.
