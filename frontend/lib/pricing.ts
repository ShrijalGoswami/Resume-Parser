/**
 * What each plan COSTS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Deliberately separate from the entitlement catalog.
 *
 * `components/hirelens/lib/entitlements/catalog.ts` answers "what does this
 * plan include?" and is mirrored from the server, where it is enforced. This
 * file answers "what does it cost?", which the server has no opinion about and
 * no code path depends on. Merging them would put a commercial number inside
 * the structure that decides access, and a pricing change would then touch the
 * module that gates the product.
 *
 * So: features and limits come from the catalog, money comes from here, and the
 * pricing page reads both. Nothing else reads this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * There is no self-service checkout yet — the API has no subscription write
 * path and the database revokes one. These figures are what the page QUOTES;
 * nothing charges anyone, and no code compares a price to anything.
 */

import type { PlanKey } from '@/components/hirelens/lib/entitlements/catalog'

export type CurrencyCode = 'INR' | 'USD'

export interface Currency {
  code: CurrencyCode
  symbol: string
  /** Used by `Intl.NumberFormat` for grouping — ₹2,499 vs $2,499. */
  locale: string
  label: string
  /** How the currency is named in the UI. The selector is a CURRENCY choice,
   *  not a country one — a customer picks what they want to be quoted in. */
  name: string
  /**
   * The market this price list was set for.
   *
   * Configuration metadata, not UI copy: it records WHY ₹999 and $19 are what
   * they are. Showing it in the selector would turn a currency preference into
   * a claim about where the visitor is, which is neither our business nor
   * reliably knowable.
   */
  market: string
  /**
   * Whether these figures are a real commercial decision.
   *
   * An unconfirmed market is NEVER rendered. A price is a promise, and a
   * plausible-looking number nobody agreed to is the one kind of placeholder a
   * customer can act on before anyone notices it was invented.
   *
   * To add a market: set real amounts below and flip this to `true`. A test
   * asserts that no confirmed market has placeholder zeros, so this cannot be
   * flipped ahead of the decision.
   */
  confirmed: boolean
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    label: 'INR',
    name: 'Indian Rupee',
    market: 'India',
    confirmed: true,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    label: 'USD',
    name: 'US Dollar',
    market: 'United States',
    confirmed: true,
  },
}

/** `null` means the plan has no list price at this cadence — Enterprise is
 *  quoted, and any period that has not been priced yet is also `null`. */
export type Amount = number | null

export type BillingPeriod = 'monthly' | 'yearly'

/** Every cadence a plan can carry a price for. */
export interface PlanPricing {
  monthly: Amount
  /**
   * Yearly list price — the TOTAL for twelve months, not a monthly-equivalent.
   * A page that shows "₹833/mo billed annually" derives that here rather than
   * storing it, so the number a customer is actually charged is the one in the
   * config.
   */
  yearly: Amount
}

/**
 * YEARLY BILLING IS OFF, and this flag is the only thing that decides it.
 *
 * The schema carries yearly so that adding it later is a data change rather
 * than a refactor — but two things must be true before it can be flipped, and
 * neither is today:
 *
 *   1. Someone has to decide the yearly prices. They are `null` below, not a
 *      12× multiple, because "monthly × 12" is not an annual plan — the
 *      discount IS the product decision, and inventing one here would ship a
 *      number nobody agreed to.
 *   2. The backend has to be able to honour it. `subscriptions` has no annual
 *      period and résumé credits renew per calendar month UTC, so an annual
 *      plan today would be a promise the server cannot keep.
 *
 * `availableBillingPeriods()` reads this, so no surface needs its own guard.
 */
export const YEARLY_BILLING_ENABLED = false

/**
 * List prices, per market, per cadence.
 *
 * MARKET PRICING, NOT CONVERSION. Each market is an independent decision about
 * what it will pay. ₹999 and $19 are not the same number seen through an
 * exchange rate, and nothing in this file multiplies one by anything to reach
 * the other — deliberately, because an FX-derived price moves when the rupee
 * moves, which is a reason to change a price that has nothing to do with the
 * product or the customer.
 *
 * Adding a market means making that decision, not running a conversion. The
 * same is true of adding a cadence.
 */
