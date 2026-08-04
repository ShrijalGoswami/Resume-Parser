'use client'

import * as React from 'react'
import { availableCurrencies, type CurrencyCode } from '@/lib/pricing'

/**
 * Currency selector.
 *
 * Presented as a CURRENCY choice, never a country one. The prices behind it
 * are set per market — ₹999 and $19 are separate decisions, not one number
 * converted — but that is configuration, not something to put in front of a
 * visitor. Asking "which country are you in?" makes a claim about the person;
 * asking "which currency?" asks a preference, which is all this is.
 *
 * Renders NOTHING when only one currency is confirmed. A toggle with a single
 * option is furniture that implies a choice the visitor does not have.
 *
 * The starting selection is a guess from the browser and is always
 * overridable. It is also not a billing decision: what a customer is charged
 * in is settled at checkout from their billing details, which may well
 * disagree with what they browsed in.
 */
export function CurrencyToggle({
  value,
  onChange,
}: {
  value: CurrencyCode
  onChange: (next: CurrencyCode) => void
}) {
  const currencies = availableCurrencies()
  if (currencies.length < 2) return null

  return (
    <div
      role="radiogroup"
      aria-label="Currency"
      className="inline-flex items-center rounded-[0.3rem] border border-mkt-border p-0.5"
    >
      {currencies.map((currency) => {
        const active = currency.code === value
        return (
          <button
            key={currency.code}
            type="button"
            role="radio"
            aria-checked={active}
            // "Indian Rupee (INR)" reads correctly out loud; "₹ INR" does not.
            aria-label={`${currency.name} (${currency.label})`}
            onClick={() => onChange(currency.code)}
            className={`rounded-[0.2rem] px-3 py-1 mkt-label transition-colors ${
              active ? 'bg-mkt-fg text-mkt-canvas' : 'text-mkt-fg-secondary hover:text-mkt-fg'
            }`}
          >
            <span aria-hidden="true">
              {currency.symbol} {currency.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
