import type { Metadata } from 'next'
import { fontVariables } from '@/components/hirelens/theme/fonts'
import { HireLensProviders } from '@/components/hirelens/shell/providers'

/**
 * V4 authentication route group. Reuses the same providers as the app (the `.hl`
 * scope, fonts, theme, toasts) but renders NO app shell — auth is a full-screen
 * Split-Editorial surface.
 *
 * The legacy app and its `/login` route are gone; `/auth/*` is now the only
 * sign-in surface, and `/login` redirects here.
 */
export const metadata: Metadata = {
  title: { default: 'Sign in', template: '%s · HireLens' },
  /**
   * A description so a link to these pages is not blank, and `noindex` because
   * they should never be a search result.
   *
   * An indexed sign-in form is worse than useless to a reader: it tells them
   * nothing about HireLens and, when it outranks the page that would have, it
   * actively displaces the answer they wanted. `follow` is kept so the links
   * out of these pages still carry a crawler onward to the marketing site.
   */
  description:
    'Sign in to HireLens, or create an account. Every new organization starts on the free plan.',
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <HireLensProviders fontClassName={fontVariables}>{children}</HireLensProviders>
}
