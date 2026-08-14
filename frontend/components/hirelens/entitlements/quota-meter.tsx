'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { upgradeValueLine } from '../lib/entitlements/catalog'
import { QUOTA_WARN_RATIO, useQuota } from '../lib/entitlements/use-entitlement'
import { UpgradeButton } from './upgrade-button'

/**
 * Usage against one plan allowance.
 *
 * SILENT UNTIL IT MATTERS. Below 80% this renders nothing at all. A meter that
 * is always on screen turns a generous allowance into a countdown, and teaches
 * the customer to watch a number instead of using the product — the opposite of
 * what a limit is for. It appears at 80%, so the warning arrives while there is
 * still room to act, and goes red only when the next unit would actually be
 * refused.
 *
 * `variant="always"` opts a surface out of that — Settings/Billing, where the
 * figure is the content rather than an interruption.
 *
 * Unlimited plans and founding organizations render nothing in either variant:
 * there is no allowance, so there is nothing truthful for a meter to say.
 *
 * Four states again: while loading and on error it renders NOTHING rather than
 * a zeroed bar. A meter reading "0 of 2 used" because a request failed is worse
 * than no meter — it is a confident wrong number, and the user has no way to
 * tell it apart from a real one.
 */
export interface QuotaMeterProps {
  metric: string
  variant?: 'warning-only' | 'always'
  /** Show an upgrade CTA beside the figure once it is warning. */
  showUpgrade?: boolean
  className?: string
}

export function QuotaMeter({
  metric,
  variant = 'warning-only',
  showUpgrade = true,
  className,
}: QuotaMeterProps) {
  const quota = useQuota(metric)

  // Never render a number we are not sure of.
  if (quota.state !== 'ready') return null
  if (variant === 'warning-only' && (quota.unlimited || !quota.shouldWarn)) return null

  // In the always-on variant an unlimited allowance IS the content — a Pro
  // customer looking at their plan should read "Unlimited", not find the row
  // missing and wonder whether it failed to load. There is no bar, because a
  // bar implies a ceiling.
  if (quota.unlimited) {
    return (
      <div
        className={cn(
          'flex items-baseline justify-between gap-3 rounded-hl-md border border-hl-border p-3',
          className,
        )}
      >
        <span className="hl-caption text-hl-fg-secondary">{quota.label}</span>
        <span className="hl-caption inline-flex items-center gap-1 font-medium text-hl-fg">
          <Check className="size-3.5 text-hl-success" aria-hidden />
          Unlimited
        </span>
      </div>
    )
  }

  const pct = Math.round(quota.ratio * 100)
  const renews = quota.window === 'month'
  const value = upgradeValueLine(metric, quota.requiredPlan)

  return (
    <div
      className={cn('flex flex-col gap-1.5 rounded-hl-md border border-hl-border p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="hl-caption text-hl-fg-secondary">
          {/* The figure reads the way the customer thinks about it: what they
              have used, out of what they were given. */}
          {quota.used} of {quota.limit} {quota.label} used
        </span>
        {quota.isExhausted ? (
          <span className="hl-caption text-hl-danger">
            {renews ? 'Renews next month' : 'No credits left'}
          </span>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-valuenow={quota.used}
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-label={`${quota.label} used`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-hl-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-[var(--hl-dur-slow)]',
            // Colour follows the level, not the variant: in `always` mode a
            // healthy meter must not sit there amber, implying a problem that
            // is four fifths of an allowance away.
            quota.level === 'exhausted'
              ? 'bg-[color:var(--hl-danger)]'
              : quota.level === 'warning'
                ? 'bg-[color:var(--hl-warning)]'
                : 'bg-hl-accent',
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      {/* Counting down states a problem. This states the outcome — the third
          of the three questions every upgrade surface has to answer ("what
          happens if I upgrade?"). One derived sentence is enough to make it a
          decision rather than a warning; anything longer reads as an advert. */}
      {value ? <p className="hl-caption text-hl-fg-secondary">{value}</p> : null}

      {showUpgrade && quota.requiredPlan ? (
        <div className="mt-1 flex justify-end">
          <UpgradeButton requiredPlan={quota.requiredPlan} metric={metric} size="sm" />
        </div>
      ) : null}
    </div>
  )
}

export { QUOTA_WARN_RATIO }
