import type { Metadata } from 'next'

import { HomeStructuredData } from '@/components/seo/structured-data-blocks'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { Frame01Hero } from '@/components/marketing/frame-01-hero'
import { Frame02Philosophy } from '@/components/marketing/frame-02-philosophy'
import { Frame03Pipeline } from '@/components/marketing/frame-03-pipeline'
import { Frame04Regret } from '@/components/marketing/frame-04-regret'
import { Frame05Conclusion } from '@/components/marketing/frame-05-conclusion'

/**
 * The HireLens production homepage.
 *
 * Source of truth: the five HireLens V4 Stitch marketing frames, composed in
 * frame order into one continuous scroll. Each frame is shipped as its own
 * screen in Stitch (so each carries its own nav and footer); composed here, the
 * page takes frame 1's dark nav at the top and frame 5's footer at the bottom,
 * and the frames' section bodies run between them unchanged.
 *
 *   Frame 1  hero · compression preview
 *   Frame 2  social proof · the stakes · philosophy · ATS contrast
 *   Frame 3  decision pipeline · triage · deep review · decide
 *   Frame 4  regret analysis · AI tenets · enterprise trust
 *   Frame 5  customer story · pricing · FAQ · closing
 */
/**
 * `alternates.canonical` is the only addition. The homepage is reachable as
 * `/`, as the site root, and from every preview deployment — declaring which
 * one is the real address is what stops those being treated as three pages
 * that happen to be identical.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <div className="mkt-min-vh flex flex-col bg-mkt-canvas">
      <MarketingNav />
      <main className="flex-grow">
        <Frame01Hero />
        <Frame02Philosophy />
        <Frame03Pipeline />
        <Frame04Regret />
        <Frame05Conclusion />
      </main>
      <MarketingFooter />
      <HomeStructuredData />
    </div>
  )
}
