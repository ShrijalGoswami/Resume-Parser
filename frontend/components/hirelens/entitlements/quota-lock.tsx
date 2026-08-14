'use client'

import * as React from 'react'
import { GateState } from '../states/gate-state'
import { metricLabel, upgradeValueLine, type PlanKey } from '../lib/entitlements/catalog'
import { UpgradeButton } from './upgrade-button'

/**
 * An exhausted allowance.
 *
 * Deliberately a different surface from `<FeatureLock>`, because they are
 * different sentences with different futures. A lock says "your plan doesn't
 * include this" — static, about capability, only money changes it. A quota says
 * "you've used 2 of 2" — dynamic, about volume, and on a paid plan it fixes
 * itself at the start of next month. Rendering them identically would tell a
 * Plus customer who ran out of monthly credits that they lack a feature they
 * are actively paying for.
 *
 * The renewal line is the part most worth getting right. Free credits are for
 * the LIFETIME of the organization — it is a trial, not an allowance — so this
 * must never imply to a Free user that anything resets. Saying "resets next
 * month" to someone whose credits never reset is a promise the product will
 * break in four weeks.
 *
 * Presentational: it takes numbers, it does not fetch them. `<QuotaMeter>` and
 * the Phase 2.4 upload dialog both feed it.
 */
export interface QuotaLockProps {
  metric: string
  used: number
  limit: number
  /** 'lifetime' — nothing resets. 'month' — renews with the billing period. */
  window?: string
  requiredPlan?: PlanKey | null
  /** Override the headline; prefer letting it derive. */
  title?: string
  action?: React.ReactNode
  className?: string
}

export function QuotaLock({
  metric,
  used,
  limit,
  window,
  requiredPlan = null,
  title,
  action,
  className,
}: QuotaLockProps) {
  const label = metricLabel(metric)
  const headline = title ?? `You’ve used all ${limit} of your ${label}.`
  // The three questions, in order: what ran out (headline), why it matters /
  // when it comes back (renewal), and what changes if you upgrade (value).
  // The value line is the one that turns a dead end into a decision.
  const value = upgradeValueLine(metric, requiredPlan)
  const description =
    window === 'month'
      ? `Your allowance renews at the start of next month.${value ? ` ${value}` : ''}`
      : (value ?? undefined)

  return (
    <GateState
      reason="quota"
      title={headline}
      description={description}
      meta={`${used} of ${limit} ${label} used`}
      action={action ?? <UpgradeButton requiredPlan={requiredPlan} metric={metric} />}
      className={className}
    />
  )
}
