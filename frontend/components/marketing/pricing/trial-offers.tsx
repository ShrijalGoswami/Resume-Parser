'use client'

import * as React from 'react'
import { Reveal } from '@/components/marketing/motion'
import {
  TRIAL_PLAN_KEYS,
  LIMITS,
  PLAN_LABELS,
} from '@/components/hirelens/lib/entitlements/catalog'
import {
  PLAN_POSITIONING,
  formatPrice,
  isCheckoutSupported,
  priceOf,
  type CurrencyCode,
} from '@/lib/pricing'
import { PlanCta } from './plan-cta'

/**
 * The one-time paid trials, as a compact strip under the plan cards.
 *
 * Deliberately NOT two more cards in the main grid. The four-card row is the
 * upgrade ladder — each card a superset of the last — and the trials are not
 * rungs on it: they hold fewer résumés than Free and (for the Interview Trial)
 * a metered slice of a Pro capability. Rendering them inline would break the
 * "everything in X, plus:" reading that makes the ladder legible.
 *
 * Rendered only where they can actually be bought: the trials are an
 * INR/checkout offer with no USD price, and a strip of offers a visitor cannot
 * purchase is a dead end, not information.
 */
export function TrialOffers({ currency }: { currency: CurrencyCode }) {
  if (!isCheckoutSupported(currency)) return null
  const offered = TRIAL_PLAN_KEYS.filter((plan) => priceOf(plan, currency) !== null)
  if (offered.length === 0) return null

  return (
    <Reveal className="mt-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {offered.map((plan) => (
          <div
            key={plan}
            className="flex flex-col gap-4 rounded-mkt-lg border border-mkt-border bg-mkt-raised p-6 shadow-[var(--mkt-shadow-card-resting)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="mkt-body font-medium text-mkt-fg">{PLAN_LABELS[plan]}</h3>
                <span className="font-mkt-mono mkt-body-sm text-mkt-fg">
                  {formatPrice(plan, currency)}
                  <span className="text-mkt-fg-tertiary"> one-time</span>
                </span>
              </div>
              <p className="mt-1 mkt-body-sm text-mkt-fg-secondary">
                {PLAN_POSITIONING[plan]}
              </p>
              <p className="mt-0.5 mkt-label-sm text-mkt-fg-tertiary">
                {LIMITS[plan].resumes} résumés total · {LIMITS[plan].campaigns} role
                {plan === 'trial_interview' ? ' · 1 interview pack · 1 Copilot question' : ''}
              </p>
            </div>
            <div className="shrink-0">
              <PlanCta plan={plan} currency={currency} emphasis="secondary" />
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  )
}
