'use client'

import * as React from 'react'
import { useOrgContext, useSubscription } from '../../lib/api/settings'
import { SettingsSection, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge, type BadgeProps } from '../../ui/badge'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'

const STATUS_TONE: Record<string, BadgeProps['variant']> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'neutral',
}

/* Initial-caps on every word turned the limit keys into "Storage Mb" and
   "Ai Requests" — the same shape of defect as the "Ats" category on the
   Integrations page. Acronyms and units are cased explicitly; a plan surface is
   the last place that should look auto-generated. */
const CASING: Record<string, string> = {
  ai: 'AI', api: 'API', mb: 'MB', gb: 'GB', ats: 'ATS', sso: 'SSO', id: 'ID',
}

function humanize(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w+/g, (word) => CASING[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
}

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
                  not the one above it. */}
              <span className="hl-h3 capitalize">{humanize(current.plan)}</span>
              <Badge variant={STATUS_TONE[current.status] ?? 'neutral'} className="capitalize">
                {humanize(current.status)}
              </Badge>
            </div>
            {Object.keys(current.limits).length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(current.limits).map(([metric, value]) => (
                  <div
                    key={metric}
                    className="flex items-center justify-between rounded-hl-md border border-hl-border-subtle px-3 py-2"
                  >
                    <span className="hl-small text-hl-fg-secondary">{humanize(metric)}</span>
                    <span className="hl-small font-medium text-hl-fg">
                      {value < 0 ? 'Unlimited' : value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
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
