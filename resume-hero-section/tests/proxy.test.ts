import { describe, it, expect } from 'vitest'
import { resolveMiddlewareAction } from '../lib/auth-routing'

/**
 * Security-critical: server-side route protection for the V4 app. These test the
 * middleware's pure decision (resolveMiddlewareAction); proxy.ts wires it to
 * Supabase + Next, and the decision is what determines who can reach what.
 */
describe('resolveMiddlewareAction — V4 route protection', () => {
  it('unauthenticated → protected V4 route redirects to /auth/login (preserving next)', () => {
    expect(resolveMiddlewareAction('/home', false)).toEqual({
      kind: 'redirect',
      pathname: '/auth/login',
      withNext: true,
    })
    expect(resolveMiddlewareAction('/roles/abc-123', false)).toMatchObject({
      kind: 'redirect',
      pathname: '/auth/login',
    })
    expect(resolveMiddlewareAction('/ledger', false)).toMatchObject({ pathname: '/auth/login' })
    expect(resolveMiddlewareAction('/settings/profile', false)).toMatchObject({
      pathname: '/auth/login',
    })
  })

  it('authenticated → protected V4 route passes through', () => {
    expect(resolveMiddlewareAction('/home', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/roles/abc-123', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/settings/profile', true)).toEqual({ kind: 'pass' })
  })

  it('authenticated → /auth/login or /auth/signup redirects to /home', () => {
    expect(resolveMiddlewareAction('/auth/login', true)).toEqual({
      kind: 'redirect',
      pathname: '/home',
      withNext: false,
    })
    expect(resolveMiddlewareAction('/auth/signup', true)).toEqual({
      kind: 'redirect',
      pathname: '/home',
      withNext: false,
    })
  })

  it('does NOT bounce authenticated users out of mid-session auth flows', () => {
    // These carry a recovery/invite session; redirecting would break the flow.
    expect(resolveMiddlewareAction('/auth/reset-password', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/auth/accept-invite', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/auth/forgot-password', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/auth/callback', true)).toEqual({ kind: 'pass' })
  })

  it('public routes pass regardless of auth state', () => {
    expect(resolveMiddlewareAction('/', false)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/welcome', false)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/auth/login', false)).toEqual({ kind: 'pass' })
  })

  it('still guards the legacy routes it owns', () => {
    // Legacy surfaces with no complete V4 replacement — reachable via the
    // "Classic" nav group, so the legacy guard must still apply.
    for (const route of ['/insights', '/reports', '/agent', '/knowledge', '/predictions']) {
      expect(resolveMiddlewareAction(route, false)).toEqual({
        kind: 'redirect',
        pathname: '/login',
        withNext: true,
      })
      expect(resolveMiddlewareAction(route, true)).toEqual({ kind: 'pass' })
    }
    expect(resolveMiddlewareAction('/login', true)).toEqual({
      kind: 'redirect',
      pathname: '/dashboard',
      withNext: false,
    })
  })

  it('lets migrated legacy routes fall through to their next.config redirect', () => {
    // /dashboard, /campaigns, /search, /integrations and /admin are redirected to
    // V4 by next.config. They are deliberately absent from LEGACY_PROTECTED so an
    // unauthenticated request is not bounced to the legacy /login for a page it
    // will never render.
    for (const route of ['/dashboard', '/campaigns/x', '/search', '/integrations', '/admin']) {
      expect(resolveMiddlewareAction(route, false)).toEqual({ kind: 'pass' })
    }
  })

  it('protects the V4 destination of every migrated legacy route', () => {
    // This is what actually keeps the migrated surfaces private: the legacy path
    // redirects to V4, and the V4 path is guarded. If a destination ever drops
    // out of V4_PROTECTED, the old URL becomes an unauthenticated way in.
    const destinations = ['/home', '/roles', '/talent', '/settings', '/settings/members']
    for (const route of destinations) {
      expect(resolveMiddlewareAction(route, false)).toMatchObject({
        kind: 'redirect',
        pathname: '/auth/login',
      })
    }
  })

  it('guards the surfaces added after the V4 migration', () => {
    for (const route of ['/analytics', '/interviews', '/notifications']) {
      expect(resolveMiddlewareAction(route, false)).toEqual({
        kind: 'redirect',
        pathname: '/auth/login',
        withNext: true,
      })
      expect(resolveMiddlewareAction(route, true)).toEqual({ kind: 'pass' })
    }
  })
})
