import * as React from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { confidenceMeta } from './confidence-chip'
import type { RecommendationSignal } from './signals'
import type { Recommendation } from '@/types/agent'

function Row({
  label,
  warn,
  children,
}: {
  label: string
  warn?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-t border-hl-border-subtle py-3 first:border-t-0 first:pt-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <span
        className={cn(
          'hl-small flex items-center gap-1.5',
          warn ? 'text-hl-score-soft' : 'text-hl-fg-tertiary',
        )}
      >
        {warn ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </span>
      <div className="hl-body text-hl-fg">{children}</div>
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-hl-sm border border-hl-border bg-hl-canvas px-2 py-0.5 font-hl-mono text-[11px] text-hl-fg-secondary"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

/**
 * Analyst Brief (Stitch Decision Intelligence) — a concise, executive labeled
 * readout on the AI surface. Every row renders only from real recommendation
 * data; anything without backing is omitted.
 */
export function AnalystBrief({
  rec,
  signals,
  watchouts,
}: {
  rec: Recommendation
  signals: RecommendationSignal[]
  watchouts: string[]
}) {
  const { label: confidenceLabel } = confidenceMeta(rec.confidence)
  const sourceCount = rec.data_sources.length

  return (
    <section className="hl-prism-edge rounded-hl-lg border border-hl-ai-border bg-hl-ai-surface p-5">
      <p className="mb-3 flex items-center gap-1.5 font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
        <Sparkles className="size-3.5 text-hl-prism-mid" aria-hidden />
        Analyst brief
      </p>
      <div>
        {rec.recommended_action ? (
          <Row label="Recommendation">{rec.recommended_action}</Row>
        ) : null}
        {rec.why ? <Row label="Rationale">{rec.why}</Row> : null}
        {rec.evidence.length > 0 ? (
          <Row label="Primary evidence">
            <ul className="flex flex-col gap-1">
              {rec.evidence.map((item, index) => (
                <li key={index} className="text-hl-fg-secondary">
                  {item}
                </li>
              ))}
            </ul>
          </Row>
        ) : null}
        {signals.length > 0 ? (
          <Row label="Supporting signals">
            <Chips items={signals.map((s) => s.label)} />
          </Row>
        ) : null}
        {watchouts.length > 0 ? (
          <Row label="Watch-outs" warn>
            {watchouts.join(' · ')}
          </Row>
        ) : null}
        <Row label="Confidence">
          {confidenceLabel}
          {sourceCount > 0 ? ` · ${sourceCount} source${sourceCount === 1 ? '' : 's'}` : ''}
        </Row>
        {rec.data_sources.length > 0 ? (
          <Row label="Sources">
            <Chips items={rec.data_sources} />
          </Row>
        ) : null}
      </div>
    </section>
  )
}
