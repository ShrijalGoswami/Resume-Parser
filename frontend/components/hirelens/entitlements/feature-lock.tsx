'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GateState } from '../states/gate-state'
import { featureBlurb, featureLabel, PLAN_LABELS, type PlanKey } from '../lib/entitlements/catalog'
import { UpgradeButton } from './upgrade-button'

/**
 * A locked capability, rendered from its feature key.
 *
 * PRESENTATIONAL ON PURPOSE — no hooks, no context read. It is handed a feature
 * and a required plan and renders them, which means the same component serves
 * both a lock derived from `/org/context` (via `<PlanGate>`) and a lock derived
 * from a 402 body after an action was attempted (Phase 2.4). Two code paths,
 * one surface, so the product cannot end up with two different-looking locks
 * for the same capability.
 *
 * LOCKED, NEVER HIDDEN. A hidden feature sells nothing and teaches nothing —
 * the customer never learns the product does the thing they need. This reverses
 * the nav rule used for permissions, where hiding is right because no amount of
 * money fixes a role.
 *
 * All copy is catalog-derived. Nothing here names a tier.
 */
export interface FeatureLockProps {
  /** Catalog feature key. Supplies the label and the explanatory line. */
  feature: string
  /** Tier to offer. From `usePlanGate` or a 402 — already reconciled. */
  requiredPlan?: PlanKey | null
  /** Override the derived headline. Rare — prefer fixing the catalog blurb. */
  title?: string
  description?: string
  icon?: LucideIcon
  /** Replace the default upgrade CTA (e.g. with nothing, inside a dense card). */
  action?: React.ReactNode
  /**
   * `panel` (default) fills a route or a section. `compact` is the same lock at
   * card size — same glyph, same derived sentence, same CTA, less padding.
   *
   * A variant rather than a second component ON PURPOSE. The moment a screen
   * needs a smaller lock and there is no variant for it, that screen writes its
   * own — and the product ends up with several lock experiences that each
   * looked reasonable in isolation. One component, one visual language.
   */
  variant?: 'panel' | 'compact'
  className?: string
}

export function FeatureLock({
  feature,
  requiredPlan = null,
  title,
  description,
  icon,
  action,
  variant = 'panel',
  className,
}: FeatureLockProps) {
  const label = featureLabel(feature)
  // The three questions a lock must answer:
  //   1. what is locked  → the headline names the capability
  //   2. why want it     → the catalog blurb, below
  //   3. what if I pay   → the tier, named in the headline and on the CTA
  // A lock that answers only the first is an obstacle rather than an offer.
  const headline =
    title ??
    (requiredPlan
      ? `${label} is available on the ${PLAN_LABELS[requiredPlan]} plan.`
      : `${label} is not included in your plan.`)
  return (
    <GateState
      reason="plan"
      title={headline}
      description={description ?? featureBlurb(feature)}
      icon={icon}
      action={
        action ?? <UpgradeButton requiredPlan={requiredPlan} feature={feature} />
      }
      className={cn(variant === 'compact' && 'gap-2 px-4 py-6', className)}
    />
  )
}
