'use client'

import * as React from 'react'

/**
 * Loads Razorpay Checkout, once.
 *
 * WHY A LAZY LOADER AND NOT A `<Script>` IN THE LAYOUT
 * ---------------------------------------------------
 * Checkout is a third-party script on the critical path of exactly one action
 * that almost nobody performs on any given visit. Putting it in the layout would
 * make every recruiter loading the Inbox pay for a payment modal they are not
 * opening, and would hand a third party a script tag on every page of the
 * product. It is fetched when somebody decides to buy something, and not before.
 *
 * The promise is memoised at module scope rather than in state: a customer who
 * abandons the modal and comes back should not re-download it, and two surfaces
 * mounting at once (pricing card and a quota lock) must not race two tags into
 * the document.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/** The subset of Razorpay Checkout this integration uses.
 *
 *  Deliberately narrow. The SDK surface is large and mostly irrelevant here,
 *  and a wide `any` would let a typo reach the browser as a silent no-op. */
export interface RazorpayCheckoutOptions {
  key: string
  subscription_id: string
  name: string
  description?: string
  /** Called when the customer completes payment. NOT proof of a plan change —
   *  the payload is verified server-side and the webhook grants the plan. */
  handler: (response: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
  }) => void
  prefill?: { email?: string; name?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean }
}

export interface RazorpayInstance {
  open: () => void
  close: () => void
  on: (event: string, handler: (payload: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance
  }
}

let loader: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout requires a browser'))
  }
  if (window.Razorpay) return Promise.resolve()
  if (loader) return loader

  loader = new Promise<void>((resolve, reject) => {
    // An existing tag means a previous mount already started this. Attach to it
    // rather than adding a second: two tags would both resolve, and the second
    // download is pure waste on a connection that may be why we are waiting.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`,
    )
    const script = existing ?? document.createElement('script')
    const onLoad = () => (window.Razorpay ? resolve() : reject(new Error('Razorpay unavailable')))
    const onError = () => {
      // Clear the memo so a retry can genuinely retry. Leaving a rejected
      // promise cached would make "Try again" fail instantly forever, which
      // reads as a broken button rather than a bad network.
      loader = null
      reject(new Error('Could not load Razorpay Checkout'))
    }
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    if (!existing) {
      script.src = CHECKOUT_SRC
      script.async = true
      document.body.appendChild(script)
    }
  })
  return loader
}

/** Ensures Checkout is available, then constructs a modal.
 *
 *  Returns a function rather than a ready flag: the caller wants to know
 *  "can I open this now", and awaiting at the moment of use keeps the loading
 *  state in one place instead of spread across a boolean and an effect. */
export function useRazorpayCheckout() {
  return React.useCallback(async (options: RazorpayCheckoutOptions): Promise<RazorpayInstance> => {
    await loadCheckoutScript()
    if (!window.Razorpay) throw new Error('Could not load Razorpay Checkout')
    return new window.Razorpay(options)
  }, [])
}

/** Test seam — resets the module-scope memo between cases. */
export function __resetRazorpayLoaderForTests() {
  loader = null
}
