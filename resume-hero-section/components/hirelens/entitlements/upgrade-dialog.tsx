'use client'

import * as React from 'react'
import { Check, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { Button } from '../ui/button'
import {
  PLAN_LABELS,
  featureBlurb,
  featureLabel,
  featuresForPlan,
  metricLabel,
  planAllowanceOf,
  upgradeValueLine,
  type MetricKey,
  type PlanKey,
} from '../lib/entitlements/catalog'
import { UpgradeActionProvider, type UpgradeRequest } from './upgrade-action'

/**
 * The upgrade surface every locked control, lock panel and 402 leads to.
 *
 * EVERY UPGRADE PROMPT ANSWERS THREE QUESTIONS, and this dialog is where all
 * three are answered in full:
 *
 *   1. What is locked?      the catalog label — the feature or the allowance
 *   2. Why would I want it? the catalog blurb, or the figure that ran out
 *   3. What do I get?       the derived value line, plus what else the tier adds
 *
 * A surface that answers only the first is an obstacle. One that answers the
 * first two is an explanation. Only the third makes it a decision, and it is
 * the one most often left out because it is the only one that cannot be written
 * without knowing the catalog.
 *
 * There is still no self-service checkout — the API has no subscription write
 * path and the database revokes one. So the dialog is honest about the next
 * step rather than presenting a button that cannot do anything. When billing
 * ships, the footer action changes here and nowhere else.
 */

export interface UpgradeDialogProps {
  request: UpgradeRequest | null
  onOpenChange: (open: boolean) => void
  /** Replaces the "contact us" footer once checkout exists. */
  onCheckout?: (request: UpgradeRequest) => void
}

/** Up to three things the target tier adds beyond the one that was blocked. */
function alsoIncluded(plan: PlanKey, exclude: string | null | undefined): string[] {
  return featuresForPlan(plan)
    .filter((f) => f.minPlan === plan && f.key !== exclude)
    .slice(0, 3)
    .map((f) => f.label)
}

export function UpgradeDialog({ request, onOpenChange, onCheckout }: UpgradeDialogProps) {
  const open = request !== null
  const plan = request?.requiredPlan ?? null
  const feature = request?.feature ?? null
  const metric = request?.metric ?? null

  // 1. What is locked.
  const subject = feature
    ? featureLabel(feature)
    : metric
      ? metricLabel(metric)
      : 'This feature'

  // 2. Why you would want it.
  const why = feature
    ? featureBlurb(feature)
    : metric && plan
      ? `You've reached your ${metricLabel(metric)} limit.`
      : ''

  // 3. What changes if you upgrade.
  const outcome = metric
    ? upgradeValueLine(metric, plan)
    : plan
      ? `${PLAN_LABELS[plan]} includes ${featureLabel(feature ?? '')}.`
      : null

  const extras = plan ? alsoIncluded(plan, feature) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {/* A feature and an allowance need different sentences. "résumés is
                on Plus" is what one shared template produces, and it is not
                English — a quota is a quantity, so it asks for MORE. */}
            {!plan
              ? `${subject} isn't in your plan`
              : metric && !feature
                ? `More ${subject} are on ${PLAN_LABELS[plan]}`
                : `${subject} is on ${PLAN_LABELS[plan]}`}
          </DialogTitle>
          {why ? <DialogDescription>{why}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {outcome ? (
            <p className="hl-body-medium inline-flex items-start gap-2 rounded-hl-md bg-hl-accent-subtle p-3 text-hl-accent-fg">
              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
              {outcome}
            </p>
          ) : null}

          {/* The rest of the tier. Not a price list — three concrete
              capabilities, so the decision is about what the team gets rather
              than about a number. */}
          {extras.length > 0 && plan ? (
            <div className="flex flex-col gap-1.5">
              <p className="hl-caption text-hl-fg-tertiary">
                {PLAN_LABELS[plan]} also includes
              </p>
              <ul className="flex flex-col gap-1">
                {extras.map((label) => (
                  <li key={label} className="hl-small inline-flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-hl-success" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Metric limits are worth stating plainly next to the feature list —
              a team deciding on a tier is usually deciding on volume. */}
          {plan && metric ? (
            <p className="hl-caption text-hl-fg-tertiary">
              {PLAN_LABELS[plan]} gives you {planAllowanceOf(metric as MetricKey, plan)}.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Not now</Button>
          </DialogClose>
          {onCheckout && request ? (
            <Button variant="primary" onClick={() => onCheckout(request)}>
              {plan ? `Upgrade to ${PLAN_LABELS[plan]}` : 'Upgrade'}
            </Button>
          ) : (
            // No checkout yet. Saying so — and giving the one route that does
            // work — beats a button that silently does nothing, which is how a
            // customer concludes the product is broken rather than unfinished.
            <Button variant="primary" asChild>
              <a href="mailto:support@hirelens.app?subject=Upgrade%20my%20plan">
                Contact us to upgrade
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Mounts the dialog and wires it to every upgrade CTA in the app.
 *
 * One provider near the root means a lock, a locked button and a 402 all reach
 * the same surface, and Phase 3 swaps a mailto for a checkout session in a
 * single place.
 */
export function UpgradeDialogProvider({
  children,
  onCheckout,
}: {
  children: React.ReactNode
  onCheckout?: (request: UpgradeRequest) => void
}) {
  const [request, setRequest] = React.useState<UpgradeRequest | null>(null)
  const handle = React.useCallback((next: UpgradeRequest) => setRequest(next), [])

  return (
    <UpgradeActionProvider onUpgrade={handle}>
      {children}
      <UpgradeDialog
        request={request}
        onOpenChange={(open) => {
          if (!open) setRequest(null)
        }}
        onCheckout={onCheckout}
      />
    </UpgradeActionProvider>
  )
}
