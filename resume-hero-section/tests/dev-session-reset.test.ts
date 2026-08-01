import { describe, it, expect } from 'vitest'
import {
  DEV_BOOT_COOKIE,
  getDevBootId,
  isDevSessionResetEnabled,
  isStaleDevRequest,
  isSupabaseSessionCookie,
} from '../lib/dev-session-reset'

/**
 * The dev-only session reset. The load-bearing assertion here is the production
 * one: if `isDevSessionResetEnabled` ever returns true under NODE_ENV=production,
 * the proxy starts expiring real users' sessions.
 */
describe('dev session reset — environment gating', () => {
  it('is DISABLED in production, whatever else is set', () => {
    expect(isDevSessionResetEnabled({ NODE_ENV: 'production' })).toBe(false)
    expect(
      isDevSessionResetEnabled({ NODE_ENV: 'production', HL_DEV_PERSIST_SESSION: '0' }),
    ).toBe(false)
  })

  it('is enabled in development and test', () => {
    expect(isDevSessionResetEnabled({ NODE_ENV: 'development' })).toBe(true)
    expect(isDevSessionResetEnabled({ NODE_ENV: 'test' })).toBe(true)
  })

  it('can be opted out of for a dev run', () => {
    expect(
      isDevSessionResetEnabled({ NODE_ENV: 'development', HL_DEV_PERSIST_SESSION: '1' }),
    ).toBe(false)
  })
})

describe('dev session reset — boot id', () => {
  it('is stable within a process', () => {
    expect(getDevBootId()).toBe(getDevBootId())
  })

  it('treats a missing or foreign boot cookie as stale, and the current one as fresh', () => {
    expect(isStaleDevRequest(undefined)).toBe(true)
    expect(isStaleDevRequest('boot-id-from-a-previous-server-run')).toBe(true)
    expect(isStaleDevRequest(getDevBootId())).toBe(false)
  })
})

describe('dev session reset — cookie matching', () => {
  it('matches Supabase session cookies including chunks', () => {
    expect(isSupabaseSessionCookie('sb-vmqhabcdef-auth-token')).toBe(true)
    expect(isSupabaseSessionCookie('sb-vmqhabcdef-auth-token.0')).toBe(true)
    expect(isSupabaseSessionCookie('sb-vmqhabcdef-auth-token.1')).toBe(true)
  })

  it('leaves the PKCE verifier alone', () => {
    // Clearing this would break a magic-link/OAuth callback that lands as the
    // first request after a restart.
    expect(isSupabaseSessionCookie('sb-vmqhabcdef-auth-token-code-verifier')).toBe(false)
  })

  it('leaves unrelated cookies alone', () => {
    for (const name of [DEV_BOOT_COOKIE, 'hl-theme', 'sb-auth-token', 'session']) {
      expect(isSupabaseSessionCookie(name)).toBe(false)
    }
  })
})
