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
  PLAN_BLURBS,
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

/** Everything the tier adds, for the plan-level case where nothing was
 *  refused and the whole tier IS the subject. */
function tierAdds(plan: PlanKey): string[] {
  return featuresForPlan(plan)
    .filter((f) => f.minPlan === plan)
    .map((f) => f.label)
}

export function UpgradeDialog({ request, onOpenChange, onCheckout }: UpgradeDialogProps) {
  const open = request !== null
  const plan = request?.requiredPlan ?? null
  const feature = request?.feature ?? null
  const metric = request?.metric ?? null

  /**
   * A PLAN-LEVEL REQUEST IS NOT A DENIAL, and it cannot borrow the denial copy.
   *
   * Every sentence below is built around a subject — the feature that was
   * locked, or the allowance that ran out. Arriving from a price card there is
   * no subject and there never was one: the customer chose a tier, nothing
   * refused them anything.
   *
   * Run through the feature template anyway, that produced a heading reading
   * "This feature is on Plus" and, because `featureLabel('')` falls back to the
   * key it was given, the sentence "Plus includes ." — a word and a full stop,
   * rendered in the accent panel with a sparkle beside it, at the moment
   * somebody had decided to spend money.
   *
   * `origin` is inferred as well as read: any request with no feature and no
   * metric is a plan-level one whatever it claims, so a caller that forgets the
   * field still gets sensible copy rather than the broken sentence.
   */
  const planLevel = request !== null && !feature && !metric && plan !== null

  // 1. What is locked — or, at plan level, what is being bought.
  const subject = feature
    ? featureLabel(feature)
    : metric
      ? metricLabel(metric)
      : plan
        ? PLAN_LABELS[plan]
        : 'This feature'

  // 2. Why you would want it.
  const why = feature
    ? featureBlurb(feature)
    : metric && plan
      ? `You’ve reached your ${metricLabel(metric)} limit.`
      : planLevel && plan
        ? PLAN_BLURBS[plan]
        : ''

  // 3. What changes if you upgrade.
  const outcome = metric
    ? upgradeValueLine(metric, plan)
    : planLevel && plan
      ? `${PLAN_LABELS[plan]} gives you ${planAllowanceOf('resumes', plan)}.`
      : plan && feature
        ? `${PLAN_LABELS[plan]} includes ${featureLabel(feature)}.`
        : null

  // At plan level the whole tier is the subject, so list all of it rather than
  // the three-item teaser that makes sense beside a specific lock.
  const extras = plan ? (planLevel ? tierAdds(plan) : alsoIncluded(plan, feature)) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {/* A feature, an allowance and a whole tier need three different
                sentences. "résumés is on Plus" is what one shared template
                produces, and it is not English — a quota is a quantity, so it
                asks for MORE. A tier is not a thing you are missing at all, so
                it does not "go on" anything; you move to it. */}
            {!plan
              ? `${subject} isn’t in your plan`
              : planLevel
                ? `Move to ${PLAN_LABELS[plan]}`
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

          {/* WHAT ACTUALLY HAPPENS NEXT.
              There is no checkout, so the honest answer is that a person
              applies the change — and saying so is what stops "Contact us to
              upgrade" reading as a brush-off. Stated once, here, rather than
              left for the customer to infer from a button. */}
          {!onCheckout ? (
            <p className="hl-caption text-hl-fg-tertiary">
              Self-serve checkout isn’t live yet. Tell us and we’ll move you across
              — usually the same working day, and nothing you’ve already analysed is
              affected.
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
            /**
             * No checkout yet, so this leads to a page rather than a `mailto:`.
             *
             * It WAS a bare `mailto:support@hirelens.app`. That does nothing at
             * all for anyone working from webmail without a registered protocol
             * handler — most recruiters — and when it fails it fails silently,
             * so the customer concludes they were ignored rather than that
             * their browser dropped the click. It was also the terminus of the
             * entire upgrade funnel: every lock, every quota wall and every 402
             * in the product ended there.
             *
             * `/contact` states the address as selectable text and says what
             * happens after you write, so copying always works even when
             * clicking does not. A full navigation is correct — it crosses out
             * of the `.hl` scope into the public site.
             */
            <Button variant="primary" asChild>
              <a href="/contact">Contact us to upgrade</a>
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

  /**
   * HAND OVER, DO NOT STACK. This dialog closes as checkout takes ownership.
   *
   * It used to stay open underneath, so two Radix dialogs were mounted at once
   * — visibly, both headed "Move to Plus" — and that had a consequence far worse
   * than the redundancy. A modal Radix dialog writes `pointer-events: none` onto
   * <body>, and ONE is enough to hold it. Razorpay Checkout mounts
   * `.razorpay-container` as a direct child of <body>, so it inherited the lock
   * and every control in the payment modal became unclickable.
   *
   * Making the checkout dialog non-modal for the handoff was necessary and not
   * sufficient: this one stayed modal behind it and kept the body locked.
   * `elementFromPoint` at the centre of the screen returned a list item from
   * THIS dialog's feature list rather than Razorpay's modal.
   *
   * The customer's symptom was precise and worth remembering: mouse dead,
   * keyboard fine. `pointer-events` blocks hit-testing only, so tabbing still
   * reached the payment fields — which is how the first Test Mode payment was
   * completed at all.
   */
  const startCheckout = React.useCallback(
    (next: UpgradeRequest) => {
      setRequest(null)
      onCheckout?.(next)
    },
    [onCheckout],
  )

  return (
    <UpgradeActionProvider onUpgrade={handle}>
      {children}
      <UpgradeDialog
        request={request}
        onOpenChange={(open) => {
          if (!open) setRequest(null)
        }}
        // Undefined when there is no checkout, so the dialog keeps rendering its
        // "contact us" footer rather than a button that would do nothing.
        onCheckout={onCheckout ? startCheckout : undefined}
      />
    </UpgradeActionProvider>
  )
}
