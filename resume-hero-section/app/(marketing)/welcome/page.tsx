import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { Hero } from '@/components/marketing/sections/hero'
import { Philosophy } from '@/components/marketing/sections/philosophy'
import { Pipeline } from '@/components/marketing/sections/pipeline'
import { Regret } from '@/components/marketing/sections/regret'
import { Conclusion } from '@/components/marketing/sections/conclusion'

/**
 * HireLens public landing — a single scrolling editorial narrative. Coexistence
 * path: /welcome (→ / at cutover). Sections are appended increment by increment:
 * Hero → Philosophy → Decision Pipeline → Regret Climax → Conclusion/CTA.
 */
export default function WelcomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <Philosophy />
        <Pipeline />
        <Regret />
        <Conclusion />
      </main>
      <MarketingFooter />
    </>
  )
}