export const PRICING: Record<CurrencyCode, Record<PlanKey, PlanPricing>> = {
  // India
  INR: {
    free: { monthly: 0, yearly: 0 },
    // The trials are ONE-TIME purchases; the figure lives in the `monthly`
    // slot because that is the slot checkout charges from, but `isOneTime`
    // below strips the "/month" promise from every surface.
    trial: { monthly: 99, yearly: null },
    trial_interview: { monthly: 149, yearly: null },
    plus: { monthly: 999, yearly: null },
    pro: { monthly: 2499, yearly: null },
    enterprise: { monthly: null, yearly: null },
  },
  // United States
  USD: {
    free: { monthly: 0, yearly: 0 },
    // Not priced for the US market — the trials are an INR/checkout offer, and
    // USD has no checkout. `null` keeps them off every USD surface.
    trial: { monthly: null, yearly: null },
    trial_interview: { monthly: null, yearly: null },
    plus: { monthly: 19, yearly: null },
    pro: { monthly: 49, yearly: null },
    enterprise: { monthly: null, yearly: null },
  },
}

/**
 * Plans charged ONCE, not on a cycle. Sold through the same checkout (the
 * backend expresses them as single-cycle gateway subscriptions), but every
 * price surface must say "one-time" rather than "/month" — a cadence that will
 * never recur is not a cadence.
 */
export const ONE_TIME_PLANS: readonly PlanKey[] = ['trial', 'trial_interview']

export function isOneTime(plan: PlanKey): boolean {
  return ONE_TIME_PLANS.includes(plan)
}

/**
 * THE ONE CURRENCY WE CAN ACTUALLY TAKE MONEY IN.
 *
 * Quoting a market and being able to charge it are different facts, and the
 * page was treating them as one. Both markets above are confirmed, so the
 * selector offered both and `detectCurrency` auto-picked USD for any
 * `America/*` timezone — after which a US visitor was shown $19, offered "Start
 * with Plus", walked through signup and into an upgrade prompt for a
 * transaction that cannot happen in dollars.
 *
 * The gateway is Razorpay and it settles INR. International payments are a
 * deferred decision, not an oversight, and the deferral was recorded — but only
 * in a backlog, so the page went on making the promise anyway.
 *
 * A quoted market is still worth having: a US buyer needs to know roughly what
 * this costs before they will talk to anyone. What they must NOT be given is a
 * self-serve path that dead-ends at a gateway which cannot serve them. So an
 * unchargeable market keeps its prices and loses its checkout, and every
 * surface reads this rather than testing `currency === 'INR'` in five places.
 *
 * When international payments land, this becomes a list.
 */
export const CHECKOUT_CURRENCIES: readonly CurrencyCode[] = ['INR']

/** Whether a self-serve purchase can complete in this currency today. */
export function isCheckoutSupported(currency: CurrencyCode): boolean {
  return CHECKOUT_CURRENCIES.includes(currency)
}

/**
 * Why a market has no self-serve path, in the customer's terms.
 *
 * Phrased as what we will do rather than what we cannot do — "talk to sales" is
 * a route, "we don't support your currency" is a wall. Null when checkout is
 * available and there is nothing to explain.
 */
export function checkoutUnavailableReason(currency: CurrencyCode): string | null {
  if (isCheckoutSupported(currency)) return null
  return `We can’t take card payments in ${CURRENCIES[currency].label} yet — talk to us and we’ll set your account up directly.`
}

export const DEFAULT_BILLING_PERIOD: BillingPeriod = 'monthly'

/** Cadences a surface may offer. Monthly only until yearly is priced and the
 *  backend can bill it. */
export function availableBillingPeriods(): BillingPeriod[] {
  return YEARLY_BILLING_ENABLED ? ['monthly', 'yearly'] : ['monthly']
}

/**
 * One line of positioning per plan — who it is for.
 *
 * Marketing copy, so it lives here rather than in the catalog: the catalog's
 * blurbs describe *capabilities* and are shown on lock surfaces inside the
 * product, where a sales voice would be wrong.
 */
export const PLAN_POSITIONING: Record<PlanKey, string> = {
  free: 'Try the full analysis on a couple of résumés before you commit anything.',
  trial: 'Ten résumés and one role, analysed in full, for a one-time ₹99.',
  trial_interview: 'The trial plus one full interview pack and one Copilot question, one-time.',
  plus: 'For the recruiter running their own roles end to end.',
  pro: 'For a hiring team that needs the intelligence layer and shared memory.',
  enterprise: 'For organizations with their own AI, their own identity, and their own rules.',
}

