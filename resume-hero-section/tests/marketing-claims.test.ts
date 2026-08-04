import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * THE TRUTH PASS, MADE PERMANENT.
 *
 * On 4 August 2026 the public site claimed four customers that do not exist, a
 * named testimonial with a stock portrait attached to a person who does not
 * exist, four measured outcomes nobody measured, a SOC 2 Type II audit that has
 * never happened, a choice of data residency across three regions when the
 * whole deployment is one database in Singapore, ATS integrations that are not
 * built, and a continuous bias audit that has never been run.
 *
 * Every one of those was written by someone reasonable filling a slot in a
 * design comp. That is exactly why a review will not keep them out — the next
 * person to fill a slot will reach for the same words, because an empty logo
 * strip is uncomfortable and "SOC 2 Type II" looks like the kind of thing that
 * belongs there.
 *
 * So the constraint is asserted rather than remembered. Each test below names
 * the specific claim it is keeping out and the reason it is not allowed back.
 *
 * IF ONE OF THESE FAILS, the fix is almost never to edit the test. It is to
 * delete the claim — or, if the claim has become true, to add the evidence in
 * the same commit that relaxes the assertion.
 */

const MARKETING = resolve(process.cwd(), 'components/marketing')

/** Component source with comments stripped. The prose in this codebase
 *  deliberately records what was removed and why — that history is the thing
 *  most likely to stop someone reinstating it — so it must not trip the
 *  assertions that keep the claims out of rendered output. */
function rendered(file: string): string {
  return readFileSync(resolve(MARKETING, file), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

const FRAMES = [
  'frame-01-hero.tsx',
  'frame-02-philosophy.tsx',
  'frame-03-pipeline.tsx',
  'frame-04-regret.tsx',
  'frame-05-conclusion.tsx',
]

const allFrames = () => FRAMES.map(rendered).join('\n')

describe('no invented customers', () => {
  it('names none of the fabricated companies', () => {
    // Vertex, Nexus, Omni and Meridian were rendered as a logo strip and quoted
    // in a testimonial. None is a customer; there are no reference customers.
    for (const name of ['Vertex', 'Nexus', 'Omni', 'Meridian']) {
      expect(allFrames(), `${name} is not a customer and must not appear`).not.toMatch(
        new RegExp(`\\b${name}\\b`),
      )
    }
  })

  it('carries no attributed testimonial', () => {
    // "Sarah Jenkins, VP of Engineering" and "Head of Talent, Vertex" were both
    // invented. A quote needs a real person who agreed in writing.
    expect(allFrames()).not.toMatch(/Sarah Jenkins/)
    expect(allFrames()).not.toMatch(/Head of Talent/)
  })

  it('ships no fabricated customer imagery', () => {
    // The logos and the portrait existed as real PNGs, so they stayed live at
    // their public URLs even after the markup stopped referencing them.
    const assets = existsSync(resolve(process.cwd(), 'public/marketing'))
      ? readdirSync(resolve(process.cwd(), 'public/marketing'))
      : []
    for (const asset of assets) {
      expect(asset, 'a fabricated customer asset is still published').not.toMatch(
        /^logo-\d+\.png$|portrait-/,
      )
    }
  })

  it('claims no outcome on a customer’s behalf', () => {
    // −38% time-to-decision, 4.1× more of the pile reviewed, 0 regretted hires
    // over two quarters, two roles filled in nine days. Nobody measured any of
    // it. A number attached to a result needs a study behind it.
    const frames = allFrames()
    expect(frames).not.toMatch(/time.to.decision/i)
    expect(frames).not.toMatch(/regretted hires/i)
    expect(frames).not.toMatch(/filled in \d+ days/i)
  })
})

describe('no unearned compliance or infrastructure claims', () => {
  const frames = () => allFrames()

  it('claims no security certification', () => {
    // There is no SOC 2 audit and no report to send anyone who asks. "Report on
    // request" invited an enterprise buyer to ask in writing for a document
    // that does not exist.
    expect(frames()).not.toMatch(/SOC ?2/i)
    expect(frames()).not.toMatch(/ISO ?27001/i)
    expect(frames()).not.toMatch(/report on request/i)
  })

  it('promises no data residency choice', () => {
    // One Supabase project in ap-southeast-1. "US, EU, or your own region" was
    // false in all three branches.
    expect(frames()).not.toMatch(/US, EU, or your own region/i)
    expect(frames()).not.toMatch(/data residency/i)
  })

  it('does not advertise SSO providers as available', () => {
    // SSO is an unbuilt Enterprise capability; naming Okta, Entra and Google
    // Workspace implied three working integrations.
    expect(frames()).not.toMatch(/Okta|Entra|Google Workspace/i)
  })

  it('does not claim an immutable audit trail', () => {
    // There is no audit trail for administrative operations at all — its
    // absence is a tracked hardening item and the reason a July incident left
    // no record of who deleted what.
    expect(frames()).not.toMatch(/immutable/i)
  })
})

describe('no capability claimed ahead of its implementation', () => {
  const conclusion = () => rendered('frame-05-conclusion.tsx')

  it('does not claim ATS integrations', () => {
    // `integrations` is an unbuilt Pro catalog feature. The FAQ said we
    // "integrate with major ATS platforms".
    expect(conclusion()).not.toMatch(/integrate with major ATS/i)
    expect(conclusion()).not.toMatch(/existing Applicant Tracking System/i)
  })

  it('does not claim a bias audit', () => {
    // A published bias audit is a regulated artefact for hiring technology
    // (NYC Local Law 144; EU AI Act high-risk classification). Claiming one we
    // have not performed is worse than performing none.
    expect(conclusion()).not.toMatch(/continuously audited for bias/i)
    expect(conclusion()).not.toMatch(/obscure demographic identifiers/i)
  })

  it('does not promise an implementation timeline', () => {
    expect(conclusion()).not.toMatch(/completed within a few days/i)
  })

  it('gives the same privacy answer as the pricing page', () => {
    // The homepage hedged with "without explicit consent", implying a consent
    // mechanism that does not exist, while /pricing said flatly that customer
    // data serves that organization and nothing else. Two answers, one of them
    // weaker, on the two pages a buyer's counsel reads.
    expect(conclusion()).not.toMatch(/without explicit consent/i)
  })
})

describe('the pricing surfaces agree with each other', () => {
  it('reserves the same height for the positioning line on both plan cards', () => {
    // The homepage band and /pricing render the same four PLAN_POSITIONING
    // strings. /pricing was fixed to 4.5rem after 2.75rem left Plus's price and
    // feature list ~21px above its neighbours; the homepage copy kept the bug.
    const homepage = rendered('frame-05-conclusion.tsx')
    const pricing = rendered('pricing/plan-cards.tsx')
    const reserve = /min-h-\[(\d+(?:\.\d+)?)rem\]/
    expect(homepage.match(reserve)?.[1], 'homepage plan card').toBe(
      pricing.match(reserve)?.[1],
    )
  })
})
