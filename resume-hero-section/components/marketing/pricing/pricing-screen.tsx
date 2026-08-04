'use client'

import * as React from 'react'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { Reveal } from '@/components/marketing/motion'
import { UpgradeDialogProvider } from '@/components/hirelens/entitlements'
import { FEATURED_PLAN, checkoutUnavailableReason } from '@/lib/pricing'
import { PlanCards } from './plan-cards'
import { ComparisonTable } from './comparison-table'
import { EnterpriseSection } from './enterprise-section'
import { PricingFaq } from './pricing-faq'
import { CurrencyToggle } from './currency-toggle'
import { useCurrencyPreference } from './use-currency-preference'

/**
 * The pricing page.
 *
 * Composition order is an argument, not a layout: what you get and what it
 * costs (cards) → prove it (the full comparison, derived from the same catalog
 * the server enforces) → the case that does not fit a card (Enterprise) →
 * remove the remaining doubts (FAQ). Nothing is asked of the visitor until
 * they have seen the whole matrix.
 *
 * `UpgradeDialogProvider` is mounted HERE rather than in the marketing layout.
 * It is the same provider the product uses, so a signed-in visitor gets the
 * exact dialog every lock and quota wall opens — one upgrade surface for the
 * whole product, including its public pages. It carries no data dependency of
 * its own, and `DialogContent` applies its own `.hl` scope, so it works inside
 * `.mkt` without dragging the product's provider stack onto a public page.
 */
export function PricingScreen() {
  const [currency, setCurrency] = useCurrencyPreference()
  const unavailable = checkoutUnavailableReason(currency)

  return (
    <UpgradeDialogProvider>
      <div className="mkt-min-vh flex flex-col bg-mkt-canvas">
      <MarketingNav />
      <main className="flex-grow">
        <section className="mx-auto max-w-[1280px] bg-mkt-canvas px-8 pb-20 pt-36">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-4 mkt-label text-mkt-fg-tertiary">Pricing</p>
            <h1 className="mb-5 font-mkt-display text-4xl leading-tight text-mkt-fg md:text-5xl">
              Priced by what you read, not by who reads it.
            </h1>
            <p className="mkt-body text-mkt-fg-secondary">
              Every plan runs the same analysis on every résumé. What changes is how many you
              can put through it, how many of you there are, and how much of the intelligence
              layer you want.
            </p>
          </Reveal>

          {/* Renders nothing while a single currency is confirmed. */}
          <div className="mb-10 flex justify-center">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>

          {/* An `h2` before the plan cards. Their names are `h3`, so without
              this the outline jumped h1 → h3 and the four plans appeared to be
              subsections of nothing. `sr-only` because the cards are visually
              self-evident; the heading exists to make the document structure
              true, not to add a title nobody asked for. */}
          <h2 className="sr-only">Plans and prices</h2>
          <PlanCards currency={currency} />

          {/* GST-INCLUSIVE, NOT EXCLUSIVE. This read "Prices exclude applicable
              taxes", which contradicts how the system actually bills: the
              advertised figure is the amount charged, and `net + tax = total`
              is enforced both in the billing domain and by a CHECK constraint
              on the invoices table. ₹999 means ₹999 leaves the customer's card,
              booked as ₹846.61 net and ₹152.39 GST — not ₹999 plus 18%. The
              old line under-promised, so nobody was defrauded, but it was a
              wrong statement about the amount on the surface a purchase
              decision is made from, and it would have been contradicted by the
              first invoice we ever issued. */}
          <p className="mt-10 text-center mkt-body-sm text-mkt-fg-tertiary">
            Prices include GST. No card required to start — every new organization begins on
            Free.
          </p>

          {/* A market we quote but cannot charge. Said once, plainly, under the
              cards whose buttons it changes — rather than leaving the visitor
              to discover it at a checkout that never arrives. */}
          {unavailable ? (
            <p className="mt-3 text-center mkt-body-sm text-mkt-fg-tertiary">{unavailable}</p>
          ) : null}
        </section>

        <section
          id="compare"
          className="border-t border-mkt-border bg-mkt-canvas px-8 py-24"
        >
          <div className="mx-auto max-w-[1100px]">
            <Reveal className="mb-12 text-center">
              <h2 className="mb-3 font-mkt-display text-3xl text-mkt-fg">
                Everything, side by side.
              </h2>
              <p className="mx-auto max-w-xl mkt-body-sm text-mkt-fg-secondary">
                This table is generated from the same capability list the product enforces, so
                what you read here is what your account will actually do.
              </p>
            </Reveal>
            <ComparisonTable featured={FEATURED_PLAN} />
          </div>
        </section>

        <EnterpriseSection />
        <PricingFaq />
      </main>
      <MarketingFooter />
      </div>
    </UpgradeDialogProvider>
  )
}
