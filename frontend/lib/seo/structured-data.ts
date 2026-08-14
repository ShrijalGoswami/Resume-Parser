/**
 * JSON-LD, generated from the modules that already decide these facts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING HERE IS TYPED BY HAND.
 *
 * Features and limits come from `catalog.ts` — the mirror of the server's
 * enforcement. Prices come from `lib/pricing.ts`. Legal identity comes from
 * `lib/legal.ts`. This module arranges them into schema.org shapes and adds no
 * facts of its own.
 *
 * That constraint is the whole design. Structured data is the copy a machine
 * quotes verbatim and a human never proofreads, so it is the surface where a
 * hand-written figure would go stale longest and be noticed last. The
 * comparison table on `/pricing` already works this way; this is the same rule
 * applied to the machine-readable layer.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * `Product`, `AggregateRating` and `Review` — there are no customers and no
 * ratings. Review markup with nothing real to put in it is the exact failure
 * the 4 Aug truth pass removed from the prose, and it would be worse here
 * because a machine would repeat it without hedging.
 *
 * `JobPosting` — HireLens *processes* job descriptions; it does not publish
 * them. Emitting it would miscategorise the product to every system that reads
 * it.
 *
 * WHAT IS GATED, AND WHY THE GATE IS NOT THE SAME FOR EVERYTHING
 *
 * `SoftwareApplication` ships now: it describes the software, which exists and
 * is fully known. `Organization` and `Offer` do not: one names a legal entity
 * and the other quotes a price that entity would be paid, and neither can be
 * published truthfully until `lib/legal.ts` is filled in. A machine-readable
 * price attributed to an unnamed company is a worse version of the problem the
 * draft banners exist to prevent.
 */
import {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_KEYS,
  PLAN_LABELS,
  RESUME_WINDOW,
  isUnlimited,
  type PlanKey,
} from '@/components/hirelens/lib/entitlements/catalog'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  PLAN_POSITIONING,
  isQuoted,
  priceOf,
} from '@/lib/pricing'
import {
  CONTACTS,
  ENTITY,
  LEGAL_ENTITY_CONFIRMED,
  SERVICE_DESCRIPTION,
  isConfirmed,
} from '@/lib/legal'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site'

/** Stable `@id`s so separate blocks describe one thing rather than three. */
export const IDS = {
  organization: `${SITE_URL}/#organization`,
  website: `${SITE_URL}/#website`,
  software: `${SITE_URL}/#software`,
} as const

type Json = Record<string, unknown>

/** Whether the legal identity may be published at all. */
export const canPublishOrganization = (): boolean =>
  LEGAL_ENTITY_CONFIRMED && isConfirmed(ENTITY.name)

// ── WebSite ─────────────────────────────────────────────────────────────────

export function websiteSchema(): Json {
  return {
    '@type': 'WebSite',
    '@id': IDS.website,
    name: SITE_NAME,
    url: SITE_URL,
    description: SERVICE_DESCRIPTION,
    inLanguage: 'en',
    // Only claimed when it can be attributed to a named entity.
    ...(canPublishOrganization() ? { publisher: { '@id': IDS.organization } } : {}),
  }
}

// ── SoftwareApplication — ungated ───────────────────────────────────────────

/**
 * What HireLens IS, in the vocabulary a machine already understands.
 *
 * This is the single most valuable block on the site. Asked "what is
 * HireLens?", a model reading the page has to infer a category from prose
 * written to be evocative — "Your judgment, on every candidate" is a good
 * headline and tells a classifier nothing. `applicationCategory` answers it
 * outright.
 *
 * `featureList` is every catalog capability by label. Not a marketing
 * selection: the same list the product gates on, so it cannot advertise
 * something unbuilt.
 */
export function softwareApplicationSchema(): Json {
  const features = FEATURE_KEYS.map((key) => FEATURES[key].label)

  return {
    '@type': 'SoftwareApplication',
    '@id': IDS.software,
    name: SITE_NAME,
    url: SITE_URL,
    description: SERVICE_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Recruiting Software',
    operatingSystem: 'Web browser',
    // Nothing to install and nothing to download — saying so stops a machine
    // looking for a package it will not find.
    softwareRequirements: 'A modern web browser',
    inLanguage: 'en',
    featureList: features,
    ...(canPublishOrganization()
      ? { publisher: { '@id': IDS.organization }, offers: offerSchemas() }
      : {}),
  }
}

// ── Offers — gated ──────────────────────────────────────────────────────────

