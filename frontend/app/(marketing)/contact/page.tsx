import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { Missing } from '@/components/marketing/legal/legal-page'
import { ContactStructuredData } from '@/components/seo/structured-data-blocks'
import { CONTACTS, ENTITY, GRIEVANCE_OFFICER, isConfirmed } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Contact — HireLens',
  description:
    'How to reach HireLens: support, upgrades, enterprise enquiries and privacy requests.',
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact — HireLens', url: '/contact', type: 'website' },
}

/**
 * Contact.
 *
 * This page exists because three separate journeys were dead-ending in a bare
 * `mailto:`: the upgrade dialog every lock in the product opens, the Enterprise
 * CTA on the pricing page, and the footer's "Contact" link, which pointed at an
 * anchor that did not exist on any route.
 *
 * A `mailto:` is not a contact route. It does nothing at all for anyone working
 * from webmail without a registered protocol handler — which is most recruiters
 * — and when it fails it fails silently, so the customer concludes the company
 * ignored them. Every address here is therefore rendered as SELECTABLE TEXT
 * first and wrapped in a link second: copying it always works, even when
 * clicking it does not.
 *
 * There is deliberately no contact form. A form implies a ticket, a ticket
 * implies a queue, and neither exists — nothing in the product would record a
 * submission, so it would be a button that silently discards what someone
 * typed. That is the exact failure this page was built to remove, and adding a
 * form would reintroduce it in a nicer shape.
 */

const ROUTES: { key: keyof typeof CONTACTS; heading: string; blurb: string }[] = [
  {
    key: 'support',
    heading: 'Support, and changing your plan',
    blurb:
      'Anything wrong with the product, and any plan change. There is no self-serve checkout yet, so an upgrade, downgrade or cancellation starts here and we apply it directly — usually the same working day.',
  },
  {
    key: 'sales',
    heading: 'Enterprise',
    blurb:
      'Your own AI provider keys, single sign-on, retention rules, or anything that has to run inside your own boundaries. Tell us how your hiring works and what has to stay inside your walls.',
  },
  {
    key: 'privacy',
    heading: 'Privacy and data requests',
    blurb:
      'Access, correction or deletion of personal data — including if you are a candidate whose résumé was uploaded by someone else and you do not have an account.',
  },
]

function Address({ value }: { value: string }) {
  return (
    <a
      href={`mailto:${value}`}
      className="font-mkt-mono text-mkt-fg underline decoration-mkt-border-strong underline-offset-4 transition-colors hover:decoration-mkt-fg"
    >
      {value}
    </a>
  )
}

export default function ContactPage() {
  return (
    <div className="mkt-min-vh flex flex-col bg-mkt-canvas">
      <MarketingNav />
      <main className="flex-grow">
        <section className="mx-auto max-w-[720px] px-6 pb-24 pt-36 md:px-8">
          <p className="mb-4 mkt-label text-mkt-fg-tertiary">Contact</p>
          <h1 className="mb-5 font-mkt-display text-4xl leading-tight text-mkt-fg md:text-5xl">
            Talk to a person.
          </h1>
          <p className="mb-14 border-b border-mkt-border pb-10 mkt-body text-mkt-fg-secondary">
            We are a small team, so these go to people rather than into a queue. Write from the
            address on your account where you can — it saves a round trip confirming who you are.
          </p>

          <div className="flex flex-col gap-10">
            {ROUTES.map((route) => (
              <section key={route.key} className="flex flex-col gap-2">
                <h2 className="font-mkt-display text-2xl text-mkt-fg">{route.heading}</h2>
                <p className="mkt-body-sm leading-relaxed text-mkt-fg-secondary">{route.blurb}</p>
                <p className="mt-1 mkt-body-sm">
                  <Address value={CONTACTS[route.key]} />
                </p>
              </section>
            ))}
          </div>

          <div className="mt-14 border-t border-mkt-border pt-10">
            <h2 className="mb-4 font-mkt-display text-2xl text-mkt-fg">Company details</h2>
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <dt className="mkt-label text-mkt-fg-tertiary">Registered name</dt>
                <dd className="mkt-body-sm text-mkt-fg-secondary">
                  {isConfirmed(ENTITY.name) ? ENTITY.name : <Missing label="registered name" />}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="mkt-label text-mkt-fg-tertiary">Registered office</dt>
                <dd className="mkt-body-sm text-mkt-fg-secondary">
                  {ENTITY.address.every(isConfirmed) && ENTITY.address.length > 0 ? (
                    ENTITY.address.map((line) => <span key={line} className="block">{line}</span>)
                  ) : (
                    <Missing label="registered office" />
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="mkt-label text-mkt-fg-tertiary">Grievance Officer</dt>
                <dd className="mkt-body-sm text-mkt-fg-secondary">
                  {isConfirmed(GRIEVANCE_OFFICER.name) ? (
                    GRIEVANCE_OFFICER.name
                  ) : (
                    <Missing label="officer name" />
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-12 mkt-body-sm text-mkt-fg-tertiary">
            Our <Link href="/terms" className="text-mkt-accent-text underline">Terms</Link>,{' '}
            <Link href="/privacy" className="text-mkt-accent-text underline">Privacy Policy</Link>{' '}
            and{' '}
            <Link href="/refunds" className="text-mkt-accent-text underline">
              Refund &amp; Cancellation Policy
            </Link>{' '}
            answer most questions before you have to ask them.
          </p>
        </section>
      </main>
      <MarketingFooter />
      <ContactStructuredData />
    </div>
  )
}
