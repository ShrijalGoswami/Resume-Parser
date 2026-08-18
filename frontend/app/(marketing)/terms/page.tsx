import type { Metadata } from 'next'
import Link from 'next/link'

import { Clause, Fact, LegalPage, List, P } from '@/components/marketing/legal/legal-page'
import { ENTITY, POLICY_UPDATED, SERVICE_DESCRIPTION, contactAddress } from '@/lib/legal'
import { LIMITS, PLAN_LABELS } from '@/components/hirelens/lib/entitlements/catalog'

export const metadata: Metadata = {
  title: 'Terms of Service — Hirevo',
  description:
    'The agreement between Hirevo and the organizations that use it: what we provide, what you are responsible for, and how either side ends it.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms of Service — Hirevo', url: '/terms', type: 'article' },
}

/**
 * Terms of Service.
 *
 * Written to be READ, not to be survived. Every clause states one obligation in
 * the shortest sentence that carries it, because a term a customer cannot
 * understand is a term they cannot comply with.
 *
 * Two constraints shaped the content:
 *
 *   1. Nothing here promises a capability the product does not have. The whole
 *      point of the August 2026 audit pass was removing claims that outran the
 *      implementation, and a contract is the worst place to reintroduce one.
 *   2. The service-level language is deliberately modest. There is no uptime
 *      commitment because there is no monitoring obligation we have accepted,
 *      and an SLA figure invented for a terms page is a number the customer is
 *      entitled to hold us to.
 *
 * Résumé limits are read from the entitlement catalog rather than typed, for the
 * same reason the pricing page derives its table: a limit stated in a contract
 * and enforced in code must be the same number.
 */
