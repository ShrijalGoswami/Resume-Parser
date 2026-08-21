/**
 * Billing API client (Razorpay checkout).
 *
 * THE CLIENT NEVER NAMES A PRICE OR A GATEWAY PLAN.
 * ------------------------------------------------
 * `createSubscription` sends one thing: a plan SLUG — `'plus'` or `'pro'`. The
 * backend resolves that to a Razorpay plan id and an amount from its own
 * environment (`RAZORPAY_PLAN_*`), and refuses any slug outside `SELLABLE_PLANS`.
 *
 * That is the whole trust boundary, and it is worth being explicit about why it
 * is shaped this way: if the browser could send a `plan_id` or an `amount`, then
 * anyone with dev tools could subscribe to a plan of their own making for a
 * price of their own choosing. It cannot, because the server never reads one.
 * The amount that comes BACK is for display only — it is what the gateway will
 * charge, echoed so the confirmation panel and the modal cannot disagree.
 *
 * `verifyCallback` posts Razorpay's browser payload back for server-side HMAC
 * verification. IT GRANTS NOTHING, by design: it tells the interface the
 * customer finished so it can stop spinning. The plan changes when the webhook
 * arrives and only then — see `docs/BILLING_ARCHITECTURE.md` §7.2.
 */
import { authHeaders, V1 } from './auth-headers';
import { apiErrorFrom } from '@/lib/api-error';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<T>;
}

/** The plans that can be bought self-serve. Mirrors the backend's
 *  `SELLABLE_PLANS`; Free is not a purchase and Enterprise is quoted. */
export type SellablePlan = 'trial' | 'trial_interview' | 'plus' | 'pro';

/** What the browser needs to open Razorpay Checkout.
 *
 *  `public_key` is the PUBLISHABLE key id (`rzp_test_…`). It is safe in a
 *  response body and safe in the client bundle — it identifies the merchant and
 *  cannot authorize a charge. The key secret never leaves the server. */
export interface CheckoutHandoff {
  provider: string;
  kind: 'modal' | 'redirect';
  subscription_id: string | null;
  redirect_url: string | null;
  public_key: string | null;
  amount_minor: number | null;
  currency: string | null;
}

export interface CallbackVerification {
  verified: boolean;
  /** Always false. The webhook is what activates a plan — never this call. */
  plan_active: boolean;
  message: string;
}

/** Razorpay's browser callback payload. Passed through untouched: the backend
 *  route takes an opaque map so it stays provider-agnostic, and only the
 *  adapter knows these field names. */
export interface RazorpayCallbackPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/**
 * Start a subscription for a plan the customer chose.
 *
 * ANY sellable plan, from any current plan. There is no ladder: a Free
 * organization may buy Pro directly, and the backend accepts it — the tier
 * sequence Settings ▸ Billing used to imply was a UI artefact, never a rule.
 */
export const createSubscription = (plan: SellablePlan) =>
  api<CheckoutHandoff>('/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ plan, currency: 'INR' }),
  });

/** What a scheduled plan change returns. Nothing is true YET. */
export interface ScheduledPlanChange {
  current_plan: string;
  scheduled_plan: string;
  /** ISO-8601 end of the paid period, from the gateway. Null when it gave none
   *  — the UI then says "at the end of your current period" rather than
   *  inventing a date. */
  effective_at: string | null;
  /** The change was already queued; this request created nothing new. */
  already_scheduled: boolean;
}

/**
 * Move a LIVE subscription up a tier, effective at the cycle end.
 *
 * A different operation from checkout, on purpose. There is no mandate to
 * authorize — the customer already has one — so there is no Razorpay modal and
 * **no charge today**. One server call against the subscription they already
 * hold; the plan changes when the billing period rolls over.
 *
 * Sends a slug only. The gateway plan id, the amount and the schedule are all
 * resolved server-side.
 */
export const changePlan = (plan: SellablePlan) =>
  api<ScheduledPlanChange>('/billing/subscriptions/plan-change', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });

export const verifyCheckoutCallback = (payload: RazorpayCallbackPayload) =>
  api<CallbackVerification>('/billing/subscriptions/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
