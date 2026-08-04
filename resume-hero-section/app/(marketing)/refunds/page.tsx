import type { Metadata } from 'next'
import Link from 'next/link'

import { Clause, LegalPage, List, P } from '@/components/marketing/legal/legal-page'
import { POLICY_UPDATED, contactAddress } from '@/lib/legal'
import { LIMITS, PLAN_LABELS } from '@/components/hirelens/lib/entitlements/catalog'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — HireLens',
  description:
    'How to cancel a HireLens subscription, what happens to your data afterwards, and when we refund.',
}

/**
 * Refund & Cancellation Policy.
 *
 * Required for Razorpay merchant activation, and required by common sense: a
 * subscription product that does not say how to leave is asking the customer to
 * trust it on the one point they have no evidence about.
 *
 * The policy is deliberately generous in the one place that costs least and
 * matters most — the free tier means nobody has to buy in order to evaluate, so
 * a refund request almost always signals we got something wrong rather than
 * that someone is gaming us.
 *
 * Nothing here describes a mechanism that does not exist. Self-serve
 * cancellation is stated as "contact us" because that is genuinely the only
 * route today; when a billing portal ships, this page changes with it.
 */
export default function RefundsPage() {
  const support = contactAddress('support')

  const contactLink = support ? (
    <a href={`mailto:${support}`} className="text-mkt-accent-text underline">
      {support}
    </a>
  ) : (
    <Link href="/contact" className="text-mkt-accent-text underline">
      our contact page
    </Link>
  )

  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      summary="How to cancel, what happens to your data when you do, and the circumstances in which we refund."
      updated={POLICY_UPDATED.refunds}
    >
      <Clause title="1. You do not have to buy to evaluate">
        <P>
          Every organization starts on {PLAN_LABELS.free}, which includes{' '}
          {LIMITS.free.resumes} full résumé analyses with no card required. That is the real
          analysis, not a reduced one — the intent is that you know whether HireLens works for you
          before any money changes hands.
        </P>
      </Clause>

      <Clause title="2. Cancelling">
        <P>
          You can cancel at any time. Cancellation takes effect at the end of the billing period
          you have already paid for, so you keep the plan you bought until it expires and are not
          charged again.
        </P>
        <P>
          There is no self-serve cancellation button yet. To cancel, contact us at {contactLink}{' '}
          from the email address on the account. We will confirm in writing, and the confirmation
          is what counts — not the request.
        </P>
        <P>
          We will not make you sit through a retention call. If you tell us why you are leaving we
          will listen; if you do not, we will still cancel.
        </P>
      </Clause>

      <Clause title="3. Refunds">
        <P>We refund in these cases:</P>
        <List
          items={[
            'Within 7 days of a first subscription payment, for any reason, in full.',
            'Where you were charged after cancelling, or charged twice — in full, promptly, without argument.',
            'Where a fault on our side made the service substantially unusable for a material part of a billing period — pro rata for that period.',
          ]}
        />
        <P>We do not normally refund:</P>
        <List
          items={[
            'A partly used billing period following a voluntary cancellation, since you keep access until it ends.',
            'A period during which the service worked and was used.',
            'Charges older than the current and immediately preceding billing period.',
          ]}
        />
        <P>
          Résumé allowances do not carry over between months and are not separately refundable —
          they are part of the plan, not a purchase of credits.
        </P>
      </Clause>

      <Clause title="4. How a refund is paid">
        <P>
          Refunds go back to the original payment method through our payment processor. We
          initiate them within 5 business days of agreeing one. How long the money then takes to
          appear is the card issuer&rsquo;s or bank&rsquo;s decision, typically 5 to 10 business
          days, and is outside our control.
        </P>
      </Clause>

      <Clause title="5. A failed payment is not a cancellation">
        <P>
          If a renewal payment fails we keep your team working while we sort it out with you,
          rather than locking a hiring pipeline mid-week. We will contact you, retry, and suspend
          access only after a grace period has passed. Nothing is deleted when an account is
          suspended.
        </P>
      </Clause>

      <Clause title="6. Your data when you leave">
        <P>
          Cancelling does not delete anything immediately. Your candidates, decisions, notes and
          ledger remain readable and exportable for 30 days after the account closes, so you can
          take them with you. After that they are deleted as described in the{' '}
          <Link href="/privacy" className="text-mkt-accent-text underline">
            Privacy Policy
          </Link>
          .
        </P>
        <P>
          Ask us to delete sooner and we will. Invoices are the exception: tax law requires us to
          keep them.
        </P>
      </Clause>

      <Clause title="7. Downgrading">
        <P>
          Moving to a lower plan takes effect at the end of the current billing period. Nothing
          you have already analysed is removed by a downgrade — you keep your data and lose only
          the capabilities the lower plan does not include.
        </P>
      </Clause>

      <Clause title="8. Contact">
        <P>Refund and cancellation requests, and anything unclear on this page: {contactLink}.</P>
      </Clause>
    </LegalPage>
  )
}
