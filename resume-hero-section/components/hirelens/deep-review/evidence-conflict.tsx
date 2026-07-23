'use client'

import { AIAnswer } from '../domain'

/**
 * Evidence conflict (Stitch "Deep Review — Evidence State: Conflicting"). The
 * layout is ready before the intelligence exists: today the backend emits no
 * source-conflict detection, so `conflicts` is empty and nothing renders. A
 * future conflict engine can populate `EvidenceConflict[]` with independently
 * sourced excerpts — no UI redesign required. Never fabricate or heuristically
 * infer conflicts to make this appear.
 */
export interface EvidenceExcerpt {
  /** Where it came from, e.g. "Résumé" or "Interview 2 (System Design)". */
  source: string
  /** The verbatim excerpt. */
  quote: string
}

export interface EvidenceConflict {
  /** The judgment the conflict raises, e.g. "Are they senior enough?". */
  question: string
  /** A neutral, truthful framing of the disagreement. */
  summary: string
  /** The two (or more) independently sourced excerpts that disagree. */
  sides: EvidenceExcerpt[]
}

function ExcerptColumn({ excerpt }: { excerpt: EvidenceExcerpt }) {
  return (
    <div className="rounded-hl-lg border border-hl-border-subtle bg-hl-subtle p-4">
      <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
        {excerpt.source}
      </p>
      <blockquote className="hl-body mt-2 text-hl-fg-secondary">“{excerpt.quote}”</blockquote>
    </div>
  )
}

export function EvidenceConflicts({ conflicts }: { conflicts: EvidenceConflict[] }) {
  if (conflicts.length === 0) return null
  return (
    <div className="flex flex-col gap-10">
      {conflicts.map((conflict, index) => (
        <section key={`${conflict.question}-${index}`} className="flex flex-col gap-4">
          <div>
            <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
              Needs your judgment
            </p>
            <h3 className="hl-h2 mt-1 font-hl-display text-hl-fg">{conflict.question}</h3>
          </div>
          <AIAnswer>{conflict.summary}</AIAnswer>
          <div className="grid gap-3 sm:grid-cols-2">
            {conflict.sides.map((side, i) => (
              <ExcerptColumn key={`${side.source}-${i}`} excerpt={side} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
