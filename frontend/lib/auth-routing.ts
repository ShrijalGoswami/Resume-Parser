/**
 * Pure auth-routing decision for the Next proxy (middleware). Kept free of
 * `next/server` and Supabase imports so the security logic is deterministic and
 * unit-testable in isolation.
 *
 * ONE app, one auth surface: protected → /auth/login; authed users bounced
 * to /today.
 *
 * Phase 9.1 removed the legacy group. `LEGACY_AUTH_ROUTES` and its guard branch
 * went with it: the frozen v1.0 `/login` page was the last thing either
 * referenced, and `/login` and `/signup` are now permanent redirects to their
 * `/auth/*` equivalents in `next.config.mjs`. A redirect needs no session guard
 * — it never renders — so leaving an empty array here would have read like a
 * live control over a surface that no longer exists.
 */

// The authenticated product surfaces. `lib/analytics/redact.ts` derives
// `isPrivatePath` from this list, so a route added here is redacted from
// analytics automatically; one omitted leaks its URL.
export const V4_PROTECTED = [
  '/today',
  '/jobs',
  '/candidates',
  '/decisions',
  '/interviews',
  '/ask',
  '/reports',
  '/ai-audit',
  '/notifications',
  '/settings',
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
 * path should be preserved as `?next=` so sign-in can return there. Matching is
 * precise — an exact segment or `prefix/…` — so `/todays-report` is not treated
 * as `/today`.
 */
export function resolveMiddlewareAction(
  pathname: string,
  isAuthenticated: boolean,
): MiddlewareAction {
  const matchExact = (prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (matchExact(V4_PROTECTED) && !isAuthenticated) {
    return { kind: 'redirect', pathname: '/auth/login', withNext: true }
  }
  if (matchExact(V4_AUTH_REDIRECT) && isAuthenticated) {
    return { kind: 'redirect', pathname: '/today', withNext: false }
  }

  return { kind: 'pass' }
}
