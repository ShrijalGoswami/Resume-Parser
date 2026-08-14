'use client'

import * as React from 'react'
import { isPlanGateError, planDenialOf } from '@/lib/api-error'
import { normalizePlan, upgradeTargetFor } from '../lib/entitlements/catalog'
import { useUpgradeAction } from './upgrade-action'

/**
 * Route a failed request to the right surface.
 *
 * Before this, a 402 arrived as a toast carrying the server's sentence — which
 * was accurate and useless. "AI Copilot is available on the Pro plan" with a
 * dismiss button tells a customer what they cannot do and gives them nothing to
 * do about it. The server already sends everything a real upgrade surface needs
 * as structured fields; this is what stops that payload being thrown away at
 * the last step.
 *
 * Returns `true` when the error WAS a plan denial and has been handled, so call
 * sites read:
 *
 *     catch (e) { if (!handleDenial(e)) setError(messageOf(e)) }
 *
 * Anything that is not a 402 is left alone deliberately. A network failure or a
 * 500 shown as an upgrade prompt is the same false accusation the gate hooks
 * are built to avoid — worse here, because it follows an action the customer
 * deliberately took.
 */
export function usePlanDenialHandler(): (error: unknown) => boolean {
  const upgrade = useUpgradeAction()

  return React.useCallback(
    (error: unknown) => {
      if (!isPlanGateError(error)) return false
      const denial = planDenialOf(error)
      if (!denial) {
        // A legacy 403 "capability is not enabled" with no structured body. It
        // is still a plan problem, so it still opens the dialog — with nothing
        // to name, which the dialog handles rather than inventing a tier.
        upgrade({})
        return true
      }
      upgrade({
        feature: denial.feature,
        metric: denial.metric,
        // The server's tier, reconciled with the catalog: a Free user refused
        // at webhooks is told "pro" by the router gate that fired first, and
        // upgrading to Pro would not unlock webhooks.
        requiredPlan: upgradeTargetFor(denial.required_plan, denial.feature),
      })
      return true
    },
    [upgrade],
  )
}

/**
 * The quota figures carried by a 402, when it was a limit rather than a lock.
 * Lets a surface render the wall with the server's own numbers instead of the
 * possibly-staler ones in the cached org context.
 */
export function quotaDenialOf(error: unknown): {
  metric: string
  used: number
  limit: number
  requiredPlan: ReturnType<typeof normalizePlan> | null
} | null {
  const denial = planDenialOf(error)
  if (!denial || denial.code !== 'limit_exceeded' || !denial.metric) return null
  return {
    metric: denial.metric,
    used: denial.used ?? 0,
    limit: denial.limit ?? 0,
    requiredPlan: denial.required_plan ? normalizePlan(denial.required_plan) : null,
  }
}
