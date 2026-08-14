import * as React from 'react'

import { JsonLd } from '@/components/seo/json-ld'
import {
  breadcrumbSchema,
  faqSchema,
  graph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
  type QuestionAnswer,
} from '@/lib/seo/structured-data'
// From the data module, NOT the component: importing a value out of a
// `'use client'` file into a server component yields a client reference proxy
// rather than the array, and the failure surfaces only at prerender time.
import { PRICING_FAQS } from '@/lib/marketing/pricing-faqs'

/**
 * The JSON-LD each public page emits.
 *
 * Server components with no client cost, mounted at the bottom of a page's
 * markup. Placement is cosmetic — a crawler reads the whole document — but
 * keeping them out of the visual tree means nobody editing layout has to step
 * around them.
 *
 * `organizationSchema()` returns null until `lib/legal.ts` is filled in, and
 * `graph()` drops nulls, so every one of these degrades to exactly the blocks
 * that can be published truthfully today.
 */

/** Homepage: what the site is, what the software is, and who publishes it. */
export function HomeStructuredData() {
  return (
    <JsonLd
      data={graph(websiteSchema(), softwareApplicationSchema(), organizationSchema())}
    />
  )
}

/**
 * Pricing: the software again (so an `Offer` has something to attach to once
 * the gate opens) plus the eight questions the page already answers.
 */
export function PricingStructuredData() {
  return (
    <JsonLd
      data={graph(
        softwareApplicationSchema(),
        faqSchema(PRICING_FAQS as readonly QuestionAnswer[]),
        organizationSchema(),
      )}
    />
  )
}

/**
 * Legal pages: a breadcrumb so the hierarchy is explicit.
 *
 * No `Article` — these are policies, not editorial, and marking a Terms page as
 * an Article invites it into contexts it does not belong in.
 */
export function LegalStructuredData({ name, path }: { name: string; path: string }) {
  return (
    <JsonLd
      data={graph(
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name, path },
        ]),
        organizationSchema(),
      )}
    />
  )
}

/** Contact: the breadcrumb, and the organization once it may be named. */
export function ContactStructuredData() {
  return (
    <JsonLd
      data={graph(
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]),
        organizationSchema(),
      )}
    />
  )
}
