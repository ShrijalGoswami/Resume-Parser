import { cn } from '@/lib/utils'
import { focusBand } from '../lib/focus-scale'
import type { RecommendationSignal } from './signals'

/**
 * Confidence panel (Stitch "Confidence Analysis" / "Hiring Signals"). Conditional
 * and evidence-backed: it renders only real signals (from score components). With
 * no signals it collapses to nothing — the memo falls back to the confidence chip
 * + Analyst Brief. No fabricated corroboration, verification status, or "raise
 * confidence to ~High" projections.
 */
export function ConfidencePanel({ signals }: { signals: RecommendationSignal[] }) {
  if (signals.length === 0) return null

  return (
    <section className="rounded-hl-xl border border-hl-border p-5">
      <div className="flex items-center justify-between">
        <h3 className="hl-h3 text-hl-fg">Hiring signals</h3>
        <span className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
          {signals.length} scored
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3.5">
        {signals.map((signal) => {
          const band = focusBand(signal.score)
          return (
            <div key={signal.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="hl-small text-hl-fg">{signal.label}</span>
                <span className={cn('font-hl-mono text-xs tabular-nums', band.text)}>
                  {signal.score}
                </span>
              </div>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-hl-muted">
                <span
                  className={cn('block h-full rounded-full', band.bar)}
                  style={{ width: `${Math.max(0, Math.min(100, signal.score))}%` }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
