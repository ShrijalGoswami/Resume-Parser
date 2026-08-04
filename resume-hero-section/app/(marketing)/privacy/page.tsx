import type { Metadata } from 'next'
import Link from 'next/link'

import { Clause, Fact, LegalPage, List, P } from '@/components/marketing/legal/legal-page'
import {
  ENTITY,
  GRIEVANCE_OFFICER,
  POLICY_UPDATED,
  SUBPROCESSORS,
  contactAddress,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — HireLens',
  description:
    'What personal data HireLens holds, why, where it lives, who else processes it, and how long we keep it — including the résumés of candidates who never signed up.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy — HireLens', url: '/privacy', type: 'article' },
}

/**
 * Privacy Policy.
 *
 * The hard part of this document is that HireLens processes personal data about
 * people who never visited the site: candidates whose résumés a recruiter
 * uploaded. They have rights, they have no account, and most privacy policies
 * quietly address only the account holder. This one addresses both, and says
 * plainly which of the two we are talking to in each clause.
 *
 * Every factual claim here is checkable against the deployment:
 *   - the region is the real Supabase region, not a marketing "global" answer;
 *   - the subprocessors are named individually, from `lib/legal.ts`;
 *   - no certification is claimed, because none has been obtained.
 *
 * The trust strip on the homepage used to assert SOC 2 Type II and a choice of
 * data residency. Neither was true. This page is where the honest version of
 * those answers now lives, and it is deliberately less flattering.
 */
