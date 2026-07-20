'use client'

import * as React from 'react'
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
}

export interface AIAnswerProps {
  children: React.ReactNode
  confidence?: number
  sources?: AIAnswerSource[]
  reasoning?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function AIAnswer({
  children,
  confidence,
  sources,
  reasoning,
  actions,
  className,
}: AIAnswerProps) {
  const [showReasoning, setShowReasoning] = React.useState(false)

  return (
    <div
      className={cn('hl-prism-edge rounded-r-[var(--hl-radius-lg)] bg-hl-ai-surface p-4', className)}
    >
      <div className="hl-body text-hl-fg">{children}</div>

      {sources && sources.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="hl-caption text-hl-fg-tertiary">Sources</span>
          {sources.map((source, index) => (
            <button
              key={`${source.label}-${index}`}
              type="button"
              onClick={source.onClick}
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
