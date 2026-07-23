'use client'

import * as React from 'react'
import { useOrgContext, useSubscription, useUpdateSubscription } from '../../lib/api/settings'
import { SettingsSection, Field, NativeSelect, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge, type BadgeProps } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'

const PLANS = ['free', 'professional', 'business', 'enterprise'] as const

const STATUS_TONE: Record<string, BadgeProps['variant']> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'neutral',
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function BillingSection() {
  const ctx = useOrgContext()
  const subscription = useSubscription()
  const update = useUpdateSubscription()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.ORG_MANAGE)

  const [plan, setPlan] = React.useState<string | null>(null)
  const current = subscription.data
  const selectedPlan = plan ?? current?.plan ?? 'free'
  const changed = current ? selectedPlan !== current.plan : false

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
              <span className="hl-h2 capitalize">{humanize(current.plan)}</span>
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

          {canManage ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Change plan" htmlFor="billing-plan">
                <NativeSelect
                  id="billing-plan"
                  value={selectedPlan}
                  onChange={(event) => setPlan(event.target.value)}
                >
                  {PLANS.map((value) => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Button
                variant="primary"
                size="sm"
                disabled={!changed}
                loading={update.isPending}
                onClick={() =>
                  update.mutate(selectedPlan, {
                    onSuccess: () => {
                      toast({ variant: 'success', title: `Plan changed to ${humanize(selectedPlan)}` })
                      setPlan(null)
                    },
                    onError: (error) =>
                      toast({
                        variant: 'danger',
                        title: error instanceof Error ? error.message : 'Change failed',
                      }),
                  })
                }
              >
                Change plan
              </Button>
            </div>
          ) : null}

          <DeferredNote title="Invoices & payment are handled separately">
            This manages your plan tier and limits. Payment methods, invoices, and seat billing live
            outside HireLens for now.
          </DeferredNote>
        </div>
      )}
    </SettingsSection>
  )
}
