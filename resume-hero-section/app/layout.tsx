import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
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
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
