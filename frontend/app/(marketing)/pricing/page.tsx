import type { Metadata } from 'next'
import { PricingScreen } from '@/components/marketing/pricing/pricing-screen'
import { PricingStructuredData } from '@/components/seo/structured-data-blocks'

/**
 * `/pricing` — the public plan comparison.
 *
 * A thin server component so the route can own its metadata; everything below
 * is client-side because the cards, the comparison and the FAQ all react to
 * the visitor (signed in or not, which currency, which panel is open).
 */
export const metadata: Metadata = {
  title: 'Pricing — Hirevo',
  description:
    'Every Hirevo plan runs the same analysis on every résumé. Compare Free, Plus, Pro and Enterprise — limits, capabilities, and what each tier adds.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — Hirevo',
    description:
      'Priced by what you read, not by who reads it. Compare every Hirevo plan side by side.',
    url: '/pricing',
    type: 'website',
  },
}

export default function PricingPage() {
  return (
    <>
      <PricingScreen />
      <PricingStructuredData />
    </>
  )
}
