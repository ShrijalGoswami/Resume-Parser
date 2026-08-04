'use client'

import * as React from 'react'
import { useOrgContext, useSubscription } from '../../lib/api/settings'
import { SettingsSection, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { PlanBadge, QuotaMeter, useUpgradeAction } from '../../entitlements'
import { METRIC_KEYS, planLabel, usePlan } from '../../lib/entitlements'
import { nextPlan, upgradeCta } from '../../lib/entitlements/catalog'
import { Button } from '../../ui/button'
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
  const upgrade = useUpgradeAction()
  const plan = usePlan()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.ORG_MANAGE)
  const current = subscription.data

  /**
   * The next tier up, or null when there is nothing to sell.
   *
   * Derived, never written: "Upgrade to Pro" typed into a component is
   * `if (plan === 'PRO')` wearing a nicer coat, and it would go on offering Pro
   * to a Pro customer.
   *
   * NULL FOR A FOUNDING ORGANIZATION, and that is the important case. Founding
   * is a RULESET, not a plan — `plan_ruleset: 'founding'` grants every
   * capability with no limits, while the plan slug underneath may be anything
   * and normalizes to `free`. Keying off the slug would put "Upgrade to Plus"
   * in front of the grandfathered customers, offering to sell them less than
   * they already have, on the one screen where they check what they are owed.
   * Founding organizations are never billed — no checkout, no CTA.
   *
   * Null while the plan is loading or errored, too: an upgrade CTA is a claim
   * about what someone lacks, and that is not a claim to make on a guess.
   */
  const upgradeTo =
    plan.state === 'ready' && !plan.isFounding ? nextPlan(plan.plan) : null

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

          {/* THE ONE SCREEN A CUSTOMER OPENS TO SPEND MONEY, and it had no way
              to. It showed the plan name and four meters, and stopped: no
              upgrade control, no link to the comparison, and `showUpgrade` off
              on every meter — so an exhausted Free organization could read
              exactly how exhausted it was and be offered no remedy at all.

              The CTA opens the SAME dialog every lock and quota wall opens, so
              when checkout lands this surface inherits it with no change here.
              `origin: 'plan'` because nothing refused anyone — they came to
              Settings to change tier. */}
          {canManage && upgradeTo ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => upgrade({ requiredPlan: upgradeTo, origin: 'plan' })}
              >
                {upgradeCta(upgradeTo)}
              </Button>
              <Button variant="ghost" asChild>
                <a href="/pricing">Compare plans</a>
              </Button>
            </div>
          ) : null}

          <DeferredNote title="Your plan is managed by billing">
            {canManage
              ? // Was "…arrive with the pricing release". The pricing release
                // shipped; a customer who watched /pricing go live was being
                // told the thing they were waiting for had already arrived.
                'There’s no self-serve checkout yet, so a plan change is applied by us — usually the same working day. Nothing you’ve already analysed is affected by moving between plans.'
              : 'Only an owner can change the organization’s plan.'}
          </DeferredNote>
        </div>
      )}
    </SettingsSection>
  )
}
