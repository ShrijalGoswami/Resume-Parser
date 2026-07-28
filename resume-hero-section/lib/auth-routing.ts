/**
 * Pure auth-routing decision for the Next proxy (middleware). Kept free of
 * `next/server` and Supabase imports so the security logic is deterministic and
 * unit-testable in isolation.
 *
 * Two coexisting apps, each with its own auth surface:
 *   - Legacy (frozen): protected → /login; authed users bounced to /dashboard.
 *   - V4 (hirelens):   protected → /auth/login; authed users bounced to /home.
 */

// The legacy app no longer owns any protected page. `LEGACY_PROTECTED` used to
// list /insights, /reports, /agent, /knowledge and /predictions — the "Classic"
// nav group — and those five pages have been removed now that Intelligence
// (Ask · Analytics · Ledger · Learning) covers the same ground. The constant and
// its guard branch went with them rather than being left as an empty array that
// reads like a live control.
//
// The earlier legacy routes were never listed here either: /campaigns, /search,
// /integrations, /admin and /dashboard are redirected to V4 by `next.config.mjs`
// and their V4 destinations are themselves in V4_PROTECTED, so an unauthenticated
// request lands on `/auth/login` rather than the legacy `/login`.
//
// `/login` itself still exists and still bounces an already-signed-in user, which
// is why this list remains.
export const LEGACY_AUTH_ROUTES = ['/login', '/signup']

// V4 (hirelens) authenticated product surfaces.
export const V4_PROTECTED = [
  '/home',
  '/roles',
  '/talent',
  '/interviews',
  '/ask',
  '/analytics',
  '/ledger',
  '/learning',
  '/notifications',
  '/settings',
  '/foundations',
]
// Only the entry auth pages bounce an already-authenticated user. /auth/callback,
// /auth/reset-password, /auth/accept-invite and /auth/forgot-password run
// mid-session (recovery / invite) and must NOT be redirected, or those flows break.
export const V4_AUTH_REDIRECT = ['/auth/login', '/auth/signup']

export type MiddlewareAction =
  | { kind: 'pass' }
  | { kind: 'redirect'; pathname: string; withNext: boolean }

/**
 * Decide what the proxy should do for a request. `withNext` means the requested
 * path should be preserved as `?next=` so sign-in can return there. V4 uses
 * precise matching (exact segment or `prefix/…`); legacy keeps its original loose
 * `startsWith` matching untouched.
 */
export function resolveMiddlewareAction(
  pathname: string,
  isAuthenticated: boolean,
): MiddlewareAction {
  const matchExact = (prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const matchLoose = (prefixes: string[]) => prefixes.some((p) => pathname.startsWith(p))

  // V4
  if (matchExact(V4_PROTECTED) && !isAuthenticated) {
    return { kind: 'redirect', pathname: '/auth/login', withNext: true }
  }
  if (matchExact(V4_AUTH_REDIRECT) && isAuthenticated) {
    return { kind: 'redirect', pathname: '/home', withNext: false }
  }

  // Legacy — only the sign-in surface is left to handle.
  if (matchLoose(LEGACY_AUTH_ROUTES) && isAuthenticated) {
    return { kind: 'redirect', pathname: '/dashboard', withNext: false }
  }

  return { kind: 'pass' }
}
