import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  IDS,
  breadcrumbSchema,
  canPublishOrganization,
  faqSchema,
  graph,
  offerSchemas,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '../lib/seo/structured-data'
import { buildLlmsTxt } from '../lib/seo/llms-txt'
import { DISALLOWED_PATHS, PUBLIC_ROUTES, SITE_URL, absoluteUrl } from '../lib/seo/site'
import { LEGAL_ENTITY_CONFIRMED } from '../lib/legal'
import {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_KEYS,
  PLAN_LABELS,
} from '../components/hirelens/lib/entitlements/catalog'
import { PRICING, formatPrice } from '../lib/pricing'

/**
 * AI discoverability.
 *
 * The audit that produced this work found two kinds of problem. One was
 * absence — no structured data, no sitemap, no canonicals — and absence is
 * easy to notice. The other was worse and is what most of these tests guard:
 * the site's most machine-prominent markup described things that are not real.
 *
 * The rule these encode is the same one `marketing-claims.test.ts` applies to
 * prose, extended to the layer a machine reads: **nothing may be published to a
 * machine that the product cannot substantiate**, and nothing may be typed by
 * hand that a source module already knows.
 */

const src = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')

/**
 * Source with comments removed.
 *
 * The prose in this codebase deliberately records what was removed and why —
 * "NOT `<article>`, and that is a correctness fix" — and twice now a test has
 * failed on its own explanation rather than on rendered code. Same convention
 * as `marketing-claims.test.ts`.
 */
