'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '../ui/button'
import { upgradeCta, type PlanKey } from '../lib/entitlements/catalog'
import { useUpgradeAction } from './upgrade-action'

/**
 * The one upgrade CTA. Its label is DERIVED — "Upgrade to Pro" is never typed
 * into a component, because a hardcoded tier is `if (plan === 'PRO')` wearing a
 * nicer coat: it goes stale silently the moment a feature moves tier, and the
 * customer is the one who finds out.
 *
 * `requiredPlan` should come from `usePlanGate`/`useQuota` (which already
 * reconcile the server's answer against the catalog) or from a 402's
 * `required_plan`. When it is null the label falls back to a bare "Upgrade" —
 * true when nothing higher would help, and better than inventing a tier.
 */
export interface UpgradeButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  requiredPlan?: PlanKey | null
  feature?: string | null
  metric?: string | null
  /** Override the derived label only for genuinely different copy
   *  ("See plans"), never to name a tier by hand. */
  label?: string
}

export function UpgradeButton({
  requiredPlan = null,
  feature = null,
  metric = null,
  label,
  variant = 'primary',
  size = 'sm',
  ...props
}: UpgradeButtonProps) {
  const upgrade = useUpgradeAction()
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => upgrade({ feature, metric, requiredPlan })}
      {...props}
    >
      {label ?? upgradeCta(requiredPlan)}
    </Button>
  )
}
