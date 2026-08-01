'use client'

import * as React from 'react'
import { ErrorState } from '../states/error-state'
import { LoadingLines } from '../states/loading'
import { usePlanGate } from '../lib/entitlements/use-entitlement'
import { FeatureLock } from './feature-lock'

/**
 * Screen- and section-level entitlement boundary. The four states of
 * `usePlanGate`, rendered.
 *
 * The state that matters is ERROR. When `/org/context` fails — and it does fail
 * often enough to see inside one session — this renders "this didn't load" with
 * a retry, NOT a lock. Rendering an upgrade prompt because a request failed
 * shows "Upgrade to Pro" to a customer who already pays for Pro, and the only
 * remedy it suggests is to pay again for what they have. There is no version of
 * that which is acceptable, so the distinction is structural here rather than a
 * rule someone has to remember at each call site.
 *
 * Loading renders skeleton lines: content appearing a moment late is always
 * better than a lock that appears and then withdraws.
 */
export interface PlanGateProps {
  feature: string
  children: React.ReactNode
  /** Replace the denied surface (e.g. a card-sized lock instead of the default). */
  fallback?: React.ReactNode
  /** Replace the loading surface — use a shape matching the real content. */
  loading?: React.ReactNode
  className?: string
}

export function PlanGate({ feature, children, fallback, loading, className }: PlanGateProps) {
  const gate = usePlanGate(feature)

  if (gate.state === 'loading') {
    return <div className={className}>{loading ?? <LoadingLines lines={3} />}</div>
  }

  if (gate.state === 'error') {
    return (
      <div className={className}>
        <ErrorState
          title="This didn't load"
          description="We couldn't check what your plan includes. Try again."
          onRetry={gate.retry}
        />
      </div>
    )
  }

  if (gate.state === 'denied') {
    return (
      <div className={className}>
        {fallback ?? <FeatureLock feature={gate.feature} requiredPlan={gate.requiredPlan} />}
      </div>
    )
  }

  return <>{children}</>
}
