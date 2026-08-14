import * as React from 'react'
import { AIAnswer, type AIAnswerSource } from '../../domain'
import { ConfidencePill } from '../../domain/confidence-pill'
import { Section, PendingAnalysis } from './primitives'
import type { CandidateModel } from '../model'

/**
 * CandidateVerdict — THE AI answer. Rendered through the shared `AIAnswer`
 * primitive, which enforces the immutable contract order:
 *   Answer → Sources → Confidence → Reasoning (collapsed) → Actions.
 * When there's no analysis yet, it degrades to an honest pending note.
 */
export function CandidateVerdict({
  model,
  onOpenResume,
  actions,
}: {
  model: CandidateModel
  onOpenResume?: () => void
  actions?: React.ReactNode
}) {
  if (!model.hasAnalysis) return <PendingAnalysis />

  const sources: AIAnswerSource[] = []
  if (model.resumePath && onOpenResume) sources.push({ label: 'Résumé', onClick: onOpenResume })
  const answer = model.verdict || model.matchCategory || 'Analyzed'

  return (
    <AIAnswer
      confidence={model.confidence ?? undefined}
      sources={sources.length > 0 ? sources : undefined}
      reasoning={model.verdictReasoning || undefined}
      actions={actions}
    >
      {/* Was a sparkle in prism blue over a mono label — three V2 violations
          in one line (§8 no sparkles, §16 copper marks system content, §4
          mono never labels). The copper rule on the card's edge already says
          "system-generated"; the label just names the section, in Inter. */}
      <p className="hl-label-sm text-hl-fg-tertiary">The verdict</p>
      {model.matchCategory ? (
        <p className="hl-h3 mt-1 capitalize text-hl-fg">{model.matchCategory}</p>
      ) : null}
      <p className="mt-2">{answer}</p>
    </AIAnswer>
  )
}

/** CandidateConfidence — the fit-confidence pill, standalone (neutral, never red). */
export function CandidateConfidence({ model }: { model: CandidateModel }) {
  if (model.confidence === null) return null
  return (
    <div className="flex items-center gap-2">
      <span className="hl-caption text-hl-fg-tertiary">Fit confidence</span>
      <ConfidencePill value={model.confidence} />
    </div>
  )
}

/**
 * CandidateSummary — the analysis's narrative paragraph.
 *
 * Titled "Analysis summary" rather than "Summary" for provenance. The audit
 * flagged a page that appeared to contradict itself — "Moderate Match" beside
 * a sentence calling someone a strong candidate — but those are two different
 * backend fields (`match_category`, a band; `summary`, prose), not one
 * judgment stated inconsistently. Naming the field each string comes from is
 * the honest repair; rewriting either value to agree with the other would be
 * inventing scoring, which this product must never do.
 */
export function CandidateSummary({ model }: { model: CandidateModel }) {
  if (!model.summary) return null
  return (
    <Section title="Analysis summary">
      <p className="hl-body text-hl-fg-secondary">{model.summary}</p>
    </Section>
  )
}
