'use client'

import * as React from 'react'
import { Reveal } from '@/components/marketing/motion'
import {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_KEYS,
  PLAN_LABELS,
  RESUME_WINDOW,
  isUnlimited,
  planRank,
  type PlanKey,
} from '@/components/hirelens/lib/entitlements/catalog'
import {
  FEATURED_PLAN,
  PLAN_POSITIONING,
  formatPrice,
  priceSuffix,
  type CurrencyCode,
} from '@/lib/pricing'
import { PlanCta } from './plan-cta'

/**
 * The four plans, as cards.
 *
 * Structure comes from the catalog, money from `lib/pricing.ts`, positioning
 * copy from the same place as the money — see that file's header for why the
 * two are kept apart.
 *
 * Each card lists what that TIER ADDS rather than everything it includes.
 * Repeating the whole set four times makes the cards differ only by a number
 * and asks the reader to diff them; "everything in Plus, and…" is how a person
 * actually reasons about an upgrade. The exhaustive answer is the comparison
 * table below, which is the right surface for it.
 */

/** The headline limit — the one number that changes how the plan feels. */
function headlineLimit(plan: PlanKey): string {
  const limit = LIMITS[plan].resumes
  if (isUnlimited(limit)) return 'Unlimited résumés'
  // Free's credits never renew; saying "/month" would promise a reset that
  // does not exist.
  return RESUME_WINDOW[plan] === 'month'
    ? `${limit} résumés / month`
    : `${limit} résumés to try`
}

function seatText(plan: PlanKey): string {
  const seats = LIMITS[plan].members
  if (isUnlimited(seats)) return 'Unlimited team members'
  return seats === 1 ? '1 team member' : `${seats} team members`
}

export function PlanCards({ currency }: { currency: CurrencyCode }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {PLAN_KEYS.map((plan, index) => {
        const featured = plan === FEATURED_PLAN
        const previous = PLAN_KEYS[planRank(plan) - 1]
        const adds = FEATURE_KEYS.map((key) => FEATURES[key]).filter((f) => f.minPlan === plan)

        return (
          <Reveal
            key={plan}
            delay={index * 80}
            // `bg-mkt-raised` (white), not `bg-mkt-canvas`: the section and
            // the page are both canvas, so a canvas card was a 1px outline on
            // an unbroken plane. Every card also takes a resting elevation —
            // an unchosen plan is still an object, and only the featured one
            // was being given permission to look like one.
            className={`mkt-lift relative flex flex-col overflow-hidden rounded-mkt-lg border bg-mkt-raised p-7 ${
              featured
                ? 'border-mkt-border-strong shadow-[var(--mkt-shadow-card-raised)]'
                : 'border-mkt-border shadow-[var(--mkt-shadow-card-resting)]'
            }`}
          >
            {featured && <div className="mkt-prism-hairline absolute inset-x-0 top-0 h-px" />}

            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h3 className="mkt-body-lg font-medium text-mkt-fg">{PLAN_LABELS[plan]}</h3>
              {featured && (
                <span className="shrink-0 rounded-[0.25rem] bg-mkt-accent-bg px-2 py-0.5 mkt-label text-mkt-accent-text">
                  Most teams
                </span>
              )}
            </div>

            {/* This min-height is what keeps the four cards on a shared baseline,
                and it has to clear the LONGEST positioning line, not the average.
                At 2.75rem it cleared two lines — but at the 4-up width three of
                the four descriptions wrap to three lines and only Plus wraps to
                two, so Plus's price, rule and feature list all sat 21px above its
                neighbours. Cards are equal height and the CTA is pinned by
                `flex-grow` on the list, so the ragged middle was the only symptom.
                `mkt-body-sm` is 15px/24px, so three lines is 72px = 4.5rem.
                Re-measure if the copy in PLAN_POSITIONING grows. */}
            <p className="mb-6 min-h-[4.5rem] mkt-body-sm text-mkt-fg-secondary">
              {PLAN_POSITIONING[plan]}
            </p>

            <div className="mb-6 border-b border-mkt-border-subtle pb-6">
              <div className="flex items-baseline gap-1 font-mkt-mono text-2xl text-mkt-fg">
                {formatPrice(plan, currency)}
                <span className="text-base text-mkt-fg-tertiary">
                  {priceSuffix(plan, currency)}
                </span>
              </div>
              <p className="mt-1.5 mkt-data text-mkt-fg-tertiary">
                {headlineLimit(plan)} · {seatText(plan)}
              </p>
            </div>

            <ul className="mb-8 flex-grow space-y-2.5">
              {previous && (
                <li className="mkt-body-sm text-mkt-fg-secondary">
                  Everything in {PLAN_LABELS[previous]}, plus:
                </li>
              )}
              {adds.map((feature) => (
                <li key={feature.key} className="flex items-start gap-2">
                  <span
                    className="material-symbols-outlined mt-px text-[15px] text-mkt-accent-text"
                    aria-hidden="true"
                  >
                    check
                  </span>
                  <span className="mkt-body-sm text-mkt-fg-secondary">{feature.label}</span>
                </li>
              ))}
            </ul>

            {/* `currency` matters to the CTA, not just to the figure above it:
                a market we cannot charge gets a conversation rather than a
                signup funnel that ends at a gateway settling only rupees. */}
            <PlanCta
              plan={plan}
              currency={currency}
              emphasis={featured ? 'primary' : 'secondary'}
            />
          </Reveal>
        )
      })}
    </div>
  )
}
