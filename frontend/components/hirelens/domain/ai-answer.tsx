'use client'

import * as React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfidencePill } from './confidence-pill'

/**
 * AIAnswer (Design Bible §4.6) — the single AI render. Prism left hairline over
 * the AI surface, then: answer → sources → confidence → reasoning (collapsed) →
 * actions. This P1 version renders a complete (non-streaming) answer; streaming
 * is added with the AI spine in a later phase.
 */
export interface AIAnswerSource {
  label: string
  onClick?: () => void
  /** Longer description, surfaced on hover — the chip stays scannable. */
  title?: string
}

export interface AIAnswerProps {
  children: React.ReactNode
  confidence?: number
  sources?: AIAnswerSource[]
  reasoning?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  /**
   * `false` renders an explicit "not from your data" note in place of the
   * sources row. Pass it whenever the caller KNOWS the answer's grounding;
   * leave it `undefined` when grounding is genuinely unknown, which renders
   * neither — silence is honest there, and a wrong badge is not.
   */
  grounded?: boolean
}

export function AIAnswer({
  children,
  confidence,
  sources,
  reasoning,
  actions,
  className,
  grounded,
}: AIAnswerProps) {
  const [showReasoning, setShowReasoning] = React.useState(false)

  return (
    <div
      className={cn('hl-prism-edge rounded-r-[var(--hl-radius-lg)] bg-hl-ai-surface p-4', className)}
    >
      <div className="hl-body text-hl-fg">{children}</div>

      {/* An ungrounded answer says so, rather than just omitting the sources
          row. Those two states used to look identical, so "we had no data" was
          indistinguishable from "we had data and forgot to cite it" — the
          reader could not tell how much to trust what they were reading. */}
      {grounded === false ? (
        <p className="mt-3 flex items-start gap-1.5 hl-caption text-hl-fg-tertiary">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>This answer wasn’t generated from your organization’s data.</span>
        </p>
      ) : null}

      {sources && sources.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="hl-caption text-hl-fg-tertiary">Sources</span>
          {sources.map((source, index) => (
            <button
              key={`${source.label}-${index}`}
              type="button"
              onClick={source.onClick}
              title={source.title}
              disabled={!source.onClick}
              className="hl-caption rounded-full border border-hl-border bg-hl-canvas px-2 py-0.5 text-hl-fg-secondary outline-none transition-colors enabled:hover:text-hl-fg disabled:cursor-default"
            >
              {source.label}
            </button>
          ))}
        </div>
      ) : null}

      {confidence !== undefined || reasoning ? (
        <div className="mt-3 flex items-center gap-3">
          {confidence !== undefined ? <ConfidencePill value={confidence} /> : null}
          {reasoning ? (
            <button
              type="button"
              onClick={() => setShowReasoning((value) => !value)}
              aria-expanded={showReasoning}
              className="hl-caption text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg-secondary"
            >
              {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
            </button>
          ) : null}
        </div>
      ) : null}

      {reasoning && showReasoning ? (
        <div className="hl-small mt-2 text-hl-fg-secondary">{reasoning}</div>
      ) : null}

      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
