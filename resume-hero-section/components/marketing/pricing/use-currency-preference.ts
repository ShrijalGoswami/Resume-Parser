'use client'

import * as React from 'react'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  detectCurrency,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/pricing'

const STORAGE_KEY = 'hl-pricing-currency'

/**
 * Which currency the visitor is quoted in — a DISPLAY PREFERENCE, nothing more.
 *
 * Order of authority, highest first:
 *   1. what the visitor last chose (localStorage) — an explicit choice is never
 *      overridden by a guess, on this visit or any later one
 *   2. what the browser suggests (timezone, then language) — a first guess only
 *   3. the default
 *
 * NOT a billing country. Which currency a customer is actually CHARGED in is
 * decided at checkout from the billing details they give us, and checkout is
 * free to override this preference when it disagrees — a payment processor and
 * a tax authority both need a real answer, and a browser timezone is not
 * evidence for either. Nothing downstream should treat this as a fact about
 * where anyone is.
 *
 * Implemented as an external store rather than state-in-an-effect. The market
 * genuinely IS external — it lives in `localStorage` and in the browser's own
 * locale — and `useSyncExternalStore` is the one API that lets the server
 * render a stable value while the client reads the real one, without the
 * cascading render that setting state from an effect causes.
 *
 * Reading `Intl` or `navigator` during render would produce markup the server
 * cannot reproduce; React discards the whole tree on a hydration mismatch, so
 * the page would flash and any open panel would close. The server snapshot is
 * therefore the constant default, and the true market arrives on hydration.
 *
 * One module-level store, so `/pricing` and the homepage band always agree —
 * including live, in the same session, and across tabs.
 */

let cached: CurrencyCode | null = null
const listeners = new Set<() => void>()

function resolve(): CurrencyCode {
  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    /* Storage throws in some private modes — detection still works. */
  }
  // A stored currency only counts while we still quote in it; one that has
  // been withdrawn must not keep pricing pages out of storage.
  if (isCurrencyCode(stored) && CURRENCIES[stored].confirmed) return stored
  return detectCurrency()
}

function getSnapshot(): CurrencyCode {
  // Cached because `getSnapshot` runs on every render and must be cheap; also
  // because it must return a stable value or React will loop.
  if (cached === null) cached = resolve()
  return cached
}

function getServerSnapshot(): CurrencyCode {
  return DEFAULT_CURRENCY
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Another tab changing currency should not leave this one quoting something
  // different from what the customer just chose.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    cached = null
    listeners.forEach((l) => l())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function choose(next: CurrencyCode) {
  cached = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* The choice still applies for this visit. */
  }
  listeners.forEach((l) => l())
}

export function useCurrencyPreference(): [CurrencyCode, (next: CurrencyCode) => void] {
  const currency = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return [currency, choose]
}

/** Test seam — resets the module store between cases. */
export function __resetCurrencyPreference() {
  cached = null
}
