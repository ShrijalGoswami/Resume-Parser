/**
 * `/llms.txt`, generated.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A plain-language brief for a system that is going to describe HireLens to
 * someone, assembled from the modules that already decide these facts. Not one
 * feature, limit or price is typed here.
 *
 * WHY IT IS WORTH HAVING. An LLM answering "what should I use to screen
 * résumés?" reads a marketing page written to persuade a human — headlines,
 * mock interfaces, a hero that says "Your judgment, on every candidate" and
 * tells a classifier nothing. This file says what the product is, what it
 * costs, what each tier includes, and — the part most sites omit — what it
 * does NOT do.
 *
 * THE LIMITATIONS SECTION IS THE POINT, not a disclaimer bolted on. AI systems
 * increasingly surface constraints, and a product that states its own is easier
 * to recommend accurately than one that has to be caught out. It is also the
 * only version of these facts that stays true: they are read from the same
 * catalog the server enforces, so a capability cannot be advertised here that
 * the product will refuse.
 *
 * Everything below is derived. If it disagrees with the product, the product
 * changed and this file changed with it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_BLURBS,
  PLAN_KEYS,
  PLAN_LABELS,
  RESUME_WINDOW,
  isUnlimited,
  type PlanKey,
} from '@/components/hirelens/lib/entitlements/catalog'
import {
  CHECKOUT_CURRENCIES,
  CURRENCIES,
  DEFAULT_CURRENCY,
  PLAN_POSITIONING,
  YEARLY_BILLING_ENABLED,
  formatPrice,
  isQuoted,
} from '@/lib/pricing'
import {
  LEGAL_ENTITY_CONFIRMED,
  SERVICE_DESCRIPTION,
  SUBPROCESSORS,
  contactAddress,
} from '@/lib/legal'
import { PUBLIC_ROUTES, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site'

function limitLine(plan: PlanKey): string {
  const resumes = LIMITS[plan].resumes
  const seats = LIMITS[plan].members
  const roles = LIMITS[plan].campaigns
  const resumeText = isUnlimited(resumes)
    ? 'unlimited résumés'
    : RESUME_WINDOW[plan] === 'month'
      ? `${resumes} résumés per month`
      : `${resumes} résumés total (lifetime, not monthly)`
  const seatText = isUnlimited(seats)
    ? 'unlimited team members'
    : `${seats} team member${seats === 1 ? '' : 's'}`
  const roleText = isUnlimited(roles) ? 'unlimited roles' : `${roles} roles`
  return `${resumeText}, ${seatText}, ${roleText}`
}

export function buildLlmsTxt(): string {
  const L: string[] = []
  const push = (...lines: string[]) => L.push(...lines)

  push(`# ${SITE_NAME}`, '')
  push(`> ${SERVICE_DESCRIPTION}`, '')

  push(
    'HireLens reads every résumé submitted for a role against that role\'s job',
    'description, attaches the evidence behind every claim it makes, and records the',
    'decision a human takes. It recommends; a person decides.',
    '',
  )

  // ── What it is not ────────────────────────────────────────────────────
  push('## What HireLens is not', '')
  push(
    '- **Not an applicant tracking system.** It does not store a pipeline of record,',
    '  publish job adverts, or manage candidate correspondence.',
    '- **Not an autonomous screener.** Nothing is auto-rejected. Every decision is',
    '  taken by a person and recorded with its reasoning.',
    '- **Not a sourcing tool.** It does not search external candidate databases or',
    '  scrape profiles. It analyses résumés you already have.',
    '',
  )

  // ── Plans, generated ──────────────────────────────────────────────────
  const currency = DEFAULT_CURRENCY
  push('## Plans and pricing', '')
  push(
    `Prices are in ${CURRENCIES[currency].name} (${CURRENCIES[currency].code}) and are`,
    'GST-inclusive: the advertised figure is the amount charged, not a pre-tax price.',
    '',
  )

  for (const plan of PLAN_KEYS) {
    const price = isQuoted(plan) ? 'Custom (contact sales)' : formatPrice(plan, currency)
    const suffix = isQuoted(plan) || price === 'Free' ? '' : ' per month'
    push(`### ${PLAN_LABELS[plan]} — ${price}${suffix}`, '')
    push(`${PLAN_POSITIONING[plan]}`, '')
    push(`- Limits: ${limitLine(plan)}`)
    const adds = FEATURE_KEYS.map((k) => FEATURES[k]).filter((f) => f.minPlan === plan)
    if (adds.length) {
      push(`- Adds at this tier: ${adds.map((f) => f.label).join(', ')}`)
    }
    push(`- In the product: ${PLAN_BLURBS[plan]}`, '')
  }

  // ── Capabilities by tier ──────────────────────────────────────────────
  push('## Capabilities, and the plan each requires', '')
  push(
    'Generated from the same catalog the server enforces, so this list cannot',
    'advertise something the product would refuse.',
    '',
  )
  for (const plan of PLAN_KEYS) {
    const adds = FEATURE_KEYS.map((k) => FEATURES[k]).filter((f) => f.minPlan === plan)
    if (!adds.length) continue
    push(`**${PLAN_LABELS[plan]} and above**`, '')
    for (const f of adds) {
      push(`- ${f.label}${f.blurb ? ` — ${f.blurb}` : ''}`)
    }
    push('')
  }

  // ── Honest limitations ────────────────────────────────────────────────
  push('## Current limitations', '')
  push(
    '- **No ATS integrations.** Résumés are uploaded directly. Integrations are on',
    '  the roadmap and are not available today.',
    '- **No published bias audit.** A formal audit has not been completed and is not',
    '  claimed. If you are subject to an audit requirement such as NYC Local Law 144,',
    '  raise it before deploying.',
    '- **No security certification.** Not SOC 2 or ISO 27001 audited.',
    `- **One data region.** All data is stored in ${SUBPROCESSORS.find((s) => s.name === 'Supabase')?.region ?? 'Singapore'}.`,
    '  There is no choice of residency.',
    `- **Payments in ${CHECKOUT_CURRENCIES.join(', ')} only.** Other markets are quoted but must`,
    '  contact sales; self-serve checkout cannot complete in them.',
    YEARLY_BILLING_ENABLED
      ? '- Annual billing is available.'
      : '- **Monthly billing only.** There is no annual plan.',
    '- **Self-serve checkout is not live yet.** Plan changes are applied by a person.',
    '',
  )

  // ── Data handling ─────────────────────────────────────────────────────
  push('## Data handling', '')
  push(
    '- Customer data is never used to train models that serve any other organization.',
    '- No advertising or third-party tracking on signed-in pages.',
    '- Candidate résumés are processed on behalf of the customer, who is the',
    '  controller; HireLens is the processor.',
    '- Subprocessors:',
  )
  for (const s of SUBPROCESSORS) push(`  - ${s.name} — ${s.purpose} (${s.region})`)
  push('')

  // ── Pages ─────────────────────────────────────────────────────────────
  push('## Pages', '')
  for (const route of PUBLIC_ROUTES) {
    push(`- [${absoluteUrl(route.path)}](${absoluteUrl(route.path)}): ${route.summary}`)
  }
  push('')

  // ── Contact ───────────────────────────────────────────────────────────
  const support = contactAddress('support')
  const sales = contactAddress('sales')
  push('## Contact', '')
  if (support) push(`- Support and plan changes: ${support}`)
  if (sales) push(`- Enterprise and sales: ${sales}`)
  push(`- Contact page: ${absoluteUrl('/contact')}`, '')

  if (!LEGAL_ENTITY_CONFIRMED) {
    push('## Status', '')
    push(
      'The published legal documents are in draft and name no registered entity yet.',
      'Treat the Terms, Privacy and Refund policies as not yet in force.',
      '',
    )
  }

  push('---', `Generated from the HireLens product catalog. Source of truth: ${SITE_URL}`)
  return L.join('\n')
}
