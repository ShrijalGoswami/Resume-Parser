import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/hirelens/theme/theme-provider'
import './globals.css'

/**
 * Minimal root layout.
 *
 * Owns only the document skeleton (`<html>`/`<body>`), global stylesheet, and
 * analytics. Each application shell supplies its own providers, fonts, and
 * chrome from its route-group layout:
 *   - app/(legacy)/layout.tsx   — HireLens v1.0 (frozen)
 *   - app/(hirelens)/layout.tsx — HireLens V3 (canonical, in progress)
 *
 * `suppressHydrationWarning` allows the V3 theme provider to set the color
 * scheme on `<html>` before hydration without a mismatch warning.
 *
 * ThemeProvider is mounted HERE, at the single shared root, rather than inside
 * the route-group layouts. next-themes emits its no-flash `<script>` as part of
 * the provider's own output; a provider that lives in a route-group layout is
 * unmounted and re-mounted when navigating between groups (e.g. `/auth/login`
 * → `/home`), so React re-renders that `<script>` on the client and React 19
 * warns that client-rendered scripts never execute. Mounted at the root the
 * provider renders once into the server HTML and survives every navigation.
 */
export const metadata: Metadata = {
  title: 'HireLens',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
