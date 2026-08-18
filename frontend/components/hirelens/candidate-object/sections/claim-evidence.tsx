import * as React from 'react'
import { findClaimSupport, type EvidenceCategory } from '../evidence-link'
import type { CandidateModel } from '../model'

/**
 * Claims, each with whatever the parsed résumé says near it.
 *
 * The Candidate Detail page put assertions ("Familiarity with containerization
 * using Docker") in one column and the résumé in another, and left the reader
 * to hold both in their head. This section closes that gap for the strongest
 * relationship the data can honestly support: the résumé lines that share the
 * claim's wording, shown directly beneath it.
 *
 * THE WORD "SOURCE" DOES NOT APPEAR HERE, and neither does any affordance that
 * would imply one. See `evidence-link.ts` — the analysis emits no span-level
 * references, so these are search results over the parsed record, labelled as
 * such. The heading says "Related résumé lines"; the note says how they were
 * found; and a claim with nothing under it says that too, because an assertion
 * the record does not echo is the most useful thing on this page.
 */

/** Category names as a reader would say them, not as the schema spells them. */
const CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  experience: 'Experience',
  project: 'Project',
  skill: 'Skill',
  certification: 'Certification',
  education: 'Education',
}

function Support({
  category,
  detail,
  context,
}: {
  category: EvidenceCategory
  detail: string
  context?: string
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {/* The category is the one piece of structure the relationship has, so
            it leads. Inter, not mono — it is a word, not a measurement. */}
        <span className="hl-label text-hl-fg-tertiary">{CATEGORY_LABEL[category]}</span>
        {context ? <span className="hl-caption text-hl-fg-tertiary">{context}</span> : null}
      </div>
      {/* The line, verbatim. Never trimmed to fit, never paraphrased. */}
      <p className="hl-small text-hl-fg-secondary">{detail}</p>
    </li>
  )
}

function Claim({ text, resume }: { text: string; resume: CandidateModel['resumeData'] }) {
  const support = React.useMemo(() => findClaimSupport(text, resume), [text, resume])

  return (
    <li className="flex flex-col gap-2">
      <p className="hl-body text-hl-fg">{text}</p>

      {support.length > 0 ? (
        // The copper rule is the product's evidence marker (V2 §16): it runs
        // beside the material a claim can be checked against, and nowhere else.
        <ul className="ml-1 flex flex-col gap-2.5 border-l-2 border-[var(--hl-accent-secondary)] pl-3">
          {support.map((item, index) => (
            <Support
              key={`${item.category}-${index}`}
              category={item.category}
              detail={item.detail}
              context={item.context}
            />
          ))}
        </ul>
      ) : (
        // Not a failure state — a finding. Said quietly, without alarm colour,
        // because "the parser did not capture this" and "the claim is wrong"
        // are different things and this cannot tell them apart.
        <p className="ml-1 border-l-2 border-hl-border pl-3 hl-caption text-hl-fg-tertiary">
          No line in the parsed résumé matches this wording.
        </p>
      )}
    </li>
  )
}

export function CandidateClaimEvidence({
  model,
  kind,
}: {
  model: CandidateModel
  /** Which set of claims to render — the two the analysis produces. */
  kind: 'strengths' | 'risks'
}) {
  const claims = kind === 'strengths' ? model.strengths : model.risks
  if (claims.length === 0) return null

  const title = kind === 'strengths' ? 'What stands out' : 'What needs a closer look'

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="hl-h3 text-hl-fg">{title}</h2>
        {/* Stated once per section, in plain words: what the reader is looking
            at and what it is not. `strengths` carries it because it comes
            first; the risks section repeats it only when shown alone. */}
        {model.resumeData ? (
          <p className="hl-caption text-hl-fg-tertiary">
            Related résumé lines are found by matching wording — they are not
            citations. Hirevo cannot yet point to the passage an assessment
            came from.
          </p>
        ) : null}
      </div>

      <ul className="flex flex-col gap-5">
        {claims.map((claim, index) => (
          <Claim key={index} text={claim} resume={model.resumeData} />
        ))}
      </ul>
    </section>
  )
}
