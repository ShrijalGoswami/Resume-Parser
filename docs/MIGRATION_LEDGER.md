# Hirevo V4 — Migration Ledger

Running record of deferred and cross-phase work. Deferred items live **here** (and
in each Phase Completion Report) — never as inline `TODO`s in production code.

Status: ☐ open · ◑ in progress · ☑ done

## Cross-phase integrations
| Item | Origin | Target | Status |
|---|---|---|---|
| Contextual AI panel — rebuild from `Drawer` + `AIAnswer` (⌘K is the entry) | P1 | consuming surface | ☐ |
| Grouped nav + mono captions; V4 item set (Inbox / Analytics / Ledger / Learning) | P1 | P4 / P8 / P9 | ☐ |
| Sidebar hover key-hints + `g`-sequence keyboard layer | P1 | with grouped nav | ☐ |
| Workspace switcher — role tag, chevron, switch popover | P1 | org-data phase | ☐ |
| Context-aware top-bar action slot + palette scope | P1 | first consuming surface | ☐ |
| Keyboard cheatsheet (`?`) | P1 | after keyboard layer | ☐ |
| Notifications feed — grouped-by-day, ✨ AI rows | P1 | notifications-data phase | ☐ |
| `AuthProvider` / `useSession` consolidation | P2 | dedicated pass | ☐ |
| Legacy `/login` removal → V4 `/auth/login` canonical | P2 | cutover | ☐ |

## P2 · Authentication — remaining increments
| Item | Status |
|---|---|
| Forgot-password + reset-password screens | ☑ (fully functional — reset link completes via `/auth/callback`) |
| Magic-link — passwordless sign-in on the login email step (`signInWithOtp`, verifies via `/auth/callback`) | ☑ (fully functional) |
| Email verification — signup confirmation routes through `/auth/callback` (`emailRedirectTo`) + resend action | ☑ (fully functional) |
| Accept-invite — acceptance surface `/auth/accept-invite` (set name + password on the invite session) | ☑ (surface complete) |
| Accept-invite backend wiring — invite email `redirect_to` must target `/auth/callback?next=/auth/accept-invite` (issuance is `inviteMember` → `/org/members`; backend-owned) | ☐ (cross-phase dependency) |
| SSO / OAuth / enterprise providers | ☐ (deferred — **no frozen design exists**; the RC has only the "SSO" trust-whisper word. Do not implement until a UX/design spec is frozen. "If the design does not exist, do not design it during implementation.") |
| 2FA shells | ☐ (deferred — no frozen design) |
| Resend confirmation from the login password step when Supabase returns "Email not confirmed" | ☐ (optional) |
| `/auth/callback` route handler (`exchangeCodeForSession`) — completes email-link / SSO flows | ☑ |
| ~~`middleware.ts` — session refresh + route protection~~ | ✗ **REMOVED** — Next 16 renamed this convention to `proxy` and the frozen v1.0 baseline **already ships `proxy.ts`**; two files = boot-time unhandled rejection. My P2 audit missed the existing `proxy.ts`, so the increment never ran. Removed `middleware.ts` + `lib/supabase/middleware.ts`. |
| V4 route protection — fold into the single allowed `proxy.ts` (add V4 protected prefixes → `/auth/login`) | ☐ (**decision pending** — edits frozen v1.0 `proxy.ts`; forced by Next 16's one-proxy-file rule, no adapter possible) |
| Auth polish — redirect authed users away from `/auth/login`·`signup`; retire now-redundant client-side session gates on V4 surfaces; those gates' "Sign in" links still target legacy `/login` (fold repoint→`/auth/login` into the retire-gates decision) | ☐ (optional) |
| V4 logout affordance — `signOut` + redirect to `/auth/login` (middleware handles the rest); no V4 logout exists yet | ☐ |
| Living Product Window — rotation + real product moments (Inbox · Triage · Deep Review · Regret · Ledger) | ☐ |
| Auth Storybook stories — `AuthField`, `AuthSplit` | ☐ |
| Integration + verification | ◑ (`tsc`/`eslint` clean, but a **runtime** server run revealed the `middleware.ts`↔`proxy.ts` conflict static checks missed; V4 route protection still owed pending the `proxy.ts` decision) |

## Resolved
| Item | Resolved in |
|---|---|
| Always-Ink editorial panel color literals → `--hl-editorial-*` tokens | P2 (refinement) |
