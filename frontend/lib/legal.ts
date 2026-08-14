/**
 * WHO WE ARE, LEGALLY — the facts every policy page has to state.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FILE IS THE ONLY THING STANDING BETWEEN A DRAFT POLICY AND A LIVE ONE.
 *
 * A policy page is a binding document. It has to name a real legal entity, a
 * real address, a real jurisdiction and a real person to complain to — and not
 * one of those is knowable from the codebase. They are facts about a company,
 * held by whoever registered it.
 *
 * So they live here, unconfirmed, and every policy page reads
 * `LEGAL_ENTITY_CONFIRMED` before it presents itself as being in force. While
 * that flag is false the pages render, are linkable and state their content —
 * but they label themselves as a draft that binds nobody, because a document
 * that says "[COMPANY ADDRESS]" in the middle of a governing-law clause is
 * worse than one that admits it is not finished.
 *
 * This is the same rule `lib/pricing.ts` applies to an unconfirmed market: a
 * plausible-looking placeholder nobody agreed to is the one kind of stand-in a
 * customer can act on before anyone notices it was invented.
 *
 * TO PUT THE POLICIES IN FORCE:
 *   1. Replace every `UNCONFIRMED` value below with the real one.
 *   2. Have counsel read the four pages under `app/(marketing)/`.
 *   3. Flip `LEGAL_ENTITY_CONFIRMED` to `true`.
 *
 * A test asserts that the flag cannot be true while a placeholder remains, so
 * step 3 cannot be taken ahead of step 1.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Razorpay merchant activation requires published Terms, Privacy, Refund &
 * Cancellation and Contact pages. Until this file is filled in, Billing Step 4
 * is blocked on paperwork rather than on code.
 */

/** The sentinel. Any field still equal to this has not been decided. */
export const UNCONFIRMED = 'UNCONFIRMED' as const

/**
 * Whether the policies below are in force.
 *
 * FALSE means every policy page renders a draft notice and the signup consent
 * line does not claim the user has agreed to anything binding. Never flip this
 * to skip the banner — flip it because the facts are real.
 */
export const LEGAL_ENTITY_CONFIRMED = false

export interface LegalEntity {
  /** Registered company name, exactly as incorporated. */
  name: string
  /** Company identifier — CIN, LLPIN, or the local equivalent. */
  registration: string
  /** Registered office, one line per line. */
  address: string[]
  /** Courts whose law governs the Terms. */
  jurisdiction: string
  /** GSTIN, where the entity is registered for GST. */
  taxId: string
}

/**
 * DPDP Act 2023 §13 requires a named person a data principal can complain to,
 * reachable without going through support. Not a shared inbox alias unless a
 * named individual is accountable for it.
 */
export interface GrievanceOfficer {
  name: string
  email: string
}

export const ENTITY: LegalEntity = {
  name: UNCONFIRMED,
  registration: UNCONFIRMED,
  address: [UNCONFIRMED],
  jurisdiction: UNCONFIRMED,
  taxId: UNCONFIRMED,
}

export const GRIEVANCE_OFFICER: GrievanceOfficer = {
  name: UNCONFIRMED,
  email: UNCONFIRMED,
}

/**
 * Where to reach us.
 *
 * These are quoted on the Contact page as selectable text, not only as
 * `mailto:` links — a `mailto:` does nothing at all for the many recruiters
 * working from webmail with no registered protocol handler, and an address
 * that silently fails is indistinguishable from a company that ignores you.
 *
 * These two were already shipping in the product before this file existed —
 * the upgrade dialog and the Enterprise CTA have been pointing at them — so
 * they are carried over rather than reset to the sentinel. Blanking a contact
 * route that may well be working would be a regression dressed as caution.
 *
 * WHAT IS STILL UNVERIFIED: whether `hirelens.app` has MX records and whether
 * anyone reads these mailboxes. That cannot be checked from the codebase, and
 * an unmonitored support address is worse than none — it converts "we never
 * replied" into "they wrote and we never knew". Confirm before launch.
 *
 * `privacy` deliberately aliases support rather than introducing a third
 * address nobody has created. A rights request bouncing is a regulatory
 * problem, not just a missed email.
 */
export const CONTACTS = {
  support: 'support@hirelens.app',
  sales: 'sales@hirelens.app',
  privacy: 'support@hirelens.app',
} as const

export type ContactKey = keyof typeof CONTACTS

/** True when a field carries a real value rather than the sentinel. */
export function isConfirmed(value: string): boolean {
  return value !== UNCONFIRMED && value.trim().length > 0
}

/** Every placeholder still outstanding, for the guard test and the draft notice. */
export function outstandingLegalFields(): string[] {
  const missing: string[] = []
  if (!isConfirmed(ENTITY.name)) missing.push('entity name')
  if (!isConfirmed(ENTITY.registration)) missing.push('registration number')
  if (!ENTITY.address.every(isConfirmed) || ENTITY.address.length === 0)
    missing.push('registered address')
  if (!isConfirmed(ENTITY.jurisdiction)) missing.push('governing jurisdiction')
  if (!isConfirmed(ENTITY.taxId)) missing.push('tax registration')
  if (!isConfirmed(GRIEVANCE_OFFICER.name)) missing.push('grievance officer')
  if (!isConfirmed(GRIEVANCE_OFFICER.email)) missing.push('grievance officer contact')
  for (const [key, value] of Object.entries(CONTACTS)) {
    if (!isConfirmed(value)) missing.push(`${key} address`)
  }
  return missing
}

/**
 * A contact address, or null where none has been confirmed.
 *
 * Null is the honest answer, and every caller renders it as "not yet published"
 * rather than as a `mailto:` to an address that may not resolve. Quoting an
 * unverified support address on a policy page is how a customer's complaint
 * bounces silently.
 */
export function contactAddress(key: ContactKey): string | null {
  const value = CONTACTS[key]
  return isConfirmed(value) ? value : null
}

/** `mailto:` for a confirmed address, or null. Never a dead link. */
export function contactHref(key: ContactKey, subject?: string): string | null {
  const address = contactAddress(key)
  if (!address) return null
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`
}

/**
 * When each policy last changed, as a plain date string.
 *
 * Typed by hand on purpose: a build date would change every deploy and tell a
 * reader a policy was revised when it was not, which is the one thing a
 * "last updated" line exists to communicate honestly.
 */
export const POLICY_UPDATED = {
  terms: '4 August 2026',
  privacy: '4 August 2026',
  refunds: '4 August 2026',
} as const

/** The single line every page uses to describe the product in legal prose. */
export const SERVICE_DESCRIPTION =
  'HireLens, a hosted service that analyses résumés against a job description and helps a hiring team record and defend its decisions.'

/**
 * Third parties that process customer data on our behalf.
 *
 * Named individually rather than described as "trusted partners". A data
 * principal is entitled to know which companies hold their résumé, and a
 * category name tells them nothing they can act on.
 *
 * Keep this list in step with what is actually deployed. It is currently the
 * whole set: there is no analytics vendor inside the product, no CRM, and no
 * advertising pixel on any page a signed-in user sees.
 */
export const SUBPROCESSORS: { name: string; purpose: string; region: string }[] = [
  {
    name: 'Supabase',
    purpose: 'Database, authentication and file storage',
    region: 'Singapore (ap-southeast-1)',
  },
  {
    name: 'Groq',
    purpose: 'Large-language-model inference for résumé analysis',
    region: 'United States',
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting and delivery',
    region: 'Global edge network',
  },
  {
    name: 'Razorpay',
    purpose: 'Payment processing (subscriptions and invoices)',
    region: 'India',
  },
]