/** The tier the cards emphasise. One card, or the row reads as four equal options. */
export const FEATURED_PLAN: PlanKey = 'pro'

/** Markets safe to display. Never returns an unconfirmed one. */
export function availableCurrencies(): Currency[] {
  return Object.values(CURRENCIES).filter((c) => c.confirmed)
}

/**
 * What renders before anything is known about the visitor — on the server, and
 * on the first client paint.
 *
 * It must be a constant: deriving it from a request header would make the page
 * uncacheable, and deriving it from the browser during render would produce
 * markup the server cannot reproduce, which React rejects as a hydration
 * mismatch. Detection happens after mount instead — see `detectCurrency`.
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'INR'

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in CURRENCIES
}

/**
 * A FIRST GUESS at which currency to quote, from the browser.
 *
 * A guess and nothing more. It picks the initial selection and is then out of
 * the way: the selector is always present, an explicit choice always wins and
 * is remembered, and nothing here is treated as a fact about the visitor. A US
 * buyer working from Bangalore must be able to reach the price they will
 * actually be charged.
 *
 * NOT the billing country, and must never be used as one. Which currency a
 * customer is CHARGED in is a checkout concern, decided from the billing
 * details they provide — a payment processor and a tax authority both care
 * about that answer, and a browser timezone is not evidence for either. When
 * checkout lands it is free to override this preference; this value only ever
 * decides what a marketing page displays.
 *
 * Timezone is read before language because it is the better signal: `en-US` is
 * a common browser default worldwide, while `Asia/Calcutta` is set by where the
 * machine actually is. Anything unrecognised falls through to the default.
 *
 * Safe to call on the server — returns the default when there is no `window`.
 */
export function detectCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    // Both spellings are in the wild; older ICU data reports Calcutta.
    if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'INR'
    if (zone.startsWith('America/')) return 'USD'

    const language = navigator.language ?? ''
    if (language.endsWith('-IN')) return 'INR'
    if (language.endsWith('-US')) return 'USD'
  } catch {
    /* Intl or navigator unavailable — the default is a fine answer. */
  }

  return DEFAULT_CURRENCY
}

/**
 * The list price, or `null` where there is none.
 *
 * `period` defaults to monthly, so every existing caller keeps quoting the
 * cadence the product actually bills. An unpriced cadence returns `null` and
 * formats as "Custom" — the same treatment as Enterprise, because in both
 * cases the honest answer is "talk to us", not a number.
 */
export function priceOf(
  plan: PlanKey,
  currency: CurrencyCode,
  period: BillingPeriod = DEFAULT_BILLING_PERIOD,
): Amount {
  return PRICING[currency][plan][period]
}

/** True when a plan carries no list price at all — Enterprise is quoted. */
export function isQuoted(plan: PlanKey): boolean {
  return PRICING[DEFAULT_CURRENCY][plan][DEFAULT_BILLING_PERIOD] === null
}

/**
 * "₹2,499" · "Free" · "Custom". No decimals: these are whole-rupee and
 * whole-dollar list prices, and a trailing `.00` on a pricing card reads as a
 * transaction rather than a rate.
 */
export function formatPrice(
  plan: PlanKey,
  currency: CurrencyCode,
  period: BillingPeriod = DEFAULT_BILLING_PERIOD,
): string {
  const amount = priceOf(plan, currency, period)
  if (amount === null) return 'Custom'
  if (amount === 0) return 'Free'
  const { locale, code } = CURRENCIES[currency]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** What follows the figure. Empty for Free and Enterprise — "Free /month" is
 *  noise, and "Custom /month" is a guess about a contract we have not written. */
export function priceSuffix(
  plan: PlanKey,
  currency: CurrencyCode,
  period: BillingPeriod = DEFAULT_BILLING_PERIOD,
): string {
  const amount = priceOf(plan, currency, period)
  if (amount === null || amount === 0) return ''
  if (isOneTime(plan)) return ' one-time'
  return period === 'yearly' ? '/year' : '/month'
}
