'use client'

import * as React from 'react'
import { useOrgContext, useSubscription } from '../../lib/api/settings'
import { SettingsSection, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { PlanBadge, QuotaMeter, useUpgradeAction } from '../../entitlements'
import { METRIC_KEYS, planLabel, usePlan } from '../../lib/entitlements'
import {
  PLAN_KEYS,
  PLAN_LABELS,
  normalizePlan,
  planRank,
  upgradeCta,
  type PlanKey,
} from '../../lib/entitlements/catalog'
import { DEFAULT_CURRENCY, formatPrice, isQuoted, priceSuffix } from '@/lib/pricing'
import { Button } from '../../ui/button'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'

/* `STATUS_TONE`, `CASING` and `humanize` lived here to turn raw plan, status and
   limit-metric keys into presentable text. All three are gone: `PlanBadge` now
   owns status presentation, `planLabel` owns the plan name, and `QuotaMeter`
   owns metric copy — each from the catalog, shared with every other surface.
   Local title-casing was how "Storage Mb" and "Ai Requests" happened, and a
   plan surface is the last place that should look auto-generated. */

/** "11 September 2026", or nothing at all. A date the backend did not send is
 *  not guessed at — an invented renewal is a statement about someone's money. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function BillingSection() {
  const ctx = useOrgContext()
  const subscription = useSubscription()
  const upgrade = useUpgradeAction()
  const plan = usePlan()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.ORG_MANAGE)
  const current = subscription.data

  /**
   * EVERY tier the customer could buy — not the next one up.
   *
   * This was `nextPlan(plan.plan)`, a single target, and that turned a price
   * list into a ladder: a Free organization was offered Plus and only Plus, so
   * the one screen where somebody goes to spend money made Pro reachable only
   * by buying Plus first. Nobody decided that; it fell out of a helper named
   * "next". The backend never agreed with it either — `start_checkout` accepts
   * `plan='pro'` from a Free organization and always has.
   *
   * Derived, never written: "Upgrade to Pro" typed into a component is
   * `if (plan === 'PRO')` wearing a nicer coat, and it would go on offering Pro
   * to a Pro customer. `isQuoted` keeps Enterprise out for the same reason
   * `PlanCta` does — it has no list price, so it is a conversation rather than
   * a checkout — and the rank comparison keeps a downgrade from ever appearing.
   *
   * EMPTY FOR A FOUNDING ORGANIZATION, and that is the important case. Founding
   * is a RULESET, not a plan — `plan_ruleset: 'founding'` grants every
   * capability with no limits, while the plan slug underneath may be anything
   * and normalizes to `free`. Keying off the slug would put "Upgrade to Plus"
   * in front of the grandfathered customers, offering to sell them less than
   * they already have, on the one screen where they check what they are owed.
   * Founding organizations are never billed — no checkout, no CTA.
   *
   * Empty while the plan is loading or errored, too: an upgrade CTA is a claim
   * about what someone lacks, and that is not a claim to make on a guess.
   */
  /**
   * The tier already queued for the end of this period, if any.
   *
   * Normalized through the catalog so an unrecognised value from the API
   * degrades to nothing shown rather than to a broken label.
   */
  const scheduledPlan: PlanKey | null =
    current?.scheduled_plan ? normalizePlan(current.scheduled_plan) : null

  const upgradeTargets: PlanKey[] =
    plan.state === 'ready' && !plan.isFounding
      ? PLAN_KEYS.filter(
          (candidate) =>
            candidate !== 'free' &&
            !isQuoted(candidate) &&
            planRank(candidate) > planRank(plan.plan) &&
            // NEVER OFFER WHAT IS ALREADY BOOKED. The backend is idempotent and
            // would return the existing schedule rather than queue a second,
            // but a button that reads "Upgrade to Pro" to somebody who has
            // already scheduled Pro is telling them it did not work.
            candidate !== scheduledPlan,
        )
      : []

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

              The CTA opens the SAME dialog every lock and quota wall opens, and
              that dialog now carries a real checkout — this surface inherited it
              with no change here, exactly as intended. `origin: 'plan'` because
              nothing refused anyone — they came to Settings to change tier. */}

          {/* WHAT THE CUSTOMER PAID FOR, when the backend actually knows.
              Rendered only for a gateway-billed subscription: a founding or
              operator-set plan has no period and no renewal, and inventing one
              would be a promise about somebody's money. `cancel_at_period_end`
              flips the label from "Renews" to "Access until", because after a
              cancellation that same date means the opposite thing. */}
          {current.current_period_end ? (
            <dl className="flex flex-col gap-2 rounded-hl-lg border border-hl-border bg-hl-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Billing</dt>
                <dd className="hl-small">Monthly</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">
                  {current.cancel_at_period_end ? 'Access until' : 'Renews'}
                </dt>
                <dd className="hl-small">{formatDate(current.current_period_end)}</dd>
              </div>
            </dl>
          ) : null}

          {/* AN UPGRADE THAT IS ALREADY BOOKED, stated instead of sold again.
              Persisted by migration 0029, so this survives a refresh — held
              only in the tab that scheduled it, a reload would show the CTA
              again and invite a second attempt at something already queued. */}
          {scheduledPlan ? (
            <div className="flex flex-col gap-2 rounded-hl-lg border border-hl-accent-subtle bg-hl-accent-subtle p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="hl-body-medium text-hl-accent-fg">
                  {PLAN_LABELS[scheduledPlan]} upgrade scheduled
                </span>
                <span className="hl-small tabular-nums text-hl-accent-fg">
                  {formatPrice(scheduledPlan, DEFAULT_CURRENCY)}
                  {priceSuffix(scheduledPlan, DEFAULT_CURRENCY)}
                </span>
              </div>
              <p className="hl-caption text-hl-fg-secondary">
                {current.scheduled_plan_effective_at
                  ? `Effective ${formatDate(current.scheduled_plan_effective_at)}. `
                  : ''}
                No charge today. Your {planLabel(current.plan)} plan remains active
                until your current billing period ends.
              </p>
            </div>
          ) : null}

          {canManage && upgradeTargets.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {upgradeTargets.map((target, index) => (
                <Button
                  key={target}
                  // The cheapest available step is the quiet default and the
                  // rest are secondary — a price list, not a recommendation.
                  variant={index === 0 ? 'primary' : 'secondary'}
                  onClick={() => upgrade({ requiredPlan: target, origin: 'plan' })}
                >
                  {upgradeCta(target)}
                </Button>
              ))}
              <Button variant="ghost" asChild>
                <a href="/pricing">Compare plans</a>
              </Button>
            </div>
          ) : null}

          {/* The note now covers only what checkout still cannot do. Plus and
              Pro are self-serve; a CHANGE between them is not, because the
              backend refuses it (BILL-13) rather than pretending. Saying so
              here is what stops a 409 from reading as a bug. */}
          <DeferredNote title="Changing an existing subscription">
            {canManage
              ? 'Plus and Pro can be bought here. Moving between paid plans, or back down, is still applied by us — tell us and we’ll move you across, usually the same working day. Nothing you’ve already analysed is affected.'
              : 'Only an owner can change the organization’s plan.'}
          </DeferredNote>
        </div>
      )}
    </SettingsSection>
  )
}
