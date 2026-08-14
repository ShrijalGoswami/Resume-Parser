import { describe, it, expect } from 'vitest'

import {
  isPrivatePath,
  redactAnalyticsUrl,
  redactPathname,
} from '../lib/analytics/redact'
import { V4_PROTECTED } from '../lib/auth-routing'

/**
 * Analytics redaction.
 *
 * The defect this guards against was silent and durable: `<Analytics />` sent
 * the raw URL of every page view, so opening a candidate handed a third party
 * the real primary keys of a real campaign and a real candidate — the same keys
 * every time, which is what turns a page-view stream into a picture of who a
 * customer is screening.
 *
 * These tests assert both halves of the fix, because either one alone is a
 * regression: the identifiers must be gone, AND the route shape must survive.
 * A redactor that flattened everything to `/` would pass "no UUIDs leaked" and
 * make analytics worthless, which is how a privacy fix gets reverted.
 */

const CAMPAIGN = '8f14e45f-ceea-4c2b-9b1f-3d2a7e5c4b60'
const CANDIDATE = 'c9b1a2d3-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

describe('redactPathname', () => {
  it('removes a campaign (role) identifier', () => {
    const out = redactPathname(`/roles/${CAMPAIGN}`)
    expect(out).not.toContain(CAMPAIGN)
    expect(out).toBe('/roles/[roleId]')
  })

  it('removes a candidate identifier', () => {
    const out = redactPathname(`/roles/${CAMPAIGN}/candidates/${CANDIDATE}`)
    expect(out).not.toContain(CANDIDATE)
    expect(out).toBe('/roles/[roleId]/candidates/[candidateId]')
  })

  it('removes both identifiers from a decision URL', () => {
    const out = redactPathname(`/roles/${CAMPAIGN}/decisions/${CANDIDATE}`)
    expect(out).not.toContain(CAMPAIGN)
    expect(out).not.toContain(CANDIDATE)
    expect(out).toBe('/roles/[roleId]/decisions/[decisionId]')
  })

  it('keeps the route structure distinguishable', () => {
    // The point of naming each placeholder after its collection: these three
    // journeys stay three distinct rows in an analytics report. A generic
    // `[id]` would still have passed every assertion above.
    const role = redactPathname(`/roles/${CAMPAIGN}`)
    const candidate = redactPathname(`/roles/${CAMPAIGN}/candidates/${CANDIDATE}`)
    const decision = redactPathname(`/roles/${CAMPAIGN}/decisions/${CANDIDATE}`)
    expect(new Set([role, candidate, decision]).size).toBe(3)
  })

  it('leaves static product routes untouched', () => {
    for (const path of ['/home', '/talent', '/ledger', '/settings/billing']) {
      expect(redactPathname(path)).toBe(path)
    }
  })

  it('leaves public marketing and policy routes untouched', () => {
    for (const path of ['/', '/pricing', '/contact', '/terms', '/privacy', '/refunds']) {
      expect(redactPathname(path)).toBe(path)
    }
  })

  it('does not mistake an ordinary route word for an identifier', () => {
    // The opaque-token rule has a 16-character floor precisely so real segments
    // are never redacted. `notifications` is the longest word in the route
    // table and must survive.
    expect(redactPathname('/notifications')).toBe('/notifications')
    expect(redactPathname('/interviews')).toBe('/interviews')
  })

  it('redacts numeric and other opaque identifiers, not only UUIDs', () => {
    expect(redactPathname('/roles/48291')).toBe('/roles/[roleId]')
    expect(redactPathname('/roles/pay_RxKq81mNvZbT4a')).toBe('/roles/[roleId]')
  })
})

describe('redactAnalyticsUrl', () => {
  it('strips identifiers from a full URL and keeps the origin', () => {
    const out = redactAnalyticsUrl(
      `https://hirelens.app/roles/${CAMPAIGN}/candidates/${CANDIDATE}`,
    )
    expect(out).toBe('https://hirelens.app/roles/[roleId]/candidates/[candidateId]')
    expect(out).not.toContain(CAMPAIGN)
    expect(out).not.toContain(CANDIDATE)
  })

  it('drops the query string on private routes', () => {
    // Talent search puts its terms in the URL. A recruiter searching a person
    // by name is more identifying than the UUID this module exists to remove,
    // so the query does not survive on the product surface.
    const out = redactAnalyticsUrl('https://hirelens.app/talent?q=Jane%20Doe&stage=offer')
    expect(out).toBe('https://hirelens.app/talent')
    expect(out.toLowerCase()).not.toContain('jane')
  })

  it('drops the hash on private routes', () => {
    expect(redactAnalyticsUrl(`https://hirelens.app/roles/${CAMPAIGN}#notes`)).toBe(
      'https://hirelens.app/roles/[roleId]',
    )
  })

  it('keeps the query string on public marketing routes', () => {
    // utm_* is the one place a query string is the measurement rather than a
    // leak, and nothing behind these paths is organization data.
    const out = redactAnalyticsUrl('https://hirelens.app/pricing?utm_source=launch')
    expect(out).toContain('utm_source=launch')
    expect(out).toContain('/pricing')
  })

  it('returns an unparseable URL unchanged instead of throwing', () => {
    // This runs inside an analytics callback during render-adjacent work; a
    // throw here would take a page view down with it.
    expect(() => redactAnalyticsUrl('not a url')).not.toThrow()
    expect(redactAnalyticsUrl('not a url')).toBe('not a url')
  })

  it('never emits anything UUID-shaped for any protected route', () => {
    const uuidLike = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    for (const base of V4_PROTECTED) {
      const out = redactAnalyticsUrl(`https://hirelens.app${base}/${CANDIDATE}`)
      expect(out).not.toMatch(uuidLike)
    }
  })
})

describe('isPrivatePath', () => {
  it('treats every proxy-protected prefix as private', () => {
    // Derived from V4_PROTECTED rather than restated, so a new authenticated
    // area becomes private here the moment the proxy guards it.
    for (const path of V4_PROTECTED) {
      expect(isPrivatePath(path)).toBe(true)
      expect(isPrivatePath(`${path}/nested`)).toBe(true)
    }
  })

  it('does not treat public routes as private', () => {
    for (const path of ['/', '/pricing', '/contact', '/terms', '/privacy']) {
      expect(isPrivatePath(path)).toBe(false)
    }
  })

  it('does not match a path that merely starts with the same letters', () => {
    expect(isPrivatePath('/homepage-tour')).toBe(false)
  })
})
