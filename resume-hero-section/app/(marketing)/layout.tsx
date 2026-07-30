import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Newsreader, Public_Sans } from 'next/font/google'
import { NeuralBackground } from '@/components/marketing/NeuralBackground'

/**
 * Marketing (public site) layout.
 *
 * Owns the font stack and the `.mkt` style scope for the public marketing
 * surface. Kept separate from `(hirelens)` and `(legacy)` so the public site's
 * palette and typography can never leak into the product shell.
 *
 * The four families below are the ones the HireLens V4 Stitch marketing frames
 * load: Newsreader (display/headline), Inter (body), Public Sans (labels) and
 * JetBrains Mono (data/meta). Weights match the frames' Google Fonts requests.
 */

// Newsreader is loaded as a VARIABLE font with the optical-size axis, not as
// static weights. Stitch requests `Newsreader:opsz,wght@6..72,…`, so with
// `font-optical-sizing: auto` the 120px hero headline renders Newsreader's
// display cut. Pinning `weight` here would ship static instances locked to the
// text optical size, which renders the headline ~4% narrower and lighter than
// the approved frame.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-public-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HireLens — Precision Systems',
  description:
    'HireLens reads the whole pile, brings the few who matter into focus, and tells you what you’d regret — so your best judgment reaches everyone, not just the top of the stack.',
}

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`mkt ${newsreader.variable} ${inter.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      {/* The scroll-reveal styles start at `opacity: 0` and are cleared by
          JavaScript. Without this, a visitor with scripting disabled — or any
          visit where the bundle fails to execute — gets a blank page rather
          than an unanimated one. The page's content must never be contingent
          on JS running. See the safety contract in components/marketing/motion.tsx. */}
      <noscript>
        <style>{`.mkt-reveal,.mkt-resolve{opacity:1!important;transform:none!important}.mkt-meter-fill{transform:scaleX(1)!important}`}</style>
      </noscript>
      {/* Mounted once for the whole public surface, not per section. It is a
          fixed overlay (see NeuralBackground) so it spans every section —
          light and dark alike — as one continuous field. */}
      <NeuralBackground />
      {children}
    </div>
  )
}
