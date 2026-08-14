import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  CONTACTS,
  ENTITY,
  GRIEVANCE_OFFICER,
  LEGAL_ENTITY_CONFIRMED,
  SUBPROCESSORS,
  UNCONFIRMED,
  contactAddress,
  contactHref,
  isConfirmed,
  outstandingLegalFields,
} from '../lib/legal'

/**
 * The policy pages.
 *
 * Two failures this file exists to prevent, and they pull in opposite
 * directions:
 *
 *   1. A policy going live with `[COMPANY ADDRESS]` still in a governing-law
 *      clause. That is the reason `LEGAL_ENTITY_CONFIRMED` exists, and the
 *      reason it cannot be flipped while a placeholder remains.
 *   2. A policy page quietly disappearing again, taking the footer links back
 *      to dead anchors. Razorpay activation needs all four published, so their
 *      existence is asserted rather than assumed.
 */

const page = (route: string) =>
  resolve(process.cwd(), 'app/(marketing)', route, 'page.tsx')

describe('legal configuration', () => {
  it('cannot be marked confirmed while any fact is still a placeholder', () => {
    // The whole point of the flag. If someone flips it to remove the draft
    // banner without filling the file in, this is what stops them.
    if (LEGAL_ENTITY_CONFIRMED) {
      expect(
        outstandingLegalFields(),
        'LEGAL_ENTITY_CONFIRMED is true but these are still unset',
      ).toEqual([])
    } else {
      expect(outstandingLegalFields().length).toBeGreaterThan(0)
    }
  })

  it('reports every outstanding fact by name', () => {
    // A guard that says only "something is missing" sends the next person
    // hunting through the file.
    const outstanding = outstandingLegalFields()
    if (!isConfirmed(ENTITY.name)) expect(outstanding).toContain('entity name')
    if (!isConfirmed(ENTITY.jurisdiction)) expect(outstanding).toContain('governing jurisdiction')
    if (!isConfirmed(GRIEVANCE_OFFICER.name)) expect(outstanding).toContain('grievance officer')
  })

  it('keeps the contact addresses the product was already using', () => {
    // These shipped in the upgrade dialog and the Enterprise CTA before this
    // module existed. Resetting them to the sentinel would have removed a
    // working contact route in the name of caution.
    expect(contactAddress('support')).toBe('support@hirelens.app')
    expect(contactAddress('sales')).toBe('sales@hirelens.app')
    expect(contactAddress('privacy')).not.toBeNull()
  })

  it('never builds a mailto for an unconfirmed address', () => {
    // A dead `mailto:` fails silently, which is how a complaint gets lost.
    for (const key of Object.keys(CONTACTS) as (keyof typeof CONTACTS)[]) {
      const href = contactHref(key)
      if (contactAddress(key) === null) expect(href).toBeNull()
      else expect(href).toMatch(/^mailto:/)
    }
  })

  it('treats blank and whitespace as unconfirmed, not as a value', () => {
    expect(isConfirmed(UNCONFIRMED)).toBe(false)
    expect(isConfirmed('')).toBe(false)
    expect(isConfirmed('   ')).toBe(false)
    expect(isConfirmed('Acme Pvt Ltd')).toBe(true)
  })

  it('names every subprocessor individually, with a region', () => {
    // "Trusted partners" tells a data principal nothing they can act on.
    expect(SUBPROCESSORS.length).toBeGreaterThan(0)
    for (const sub of SUBPROCESSORS) {
      expect(sub.name.length).toBeGreaterThan(0)
      expect(sub.purpose.length).toBeGreaterThan(0)
      expect(sub.region.length).toBeGreaterThan(0)
    }
  })
})

describe('the four required pages exist', () => {
  // Razorpay merchant activation requires all four to be published and
  // reachable. Losing one is a billing blocker, not a broken link.
  it.each(['terms', 'privacy', 'refunds', 'contact'])('/%s is a real route', (route) => {
    expect(existsSync(page(route)), `app/(marketing)/${route}/page.tsx is missing`).toBe(true)
  })
})

describe('the footer links to real routes', () => {
  const footer = readFileSync(
    resolve(process.cwd(), 'components/marketing/marketing-footer.tsx'),
    'utf-8',
  )

  it('has no bare fragment links left', () => {
    // Every one of these was `#terms`, `#privacy`, `#contact` — anchors to
    // sections that existed on no page, so the whole footer was dead.
    expect(footer).not.toMatch(/href: '#/)
  })

  it('points at each policy page', () => {
    for (const route of ['/terms', '/privacy', '/refunds', '/contact']) {
      expect(footer, `footer does not link ${route}`).toContain(`href: '${route}'`)
    }
  })

  it('makes the security anchor absolute so it works off the homepage', () => {
    // `#security` resolved to nothing from /pricing and every policy page.
    expect(footer).toContain("href: '/#security'")
  })
})

describe('signup consent is enforceable', () => {
  const signup = readFileSync(
    resolve(process.cwd(), 'components/hirelens/auth/signup-form.tsx'),
    'utf-8',
  )

  it('links the documents it asks the user to agree to', () => {
    expect(signup).toMatch(/href="\/terms"/)
    expect(signup).toMatch(/href="\/privacy"/)
  })
})

describe('policy prose claims nothing untrue', () => {
  /**
   * Rendered prose only. These files carry doc comments explaining which false
   * claims they replaced — that history is the thing most likely to stop
   * someone reinstating them — so the comments must not trip the assertions
   * that keep those claims out of what a customer actually reads.
   */
  const prose = ['terms', 'privacy', 'refunds', 'contact']
    .map((route) =>
      readFileSync(page(route), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, ''),
    )
    .join('\n')

  it('claims no security certification', () => {
    // The homepage trust strip asserted SOC 2 Type II with an annual audit and
    // a report available on request. None of it was true, and a policy page is
    // the very last place it should reappear.
    //
    // A mention is allowed ONLY inside the sentence that denies holding one,
    // so each occurrence is checked in its own context rather than the first
    // one standing in for all of them.
    const pattern = /SOC ?2|ISO ?27001|PCI[- ]DSS|HIPAA/gi
    for (const match of prose.matchAll(pattern)) {
      const at = match.index ?? 0
      const context = prose.slice(Math.max(0, at - 160), at + 160)
      expect(context, `"${match[0]}" is claimed rather than disclaimed`).toMatch(
        /no security certification|not SOC 2|are not/i,
      )
    }
  })

  it('states the real storage region rather than a choice of residency', () => {
    expect(prose).toMatch(/Singapore/)
    expect(prose).not.toMatch(/US, EU, or your own region/)
  })
})
