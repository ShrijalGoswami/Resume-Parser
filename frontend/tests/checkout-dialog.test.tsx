// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { CheckoutDialog } from '../components/hirelens/billing/checkout-dialog'
import type { CheckoutPhase } from '../components/hirelens/billing/checkout-machine'

/**
 * The Hirevo side of checkout.
 *
 * The tests worth having here are not "does it render". They are about what
 * this surface is ALLOWED TO CLAIM at each phase, because the failure mode of a
 * payment UI is not a blank screen — it is a confident sentence that happens to
 * be false.
 */

const noop = () => {}

function renderDialog(phase: CheckoutPhase, overrides: Record<string, unknown> = {}) {
  return render(
    <CheckoutDialog
      open
      phase={phase}
      plan="pro"
      currentPlan="free"
      renewsAt={null}
      errorMessage={null}
      onConfirm={noop}
      onRetry={noop}
      onClose={noop}
      onDone={noop}
      {...overrides}
    />,
  )
}

afterEach(cleanup)

describe('checkout confirmation surface', () => {
  it('shows the plan, the real price and the billing period before anything is created', () => {
    renderDialog('confirm')
    expect(screen.getByText('Move to Pro')).toBeInTheDocument()
    // The figure comes from lib/pricing — the same source the pricing page and
    // the backend's boot check agree on. A hardcoded string here would be a
    // second source of truth for a number a customer's card feels.
    expect(screen.getByText('₹2,499')).toBeInTheDocument()
    expect(screen.getByText('/month')).toBeInTheDocument()
    expect(screen.getByText('Billed monthly')).toBeInTheDocument()
  })

  it('names the current plan without offering to sell it', () => {
    renderDialog('confirm')
    expect(screen.getByText('You’re on Free today.')).toBeInTheDocument()
  })

  it('never claims success before the backend has confirmed it', () => {
    // THE TEST THIS FILE EXISTS FOR. Every phase between clicking pay and the
    // webhook landing must avoid the past tense about activation.
    const premature: CheckoutPhase[] = ['preparing', 'awaiting_payment', 'verifying', 'confirming']
    for (const phase of premature) {
      cleanup()
      renderDialog(phase)
      expect(screen.queryByText(/You’re on Hirevo/)).not.toBeInTheDocument()
      expect(screen.queryByText(/subscription is active/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Active$/)).not.toBeInTheDocument()
    }
  })

  it('says what is being waited for, differently at each stage', () => {
    renderDialog('preparing')
    expect(screen.getByText('Preparing secure checkout…')).toBeInTheDocument()

    cleanup()
    renderDialog('confirming')
    // "Payment received" is true at this point and is the reassurance that
    // matters; the activation claim is still withheld.
    expect(screen.getByText('Payment received')).toBeInTheDocument()
    expect(screen.getByText('Activating your plan…')).toBeInTheDocument()
  })

  it('announces waiting states to assistive technology', () => {
    renderDialog('confirming')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('declares the plan active only in the active phase, with the figures', () => {
    renderDialog('active', { renewsAt: '2026-09-11T00:00:00Z' })
    expect(screen.getByText('You’re on Hirevo Pro.')).toBeInTheDocument()
    expect(screen.getByText('₹2,499/month')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('11 September 2026')).toBeInTheDocument()
  })

  it('omits the renewal date when the backend did not send one', () => {
    // An invented renewal is a promise about somebody's money.
    renderDialog('active', { renewsAt: null })
    expect(screen.queryByText('Renews')).not.toBeInTheDocument()
  })

  it('treats cancellation as a decision, not an error', () => {
    renderDialog('cancelled')
    expect(screen.getByText('Checkout cancelled')).toBeInTheDocument()
    expect(screen.getByText('Nothing was charged and your plan is unchanged.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('states failure plainly and offers a way back', () => {
    renderDialog('failed')
    expect(screen.getByText('Payment couldn’t be completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('never renders a raw provider or HTTP message', () => {
    // The component takes `errorMessage`, and the provider only ever passes
    // copy this app wrote. What must not happen is a gateway string reaching
    // the screen — so the default, used whenever we have nothing safe to say,
    // is asserted to be our own sentence.
    renderDialog('failed', { errorMessage: null })
    expect(
      screen.getByText(/You have not been charged\./),
    ).toBeInTheDocument()
    expect(screen.queryByText(/razorpay/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\b(4\d\d|5\d\d)\b/)).not.toBeInTheDocument()
  })

  it('offers a recoverable path when confirmation is slow, and does not call it a failure', () => {
    renderDialog('slow')
    expect(screen.getByText('Still confirming your subscription')).toBeInTheDocument()
    expect(screen.queryByText(/couldn’t be completed/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument()
  })

  it('cannot be dismissed while a payment is in flight', () => {
    // Closing mid-verification would strand a customer who has already been
    // charged on a screen that says nothing.
    renderDialog('verifying')
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('gives every phase a dialog description, so Radix never warns', () => {
    const phases: CheckoutPhase[] = [
      'confirm',
      'preparing',
      'awaiting_payment',
      'verifying',
      'confirming',
      'slow',
      'active',
      'cancelled',
      'failed',
      'schedule_confirm',
      'scheduling',
      'scheduled',
    ]
    for (const phase of phases) {
      cleanup()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderDialog(phase)
      const complaints = [...warn.mock.calls, ...error.mock.calls]
        .flat()
        .filter((arg) => typeof arg === 'string' && arg.includes('Description'))
      expect(complaints, `phase ${phase} is missing a DialogDescription`).toHaveLength(0)
      warn.mockRestore()
      error.mockRestore()
    }
  })

  /**
   * The scheduled-upgrade lane — an existing paid subscriber moving up.
   *
   * Nothing is charged today and the customer is NOT on the new tier when this
   * succeeds. Both of those are easy to get subtly wrong in copy, and both are
   * the kind of wrong that ends in a support ticket about money.
   */
  describe('scheduled upgrade', () => {
    it('states the dates and that nothing is charged today', () => {
      renderDialog('schedule_confirm', {
        plan: 'pro',
        currentPlan: 'plus',
        renewsAt: '2026-09-11T00:00:00Z',
      })
      expect(screen.getByText('Move to Pro')).toBeInTheDocument()
      expect(screen.getByText('₹2,499')).toBeInTheDocument()
      expect(screen.getByText('Plus')).toBeInTheDocument()
      // Both the end of the current period and the start of the new plan.
      expect(screen.getAllByText('11 September 2026').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/No charge today/)).toBeInTheDocument()
    })

    it('says "Schedule" rather than anything that sounds like paying now', () => {
      renderDialog('schedule_confirm', { plan: 'pro', currentPlan: 'plus' })
      expect(screen.getByRole('button', { name: 'Schedule Pro upgrade' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Pay/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Continue to payment/ })).not.toBeInTheDocument()
    })

    it('falls back to a truthful phrase when no date is available', () => {
      // An invented renewal date is a promise about somebody's money.
      renderDialog('schedule_confirm', { plan: 'pro', currentPlan: 'plus', renewsAt: null })
      expect(screen.getByText('at the end of your current period')).toBeInTheDocument()
    })

    it('shows a processing state while scheduling', () => {
      renderDialog('scheduling', { plan: 'pro', currentPlan: 'plus' })
      expect(screen.getByText('Scheduling your upgrade…')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('never claims the new plan is active once scheduled', () => {
      // THE TEST THIS BLOCK EXISTS FOR. "You're on Hirevo Pro" would be false
      // for up to a month.
      renderDialog('scheduled', {
        plan: 'pro',
        currentPlan: 'plus',
        renewsAt: '2026-09-11T00:00:00Z',
      })
      expect(screen.getByText('Pro is scheduled.')).toBeInTheDocument()
      expect(screen.queryByText(/You’re on Hirevo Pro/)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Active$/)).not.toBeInTheDocument()
      expect(screen.getByText(/You’ll move to Pro on 11 September 2026/)).toBeInTheDocument()
      expect(screen.getByText('Nothing')).toBeInTheDocument()
      expect(screen.getByText(/Plus, unchanged/)).toBeInTheDocument()
    })

    it('keeps the payment lane unreachable from the scheduled lane', () => {
      // No modal, no callback, no webhook wait — so none of the payment-lane
      // copy may appear. Naming Razorpay is fine and true: it is who the
      // instruction is sent to. What must not appear is anything implying a
      // charge is happening now.
      renderDialog('scheduling', { plan: 'pro', currentPlan: 'plus' })
      expect(screen.queryByText(/Payment received/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Preparing secure checkout/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Activating your plan/)).not.toBeInTheDocument()
      expect(screen.queryByText(/will be charged/)).not.toBeInTheDocument()
    })
  })

  /**
   * The pointer-events handoff.
   *
   * A modal Radix dialog writes `pointer-events: none` onto <body> and
   * re-enables it only on its own content. Razorpay Checkout mounts
   * `.razorpay-container` as a DIRECT CHILD OF <body>, outside our subtree, so
   * it inherited that lock: the payment modal painted correctly at ₹999 and
   * then refused every single click. Its z-index of 2×10⁹ is no defence —
   * `pointer-events` inherits, and no stacking order beats it.
   *
   * Reported as "the checkout UI is frozen". It also explains why typing into
   * the payment fields failed earlier, which had been misattributed to
   * cross-origin iframe sandboxing.
   */
  describe('the Razorpay handoff', () => {
    /** Stands in for `.razorpay-container` — appended to <body>, outside the
     *  Radix tree, exactly where Razorpay mounts and with its z-index. */
    function mountRazorpayContainer() {
      const node = document.createElement('div')
      node.className = 'razorpay-container'
      node.style.cssText = 'position:fixed;inset:0;z-index:2000000000;'
      document.body.appendChild(node)
      return node
    }

    afterEach(() => {
      document.querySelectorAll('.razorpay-container').forEach((n) => n.remove())
    })

    it('locks the body while OUR surface owns the screen', () => {
      // The control case. Modal behaviour is correct everywhere else, and this
      // asserts the fix did not disable it wholesale.
      renderDialog('confirm')
      expect(document.body.style.pointerEvents).toBe('none')
    })

    it('does NOT leave the body pointer-events-locked during the handoff', () => {
      // THE REGRESSION. This is the exact measurement taken from the frozen
      // page: `body style="pointer-events: none;"` with Razorpay open.
      renderDialog('awaiting_payment')
      expect(document.body.style.pointerEvents).not.toBe('none')
    })

    it("lets Razorpay's container receive pointer events during the handoff", () => {
      const container = mountRazorpayContainer()
      renderDialog('awaiting_payment')
      // Inherited, not set locally — which is precisely how it broke.
      expect(getComputedStyle(container).pointerEvents).not.toBe('none')
    })

    it('keeps our own content hidden and inert during the handoff', () => {
      // Non-modal removes the body lock, so this element is hit-testable again.
      // It must not swallow clicks meant for the payment modal.
      renderDialog('awaiting_payment')
      const content = screen.getByRole('dialog')
      expect(content.className).toContain('pointer-events-none')
      expect(content.className).toContain('opacity-0')
    })

    it('removes the scrim during the handoff, so only Razorpay dims the page', () => {
      // Radix renders no overlay for a non-modal dialog. Two stacked scrims is
      // what produced the "grey overlay" in the report.
      const { container: withHandoff } = renderDialog('awaiting_payment')
      expect(document.querySelectorAll('.hl-rack-scrim').length).toBe(0)
      cleanup()
      renderDialog('confirm')
      expect(document.querySelectorAll('.hl-rack-scrim').length).toBeGreaterThan(0)
      void withHandoff
    })

    it('restores the lock when Razorpay returns and our surface takes over', () => {
      // The customer paid; the panel is ours again and must behave normally.
      const { rerender } = render(
        <CheckoutDialog
          open
          phase="awaiting_payment"
          plan="pro"
          currentPlan="free"
          renewsAt={null}
          errorMessage={null}
          onConfirm={noop}
          onRetry={noop}
          onClose={noop}
          onDone={noop}
        />,
      )
      expect(document.body.style.pointerEvents).not.toBe('none')

      rerender(
        <CheckoutDialog
          open
          phase="verifying"
          plan="pro"
          currentPlan="free"
          renewsAt={null}
          errorMessage={null}
          onConfirm={noop}
          onRetry={noop}
          onClose={noop}
          onDone={noop}
        />,
      )
      expect(document.body.style.pointerEvents).toBe('none')
      // And the state machine survived the modal flip — the phase rendered.
      expect(screen.getByText('Payment received')).toBeInTheDocument()
    })

    it('survives the handoff without unmounting the dialog', () => {
      // Unmounting during the handoff would take the payment callback with it.
      const { rerender } = render(
        <CheckoutDialog
          open
          phase="preparing"
          plan="pro"
          currentPlan="free"
          renewsAt={null}
          errorMessage={null}
          onConfirm={noop}
          onRetry={noop}
          onClose={noop}
          onDone={noop}
        />,
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      for (const phase of ['awaiting_payment', 'verifying', 'confirming'] as CheckoutPhase[]) {
        rerender(
          <CheckoutDialog
            open
            phase={phase}
            plan="pro"
            currentPlan="free"
            renewsAt={null}
            errorMessage={null}
            onConfirm={noop}
            onRetry={noop}
            onClose={noop}
            onDone={noop}
          />,
        )
        expect(screen.getByRole('dialog'), `dialog vanished at ${phase}`).toBeInTheDocument()
      }
    })
  })

  it('runs the confirm CTA exactly once per click', () => {
    const onConfirm = vi.fn()
    renderDialog('confirm', { onConfirm })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
