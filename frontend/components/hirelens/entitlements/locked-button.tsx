'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { Button, type ButtonProps } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { PLAN_LABELS, featureLabel } from '../lib/entitlements/catalog'
import { usePlanGate } from '../lib/entitlements/use-entitlement'
import { useUpgradeAction } from './upgrade-action'

/**
 * A control whose capability the organization has not bought.
 *
 * IT IS NOT DISABLED, and that is the design decision worth defending. A
 * greyed-out button explains nothing, cannot be focused, cannot hold a tooltip
 * on touch, and reads as a bug — the user's own conclusion is "this product is
 * broken", not "this costs more". A locked control instead stays interactive,
 * carries a lock glyph, says what it needs on hover, and routes a click to the
 * upgrade path. The customer learns the product does the thing they wanted,
 * which is the entire commercial point of locking rather than hiding.
 *
 * The four states are kept apart here too:
 *   loading — render the real control, disabled and quiet. No lock, no upsell:
 *             we do not yet know there is anything to sell.
 *   error   — render the real control, ENABLED. We failed to find out, so we
 *             do not withhold; the server still enforces, and a 402 surfaces a
 *             proper upgrade dialog. Never accuse on a failed request.
 *   denied  — the lock.
 *   allowed — the ordinary control.
 */
export interface LockedButtonProps extends ButtonProps {
  feature: string
  /** Tooltip copy override. Derived from the catalog by default. */
  lockedHint?: string
}

export function LockedButton({
  feature,
  lockedHint,
  children,
  onClick,
  disabled,
  ...props
}: LockedButtonProps) {
  const gate = usePlanGate(feature)
  const upgrade = useUpgradeAction()

  if (gate.state === 'loading') {
    return (
      <Button {...props} disabled aria-busy>
        {children}
      </Button>
    )
  }

  if (gate.state === 'denied') {
    const hint =
      lockedHint ??
      (gate.requiredPlan
        ? `${featureLabel(feature)} is available on the ${PLAN_LABELS[gate.requiredPlan]} plan.`
        : `${featureLabel(feature)} is not included in your plan.`)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            // Not `disabled`: the click is the upgrade path, and a disabled
            // control would also drop the tooltip on touch devices.
            onClick={() =>
              upgrade({ feature, requiredPlan: gate.requiredPlan })
            }
            data-locked="true"
          >
            <Sparkles aria-hidden />
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button {...props} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}
