// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * The Razorpay handoff, through the FULL provider stack.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM `checkout-dialog.test.tsx`.
 * That file renders `CheckoutDialog` alone, and its handoff tests passed while
 * the bug was still live in the product. The defect was never in one component:
 * clicking a price card opens `UpgradeDialog`, whose CTA opened `CheckoutDialog`
 * ON TOP without closing it, so two Radix modal dialogs were mounted at once.
 *
 * A modal Radix dialog writes `pointer-events: none` onto <body>, and ONE is
 * enough to hold it. Razorpay Checkout mounts `.razorpay-container` as a direct
 * child of <body>, outside every React tree, so it inherited the lock and the
 * payment modal — fully painted, ₹2,499 on screen — refused every click.
 *
 * The tell was the symptom pair: MOUSE DEAD, KEYBOARD FINE. `pointer-events`
 * blocks hit-testing only, so Tab still reached the payment fields.
 *
 * So the assertions here are made against the composed stack, at the level the
 * bug actually lived. Nothing reaches Razorpay or the network: the gateway
 * client, the checkout API and the subscription read are all stubbed.
 */

const api = vi.hoisted(() => ({
  subscription: { plan: 'free', status: 'active', billing_state: null } as Record<string, unknown>,
  /** Captured from the options handed to Razorpay, so a test can drive the
   *  post-payment callback exactly as the real modal would. */
  onPaymentSuccess: null as ((r: Record<string, string>) => void) | null,
  opened: 0,
}))

vi.mock('@/services/org-api', () => ({
  getSubscription: () => Promise.resolve(api.subscription),
}))

vi.mock('@/services/billing-api', () => ({
  createSubscription: () =>
    Promise.resolve({
      provider: 'razorpay',
      kind: 'modal',
      subscription_id: 'sub_TEST',
      public_key: 'rzp_test_key',
      amount_minor: 249900,
      currency: 'INR',
    }),
  verifyCheckoutCallback: () => Promise.resolve({ verified: true, plan_active: false, message: '' }),
  changePlan: () => Promise.resolve({}),
}))

vi.mock('../components/hirelens/billing/use-razorpay', () => ({
  useRazorpayCheckout: () => async (options: { handler: (r: Record<string, string>) => void }) => {
    api.onPaymentSuccess = options.handler
    return {
      // `open()` deliberately does nothing: the real modal stays up and the
      // phase parks at `awaiting_payment`, which is the state under test.
      open: () => {
        api.opened += 1
      },
      close: () => {},
      on: () => {},
    }
  },
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BillingCheckoutProvider } from '../components/hirelens/billing'
import { useUpgradeAction } from '../components/hirelens/entitlements/upgrade-action'

/** Stands in for a price card — the real entry point into this flow. */
function PriceCard() {
  const upgrade = useUpgradeAction()
  return (
    <button onClick={() => upgrade({ requiredPlan: 'pro', origin: 'plan' })}>
      Upgrade to Pro
    </button>
  )
}

function renderStack() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <BillingCheckoutProvider>
        <PriceCard />
      </BillingCheckoutProvider>
    </QueryClientProvider>,
  )
}

/** A stand-in for `.razorpay-container`: direct child of <body>, outside the
 *  React tree, carrying Razorpay's own z-index. */
function mountRazorpayContainer() {
  const node = document.createElement('div')
  node.className = 'razorpay-container'
  node.style.cssText = 'position:fixed;inset:0;z-index:2000000000;'
  document.body.appendChild(node)
  return node
}

const dialogCount = () => document.querySelectorAll('[role="dialog"]').length
const bodyLocked = () => getComputedStyle(document.body).pointerEvents === 'none'

/** Card → UpgradeDialog → CheckoutDialog(confirm) → awaiting_payment. */
async function reachHandoff() {
  fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
  await screen.findByText(/Move to Pro/)

  const cta = [...document.querySelectorAll('[role="dialog"] button')].find(
    (b) => b.textContent?.trim() === 'Upgrade to Pro',
  )
  fireEvent.click(cta as HTMLElement)

  const proceed = await screen.findByRole('button', { name: 'Continue to payment' })
  fireEvent.click(proceed)
  await waitFor(() => expect(api.opened).toBeGreaterThan(0))
}

