import type { Metadata, Viewport } from 'next'
import { RedactedAnalytics } from '@/components/analytics/redacted-analytics'
import { ThemeProvider } from '@/components/hirelens/theme/theme-provider'
import { SITE_LOCALE, SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { SERVICE_DESCRIPTION } from '@/lib/legal'
import './globals.css'

/**
 * Minimal root layout.
 *
 * Owns only the document skeleton (`<html>`/`<body>`), global stylesheet, and
 * analytics. Each application shell supplies its own providers, fonts, and
 * chrome from its route-group layout:
 *   - app/(legacy)/layout.tsx   — Hirevo v1.0 (frozen)
 *   - app/(hirelens)/layout.tsx — Hirevo V3 (canonical, in progress)
 *
 * `suppressHydrationWarning` allows the V3 theme provider to set the color
 * scheme on `<html>` before hydration without a mismatch warning.
 *
 * ThemeProvider is mounted HERE, at the single shared root, rather than inside
 * the route-group layouts. next-themes emits its no-flash `<script>` as part of
 * the provider's own output; a provider that lives in a route-group layout is
 * unmounted and re-mounted when navigating between groups (e.g. `/auth/login`
 * → `/today`), so React re-renders that `<script>` on the client and React 19
 * warns that client-rendered scripts never execute. Mounted at the root the
 * provider renders once into the server HTML and survives every navigation.
 */
export const metadata: Metadata = {
  /**
   * WITHOUT THIS, EVERY ABSOLUTE URL NEXT GENERATES IS WRONG.
   *
   * `metadataBase` is what turns a relative `og:image` or canonical into an
   * absolute one. Absent, Next falls back to `localhost:3000` in development and
   * warns in production — so an `og:image` added later would silently resolve
   * to a host nobody else can reach, and the failure only shows up when someone
   * pastes a link into Slack and gets no card.
   */
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  /**
   * The sitewide default. Route groups and pages override it; anything that
   * does not gets a description rather than none, which is the difference
   * between a summariser quoting us and a summariser guessing.
   */
  description: SERVICE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: 'website',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

/**
 * Viewport and theme colour.
 *
 * Split from `metadata` because Next requires it — and the two colours match
 * the light and dark canvases the product actually paints, so a mobile browser
 * chrome does not sit in a colour that appears nowhere in the design.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFCFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0C18' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {/* Page-view URLs are redacted before they are sent — the product
            surface addresses candidates and campaigns by their real primary
            keys, and those must not leave for a third party. See
            `lib/analytics/redact.ts`. */}
        {process.env.NODE_ENV === 'production' && <RedactedAnalytics />}
      </body>
    </html>
  )
}