const rendered = (p: string) =>
  src(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

// ── Generated, never duplicated ─────────────────────────────────────────────

describe('structured data is derived, not written', () => {
  it('lists exactly the catalog features, in catalog order', () => {
    const schema = softwareApplicationSchema()
    expect(schema.featureList).toEqual(FEATURE_KEYS.map((k) => FEATURES[k].label))
  })

  it('quotes exactly the configured prices', () => {
    // A price typed into schema is the copy nobody proofreads and the one a
    // machine repeats verbatim.
    for (const offer of offerSchemas()) {
      const plan = PLAN_KEYS.find((p) => `Hirevo ${PLAN_LABELS[p]}` === offer.name)
      expect(plan, `unexpected offer ${offer.name}`).toBeDefined()
      expect(offer.price).toBe(PRICING.INR[plan!].monthly)
    }
  })

  it('marks prices GST-inclusive, matching how billing actually charges', () => {
    for (const offer of offerSchemas()) {
      const spec = offer.priceSpecification as Record<string, unknown>
      expect(spec.valueAddedTaxIncluded).toBe(true)
    }
  })

  it('never offers Enterprise, which has no list price', () => {
    expect(offerSchemas().map((o) => o.name)).not.toContain('Hirevo Enterprise')
  })

  it('hardcodes no price or limit in the source', () => {
    const source = src('lib/seo/structured-data.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(source).not.toMatch(/999|2499|2,499/)
    expect(source).not.toMatch(/₹|\$\d/)
    // The limits belong to the catalog.
    expect(source).not.toMatch(new RegExp(`\\b${LIMITS.plus.resumes}\\b`))
  })
})

// ── The gates ───────────────────────────────────────────────────────────────

describe('what may be published about the company is gated', () => {
  it('SoftwareApplication ships regardless — it describes software, not a company', () => {
    const schema = softwareApplicationSchema()
    expect(schema['@type']).toBe('SoftwareApplication')
    expect(schema.applicationCategory).toBe('BusinessApplication')
    expect(String(schema.description).length).toBeGreaterThan(20)
  })

  it('Organization is withheld until the legal entity is real', () => {
    if (LEGAL_ENTITY_CONFIRMED) {
      expect(organizationSchema()).not.toBeNull()
    } else {
      expect(organizationSchema()).toBeNull()
      expect(canPublishOrganization()).toBe(false)
    }
  })

  it('never emits UNCONFIRMED as a fact', () => {
    const emitted = JSON.stringify(
      graph(websiteSchema(), softwareApplicationSchema(), organizationSchema()),
    )
    expect(emitted).not.toContain('UNCONFIRMED')
  })

  it('drops null nodes rather than emitting empty ones', () => {
    const g = graph(websiteSchema(), null, null)
    expect((g['@graph'] as unknown[]).length).toBe(1)
  })

  it('uses stable @ids so the blocks describe one thing', () => {
    expect(IDS.software.startsWith(SITE_URL)).toBe(true)
    expect(softwareApplicationSchema()['@id']).toBe(IDS.software)
  })
})

// ── Schemas that must NOT exist ─────────────────────────────────────────────

describe('no schema claims something the product does not have', () => {
  const allSchemas = JSON.stringify(
    graph(
      websiteSchema(),
      softwareApplicationSchema(),
      organizationSchema(),
      faqSchema([{ question: 'q', answer: 'a' }]),
      breadcrumbSchema([{ name: 'Home', path: '/' }]),
    ),
  )

  it('publishes no ratings or reviews — there are no customers', () => {
    expect(allSchemas).not.toContain('AggregateRating')
    expect(allSchemas).not.toContain('"Review"')
    expect(allSchemas).not.toContain('ratingValue')
  })

  it('publishes no JobPosting — Hirevo reads job descriptions, it does not post them', () => {
    expect(allSchemas).not.toContain('JobPosting')
  })

  it('does not mark policies as editorial Articles', () => {
    const source = src('components/seo/structured-data-blocks.tsx')
    expect(source).not.toMatch(/'@type':\s*'(Article|BlogPosting|NewsArticle)'/)
  })
})

// ── FAQ shares one source with the page ─────────────────────────────────────

describe('FAQ structured data cannot drift from the page', () => {
  it('is built from the array the component renders', () => {
    const blocks = rendered('components/seo/structured-data-blocks.tsx')
    expect(blocks).toContain('PRICING_FAQS')
    // From the shared data module. Importing it out of the `'use client'`
    // component gave a client reference proxy and broke the prerender.
    expect(blocks).toContain('@/lib/marketing/pricing-faqs')
    // The questions exist in exactly one place.
    expect(src('lib/seo/structured-data.ts')).not.toMatch(/question:\s*'/)
    expect(rendered('components/marketing/pricing/pricing-faq.tsx')).not.toMatch(
      /question:\s*['`]/,
    )
  })

  it('shapes every entry as a Question with an accepted Answer', () => {
    const schema = faqSchema([{ question: 'Why?', answer: 'Because.' }])
    const entries = schema.mainEntity as Record<string, unknown>[]
    expect(entries[0]['@type']).toBe('Question')
    expect((entries[0].acceptedAnswer as Record<string, unknown>)['@type']).toBe('Answer')
  })
})

// ── llms.txt ────────────────────────────────────────────────────────────────

describe('llms.txt', () => {
  const txt = buildLlmsTxt()

  it('states the real prices, generated', () => {
    expect(txt).toContain(formatPrice('plus', 'INR'))
    expect(txt).toContain(formatPrice('pro', 'INR'))
  })

  it('lists every catalog capability', () => {
    for (const key of FEATURE_KEYS) expect(txt).toContain(FEATURES[key].label)
  })

  it('states the limitations rather than only the capabilities', () => {
    // The section that makes this file worth publishing: a system recommending
    // Hirevo should know what it does not do.
    expect(txt).toMatch(/No ATS integrations/i)
    expect(txt).toMatch(/No published bias audit/i)
    expect(txt).toMatch(/No security certification/i)
    expect(txt).toMatch(/one data region/i)
  })

  it('says what Hirevo is NOT, so it is not miscategorised', () => {
    expect(txt).toMatch(/Not an applicant tracking system/i)
    expect(txt).toMatch(/Not an autonomous screener/i)
  })

  it('makes no claim the marketing pages are forbidden from making', () => {
    expect(txt).not.toMatch(/trusted by|customers include/i)
    expect(txt).not.toMatch(/Vertex|Nexus|Omni|Meridian/)
    expect(txt).not.toMatch(/audited annually|report on request/i)
  })

  it('mentions a certification only to deny holding it', () => {
    // The blunt version of this failed on the limitations section, which says
    // "Not SOC 2 or ISO 27001 audited" — a denial, and the most valuable
    // sentence in the file. Each occurrence is checked in its own context.
    for (const match of txt.matchAll(/SOC ?2|ISO ?27001/gi)) {
      const at = match.index ?? 0
      const context = txt.slice(Math.max(0, at - 140), at + 140)
      expect(context, `"${match[0]}" is claimed rather than disclaimed`).toMatch(
        /No security certification|Not SOC ?2|not .{0,20}audited/i,
      )
    }
  })

  it('flags the draft legal status while it is true', () => {
    if (!LEGAL_ENTITY_CONFIRMED) expect(txt).toMatch(/draft/i)
  })

  it('links every public route', () => {
    for (const route of PUBLIC_ROUTES) expect(txt).toContain(absoluteUrl(route.path))
  })
})

// ── Route inventory ─────────────────────────────────────────────────────────

describe('sitemap and robots agree with the routes that exist', () => {
  it('every public route is a real page', () => {
    for (const route of PUBLIC_ROUTES) {
      const dir = route.path === '/' ? '' : route.path
      expect(
        existsSync(resolve(process.cwd(), `app/(marketing)${dir}/page.tsx`)),
        `${route.path} is in the sitemap but has no page`,
      ).toBe(true)
    }
  })

  it('disallows the product surface but not the marketing surface', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(DISALLOWED_PATHS).not.toContain(route.path)
    }
    expect(DISALLOWED_PATHS).toContain('/auth/')
    expect(DISALLOWED_PATHS).toContain('/today')
  })

  it('the agent files exist as routes', () => {
    for (const file of [
      'app/robots.ts',
      'app/sitemap.ts',
      'app/llms.txt/route.ts',
      'app/.well-known/security.txt/route.ts',
    ]) {
      expect(existsSync(resolve(process.cwd(), file)), `${file} missing`).toBe(true)
    }
  })
})

// ── Semantics ───────────────────────────────────────────────────────────────

describe('markup does not present fabricated data as content', () => {
  it('the mock candidate cards are not <article>', () => {
    // `<article>` is the strongest "standalone, quotable content" signal in
    // HTML. These four cards are invented people in a product mock, and an
    // extractor that prioritises articles surfaced them as Hirevo's primary
    // content.
    expect(rendered('components/marketing/compression-engine.tsx')).not.toMatch(/<article/)
  })

  it('no marketing icon leaks its ligature into text', () => {
    // `material-symbols-outlined` renders its text content as a glyph, so
    // without `aria-hidden` a CTA reads "See it thinkarrow_forward" to every
    // screen reader and every text extractor.
    const offenders: string[] = []
    for (const file of [
      'components/marketing/frame-01-hero.tsx',
      'components/marketing/frame-03-pipeline.tsx',
      'components/marketing/frame-04-regret.tsx',
      'components/marketing/frame-05-conclusion.tsx',
      'components/marketing/pricing/plan-cards.tsx',
      'components/marketing/pricing/comparison-table.tsx',
      'components/marketing/pricing/enterprise-section.tsx',
      'components/marketing/pricing/pricing-faq.tsx',
    ]) {
      const source = rendered(file)
      for (const m of source.matchAll(
        /<span[^>]*material-symbols-outlined[\s\S]*?>/g,
      )) {
        if (!m[0].includes('aria-hidden')) offenders.push(`${file}: ${m[0].slice(0, 60)}`)
      }
    }
    expect(offenders, `icon spans missing aria-hidden:\n${offenders.join('\n')}`).toEqual([])
  })

  it('the masthead is a banner landmark', () => {
    expect(src('components/marketing/marketing-nav.tsx')).toMatch(/<header>/)
  })

  it('every public route carries the Open Graph card', () => {
    // This regressed silently twice. A page that declares its own `openGraph`
    // block — every one of ours does, to set `og:url` — stops inheriting the
    // file-convention image from an ancestor segment, so `og:image` vanishes
    // with no build warning and no type error. The card only reappears when
    // the route owns an `opengraph-image` file. One implementation lives in
    // `lib/seo/og-image.tsx`; each route re-exports it.
    const missing = PUBLIC_ROUTES.map((route) => route.path)
      .map((path) => ({
        path,
        file: `app/(marketing)${path === '/' ? '' : path}/opengraph-image.tsx`,
      }))
      .filter(({ file }) => !existsSync(resolve(process.cwd(), file)))
      .map(({ path }) => path)
    expect(missing, `routes with no og:image: ${missing.join(', ')}`).toEqual([])
  })
})
