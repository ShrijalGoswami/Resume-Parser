import * as React from 'react'
import { Sparkles } from 'lucide-react'
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
      <p className="flex items-center gap-1.5 font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
        <Sparkles className="size-3.5 text-hl-prism-mid" aria-hidden />
        The verdict
      </p>
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

/** CandidateSummary — the AI's narrative summary of the candidate. */
export function CandidateSummary({ model }: { model: CandidateModel }) {
  if (!model.summary) return null
  return (
    <Section title="Summary">
      <p className="hl-body text-hl-fg-secondary">{model.summary}</p>
    </Section>
  )
}
