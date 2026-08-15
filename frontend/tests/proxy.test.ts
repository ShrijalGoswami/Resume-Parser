import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  V4_AUTH_REDIRECT,
  V4_PROTECTED,
  resolveMiddlewareAction,
} from '../lib/auth-routing'

/**
 * Security-critical: server-side route protection for the V4 app. These test the
 * middleware's pure decision (resolveMiddlewareAction); proxy.ts wires it to
 * Supabase + Next, and the decision is what determines who can reach what.
 */
/**
 * The matcher and the route lists must agree.
 *
 * The proxy used to match everything except static assets, so a new protected
 * route was guarded the moment it existed. It is now a positive list — which is
 * what keeps Supabase out of the serving path for the public marketing and
 * policy pages — and the cost of that is exactly this coupling: a route added
 * to `V4_PROTECTED` and forgotten here would render to an anonymous visitor
 * without the guard ever running.
 *
 * This is the test that turns that from a silent hole into a red build.
 */
describe('proxy matcher covers every guarded route', () => {
  const source = readFileSync(resolve(process.cwd(), 'proxy.ts'), 'utf-8')
  /**
   * The matcher's STRING LITERALS, not the surrounding source.
   *
   * Two earlier attempts asserted against a slice of the file and both failed
   * on the prose rather than the patterns: the block comment explaining why the
   * public files are excluded necessarily names those files. Extracting the
   * quoted entries tests what actually reaches Next.
   */
  const start = source.indexOf('matcher: [')
  const block = source.slice(start, source.indexOf('],', start) + 2)
  const patterns = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])

  /** The first segment each pattern guards: `/jobs/:path*` -> `roles`. */
  const guarded = new Set(patterns.map((p) => p.replace(/^\//, '').split('/')[0]))

  const firstSegment = (route: string) => route.replace(/^\//, '').split('/')[0]

  it.each([...V4_PROTECTED, ...V4_AUTH_REDIRECT])(
    'guards %s',
    (route) => {
      expect(
        guarded.has(firstSegment(route)),
        `proxy.ts matcher does not cover ${route} — add it, or an anonymous ` +
          `visitor reaches it with no guard`,
      ).toBe(true)
    },
  )

  it('does NOT match the public marketing and policy pages', () => {
    // These are why the matcher was inverted: no session to refresh, and a
    // Supabase round trip on each was measurably slowing the crawl path.
    for (const publicPath of ['pricing', 'terms', 'privacy', 'refunds', 'contact']) {
      expect(guarded.has(publicPath), `${publicPath} should not be proxied`).toBe(false)
    }
  })

  it('does NOT match the agent-facing files', () => {
    // robots.txt, sitemap.xml and llms.txt are the files a crawler hits first
    // and most often; each would otherwise carry an auth round trip.
    for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'humans.txt', '.well-known']) {
      expect(guarded.has(file), `${file} should not be proxied`).toBe(false)
    }
  })

  it('does not match the site root', () => {
    expect(patterns).not.toContain('/')
  })
})

describe('resolveMiddlewareAction — V4 route protection', () => {
  it('unauthenticated → protected V4 route redirects to /auth/login (preserving next)', () => {
    expect(resolveMiddlewareAction('/today', false)).toEqual({
      kind: 'redirect',
      pathname: '/auth/login',
      withNext: true,
    })
    expect(resolveMiddlewareAction('/jobs/abc-123', false)).toMatchObject({
      kind: 'redirect',
      pathname: '/auth/login',
    })
    expect(resolveMiddlewareAction('/ai-audit', false)).toMatchObject({ pathname: '/auth/login' })
    expect(resolveMiddlewareAction('/settings/profile', false)).toMatchObject({
      pathname: '/auth/login',
    })
  })

  it('authenticated → protected V4 route passes through', () => {
    expect(resolveMiddlewareAction('/today', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/jobs/abc-123', true)).toEqual({ kind: 'pass' })
    expect(resolveMiddlewareAction('/settings/profile', true)).toEqual({ kind: 'pass' })
  })

  it('authenticated → /auth/login or /auth/signup redirects to /home', () => {
    expect(resolveMiddlewareAction('/auth/login', true)).toEqual({
      kind: 'redirect',
      pathname: '/today',
      withNext: false,
    })
    expect(resolveMiddlewareAction('/auth/signup', true)).toEqual({
      kind: 'redirect',
      pathname: '/today',
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

  it('no longer guards the removed Classic routes', () => {
    // /insights, /agent, /knowledge and /predictions were the "Classic"
    // group and have been deleted. The proxy must NOT bounce them to the legacy
    // /login: doing so would send a visitor to a sign-in page in order to reach a
    // route that no longer exists, so the honest outcome is a plain 404.
    for (const route of ['/insights', '/agent', '/knowledge', '/predictions']) {
      expect(resolveMiddlewareAction(route, false)).toEqual({ kind: 'pass' })
      expect(resolveMiddlewareAction(route, true)).toEqual({ kind: 'pass' })
    }
  })

  it('lets the retired legacy sign-in paths fall through to their redirect', () => {
    // Phase 9.1 deleted the legacy group. `/login` and `/signup` are now
    // permanent `next.config` redirects into `/auth/*`, so the proxy must NOT
    // act on them — a redirect renders nothing, and the `/auth/*` destination
    // carries its own guard. Bouncing a signed-in user off `/login` would also
    // have sent them to `/dashboard`, which is itself only a redirect.
    for (const route of ['/login', '/signup']) {
      expect(resolveMiddlewareAction(route, true)).toEqual({ kind: 'pass' })
      expect(resolveMiddlewareAction(route, false)).toEqual({ kind: 'pass' })
    }
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
    const destinations = ['/today', '/jobs', '/candidates', '/settings', '/settings/members']
    for (const route of destinations) {
      expect(resolveMiddlewareAction(route, false)).toMatchObject({
        kind: 'redirect',
        pathname: '/auth/login',
      })
    }
  })

  it('guards the surfaces added after the V4 migration', () => {
    for (const route of ['/reports', '/interviews', '/notifications']) {
      expect(resolveMiddlewareAction(route, false)).toEqual({
        kind: 'redirect',
        pathname: '/auth/login',
        withNext: true,
      })
      expect(resolveMiddlewareAction(route, true)).toEqual({ kind: 'pass' })
    }
  })
})
