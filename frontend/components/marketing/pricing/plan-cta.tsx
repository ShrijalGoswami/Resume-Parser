'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/components/hirelens/lib/api/use-session'
import { useUpgradeAction } from '@/components/hirelens/entitlements'
import {
  PLAN_LABELS,
  normalizePlan,
  planRank,
  type PlanKey,
} from '@/components/hirelens/lib/entitlements/catalog'
import { settingsKeys } from '@/components/hirelens/lib/api/settings'
import { getSubscription } from '@/services/org-api'
import { DEFAULT_CURRENCY, isCheckoutSupported, isQuoted, type CurrencyCode } from '@/lib/pricing'

/**
 * The call to action on a plan, for whoever is looking at it.
 *
 * Three audiences read this page and they need three different next steps:
 *
 *   signed out   → create an account. Every new organization starts on Free,
 *                  so "start free" is literally what happens.
 *   signed in    → the existing upgrade dialog, the SAME one every lock and
 *                  quota wall in the product opens. A pricing page that
 *                  invented its own upgrade path would be a second flow to
 *                  keep in step with billing when it ships.
 *   Enterprise   → a conversation, on any plan. There is no list price to act
 *                  on and pretending otherwise wastes the visitor's click.
 *
 * And one that cuts across all three: a market whose currency we cannot charge
 * has no self-serve path at all. See `isCheckoutSupported` — a US visitor was
 * being quoted $19 and offered a signup funnel that ends at a gateway settling
 * only rupees.
 *
 * There is still no self-service checkout — the dialog says so honestly rather
 * than presenting a button that quietly does nothing. When Phase 3 adds
 * payments, that dialog's footer changes and this component does not.
 *
 * While the session is resolving the control renders in its signed-out form
 * rather than disabled: a visitor who is not logged in is the common case, and
 * a CTA that flickers between two labels is worse than one that settles.
 */
export interface PlanCtaProps {
  plan: PlanKey
  /**
   * The currency being quoted.
   *
   * The CTA depends on it: a market we cannot charge in has no self-serve path,
   * whatever the card says above the button. Optional so existing callers keep
   * working, defaulting to the market checkout does serve.
   */
  currency?: CurrencyCode
  /** Visually dominant on the featured card, quiet on the rest. */
  emphasis?: 'primary' | 'secondary'
  className?: string
}

export function PlanCta({
  plan,
  currency = DEFAULT_CURRENCY,
  emphasis = 'secondary',
  className,
}: PlanCtaProps) {
  const { session } = useSession()
  const upgrade = useUpgradeAction()

  /**
   * WHAT THE VISITOR ALREADY HAS.
   *
   * The page used to offer "Upgrade to Pro" to everyone signed in, whatever
   * they were on. For an organization whose plan is granted by us — every
   * Enterprise account, and every operator-set one — that button led to a
   * backend refusal, and before the guard that now returns 409, to a 500.
   * Offering to sell somebody strictly less than they already have is the
   * failure mode this prevents, and it was live on the highest-intent click in
   * the funnel.
   *
   * Shares `settingsKeys.subscription` with Settings ▸ Billing, so a visitor
   * arriving from the product pays nothing for it. `enabled` keeps it off the
   * public page entirely: `authHeaders()` throws with no session, and a failed
   * request on every anonymous pricing view would be noise in every log.
   */
  const subscription = useQuery({
    queryKey: settingsKeys.subscription,
    queryFn: getSubscription,
    enabled: Boolean(session),
    staleTime: 60_000,
  })
  const currentPlan: PlanKey | null = subscription.data
    ? normalizePlan(subscription.data.plan)
    : null

  const base =
    'inline-flex w-full items-center justify-center rounded-[0.25rem] py-2.5 text-center text-base font-medium transition-colors'
  const style =
    emphasis === 'primary'
      ? 'bg-mkt-fg text-mkt-canvas transition-opacity hover:opacity-90'
      : 'border border-mkt-border text-mkt-fg hover:bg-mkt-subtle'
  const cls = [base, style, className].filter(Boolean).join(' ')

  // Enterprise: a conversation on any plan, in any market. No list figure to
  // act on, and pretending otherwise wastes the visitor's click.
  if (isQuoted(plan)) {
    return (
      <Link href="/contact" className={cls}>
        Talk to sales
      </Link>
    )
  }

  /**
   * A MARKET WE CANNOT CHARGE. Free is exempt — nothing is collected for it, so
   * a US visitor can still start an account and use the product; it is only the
   * purchase that has no path.
   *
   * Sending them to `/contact` is not a downgrade of the experience, it is the
   * only honest version of it. The alternative shipping today was a signup
   * funnel ending at a gateway that settles rupees.
   */
  if (plan !== 'free' && !isCheckoutSupported(currency)) {
    return (
      <Link href="/contact" className={cls}>
        Talk to sales
      </Link>
    )
  }

  if (!session) {
    return (
      <Link href="/auth/signup" className={cls}>
        {plan === 'free' ? 'Start free' : `Start with ${PLAN_LABELS[plan]}`}
      </Link>
    )
  }

  // Signed in and looking at Free: there is nothing to sell and nothing to do.
  // Send them back to the product rather than offering to "upgrade" downward.
  if (plan === 'free') {
    return (
      <Link href="/today" className={cls}>
        Go to Hirevo
      </Link>
    )
  }

  // The tier they are on. Stated, not sold.
  if (currentPlan && currentPlan === plan) {
    return (
      <span className={`${cls} cursor-default opacity-60`} aria-disabled>
        Current plan
      </span>
    )
  }

  /**
   * They are on something HIGHER. Not a purchase, and not a refusal either —
   * the honest sentence is that this tier is already covered by theirs.
   *
   * A downgrade is deliberately not offered here. The backend has no
   * self-serve path for one (BILL-13) and Razorpay schedules plan changes at
   * cycle end rather than immediately, so a button promising it would be
   * writing a cheque the gateway will not cash.
   */
  if (currentPlan && planRank(currentPlan) > planRank(plan)) {
    return (
      <span className={`${cls} cursor-default opacity-60`} aria-disabled>
        Included in your plan
      </span>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      // `origin: 'plan'` — nothing refused this customer, they chose a tier.
      // Without it the dialog runs the denial template with no subject and
      // renders "This feature is on Plus" over "Plus includes .".
      onClick={() => upgrade({ requiredPlan: plan, origin: 'plan' })}
    >
      Upgrade to {PLAN_LABELS[plan]}
    </button>
  )
}
