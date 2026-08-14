import type { Metadata } from 'next'
import { fontVariables } from '@/components/hirelens/theme/fonts'
import { HireLensProviders } from '@/components/hirelens/shell/providers'

/**
 * HireLens V3 route-group layout. Nested inside the minimal root layout, it owns
 * the entire V3 experience: fonts, theme, shared providers, and the
 * `.hl` scope root. The frozen v1.0 app under app/(legacy)/ is unaffected.
 */
export const metadata: Metadata = {
  title: {
    default: 'HireLens',
    template: '%s · HireLens',
  },
  /**
   * THE PRODUCT SURFACE IS NEVER INDEXABLE, AND `robots.txt` IS NOT WHAT SAYS SO.
   *
   * `lib/seo/site.ts` lists every one of these paths in `DISALLOWED_PATHS`, and
   * says of that list, in its own words, that it is "NOT a security boundary" —
   * `robots.txt` is a request. It asks a crawler not to FETCH a path; it does
   * not stop that path being INDEXED. A disallowed URL that is linked from
   * anywhere can still be listed by Google from the link alone, title-less and
   * description-less, because the rule that forbade fetching also forbade
   * reading the `noindex` that would have settled it.
   *
   * This header is the instruction that actually settles it, and it is served
   * on the page itself. `follow: false` joins it because there is nothing
   * beyond these pages a crawler should walk into: every link from here leads
   * further into an authenticated product.
   *
   * `app/auth/layout.tsx` has carried the same directive since it was written.
   * This group — the product itself — did not, which left the sign-in form
   * better protected from indexing than the workspace behind it.
   */
  robots: { index: false, follow: false },
}

export default function HireLensLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <HireLensProviders fontClassName={fontVariables}>{children}</HireLensProviders>
}
