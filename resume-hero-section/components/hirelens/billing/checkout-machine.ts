/**
 * The checkout state machine, as data.
 *
 * Kept out of the component on purpose. The interesting failures in a payment
 * flow are sequencing failures — a success arriving after a cancel, a retry
 * landing while a verification is still in flight — and those are miserable to
 * test through a rendered dialog and trivial to test as a function.
 *
 * THE RULE THE TABLE ENCODES: `active` has exactly one predecessor, and it is
 * `confirming` — the phase that polls OUR OWN API. There is no edge from
 * `verifying` (the gateway's browser callback) to `active`, and that absence is
 * the whole design. A callback runs on hardware we do not control; only the
 * webhook grants a plan, and only our API can tell us the webhook landed.
 */

export type CheckoutPhase =
  /** Reviewing the plan and price. Nothing has been created at the gateway. */
  | 'confirm'
  /** Creating the subscription server-side and loading Checkout. */
  | 'preparing'
  /** Razorpay's modal is open and owns the screen. */
  | 'awaiting_payment'
  /** Verifying the browser callback server-side. Grants nothing. */
  | 'verifying'
  /** Polling our API until the webhook has written the plan. */
  | 'confirming'
  /** Confirmed by our own backend. The only phase that may claim success. */
  | 'active'
  /** Confirmation is slow. Recoverable — never reported as a failure. */
  | 'slow'
  /** The customer dismissed the gateway modal. Nothing charged. */
  | 'cancelled'
  /** Something failed before or during payment. */
  | 'failed'
  /**
   * A DIFFERENT OPERATION, sharing this surface.
   *
   * An existing paid subscriber moving up a tier authorizes no mandate and pays
   * nothing today — the gateway schedules the change for the cycle end. It
   * reuses the panel because it is the same decision to the customer, but it
   * must never reuse the payment phases: there is no Razorpay modal, no
   * callback and no webhook to wait for.
   */
  | 'schedule_confirm'
  | 'scheduling'
  | 'scheduled'

export type CheckoutEvent =
  | { type: 'CONFIRM' }
  | { type: 'CHECKOUT_OPENED' }
  | { type: 'PAID' }
  | { type: 'VERIFIED' }
  | { type: 'ACTIVATED' }
  | { type: 'SLOW' }
  | { type: 'DISMISSED' }
  | { type: 'FAILED' }
  | { type: 'RETRY' }
  | { type: 'SCHEDULED' }

/**
 * Every legal edge. Anything absent is ignored rather than raised — a UI is not
 * a ledger, and a late event from a modal that has already been dismissed is
 * ordinary, not exceptional. The consequence of ignoring is a phase that does
 * not change; the consequence of raising would be a crash mid-payment.
 */
const TRANSITIONS: Record<CheckoutPhase, Partial<Record<CheckoutEvent['type'], CheckoutPhase>>> = {
  confirm: { CONFIRM: 'preparing' },
  preparing: { CHECKOUT_OPENED: 'awaiting_payment', FAILED: 'failed', DISMISSED: 'cancelled' },
  awaiting_payment: { PAID: 'verifying', DISMISSED: 'cancelled', FAILED: 'failed' },
  // A verification that fails is NOT a failed payment — the customer may well
  // have been charged. It goes to `confirming` anyway and lets the webhook and
  // the poll decide, because the alternative tells a paying customer their
  // payment failed on the strength of a signature check they cannot influence.
  verifying: { VERIFIED: 'confirming', FAILED: 'confirming' },
  confirming: { ACTIVATED: 'active', SLOW: 'slow' },
  slow: { ACTIVATED: 'active', RETRY: 'confirming' },
  active: {},
  cancelled: { RETRY: 'confirm' },
  failed: { RETRY: 'confirm' },

  // The scheduled-upgrade lane. It reaches `scheduled`, never `active`: the
  // customer is still on their old plan today, and saying otherwise would be
  // the same false claim the payment lane exists to avoid.
  schedule_confirm: { CONFIRM: 'scheduling' },
  scheduling: { SCHEDULED: 'scheduled', FAILED: 'failed' },
  scheduled: {},
}

export function nextPhase(current: CheckoutPhase, event: CheckoutEvent): CheckoutPhase {
  return TRANSITIONS[current][event.type] ?? current
}

/** Phases in which a second checkout must not be startable. Double-submit
 *  protection is a state question, not a button question — the button is only
 *  where it happens to be visible. */
export function isBusy(phase: CheckoutPhase): boolean {
  return (
    phase === 'preparing' ||
    phase === 'awaiting_payment' ||
    phase === 'verifying' ||
    phase === 'confirming' ||
    phase === 'scheduling'
  )
}

/** How long we wait for the webhook before offering a recoverable state.
 *  Razorpay's activation is usually seconds; this is generous on purpose,
 *  because declaring failure early is worse than waiting visibly. */
export const CONFIRMATION_TIMEOUT_MS = 40_000
export const CONFIRMATION_POLL_MS = 2_500
