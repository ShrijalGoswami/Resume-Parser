import { cn } from '@/lib/utils'
import { scoreBand, type ScoreBandKey } from '../lib/format'

/**
 * ScoreMeter — the Focus Reading (Design Bible §4.11). Bar form: track with a
 * band-colored fill, fine tick marks, the mono number, and a one-word label.
 * Always number + label + color (never color alone).
 */
const fillFor: Record<ScoreBandKey, string> = {
  infocus: 'bg-hl-score-infocus',
  sharp: 'bg-hl-score-sharp',
  legible: 'bg-hl-score-legible',
  soft: 'bg-hl-score-soft',
  outfocus: 'bg-hl-score-outfocus',
}
const textFor: Record<ScoreBandKey, string> = {
  infocus: 'text-hl-score-infocus',
  sharp: 'text-hl-score-sharp',
  legible: 'text-hl-score-legible',
  soft: 'text-hl-score-soft',
  outfocus: 'text-hl-score-outfocus',
}

export interface ScoreMeterProps {
  score: number
  showLabel?: boolean
  className?: string
}

export function ScoreMeter({ score, showLabel = true, className }: ScoreMeterProps) {
  const value = Math.max(0, Math.min(100, Math.round(score)))
  const band = scoreBand(value)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Fit ${value}, ${band.label}`}
        className="relative h-1.5 w-24 overflow-hidden rounded-full bg-hl-muted"
      >
        {[25, 50, 75].map((tick) => (
          <span
            key={tick}
            aria-hidden
            className="absolute top-0 h-full w-px bg-hl-canvas/70"
            style={{ left: `${tick}%` }}
          />
        ))}
        <div className={cn('h-full rounded-full', fillFor[band.key])} style={{ width: `${value}%` }} />
      </div>
      <span className={cn('hl-mono text-[13px]', textFor[band.key])}>{value}</span>
      {showLabel ? <span className="hl-caption text-hl-fg-tertiary">{band.label}</span> : null}
    </div>
  )
}
