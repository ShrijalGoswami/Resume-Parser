'use client'

import * as React from 'react'
import { Check, Lock, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import {
  PLAN_BLURBS,
  PLAN_LABELS,
  featuresForPlan,
  planAllowanceOf,
  type PlanKey,
} from '../lib/entitlements/catalog'
import { DEFAULT_CURRENCY, formatPrice, priceSuffix } from '@/lib/pricing'
import type { CheckoutPhase } from './checkout-machine'

/**
 * The HireLens side of checkout — everything except the gateway's own modal.
 *
 * ONE SURFACE, EVERY PHASE. A customer who clicks "Upgrade to Pro" and a
 * customer watching us confirm their subscription are the same person thirty
 * seconds apart, and moving them between three different surfaces to say three
 * related things is how a purchase starts to feel like a form. The panel stays;
 * its contents change.
 *
 * WHAT THIS SURFACE MAY CLAIM
 * ---------------------------
 * Only what has been verified server-side. `active` is reachable ONLY after the
 * webhook has written the plan and our own API has confirmed it — never from
 * Razorpay's browser callback, which runs on hardware we do not control. The
 * gap between "paid" and "active" is real, usually short, and stated plainly
 * rather than papered over with an optimistic success screen. See
 * `docs/BILLING_ARCHITECTURE.md` §7.2.
 *
 * COPY COMES FROM THE CATALOG. Not one benefit is written here: the feature
 * list, the allowance line and the plan blurb are the same strings the pricing
 * page and every lock render, so a tier cannot promise one thing at the lock
 * and another at the till.
 */

export interface CheckoutDialogProps {
  open: boolean
  phase: CheckoutPhase
  plan: PlanKey | null
  /** The plan the organization is on now, when it is worth naming. */
  currentPlan?: PlanKey | null
  /** Renewal date from the backend, once the subscription is active. */
  renewsAt?: string | null
  /** Human-readable failure. Never a raw gateway or stack message. */
  errorMessage?: string | null
  onConfirm: () => void
  onRetry: () => void
  onClose: () => void
  onDone: () => void
}

/** Up to four capabilities the tier adds. The panel is a decision, not a
 *  comparison table — the full matrix is a click away on /pricing. */
function tierHighlights(plan: PlanKey): string[] {
  return featuresForPlan(plan)
    .filter((f) => f.minPlan === plan)
    .slice(0, 4)
    .map((f) => f.label)
}

function formatRenewal(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Phases where the gateway modal owns the screen, so ours must not compete. */
const HANDED_OFF: CheckoutPhase[] = ['awaiting_payment']

export function CheckoutDialog({
  open,
  phase,
  plan,
  currentPlan,
  renewsAt,
  errorMessage,
  onConfirm,
  onRetry,
  onClose,
  onDone,
}: CheckoutDialogProps) {
  const price = plan ? formatPrice(plan, DEFAULT_CURRENCY) : ''
  const suffix = plan ? priceSuffix(plan, DEFAULT_CURRENCY) : ''
  const label = plan ? PLAN_LABELS[plan] : 'your plan'
  const highlights = plan ? tierHighlights(plan) : []
  const renewal = formatRenewal(renewsAt)

  /**
   * Razorpay's modal is a fixed overlay of its own. Ours stays mounted — losing
   * it would drop focus and unmount the state machine mid-payment — but goes
   * visually silent so two panels are never stacked in front of the customer.
   */
  const handedOff = HANDED_OFF.includes(phase)

  // Busy phases must not be dismissable: closing mid-verification would strand
  // a customer who has already been charged on a screen that says nothing.
  const dismissable =
    phase === 'confirm' ||
    phase === 'schedule_confirm' ||
    phase === 'cancelled' ||
    phase === 'failed'

  return (
    <Dialog
      open={open}
      /**
       * NON-MODAL WHILE RAZORPAY OWNS THE SCREEN. This is a bug fix, not a
       * preference.
       *
       * A modal Radix dialog writes `pointer-events: none` onto <body> and
       * re-enables it only on its own content. Razorpay Checkout mounts
       * `.razorpay-container` as a DIRECT CHILD OF <body>, outside our subtree,
       * so it inherited that lock and every control in the payment modal became
       * unclickable — the modal painted correctly at ₹999 and then refused every
       * click. Its own z-index of 2×10⁹ is irrelevant: `pointer-events` inherits,
       * and no stacking order defeats it.
       *
       * Measured, not guessed: with the dialog open, a probe element placed
       * where Razorpay mounts reported `pointerEvents: "none"` and was never
       * returned by `elementFromPoint`.
       *
       * `modal={false}` stops Radix writing that style and stops it trapping
       * focus, so the customer can also tab and type into the payment fields.
       * It is scoped to the handoff phase alone — every other phase keeps the
       * ordinary modal behaviour, because every other phase is a surface the
       * customer is meant to be interacting with.
       *
       * The alternative — unmounting this dialog during the handoff — would
       * take the state machine and the payment callback down with it, which is
       * the one thing that must survive.
       */
      modal={!handedOff}
      onOpenChange={(next) => {
        if (!next && dismissable) onClose()
      }}
    >
      <DialogContent
        size="sm"
        showClose={dismissable}
        /**
         * Hidden and inert, but still mounted. `opacity-0` keeps two panels from
         * stacking in front of the customer; `pointer-events-none` keeps our
         * invisible content from swallowing clicks meant for Razorpay — which
         * matters more now that the body lock is gone and this element would
         * otherwise still be hit-testable.
         *
         * Non-modal also means no scrim, so the dimmed backdrop disappears for
         * the handoff and Razorpay's own overlay is the only one on screen.
         */
        className={handedOff ? 'pointer-events-none opacity-0' : undefined}
        /**
         * A NON-MODAL Radix dialog dismisses itself when the customer interacts
         * or focuses outside it — and during the handoff, EVERY click is outside
         * it, because they are all inside Razorpay's modal. Left alone, the
         * first tap on "Cards" would try to close the surface holding the
         * payment callback.
         *
         * `onOpenChange` already refuses to act while `dismissable` is false, so
         * nothing would actually close today. These two make that survive
         * somebody later making the busy phases dismissable, and say out loud
         * that clicks landing outside are expected here rather than accidental.
         */
        onInteractOutside={(event) => {
          if (handedOff) event.preventDefault()
        }}
        onFocusOutside={(event) => {
          if (handedOff) event.preventDefault()
        }}
        // Radix requires a description for every dialog, or it warns in the
        // console. Every branch below renders DialogDescription, so this is a
        // belt-and-braces label rather than the fix.
        aria-busy={!dismissable}
      >
        {/* ── 1. Confirm: what you are buying, before anything is created ── */}
        {phase === 'confirm' && plan ? (
          <>
            <DialogHeader>
              <DialogTitle>Move to {label}</DialogTitle>
              <DialogDescription>{PLAN_BLURBS[plan]}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* THE FIGURE, given the weight it deserves. A price a customer
                  has to hunt for on a confirmation screen is a price they will
                  check again on their statement. */}
              <div className="flex items-baseline justify-between gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="hl-caption text-hl-fg-tertiary">HireLens {label}</span>
                  <span className="hl-small text-hl-fg-secondary">Billed monthly</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="hl-h1 tabular-nums">{price}</span>
                  <span className="hl-small text-hl-fg-tertiary">{suffix}</span>
                </div>
              </div>

              {currentPlan && currentPlan !== plan ? (
                <p className="hl-caption text-hl-fg-tertiary">
                  You’re on {PLAN_LABELS[currentPlan]} today.
                </p>
              ) : null}

              {highlights.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {highlights.map((item) => (
                    <li key={item} className="hl-small inline-flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-hl-success" aria-hidden />
                      {item}
                    </li>
                  ))}
                  <li className="hl-small inline-flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-hl-success" aria-hidden />
                    {planAllowanceOf('resumes', plan)}
                  </li>
                </ul>
              ) : null}

              <p className="hl-caption inline-flex items-start gap-2 text-hl-fg-tertiary">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Payment is handled by Razorpay. Card details never reach HireLens,
                and you can cancel any time.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Back
              </Button>
              <Button variant="primary" onClick={onConfirm}>
                Continue to payment
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {/* ── 2. Preparing / handed off / verifying / confirming ────────────
            Four different waits, four different sentences. "Loading" for all of
            them would be the same lie told four times: the customer's question
            changes from "is this working" to "did my money arrive", and only
            the second one is frightening. */}
        {phase === 'preparing' || phase === 'awaiting_payment' || phase === 'verifying' || phase === 'confirming' ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {phase === 'preparing'
                  ? 'Preparing secure checkout…'
                  : phase === 'verifying'
                    ? 'Payment received'
                    : phase === 'confirming'
                      ? 'Payment received'
                      : 'Complete your payment'}
              </DialogTitle>
              <DialogDescription>
                {phase === 'preparing'
                  ? 'Setting up your subscription with Razorpay. This takes a moment.'
                  : phase === 'awaiting_payment'
                    ? 'Finish in the Razorpay window to activate your plan.'
                    : 'Confirming your subscription. Don’t close this window.'}
              </DialogDescription>
            </DialogHeader>

            <div
              className="flex items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle p-4"
              role="status"
              aria-live="polite"
            >
              {/* The wrapper is the live region. `Spinner` declares its own
                  `role="status"`, and two nested status regions make a screen
                  reader announce the same wait twice — so the decoration is
                  hidden and the sentence beside it does the announcing. */}
              <Spinner className="text-hl-accent-fg" label="" role="presentation" aria-hidden />
              <span className="hl-small text-hl-fg-secondary">
                {phase === 'preparing'
                  ? 'Creating your subscription…'
                  : phase === 'verifying'
                    ? 'Verifying your payment…'
                    : phase === 'confirming'
                      ? 'Activating your plan…'
                      : 'Waiting for payment…'}
              </span>
            </div>
          </>
        ) : null}

        {/* ── 3. Slow confirmation — recoverable, never a false failure ───── */}
        {phase === 'slow' ? (
          <>
            <DialogHeader>
              <DialogTitle>Still confirming your subscription</DialogTitle>
              <DialogDescription>
                Your payment went through. Activation is taking longer than usual —
                this is on our side, not yours, and nothing further is needed from you.
              </DialogDescription>
            </DialogHeader>

            <p className="hl-small rounded-hl-lg border border-hl-border bg-hl-subtle p-4 text-hl-fg-secondary">
              Your plan will appear in Settings ▸ Billing as soon as it lands. If it
              hasn’t within a few minutes, contact us and we’ll sort it out — your
              payment is recorded either way.
            </p>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="secondary" onClick={onRetry}>
                Check again
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {/* ── 4. Active — the only screen that may say this ───────────────── */}
        {phase === 'active' && plan ? (
          <>
            <DialogHeader>
              {/* A restrained prism wash. The brand's one flourish, used once,
                  at the single moment it means something. */}
              <div
                className="mb-1 h-1 w-12 rounded-full motion-safe:animate-in motion-safe:fade-in"
                style={{ backgroundImage: 'var(--hl-gradient-prism)' }}
                aria-hidden
              />
              <DialogTitle>You’re on HireLens {label}.</DialogTitle>
              <DialogDescription>
                Your subscription is active and your workspace is ready.
              </DialogDescription>
            </DialogHeader>

            <dl className="flex flex-col gap-2 rounded-hl-lg border border-hl-border bg-hl-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Plan</dt>
                <dd className="hl-small">HireLens {label}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Billing</dt>
                <dd className="hl-small tabular-nums">
                  {price}
                  {suffix}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Status</dt>
                <dd className="hl-small text-hl-success">Active</dd>
              </div>
              {/* Only stated when the backend actually returned one. An invented
                  renewal date is a promise about somebody's money. */}
              {renewal ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="hl-caption text-hl-fg-tertiary">Renews</dt>
                  <dd className="hl-small">{renewal}</dd>
                </div>
              ) : null}
            </dl>

            <DialogFooter>
              <Button variant="primary" onClick={onDone}>
                Continue to HireLens
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {/* ── 4b. Scheduled upgrade — an existing subscriber moving up ─────
            NO CHARGE TODAY, and the panel leads with that. The customer keeps
            the plan they paid for until the period ends; the gateway swaps it
            at the boundary. Saying "Pay now" here would be false, and saying
            "You're on Pro" afterwards would be false for up to a month. */}
        {phase === 'schedule_confirm' && plan ? (
          <>
            <DialogHeader>
              <DialogTitle>Move to {label}</DialogTitle>
              <DialogDescription>{PLAN_BLURBS[plan]}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="hl-caption text-hl-fg-tertiary">HireLens {label}</span>
                  <span className="hl-small text-hl-fg-secondary">Billed monthly</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="hl-h1 tabular-nums">{price}</span>
                  <span className="hl-small text-hl-fg-tertiary">{suffix}</span>
                </div>
              </div>

              <dl className="flex flex-col gap-2">
                {currentPlan ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="hl-caption text-hl-fg-tertiary">Current plan</dt>
                    <dd className="hl-small">{PLAN_LABELS[currentPlan]}</dd>
                  </div>
                ) : null}
                {renewal ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="hl-caption text-hl-fg-tertiary">
                        {currentPlan ? `${PLAN_LABELS[currentPlan]} runs until` : 'Current period ends'}
                      </dt>
                      <dd className="hl-small">{renewal}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="hl-caption text-hl-fg-tertiary">{label} starts</dt>
                      <dd className="hl-small">{renewal}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="hl-caption text-hl-fg-tertiary">{label} starts</dt>
                    <dd className="hl-small">at the end of your current period</dd>
                  </div>
                )}
              </dl>

              {/* The sentence that decides whether this feels safe. */}
              <p className="hl-body-medium inline-flex items-start gap-2 rounded-hl-md bg-hl-accent-subtle p-3 text-hl-accent-fg">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                No charge today. You keep {currentPlan ? PLAN_LABELS[currentPlan] : 'your current plan'}{' '}
                until then, and {label} is billed from your next renewal.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Back
              </Button>
              <Button variant="primary" onClick={onConfirm}>
                Schedule {label} upgrade
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === 'scheduling' ? (
          <>
            <DialogHeader>
              <DialogTitle>Scheduling your upgrade…</DialogTitle>
              <DialogDescription>
                Telling Razorpay to switch your plan at the end of this period.
              </DialogDescription>
            </DialogHeader>
            <div
              className="flex items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle p-4"
              role="status"
              aria-live="polite"
            >
              <Spinner className="text-hl-accent-fg" label="" role="presentation" aria-hidden />
              <span className="hl-small text-hl-fg-secondary">Scheduling the change…</span>
            </div>
          </>
        ) : null}

        {/* SCHEDULED, NOT ACTIVE. The success state must not imply the customer
            is on the new tier — they are not, and will not be until the date
            named here. */}
        {phase === 'scheduled' && plan ? (
          <>
            <DialogHeader>
              <div
                className="mb-1 h-1 w-12 rounded-full motion-safe:animate-in motion-safe:fade-in"
                style={{ backgroundImage: 'var(--hl-gradient-prism)' }}
                aria-hidden
              />
              <DialogTitle>{label} is scheduled.</DialogTitle>
              <DialogDescription>
                {renewal
                  ? `You’ll move to ${label} on ${renewal}, when your current period ends.`
                  : `You’ll move to ${label} at the end of your current period.`}
              </DialogDescription>
            </DialogHeader>

            <dl className="flex flex-col gap-2 rounded-hl-lg border border-hl-border bg-hl-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Today</dt>
                <dd className="hl-small">
                  {currentPlan ? PLAN_LABELS[currentPlan] : 'Your current plan'}, unchanged
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">From {renewal ?? 'renewal'}</dt>
                <dd className="hl-small">
                  HireLens {label} · {price}
                  {suffix}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="hl-caption text-hl-fg-tertiary">Charged today</dt>
                <dd className="hl-small">Nothing</dd>
              </div>
            </dl>

            <DialogFooter>
              <Button variant="primary" onClick={onDone}>
                Continue to HireLens
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {/* ── 5. Cancelled — a decision, not an error ─────────────────────── */}
        {phase === 'cancelled' ? (
          <>
            <DialogHeader>
              <DialogTitle>Checkout cancelled</DialogTitle>
              <DialogDescription>
                Nothing was charged and your plan is unchanged.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={onRetry}>
                Try again
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {/* ── 6. Failed — plain language, no provider internals ───────────── */}
        {phase === 'failed' ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment couldn’t be completed</DialogTitle>
              <DialogDescription>
                {/* `errorMessage` is only ever a message this app wrote. Gateway
                    text, HTTP bodies and stack traces are logged, never shown:
                    they are written for us and read like a fault by whoever is
                    trying to pay. */}
                {errorMessage ??
                  'Something went wrong before the payment went through. You have not been charged.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-hl-lg border border-hl-border bg-hl-subtle p-3">
              <Lock className="size-3.5 shrink-0 text-hl-fg-tertiary" aria-hidden />
              <span className="hl-caption text-hl-fg-tertiary">
                Your plan and your data are unchanged.
              </span>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={onRetry}>
                Try again
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
