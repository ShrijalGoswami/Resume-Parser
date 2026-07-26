/**
 * Pure auth-routing decision for the Next proxy (middleware). Kept free of
 * `next/server` and Supabase imports so the security logic is deterministic and
 * unit-testable in isolation.
 *
 * Two coexisting apps, each with its own auth surface:
 *   - Legacy (frozen): protected → /login; authed users bounced to /dashboard.
 *   - V4 (hirelens):   protected → /auth/login; authed users bounced to /home.
 */

// Legacy app (frozen) — behavior preserved for routes it still owns.
//
// Routes whose V4 replacement is live are deliberately NOT listed here. They are
// redirected to V4 by `next.config.mjs`, and their V4 destination is itself in
// V4_PROTECTED — so an unauthenticated request lands on `/auth/login` (the V4
// sign-in) rather than being bounced to the legacy `/login` for a page the user
// will never actually see. Removed on migration: /campaigns, /search,
// /integrations, /admin, /dashboard.
export const LEGACY_PROTECTED = [
  '/insights',
  '/reports',
  '/agent',
  '/knowledge',
  '/predictions',
]
export const LEGACY_AUTH_ROUTES = ['/login', '/signup']

// V4 (hirelens) authenticated product surfaces.
export const V4_PROTECTED = [
  '/home',
  '/roles',
  '/talent',
  '/ask',
  '/ledger',
  '/learning',
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

  // Legacy (behavior preserved)
  if (matchLoose(LEGACY_PROTECTED) && !isAuthenticated) {
    return { kind: 'redirect', pathname: '/login', withNext: true }
  }
  if (matchLoose(LEGACY_AUTH_ROUTES) && isAuthenticated) {
    return { kind: 'redirect', pathname: '/dashboard', withNext: false }
  }

  return { kind: 'pass' }
}