export default function PrivacyPage() {
  const privacy = contactAddress('privacy')
  const officerEmail = contactAddress('privacy')

  return (
    <LegalPage
      title="Privacy Policy"
      summary="What we hold, why we hold it, where it lives and how long it stays — for the people who use HireLens and for the candidates whose résumés pass through it."
      updated={POLICY_UPDATED.privacy}
      path="/privacy"
    >
      <Clause title="1. Who is responsible for what">
        <P>
          <Fact value={ENTITY.name} label="registered entity" /> operates HireLens.
        </P>
        <P>
          For <strong className="text-mkt-fg">account data</strong> — the people who sign in — we
          are the controller and this policy describes what we do.
        </P>
        <P>
          For <strong className="text-mkt-fg">candidate data</strong> — the résumés uploaded into
          a workspace — the customer organization is the controller and we are their processor. We
          process that data on their instructions to provide the service, and for nothing else. If
          you are a candidate and want your data removed, the fastest route is the organization
          that holds it; we will also help directly, see clause 8.
        </P>
      </Clause>

      <Clause title="2. What we collect">
        <P>From people with an account:</P>
        <List
          items={[
            'Name, work email and password credentials (passwords are stored hashed, never in readable form).',
            'The organization you belong to and your role within it.',
            'Records of what you did in the product — roles created, candidates reviewed, decisions taken — which is what makes the decision ledger useful.',
            'Billing details where you subscribe. Card numbers are handled by our payment processor and never reach our servers.',
          ]}
        />
        <P>From résumés uploaded by a customer:</P>
        <List
          items={[
            'Whatever the résumé contains — typically name, contact details, employment history, education and skills.',
            'The analysis we derive from it: scores, extracted skills, gaps and the evidence spans supporting each claim.',
            'The original file, so a recruiter can open what the candidate actually sent.',
          ]}
        />
        <P>
          We do not ask for special-category data and the service is not designed to hold it.
          Customers are contractually required not to upload it.
        </P>
      </Clause>

      <Clause title="3. Why we process it">
        <List
          items={[
            'To provide the service — analysing a résumé against a role is the product.',
            'To authenticate you and keep the account secure.',
            'To bill you, where you are on a paid plan.',
            'To support you when you contact us.',
            'To meet legal obligations, including keeping invoices for the statutory period.',
          ]}
        />
        <P>
          For account data our basis is performance of a contract, and legitimate interest in
          securing the service. For candidate data the customer organization determines the basis;
          under our terms they confirm they have one.
        </P>
      </Clause>

      <Clause title="4. What we do not do">
        <List
          items={[
            'We do not use your résumés, notes or decisions to train models that serve any other organization.',
            'We do not sell personal data, and we do not share it with advertisers.',
            'We run no advertising or third-party tracking pixels on any signed-in page.',
            'We do not enrich candidate profiles from external sources, and we do not scrape.',
          ]}
        />
      </Clause>

      <Clause title="5. Where it lives, and who else touches it">
        <P>
          Your data is stored in <strong className="text-mkt-fg">Singapore</strong>. We do not
          currently offer a choice of region, and any page or person telling you otherwise is
          wrong.
        </P>
        <P>
          Résumé text is sent to a large-language-model provider in the United States to produce
          the analysis. That transfer is what makes the product work, and it is covered by
          standard contractual clauses with that provider.
        </P>
        <P>These are every third party that processes data on our behalf:</P>
        {/* `contain: paint` for the same reason as the pricing comparison
            table: `overflow-x-auto` alone does not stop a wide child adding to
            `documentElement.scrollWidth` under the `.mkt` zoom, so the page
            itself scrolls sideways on a phone. */}
        <div className="overflow-x-auto [contain:paint]">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-mkt-border px-3 pb-2 mkt-label text-mkt-fg-tertiary">
                  Processor
                </th>
                <th className="border-b border-mkt-border px-3 pb-2 mkt-label text-mkt-fg-tertiary">
                  Purpose
                </th>
                <th className="border-b border-mkt-border px-3 pb-2 mkt-label text-mkt-fg-tertiary">
                  Region
                </th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((sub) => (
                <tr key={sub.name}>
                  <td className="border-b border-mkt-border-subtle px-3 py-2.5 mkt-body-sm text-mkt-fg">
                    {sub.name}
                  </td>
                  <td className="border-b border-mkt-border-subtle px-3 py-2.5 mkt-body-sm text-mkt-fg-secondary">
                    {sub.purpose}
                  </td>
                  <td className="border-b border-mkt-border-subtle px-3 py-2.5 mkt-body-sm text-mkt-fg-secondary">
                    {sub.region}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Clause>

      <Clause title="6. Security">
        <P>
          Data is encrypted in transit and at rest. Access within a customer&rsquo;s workspace is
          enforced at the database with row-level security, so one organization cannot read
          another&rsquo;s data even if the application is wrong. Administrative access to
          production is restricted to the people who need it.
        </P>
        <P>
          We hold no security certification at this time. We are not SOC 2 or ISO 27001 audited,
          and we would rather tell you that than imply otherwise. If a certification is obtained
          it will be stated here with its date and scope.
        </P>
      </Clause>

      <Clause title="7. How long we keep it">
        <List
          items={[
            'Account data: for as long as the account exists, then 30 days.',
            'Candidate data: until the customer deletes it, or 30 days after their account closes.',
            'Invoices and payment records: for the period tax law requires, which is longer than the rest and cannot be shortened on request.',
            'Security and audit logs: retained so an account can be investigated after an incident.',
          ]}
        />
      </Clause>

      <Clause title="8. Your rights">
        <P>
          Whether or not you have an account, you can ask us to give you a copy of your personal
          data, correct it, delete it, or restrict how it is used. You can also object to
          processing and complain to your data protection authority.
        </P>
        <P>
          If you are a candidate, tell us the organization that holds your résumé if you know it —
          it lets us find you without searching every workspace, which is itself a privacy
          improvement. Where we are acting as a processor we will pass your request to that
          organization and support them in answering it.
        </P>
        <P>
          We answer within 30 days. There is no charge unless a request is repetitive or
          excessive.
        </P>
      </Clause>

      <Clause title="9. Automated processing">
        <P>
          HireLens scores and ranks candidates, and that is automated. It does not make hiring
          decisions. Our terms require a human to review any decision with a legal or similarly
          significant effect, and the product records who made each decision and on what evidence.
        </P>
        <P>
          If you are a candidate and want to know how an analysis reached its conclusion, ask —
          every claim the system makes is linked to the passage of your résumé it came from, and
          we can show you that.
        </P>
      </Clause>

      <Clause title="10. Contacting us, and complaining">
        <P>
          Privacy questions and rights requests:{' '}
          {privacy ? (
            <a href={`mailto:${privacy}`} className="text-mkt-accent-text underline">
              {privacy}
            </a>
          ) : (
            <Link href="/contact" className="text-mkt-accent-text underline">
              see our contact page
            </Link>
          )}
          .
        </P>
        <P>
          Grievance Officer: <Fact value={GRIEVANCE_OFFICER.name} label="officer name" />
          {officerEmail ? (
            <>
              {' '}
              &middot;{' '}
              <a href={`mailto:${officerEmail}`} className="text-mkt-accent-text underline">
                {officerEmail}
              </a>
            </>
          ) : null}
          . If you are unhappy with how we handled a request, this is the person to escalate to.
        </P>
      </Clause>

      <Clause title="11. Changes">
        <P>
          We will post changes here and update the date at the top. Where a change materially
          affects how we use personal data, account holders will be emailed before it takes
          effect.
        </P>
      </Clause>
    </LegalPage>
  )
}
