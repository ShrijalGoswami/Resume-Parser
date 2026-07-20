import type { Metadata } from 'next'
import { fontVariables } from '@/components/hirelens/theme/fonts'
import { HireLensProviders } from '@/components/hirelens/shell/providers'

/**
 * HireLens V3 route-group layout. Nested inside the minimal root layout, it owns
 * the entire V3 experience: fonts, theme/density, shared providers, and the
 * `.hl` scope root. The frozen v1.0 app under app/(legacy)/ is unaffected.
 */
export const metadata: Metadata = {
  title: {
    default: 'HireLens',
    template: '%s · HireLens',
  },
}

export default function HireLensLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <HireLensProviders fontClassName={fontVariables}>{children}</HireLensProviders>
}
