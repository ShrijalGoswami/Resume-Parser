# Hirevo V4 — Production Gaps

All remaining work, prioritized. **P0** = must fix before public launch · **P1** =
soon after launch · **P2** = future roadmap (mostly backend-dependent).

**Revised 12 Aug 2026** after a launch-readiness audit that checked each row
against the code. Every P0 in the previous revision was already done — the
`/roles` index, `/analytics`, the `/welcome → /` cutover, the `/foundations`
gate. They are recorded as closed below rather than deleted, so the history of
what was once blocking stays legible.

## P0 — Must fix before launch

| Gap | Status |
|---|---|
| Dead nav: **Roles** | **Closed.** `app/(hirelens)/roles/page.tsx` exists. |
| Dead nav: **Analytics** | **Closed.** `app/(hirelens)/analytics/page.tsx` exists. |
| **`/welcome → /` cutover** | **Closed.** Marketing owns `/`; no `/welcome` remains. |
| **Env vars** | **Closed in code** — the proxy throws in production rather than serving protected routes unauthenticated. Verifying the deployed project is a human step (see `LAUNCH_CHECKLIST.md` §3). |
| **Dev showcase route** `/foundations` | **Closed.** Proxy-guarded and crawl-disallowed. Still ships to signed-in users; removal is a product call. |
| **No frontend error monitoring** | **OPEN — the one genuine P0 left.** Nothing reports a client-side exception in production. Needs a provider and a DSN, plus PII scrubbing so résumé and candidate data never reach it. |

## P1 — Soon after launch

| Gap | Notes |
|---|---|
| Legal entity details | Policies publish, but `lib/legal.ts` holds unconfirmed entity fields behind `LEGAL_ENTITY_CONFIRMED`. Needs the real company address and grievance officer. |
| Landing heading outline | `h1 → h3` skip in the hero — a candidate name inside a decorative product mock sits in the heading outline. Demote it out of the outline; do not renumber the real section headings. |
| Authenticated-surface a11y/responsive audit | The 12 Aug audit covered only the public surface. The product shell, Candidate Drawer, Compare, Copilot and Interview workspace have not been checked at mobile widths with a real session. |
| Dead component: `components/marketing/NeuralBackground.tsx` | Imported nowhere — `app/(marketing)/layout.tsx` mentions it only in a comment explaining its removal. ~500 lines of unreferenced animation code that still has to pass lint and type-check. Delete or keep deliberately. |
| Inbox canonical route | `/home` confirmed; revisit only if the IA changes. |
| Auth completeness | 2FA, dedicated SSO handoff screen, accept-invite personalization. |
| List-scan reads | Deep Review / Decision Intelligence / Ledger scan `useAllRecommendations`; add a get-by-id endpoint. |
| Ledger pagination | Currently client-side; add server pagination when volume grows. |
| Bulk actions | Triage bulk = per-candidate `updateStage` loop; add a bulk-stage endpoint (atomicity). |

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
- TypeScript, **ESLint** and the production build are all clean as of 12 Aug
  2026. The previous revision recorded four `react-hooks/refs` errors in
  `NeuralBackground.tsx` as deliberate debt; they were fixed in the launch pass,
  along with a fifth in `components/hirelens/billing/checkout-provider.tsx` that
  the earlier note did not mention.
- Crawl safety is enforced by a `noindex, nofollow` header on the product route
  group, not by `robots.txt` alone — `lib/seo/site.ts` is explicit that the
  disallow list is a courtesy to crawlers and not a control.
- Analytics page-view URLs pass through `lib/analytics/redact.ts`, so campaign
  and candidate identifiers and talent-search terms do not reach the provider.
- The frozen legacy app (`(legacy)`, `components/hero/*`, `/login`) is
  intentional and untouched.
