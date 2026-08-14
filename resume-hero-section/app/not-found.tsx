import type { Metadata } from 'next'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { EmptyState } from '@/components/hirelens/states/empty-state'
import { Button } from '@/components/hirelens/ui/button'
import { fontVariables } from '@/components/hirelens/theme/fonts'
import { cn } from '@/lib/utils'

/**
 * THE APPLICATION-WIDE 404 — for a URL that matches no route at all.
 *
 * `app/(hirelens)/not-found.tsx` looks like it already covers this, and it does
 * not. A `not-found.tsx` inside a route group is the boundary for `notFound()`
 * thrown by a segment WITHIN that group; a request for `/pricng` never enters
 * `(hirelens)`, so it matched no boundary and fell through to Next's own
 * default 404 — unstyled black-on-white, in none of the product's type or
 * colour, with no way back. The one page guaranteed to be reached by mistake
 * was the one page that did not look like HireLens.
 *
 * WHY THIS FILE REPEATS THE SCOPE THE GROUP LAYOUT WOULD HAVE GIVEN IT.
 * Only the root layout wraps this file, and the root layout is deliberately
 * minimal — `<html>`, `<body>`, the stylesheet and the theme provider. Every
 * token this state paints with (`bg-hl-canvas`, `hl-h3`, `text-hl-fg-*`)
 * resolves against the `.hl` scope, and the fonts arrive as CSS variables on
 * the same element. Without them the copy renders in the browser's default
 * serif on a transparent canvas — a 404 that proves the point it is trying to
 * disprove. So the scope and the font variables are applied here directly.
 *
 * The full `HireLensProviders` stack is NOT mounted. `EmptyState` and `Button`
 * are pure components with no context of their own, so a query client, tooltip
 * provider, command registry and checkout provider would all be mounted to
 * render two paragraphs and a link. This stays a server component.
 *
 * THE ACTION POINTS AT `/`, NOT `/home`. This page is reached by authenticated
 * and anonymous visitors alike and cannot tell them apart — reading the session
 * here would put a Supabase round trip on every stray URL, including the ones
 * crawlers generate. `/` is public, valid for both, and an authenticated user
 * landing there is one click from the product; an anonymous user sent to
 * `/home` would have been bounced to a sign-in form instead, which answers a
 * mistyped address with a demand for credentials.
 *
 * Deliberately NOT an error state, matching the group-level 404: a stale link
 * is not a fault to report, so it gets the neutral empty treatment rather than
 * a danger glyph and a "contact support" button.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  // A 404 that gets indexed is a 404 competing with the pages that do exist.
  robots: { index: false, follow: false },
}

export default function RootNotFound() {
  return (
    <div className={cn('hl', fontVariables)}>
      <div className="flex min-h-dvh items-center justify-center bg-hl-canvas px-6">
        {/* `EmptyState` renders its title as an `h2`, deliberately — inside the
            product it sits BELOW a page title and must not compete with it. A
            404 has no page title above it, so without this the document has no
            `h1` at all and a screen-reader user landing here gets a heading
            level that implies a parent heading that was never announced.
            Visually hidden because the visible headline is already right there;
            this supplies the missing level, not a second thing to read. */}
        <h1 className="sr-only">Page not found</h1>
        <EmptyState
          icon={FileQuestion}
          title="This page doesn’t exist"
          description="The address may be mistyped, or the page may have been renamed or moved."
          action={
            <Button variant="primary" asChild>
              <Link href="/">Go to homepage</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}
