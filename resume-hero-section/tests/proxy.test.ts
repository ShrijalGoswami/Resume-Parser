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

  it('preserves legacy behavior unchanged', () => {
    expect(resolveMiddlewareAction('/dashboard', false)).toEqual({
      kind: 'redirect',
      pathname: '/login',
      withNext: true,
    })
    expect(resolveMiddlewareAction('/campaigns/x', false)).toMatchObject({ pathname: '/login' })
    expect(resolveMiddlewareAction('/dashboard', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/login', true)).toEqual({
      kind: 'redirect',
      pathname: '/dashboard',
      withNext: false,
    })
  })
})