export default function TermsPage() {
  const support = contactAddress('support')

  return (
    <LegalPage
      title="Terms of Service"
      summary="The agreement between Hirevo and your organization. It covers what we provide, what you are responsible for, and how either side can end it."
      updated={POLICY_UPDATED.terms}
      path="/terms"
    >
      <Clause title="1. Who this agreement is with">
        <P>
          These terms are between{' '}
          <Fact value={ENTITY.name} label="registered entity" /> (“Hirevo”,
          “we”, “us”) and the organization whose account accepts them
          (“you”). If you accept them on behalf of an employer, you confirm you are
          authorised to bind that employer.
        </P>
        <P>
          Registration number: <Fact value={ENTITY.registration} label="registration number" />.
        </P>
      </Clause>

      <Clause title="2. What we provide">
        <P>{SERVICE_DESCRIPTION}</P>
        <P>
          We provide the service as it exists at the time you use it. Features are described on
          our <Link href="/pricing" className="text-mkt-accent-text underline">pricing page</Link>,
          and what your plan includes is what the service enforces — the two are generated from a
          single source so they cannot disagree. We may add, change or withdraw features; where a
          change removes something material from a paid plan, we will tell you before it takes
          effect.
        </P>
        <P>
          We do not promise a specific level of availability, and we do not currently offer a
          service-level agreement. If that changes it will be a separate written commitment, not
          an amendment to this page.
        </P>
      </Clause>

      <Clause title="3. Your account and your team">
        <List
          items={[
            'You are responsible for everything done under your account, including by people you invite.',
            'Keep credentials confidential and tell us promptly if you believe they have been compromised.',
            'Seats are per person. Sharing one login across several people is not permitted, and it makes your own audit trail useless.',
            'You are responsible for removing access when someone leaves your team.',
          ]}
        />
      </Clause>

      <Clause title="4. Candidate data, and the responsibility that comes with it">
        <P>
          Résumés you upload contain other people’s personal data. In respect of that data
          you are the controller and we are the processor: you decide why it is processed, and we
          process it only to provide the service to you.
        </P>
        <List
          items={[
            'You confirm you have a lawful basis to upload each résumé and to have it analysed.',
            'You will not upload special-category data (health, biometrics, and similar) — the service is not designed to hold it.',
            'You will respond to candidates exercising their rights over their own data. We will help you do so; see the Privacy Policy.',
            'You will not use Hirevo to make a decision producing a legal or similarly significant effect on a candidate without a human reviewing it.',
          ]}
        />
        <P>
          That last point is not boilerplate. Hirevo recommends and evidences; a person decides.
          The product is built that way and the agreement says so.
        </P>
      </Clause>

      <Clause title="5. Acceptable use">
        <P>You agree not to:</P>
        <List
          items={[
            'reverse engineer, resell or white-label the service without our written agreement;',
            'use it to build a competing product, or to benchmark it for publication without telling us;',
            'upload malware, or content you have no right to upload;',
            'attempt to circumvent plan limits, entitlement checks or rate limits;',
            'use the service to discriminate against candidates on any ground protected by applicable law.',
          ]}
        />
      </Clause>

      <Clause title="6. Plans, limits and payment">
        <P>
          {PLAN_LABELS.free} includes {LIMITS.free.resumes} résumé analyses for the lifetime of
          your organization — it is a trial, not a monthly allowance. Paid plans renew at the
          start of each calendar month and their allowances reset then.
        </P>
        <P>
          Prices are shown on the pricing page and are inclusive of applicable GST. Charges are
          taken in advance for each billing period. Refunds and cancellation are covered by our{' '}
          <Link href="/refunds" className="text-mkt-accent-text underline">
            Refund &amp; Cancellation Policy
          </Link>
          , which forms part of these terms.
        </P>
        <P>
          If a payment fails we will keep your team working while we sort it out, rather than
          locking a hiring pipeline mid-week. We will suspend access only after we have contacted
          you and a reasonable grace period has passed.
        </P>
      </Clause>

      <Clause title="7. Your data stays yours">
        <P>
          You own the content you put into Hirevo. We claim no ownership over your résumés,
          notes, decisions or reports, and we do not use them to train models that serve anyone
          other than your organization.
        </P>
        <P>
          You can export your data while your account is active. On termination we will keep it
          available for 30 days so you can retrieve it, then delete it in the ordinary course
          described in the Privacy Policy.
        </P>
      </Clause>

      <Clause title="8. Confidentiality">
        <P>
          Each side will protect the other’s non-public information with at least the care
          it applies to its own, and will use it only to perform this agreement. This survives
          termination.
        </P>
      </Clause>

      <Clause title="9. Ending the agreement">
        <List
          items={[
            'You may cancel at any time; cancellation takes effect at the end of your current billing period.',
            'We may suspend an account immediately where continued use would break the law, endanger the service, or where fees remain unpaid after notice.',
            'We may end the agreement on 30 days’ written notice, refunding any period paid for and not used.',
          ]}
        />
      </Clause>

      <Clause title="10. Warranties and liability">
        <P>
          The service is provided as-is. We do not warrant that its analysis is free of error, and
          you should not treat it as the sole basis for a hiring decision — the product is
          designed around a human making the call, and this clause reflects that rather than
          disclaiming it after the fact.
        </P>
        <P>
          To the extent the law allows, neither side is liable for indirect or consequential loss,
          or for lost profits or goodwill. Our total liability in any twelve-month period is
          limited to the fees you paid us in that period. Nothing here limits liability that
          cannot lawfully be limited, including for fraud or for death or personal injury caused
          by negligence.
        </P>
      </Clause>

      <Clause title="11. Changes to these terms">
        <P>
          We will post any change here and update the date at the top. Where a change materially
          reduces your rights we will give at least 30 days’ notice by email before it takes
          effect, and you may cancel within that period without penalty.
        </P>
      </Clause>

      <Clause title="12. Governing law">
        <P>
          This agreement is governed by the laws of{' '}
          <Fact value={ENTITY.jurisdiction} label="jurisdiction" />, and the courts there have
          exclusive jurisdiction over any dispute.
        </P>
      </Clause>

      <Clause title="13. Contact">
        <P>
          Questions about these terms:{' '}
          {support ? (
            <a href={`mailto:${support}`} className="text-mkt-accent-text underline">
              {support}
            </a>
          ) : (
            <Link href="/contact" className="text-mkt-accent-text underline">
              see our contact page
            </Link>
          )}
          .
        </P>
      </Clause>
    </LegalPage>
  )
}
