import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DISALLOWED_PATHS, PUBLIC_ROUTES } from '../lib/seo/site'
import { V4_PROTECTED } from '../lib/auth-routing'

/**
 * Crawl safety and the application-wide 404.
 *
 * Both failures these guard against are invisible from inside the app:
 *
 *   1. A protected page relying on `robots.txt` alone. `lib/seo/site.ts` says
 *      in its own comments that the disallow list is "NOT a security boundary"
 *      — a `Disallow` stops a fetch, not an indexing, and a linked URL can be
 *      listed from the link alone. The `noindex` header is the part that
 *      settles it, and nothing but a test notices if it is dropped.
 *   2. The root `not-found.tsx` being deleted as a duplicate of the one under
 *      `(hirelens)`. It is not a duplicate: a route-group boundary catches
 *      `notFound()` raised inside that group, and a URL matching no route never
 *      enters the group. Removing the root file restores Next's default 404 and
 *      no build, type-check or existing test fails.
 */

const root = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('the protected product surface is explicitly noindex', () => {
  const layout = read('app/(hirelens)/layout.tsx')

  it('declares robots index:false and follow:false', () => {
    expect(layout).toMatch(/robots:\s*\{[^}]*index:\s*false/)
    expect(layout).toMatch(/robots:\s*\{[^}]*follow:\s*false/)
  })

  it('keeps the same directive on the auth surface', () => {
    // Auth had this before the product did; a regression that removed it would
    // leave sign-in indexable.
    expect(read('app/auth/layout.tsx')).toMatch(/robots:\s*\{[^}]*index:\s*false/)
  })

  it('still asks robots.txt to skip the same routes (defence in depth)', () => {
    // The header is the control; the disallow list remains the courtesy. Both
    // are expected to be present — this asserts the header did not arrive as a
    // REPLACEMENT for the crawl hint.
    for (const path of V4_PROTECTED) {
      expect(DISALLOWED_PATHS).toContain(path === '/home' ? '/home' : path)
    }
  })

  it('never lists a protected route as publicly crawlable', () => {
    const publicPaths = PUBLIC_ROUTES.map((r) => r.path)
    for (const protectedPath of V4_PROTECTED) {
      expect(publicPaths).not.toContain(protectedPath)
    }
  })
})

describe('application-wide 404', () => {
  it('exists at the root of app/, not only inside a route group', () => {
    expect(existsSync(resolve(root, 'app/not-found.tsx'))).toBe(true)
  })

  const notFound = read('app/not-found.tsx')

  it('carries the .hl scope and the product font variables', () => {
    // Only the minimal root layout wraps this file, so the scope the group
    // layout would have supplied has to be applied here or every token falls
    // back to browser defaults — a 404 that proves the point it is disproving.
    expect(notFound).toContain("'hl'")
    expect(notFound).toContain('fontVariables')
  })

  it('reuses the existing empty-state language rather than a new design', () => {
    expect(notFound).toContain('EmptyState')
    expect(notFound).toContain('bg-hl-canvas')
  })

  it('sends the visitor somewhere valid whether or not they are signed in', () => {
    // `/home` would bounce an anonymous visitor to a sign-in form — answering a
    // mistyped address with a demand for credentials. `/` is public and valid
    // for both.
    expect(notFound).toContain('href="/"')
    expect(notFound).not.toContain('href="/home"')
  })

  it('is itself noindex', () => {
    expect(notFound).toMatch(/robots:\s*\{[^}]*index:\s*false/)
  })

  it('does not mount the full provider stack', () => {
    // EmptyState and Button hold no context. Mounting a query client, tooltip
    // provider, command registry and checkout provider to render two
    // paragraphs would also force this to be a client component.
    //
    // Asserted against the IMPORT and the DIRECTIVE, not against any mention of
    // the words — the file's own comments explain why the provider stack is
    // absent, and a bare `toContain` failed on that explanation.
    expect(notFound).not.toMatch(/^\s*import\s.*HireLensProviders/m)
    expect(notFound.trimStart()).not.toMatch(/^['"]use client['"]/)
  })

  it('keeps the route-group 404 in place as well', () => {
    // The two are not alternatives: this one catches unmatched URLs, the group
    // one catches notFound() raised inside the product.
    expect(existsSync(resolve(root, 'app/(hirelens)/not-found.tsx'))).toBe(true)
  })
})