/**
 * One `Offer` per sellable plan, in the market checkout can actually serve.
 *
 * Free is included (`price: 0`) because it is a real, self-serve entry point.
 * Enterprise is excluded: `isQuoted` says it has no list price, and an `Offer`
 * with an invented number is exactly what must never be machine-readable.
 *
 * The prices are read, never written. `lib/pricing.ts` is GST-inclusive, so
 * `priceSpecification.valueAddedTaxIncluded` is true — a machine comparing this
 * to a competitor quoting ex-tax would otherwise be comparing two different
 * numbers.
 */
export function offerSchemas(): Json[] {
  const currency = DEFAULT_CURRENCY
  return PLAN_KEYS.filter((plan) => !isQuoted(plan)).map((plan) => {
    const amount = priceOf(plan, currency) ?? 0
    return {
      '@type': 'Offer',
      name: `${SITE_NAME} ${PLAN_LABELS[plan]}`,
      description: PLAN_POSITIONING[plan],
      url: absoluteUrl('/pricing'),
      price: amount,
      priceCurrency: CURRENCIES[currency].code,
      availability: 'https://schema.org/InStock',
      category: PLAN_LABELS[plan],
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: amount,
        priceCurrency: CURRENCIES[currency].code,
        valueAddedTaxIncluded: true,
        // Free has no recurrence to describe.
        ...(amount > 0
          ? {
              billingIncrement: 1,
              unitCode: 'MON',
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
            }
          : {}),
      },
      ...(canPublishOrganization() ? { seller: { '@id': IDS.organization } } : {}),
    }
  })
}

/** "25 résumés a month · 3 team members" — derived, for human-readable notes. */
export function planAllowanceSummary(plan: PlanKey): string {
  const resumes = LIMITS[plan].resumes
  const seats = LIMITS[plan].members
  const resumeText = isUnlimited(resumes)
    ? 'unlimited résumés'
    : RESUME_WINDOW[plan] === 'month'
      ? `${resumes} résumés a month`
      : `${resumes} résumés to try`
  const seatText = isUnlimited(seats)
    ? 'unlimited team members'
    : `${seats} team member${seats === 1 ? '' : 's'}`
  return `${resumeText} · ${seatText}`
}

// ── Organization — gated ────────────────────────────────────────────────────

/**
 * Returns `null` until the legal entity is real.
 *
 * Publishing an `Organization` named "UNCONFIRMED", or quietly falling back to
 * the trading name, would put a machine-readable claim about a company into the
 * world that the company has not made.
 */
export function organizationSchema(): Json | null {
  if (!canPublishOrganization()) return null

  const contactPoints = (
    [
      ['support', 'customer support'],
      ['sales', 'sales'],
      ['privacy', 'privacy'],
    ] as const
  )
    .filter(([key]) => isConfirmed(CONTACTS[key]))
    .map(([key, type]) => ({
      '@type': 'ContactPoint',
      contactType: type,
      email: CONTACTS[key],
      availableLanguage: 'English',
    }))

  return {
    '@type': 'Organization',
    '@id': IDS.organization,
    name: ENTITY.name,
    legalName: ENTITY.name,
    url: SITE_URL,
    ...(isConfirmed(ENTITY.registration) ? { identifier: ENTITY.registration } : {}),
    ...(isConfirmed(ENTITY.taxId) ? { taxID: ENTITY.taxId } : {}),
    ...(ENTITY.address.every(isConfirmed) && ENTITY.address.length
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: ENTITY.address.join(', '),
          },
        }
      : {}),
    ...(contactPoints.length ? { contactPoint: contactPoints } : {}),
  }
}

// ── FAQPage ─────────────────────────────────────────────────────────────────

export interface QuestionAnswer {
  question: string
  answer: string
}

/**
 * Built from the SAME array the page renders.
 *
 * The alternative — a second copy of the questions in schema form — is how a
 * FAQ ends up answering one thing to a reader and another to a machine, which
 * is worse than having no structured data at all.
 */
export function faqSchema(entries: readonly QuestionAnswer[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }
}

// ── BreadcrumbList ──────────────────────────────────────────────────────────

export function breadcrumbSchema(trail: { name: string; path: string }[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

// ── Assembly ────────────────────────────────────────────────────────────────

/**
 * One `@graph` per page rather than several loose scripts.
 *
 * A graph lets the blocks reference each other by `@id` — the software is
 * published by the organization, the website is published by the same
 * organization — instead of three disconnected descriptions a consumer has to
 * guess are related.
 */
export function graph(...nodes: (Json | null)[]): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is Json => node !== null),
  }
}
