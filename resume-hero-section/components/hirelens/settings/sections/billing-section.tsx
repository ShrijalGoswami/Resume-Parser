'use client'

import * as React from 'react'
import { useOrgContext, useSubscription } from '../../lib/api/settings'
import { SettingsSection, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { PlanBadge, QuotaMeter } from '../../entitlements'
import { METRIC_KEYS, planLabel } from '../../lib/entitlements'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'

/* `STATUS_TONE`, `CASING` and `humanize` lived here to turn raw plan, status and
   limit-metric keys into presentable text. All three are gone: `PlanBadge` now
   owns status presentation, `planLabel` owns the plan name, and `QuotaMeter`
   owns metric copy — each from the catalog, shared with every other surface.
   Local title-casing was how "Storage Mb" and "Ai Requests" happened, and a
   plan surface is the last place that should look auto-generated. */

export function BillingSection() {
  const ctx = useOrgContext()
  const subscription = useSubscription()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.ORG_MANAGE)
  const current = subscription.data

  return (
    <SettingsSection title="Billing & plan" description="Your subscription tier and its limits.">
      {subscription.isLoading ? (
        <Skeleton className="h-40" />
      ) : subscription.isError || !current ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load your plan"
          onRetry={() => subscription.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Sits inline with a status badge — the section heading step,
                  not the one above it. `planLabel` normalizes the stored slug,
                  so an account sold as `business` reads "Pro" rather than being
                  shown a database value. */}
              <span className="hl-h3">{planLabel(current.plan)}</span>
              {/* The shared badge: it encodes founding, past-due and trialing in
                  one place, so this section no longer decides how a plan looks. */}
              <PlanBadge />
            </div>

            {/* Usage, not just limits. The old grid listed allowances with no
                indication of how much was left, which is the half of the fact
                that does not help anyone. Meters show both, in the same visual
                language as the warning that appears in the Inbox — this is the
                one surface where they are always visible, because here the
                figure IS the content rather than an interruption.

                Only the four catalog metrics are shown. `subscriptions.limits`
                can still carry pre-catalog keys that nothing enforces, and a
                limit the product does not enforce is not information — it is a
                rule the customer will believe and we will not apply. */}
            <div className="grid gap-2 sm:grid-cols-2">
              {METRIC_KEYS.map((metric) => (
                <QuotaMeter key={metric} metric={metric} variant="always" showUpgrade={false} />
              ))}
            </div>
          </Card>

          <DeferredNote title="Your plan is managed by billing">
            {canManage
              ? 'Plan changes go through billing. Self-serve upgrade and payment arrive with the pricing release; until then, contact support to move plans.'
              : 'Only an owner can change the organization’s plan.'}
          </DeferredNote>
        </div>
      )}
    </SettingsSection>
  )
}
