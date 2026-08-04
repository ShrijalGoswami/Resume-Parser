import type { Metadata } from 'next'
import { PricingScreen } from '@/components/marketing/pricing/pricing-screen'

/**
 * `/pricing` — the public plan comparison.
 *
 * A thin server component so the route can own its metadata; everything below
 * is client-side because the cards, the comparison and the FAQ all react to
 * the visitor (signed in or not, which currency, which panel is open).
 */
export const metadata: Metadata = {
  title: 'Pricing — HireLens',
  description:
    'Every HireLens plan runs the same analysis on every résumé. Compare Free, Plus, Pro and Enterprise — limits, capabilities, and what each tier adds.',
  openGraph: {
    title: 'Pricing — HireLens',
    description:
      'Priced by what you read, not by who reads it. Compare every HireLens plan side by side.',
    type: 'website',
  },
}

export default function PricingPage() {
  return <PricingScreen />
}