beforeEach(() => {
  api.onPaymentSuccess = null
  api.opened = 0
  api.subscription = { plan: 'free', status: 'active', billing_state: null }
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('.razorpay-container').forEach((n) => n.remove())
  document.body.removeAttribute('style')
})

describe('the Razorpay handoff, through the whole stack', () => {
  it('opens only ONE dialog when checkout takes over', async () => {
    // THE REGRESSION. Two stacked modal dialogs is what held the body lock.
    renderStack()

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    await screen.findByText(/Move to Pro/)
    expect(dialogCount()).toBe(1) // UpgradeDialog

    const cta = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Upgrade to Pro',
    )
    fireEvent.click(cta as HTMLElement)
    await screen.findByRole('button', { name: 'Continue to payment' })

    expect(dialogCount(), 'UpgradeDialog must close as checkout takes ownership').toBe(1)
    // And the one that remains is the checkout surface, not the upgrade one.
    expect(screen.getByText('Billed monthly')).toBeInTheDocument()
  })

  it('locks the body before checkout, as an ordinary modal should', async () => {
    // The control. Modal behaviour is correct until Razorpay needs the screen.
    renderStack()
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    await screen.findByText(/Move to Pro/)
    expect(bodyLocked()).toBe(true)
  })

  it('leaves the body UNLOCKED during awaiting_payment', async () => {
    renderStack()
    await reachHandoff()
    await waitFor(() => expect(bodyLocked()).toBe(false))
  })

  it("lets Razorpay's container receive pointer events during the handoff", async () => {
    const container = mountRazorpayContainer()
    renderStack()
    await reachHandoff()

    await waitFor(() => expect(getComputedStyle(container).pointerEvents).not.toBe('none'))

    // INHERITANCE IS THE MECHANISM, so assert on the whole ancestor chain
    // rather than the leaf. The container never set `pointer-events` itself —
    // it inherited `none` from <body>, which is exactly why its z-index of
    // 2×10⁹ was no defence.
    //
    // jsdom implements no layout, so `elementFromPoint` does not exist here and
    // true hit-testing cannot be asserted. That half was verified against the
    // live page instead, where `elementFromPoint` at the viewport centre
    // returned a list item from the stacked UpgradeDialog rather than Razorpay.
    for (let node: Element | null = container; node; node = node.parentElement) {
      expect(
        getComputedStyle(node).pointerEvents,
        `${node.nodeName} blocks pointer events during the handoff`,
      ).not.toBe('none')
    }
  })

  it('keeps CheckoutDialog mounted throughout the handoff', async () => {
    // Unmounting would take the payment callback, the verification and the
    // activation polling down with it.
    renderStack()
    await reachHandoff()
    expect(dialogCount()).toBe(1)
    expect(api.onPaymentSuccess, 'the payment callback must still be registered').toBeTypeOf(
      'function',
    )
  })

  it('restores modal behaviour when Razorpay returns', async () => {
    renderStack()
    await reachHandoff()
    await waitFor(() => expect(bodyLocked()).toBe(false))

    // Razorpay hands the callback back — our surface owns the screen again.
    api.onPaymentSuccess?.({
      razorpay_payment_id: 'pay_TEST',
      razorpay_subscription_id: 'sub_TEST',
      razorpay_signature: 'sig',
    })

    await screen.findByText('Payment received')
    await waitFor(() => expect(bodyLocked()).toBe(true))
  })

  it('leaves nothing stale when the customer backs out', async () => {
    // A dismissed checkout must not strand a locked body or a hidden dialog —
    // the page behind it would be silently unusable.
    renderStack()
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    await screen.findByText(/Move to Pro/)
    const cta = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Upgrade to Pro',
    )
    fireEvent.click(cta as HTMLElement)
    await screen.findByRole('button', { name: 'Continue to payment' })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    await waitFor(() => expect(dialogCount()).toBe(0))
    await waitFor(() => expect(bodyLocked()).toBe(false))
  })
})
