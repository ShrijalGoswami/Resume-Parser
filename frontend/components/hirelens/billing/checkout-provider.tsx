'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UpgradeDialogProvider } from '../entitlements/upgrade-dialog'
import type { UpgradeRequest } from '../entitlements/upgrade-action'
import { normalizePlan, type PlanKey } from '../lib/entitlements/catalog'
import { orgContextKey } from '../lib/api/org-context'
import { settingsKeys } from '../lib/api/settings'
import { getSubscription } from '@/services/org-api'
import {
  changePlan,
  createSubscription,
  verifyCheckoutCallback,
  type SellablePlan,
} from '@/services/billing-api'
import { useRazorpayCheckout } from './use-razorpay'
import { CheckoutDialog } from './checkout-dialog'
import {
  CONFIRMATION_POLL_MS,
  CONFIRMATION_TIMEOUT_MS,
  isBusy,
  nextPhase,
  type CheckoutEvent,
  type CheckoutPhase,
} from './checkout-machine'

/**
 * Turns every upgrade CTA in the product into a real checkout.
 *
 * ONE HANDLER, AS DESIGNED. `useUpgradeAction` has always routed locks, quota
 * walls, 402s and price cards through a single provider so that checkout could
 * land in exactly one place. This is that place: no lock, meter, button or card
 * changes to gain a working purchase path.
 *
 * WHAT ACTIVATES A PLAN, PRECISELY
 * --------------------------------
 * Not this component. The gateway's browser callback is verified server-side
 * because an unverified "success" would let the interface tell somebody they
 * had subscribed when they had not — but verification grants nothing. The plan
 * becomes real when Razorpay's webhook reaches the backend, the backend
 * re-fetches the subscription from the gateway API, and the state machine
 * writes it. This component then *observes* that through our own API, and only
 * then says "active".
 *
 * The consequence is a visible gap between paying and being upgraded. It is
 * usually a second or two. It is shown honestly, because the alternative —
 * flipping the UI to "active" on the callback — is wrong in both directions: it
 * lies when the webhook later fails, and it teaches the interface to trust a
 * client-side claim about money.
 */

/** Only these can be bought. Enterprise is quoted; Free is not a purchase.
 *  The trials buy through the same checkout (single-cycle, one charge). */
function asSellable(plan: PlanKey | null | undefined): SellablePlan | null {
  return plan === 'trial' || plan === 'trial_interview' || plan === 'plus' || plan === 'pro'
    ? plan
    : null
}

/**
 * Has the backend confirmed the paid plan?
 *
 * Deliberately strict about two things. The plan must MATCH what was bought —
 * a subscription that landed on some other tier is not this purchase — and the
 * state must be one that actually grants access. `billing_state` is preferred
 * because it is the eight-value enrichment migration 0027 added; `status` is
 * the fallback for rows written by the operator path, which never sets it.
 */
function isConfirmedActive(
  subscription: { plan?: string; status?: string; billing_state?: string | null } | null,
  target: PlanKey,
): boolean {
  if (!subscription) return false
  if (normalizePlan(subscription.plan) !== target) return false
  if (subscription.billing_state) {
    return subscription.billing_state === 'active' || subscription.billing_state === 'trialing'
  }
  return subscription.status === 'active' || subscription.status === 'trialing'
}

/**
 * Is this a scheduled tier move rather than a purchase?
 *
 * True only for an organization already ON a paid plan with a live billing
 * period. Free organizations, operator-granted plans and lapsed subscriptions
 * all buy through checkout — the first has no subscription to change, and the
 * others have no gateway subscription to PATCH.
 *
 * The client never gets to decide this for real: `POST /plan-change` re-checks
 * every one of these conditions server-side and refuses if they do not hold.
 * Getting it wrong here costs a wrong panel, never a wrong charge.
 */
function isScheduledUpgrade(
  current: PlanKey,
  subscription: { billing_state?: string | null; current_period_end?: string | null },
): boolean {
  if (current !== 'plus' && current !== 'pro') return false
  if (!subscription.current_period_end) return false
  return subscription.billing_state === 'active' || subscription.billing_state === 'trialing'
}

