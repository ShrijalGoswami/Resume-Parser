import type { Metadata } from 'next'
import { fontVariables } from '@/components/hirelens/theme/fonts'
import { HireLensProviders } from '@/components/hirelens/shell/providers'

/**
 * V4 authentication route group. Reuses the same providers as the app (the `.hl`
 * scope, fonts, theme, toasts) but renders NO app shell — auth is a full-screen
 * Split-Editorial surface.
 *
 * Coexistence: the frozen legacy app owns `/login`, so V4 auth lives under
 * `/auth/*` (mirrors the V3 `/home` pattern).
 */
export const metadata: Metadata = {
  title: { default: 'Sign in', template: '%s · HireLens' },
}

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <HireLensProviders fontClassName={fontVariables}>{children}</HireLensProviders>
}
