import * as React from 'react'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
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

/* Inter, not mono (V2 §4): a source name like "Campaign Analytics" is a label,
   not data. Mono is reserved for scores, ids, counts and timestamps. */
function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-hl-sm border border-hl-border bg-hl-canvas px-2 py-0.5 hl-caption text-hl-fg-secondary"
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
  return (
    // V2 §16: AI output is a brief, not a conversation, and it sits on the same
    // elevated surface as everything else. The 2px copper top rule is the single
    // marker for system-generated content — no tinted plate, no prism edge, no
    // sparkle. `--hl-ai-surface` and `--hl-ai-border` are on §23's banned list
    // precisely because tinting AI content is the template tell.
    <section className="rounded-hl-lg border border-hl-border border-t-2 border-t-[var(--hl-accent-secondary)] bg-hl-subtle p-5">
      <p className="mb-3 hl-label-sm text-hl-fg-secondary">System analysis</p>
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
        {/* The confidence row that used to sit here repeated the chip in the
            header verbatim — the same words twice, one scroll apart. What the
            reader cannot get from the chip is what the number was computed
            FROM, so provenance takes the space instead. */}
        {rec.data_sources.length > 0 ? (
          <Row label="Read from">
            <Chips items={rec.data_sources} />
          </Row>
        ) : null}
        {rec.tools_used.length > 0 ? (
          <Row label="Tools run">
            <Chips items={rec.tools_used} />
          </Row>
        ) : null}
      </div>
    </section>
  )
}
