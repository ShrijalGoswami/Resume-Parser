'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSession } from '@/components/hirelens/lib/api/use-session'
import { useUpgradeAction } from '@/components/hirelens/entitlements'
import { PLAN_LABELS, type PlanKey } from '@/components/hirelens/lib/entitlements/catalog'
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
      <Link href="/home" className={cls}>
        Go to HireLens
      </Link>
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