export function BillingCheckoutProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const openRazorpay = useRazorpayCheckout()

  const [plan, setPlan] = React.useState<PlanKey | null>(null)
  const [phase, setPhase] = React.useState<CheckoutPhase>('confirm')
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [renewsAt, setRenewsAt] = React.useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = React.useState<PlanKey | null>(null)

  /** Guards against a late callback from a modal the customer has moved on
   *  from — React state is async and a dismissed modal can still fire. */
  const runId = React.useRef(0)
  const phaseRef = React.useRef<CheckoutPhase>('confirm')
  // Mirrored in an effect rather than assigned during render. The assignment
  // used to sit bare in the render body, which is a ref WRITE during render and
  // the fifth `react-hooks/refs` error in the repo.
  //
  // Equivalent here because of WHERE this ref is read: every reader
  // (`isBusy(phaseRef.current)` on reopen, the Razorpay dismiss handler, the
  // slow-payment recovery) runs from a user gesture or a provider callback,
  // all of which happen after the commit that this effect closes. None reads it
  // during render, so there is no window in which the effect's later write
  // could be observed as stale.
  React.useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const send = React.useCallback((event: CheckoutEvent) => {
    setPhase((current) => nextPhase(current, event))
  }, [])

  /** Refresh everything a plan change affects: the badge, every lock, every
   *  meter, Settings ▸ Billing. All of it derives from these two queries. */
  const refreshEntitlements = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orgContextKey })
    void queryClient.invalidateQueries({ queryKey: settingsKeys.subscription })
  }, [queryClient])

  /**
   * Poll our own API until the webhook has landed.
   *
   * Polling rather than pushing because the product has no socket, and adding
   * one for a wait measured in seconds would be a large amount of infrastructure
   * to avoid a small amount of patience. It stops on success, on timeout, and
   * whenever a newer run supersedes this one.
   */
  const waitForActivation = React.useCallback(
    async (target: PlanKey, id: number) => {
      const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS
      while (Date.now() < deadline) {
        if (runId.current !== id) return
        try {
          const subscription = await getSubscription()
          if (runId.current !== id) return
          if (isConfirmedActive(subscription, target)) {
            setRenewsAt(subscription.current_period_end ?? null)
            refreshEntitlements()
            send({ type: 'ACTIVATED' })
            return
          }
        } catch {
          // A failed poll is not a failed payment. Keep waiting: the webhook is
          // authoritative and the reconciler is the backstop behind it.
        }
        await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_MS))
      }
      if (runId.current === id) send({ type: 'SLOW' })
    },
    [refreshEntitlements, send],
  )

  /** Entry point handed to every upgrade CTA in the app. */
  const handleCheckout = React.useCallback(
    (request: UpgradeRequest) => {
      const target = request.requiredPlan ?? null
      if (!asSellable(target)) return
      // A checkout already in flight must not be replaced by another. The CTA
      // behind the dialog is still clickable in theory; this makes it inert.
      if (isBusy(phaseRef.current) && open) return

      setPlan(target)
      setError(null)
      setRenewsAt(null)
      setPhase('confirm')
      setOpen(true)

      /**
       * WHICH LANE THIS IS depends on whether they already pay us.
       *
       * A Free organization buys: gateway subscription, mandate, money today.
       * An existing paid subscriber moving up a tier authorizes nothing and pays
       * nothing today — the change is scheduled on the subscription they hold.
       * Same button, same panel, two genuinely different operations, and the
       * server enforces the distinction regardless of what is decided here.
       *
       * Best-effort: failing to read the current plan leaves the ordinary
       * checkout lane, which the backend will refuse safely if it was wrong.
       */
      void getSubscription()
        .then((s) => {
          const current = normalizePlan(s.plan)
          setCurrentPlan(current)
          setRenewsAt(s.current_period_end ?? null)
          if (isScheduledUpgrade(current, s)) setPhase('schedule_confirm')
        })
        .catch(() => setCurrentPlan(null))
    },
    [open],
  )

  /**
   * Create the subscription, then hand off to Razorpay.
   *
   * The backend creates the gateway subscription and records
   * `pending_activation` with the gateway ids BEFORE returning — so a webhook
   * that arrives while the modal is still open can still be attributed to this
   * organization. Nothing here needs to know that; it is why the order is what
   * it is.
   */
  /**
   * Schedule a tier move on an existing subscription. No modal, no charge.
   *
   * Deliberately a separate function from `startPayment`, mirroring the
   * separate backend endpoint: nothing about creating a subscription applies
   * here, and sharing a code path would eventually share a bug.
   */
  const scheduleUpgrade = React.useCallback(async () => {
    const sellable = asSellable(plan)
    if (!sellable) return

    const id = ++runId.current
    setError(null)
    send({ type: 'CONFIRM' })

    try {
      const scheduled = await changePlan(sellable)
      if (runId.current !== id) return
      // The date the gateway gave us, so the panel and the subscription agree.
      setRenewsAt(scheduled.effective_at)
      // Refresh, though nothing has changed yet — the plan moves at the cycle
      // boundary, and this keeps Settings consistent if anything else did.
      refreshEntitlements()
      send({ type: 'SCHEDULED' })
    } catch (caught) {
      if (runId.current !== id) return
      console.error('[billing] plan change could not be scheduled', caught)
      const conflict =
        typeof caught === 'object' && caught !== null && 'status' in caught
          ? (caught as { status?: number }).status === 409
          : false
      setError(
        conflict
          ? 'We couldn’t schedule that change. Contact us and we’ll move you across.'
          : 'We couldn’t schedule the upgrade just now. Nothing was charged and your plan is unchanged — please try again.',
      )
      send({ type: 'FAILED' })
    }
  }, [plan, refreshEntitlements, send])

  const startPayment = React.useCallback(async () => {
    const sellable = asSellable(plan)
    if (!sellable || !plan) return

    const id = ++runId.current
    setError(null)
    send({ type: 'CONFIRM' })

    try {
      const handoff = await createSubscription(sellable)
      if (runId.current !== id) return
      if (!handoff.subscription_id || !handoff.public_key) {
        throw new Error('incomplete handoff')
      }

      const checkout = await openRazorpay({
        key: handoff.public_key,
        subscription_id: handoff.subscription_id,
        name: 'Hirevo',
        description: `Hirevo ${plan === 'pro' ? 'Pro' : 'Plus'} — monthly subscription`,
        theme: { color: '#6D5EF8' },
        handler: (response) => {
          if (runId.current !== id) return
          send({ type: 'PAID' })
          // Verify server-side so the interface is entitled to say the customer
          // finished. It does NOT decide the plan — note that both branches
          // continue to the same place.
          void verifyCheckoutCallback({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          })
            .then(() => runId.current === id && send({ type: 'VERIFIED' }))
            .catch(() => runId.current === id && send({ type: 'FAILED' }))
            .finally(() => {
              if (runId.current === id) void waitForActivation(plan, id)
            })
        },
        modal: {
          ondismiss: () => {
            if (runId.current !== id) return
            // Only a dismissal BEFORE payment is a cancellation. Razorpay also
            // fires this as its own modal closes after a successful payment,
            // and treating that as a cancel would tell a customer who has just
            // paid that they backed out.
            if (phaseRef.current === 'awaiting_payment') send({ type: 'DISMISSED' })
          },
        },
      })

      if (runId.current !== id) return

      checkout.on('payment.failed', () => {
        if (runId.current === id) {
          setError(
            'Your payment was declined. No charge was made — you can try again or use a different method.',
          )
          send({ type: 'FAILED' })
        }
      })

      send({ type: 'CHECKOUT_OPENED' })
      checkout.open()
    } catch (caught) {
      if (runId.current !== id) return
      // Raw provider and HTTP messages are logged, never rendered: they are
      // written for us, and read as a fault by whoever is trying to pay.
      console.error('[billing] checkout could not start', caught)
      const conflict =
        typeof caught === 'object' && caught !== null && 'status' in caught
          ? (caught as { status?: number }).status === 409
          : false
      setError(
        conflict
          ? 'This organization already has a subscription. Contact us and we’ll move you across.'
          : 'We couldn’t start checkout just now. Nothing was charged — please try again.',
      )
      send({ type: 'FAILED' })
    }
  }, [openRazorpay, plan, send, waitForActivation])

  const close = React.useCallback(() => {
    runId.current += 1
    setOpen(false)
    // Refresh on the way out regardless of phase: a customer who closes a slow
    // confirmation should still find the right plan when it lands.
    refreshEntitlements()
  }, [refreshEntitlements])

  const retry = React.useCallback(() => {
    if (phaseRef.current === 'slow' && plan) {
      const id = ++runId.current
      send({ type: 'RETRY' })
      void waitForActivation(plan, id)
      return
    }
    setError(null)
    send({ type: 'RETRY' })
  }, [plan, send, waitForActivation])

  return (
    <UpgradeDialogProvider onCheckout={handleCheckout}>
      {children}
      <CheckoutDialog
        open={open}
        phase={phase}
        plan={plan}
        currentPlan={currentPlan}
        renewsAt={renewsAt}
        errorMessage={error}
        // The panel is shared; the operation is not. `schedule_confirm` is an
        // existing subscriber moving tier, which pays nothing today.
        onConfirm={() =>
          phase === 'schedule_confirm' ? void scheduleUpgrade() : void startPayment()
        }
        onRetry={retry}
        onClose={close}
        onDone={close}
      />
    </UpgradeDialogProvider>
  )
}
