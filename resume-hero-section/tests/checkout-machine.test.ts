import { describe, expect, it } from 'vitest'
import { isBusy, nextPhase, type CheckoutPhase } from '@/components/hirelens/billing/checkout-machine'

/**
 * The sequencing rules of checkout.
 *
 * These are the cases that are painful to reproduce in a browser and cheap to
 * pin here: a success arriving after a cancel, a dismissal firing after a
 * payment, a verification failing on a customer who has already been charged.
 * Each one has a wrong answer that looks perfectly reasonable in isolation.
 */
describe('checkout state machine', () => {
  it('only reaches `active` from `confirming`', () => {
    // THE LOAD-BEARING TEST. `confirming` is the phase that polls OUR API,
    // which only reports a plan the webhook has written. Any other edge into
    // `active` would mean the UI declaring success on a client-side claim.
    const phases: CheckoutPhase[] = [
      'confirm',
      'preparing',
      'awaiting_payment',
      'verifying',
      'cancelled',
      'failed',
    ]
    for (const phase of phases) {
      expect(nextPhase(phase, { type: 'ACTIVATED' })).not.toBe('active')
    }
    expect(nextPhase('confirming', { type: 'ACTIVATED' })).toBe('active')
    expect(nextPhase('slow', { type: 'ACTIVATED' })).toBe('active')
  })

  it('never treats a payment as complete on the gateway callback alone', () => {
    // `PAID` is the browser callback. It moves to verification, not to success.
    expect(nextPhase('awaiting_payment', { type: 'PAID' })).toBe('verifying')
    expect(nextPhase('verifying', { type: 'VERIFIED' })).toBe('confirming')
  })

  it('does not report a failed verification as a failed payment', () => {
    // The customer may well have been charged. Signature verification is our
    // problem, not theirs — fall through to the webhook and let it decide.
    expect(nextPhase('verifying', { type: 'FAILED' })).toBe('confirming')
  })

  it('turns a slow webhook into a recoverable state, never a failure', () => {
    expect(nextPhase('confirming', { type: 'SLOW' })).toBe('slow')
    expect(nextPhase('slow', { type: 'RETRY' })).toBe('confirming')
  })

  it('ignores a dismissal that arrives after payment', () => {
    // Razorpay fires `ondismiss` as its own modal closes after a SUCCESSFUL
    // payment. Honouring it would tell a customer who just paid that they
    // cancelled.
    expect(nextPhase('verifying', { type: 'DISMISSED' })).toBe('verifying')
    expect(nextPhase('confirming', { type: 'DISMISSED' })).toBe('confirming')
    expect(nextPhase('active', { type: 'DISMISSED' })).toBe('active')
  })

  it('treats a dismissal before payment as a cancellation', () => {
    expect(nextPhase('awaiting_payment', { type: 'DISMISSED' })).toBe('cancelled')
  })

  it('is terminal at `active`', () => {
    const events = ['PAID', 'FAILED', 'DISMISSED', 'RETRY', 'SLOW'] as const
    for (const type of events) {
      expect(nextPhase('active', { type })).toBe('active')
    }
  })

  it('allows retry only from a settled failure', () => {
    expect(nextPhase('cancelled', { type: 'RETRY' })).toBe('confirm')
    expect(nextPhase('failed', { type: 'RETRY' })).toBe('confirm')
    // Not mid-flight: a retry there would start a second gateway subscription.
    expect(nextPhase('preparing', { type: 'RETRY' })).toBe('preparing')
    expect(nextPhase('awaiting_payment', { type: 'RETRY' })).toBe('awaiting_payment')
  })

  it('keeps the scheduled lane away from `active`', () => {
    // A scheduled upgrade reaches `scheduled` and stops. `active` would claim
    // the customer is on the new tier — false, for up to a month.
    expect(nextPhase('schedule_confirm', { type: 'CONFIRM' })).toBe('scheduling')
    expect(nextPhase('scheduling', { type: 'SCHEDULED' })).toBe('scheduled')
    expect(nextPhase('scheduling', { type: 'ACTIVATED' })).not.toBe('active')
    expect(nextPhase('scheduled', { type: 'ACTIVATED' })).toBe('scheduled')
  })

  it('never lets a payment event drive the scheduled lane', () => {
    // There is no gateway modal here, so these can only arrive by mistake.
    for (const type of ['PAID', 'VERIFIED', 'DISMISSED'] as const) {
      expect(nextPhase('schedule_confirm', { type })).toBe('schedule_confirm')
      expect(nextPhase('scheduling', { type })).toBe('scheduling')
    }
  })

  it('lets a failed scheduling attempt be retried', () => {
    expect(nextPhase('scheduling', { type: 'FAILED' })).toBe('failed')
    expect(nextPhase('failed', { type: 'RETRY' })).toBe('confirm')
  })

  it('marks every in-flight phase busy, so a second checkout cannot start', () => {
    expect(isBusy('preparing')).toBe(true)
    expect(isBusy('awaiting_payment')).toBe(true)
    expect(isBusy('verifying')).toBe(true)
    expect(isBusy('confirming')).toBe(true)
    expect(isBusy('scheduling')).toBe(true)

    expect(isBusy('confirm')).toBe(false)
    expect(isBusy('active')).toBe(false)
    expect(isBusy('cancelled')).toBe(false)
    expect(isBusy('failed')).toBe(false)
    expect(isBusy('slow')).toBe(false)
    expect(isBusy('schedule_confirm')).toBe(false)
    expect(isBusy('scheduled')).toBe(false)
  })
})
