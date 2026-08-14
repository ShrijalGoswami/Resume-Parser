'use client'

import * as React from 'react'
import { Badge } from '../ui/badge'
import { usePlan } from '../lib/entitlements/use-entitlement'

/**
 * The organization's plan, as a badge.
 *
 * Renders nothing while loading or on error. A badge that says "Free" because
 * `/org/context` failed is a confident wrong answer shown to a paying customer,
 * and it sits in the chrome where they will see it constantly.
 *
 * FOUNDING gets its own badge rather than being shown as its underlying plan
 * slug. Those 68 organizations predate monetization and hold every capability
 * with no limits; labelling them "Free" would be both wrong and insulting, and
 * labelling them "Enterprise" would be a promise nobody made. The badge names
 * what they actually are.
 *
 * `past_due` is surfaced because a customer should learn about a billing
 * problem from the product before they learn about it from losing access — and
 * on this system they do NOT lose access while past due, so the badge is
 * information rather than a threat.
 */
export interface PlanBadgeProps {
  className?: string
  /** Show subscription status (past_due, trialing) alongside the plan. */
  showStatus?: boolean
}

export function PlanBadge({ className, showStatus = true }: PlanBadgeProps) {
  const plan = usePlan()
  if (plan.state !== 'ready') return null

  if (plan.isFounding) {
    return (
      <Badge variant="accent" className={className} title="Grandfathered before plans launched">
        Founding
      </Badge>
    )
  }

  if (showStatus && plan.status === 'past_due') {
    return (
      <Badge variant="warning" className={className}>
        {plan.label} · Payment due
      </Badge>
    )
  }

  if (showStatus && plan.status === 'trialing') {
    return (
      <Badge variant="info" className={className}>
        {plan.label} · Trial
      </Badge>
    )
  }

  return (
    <Badge variant={plan.plan === 'free' ? 'neutral' : 'outline'} className={className}>
      {plan.label}
    </Badge>
  )
}
