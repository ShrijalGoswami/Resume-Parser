import { cn } from '@/lib/utils'
import { scoreBand, type ScoreBandKey } from '../lib/format'

/**
 * ScoreMeter — the Focus Reading (Design Bible §4.11). Bar form: track with a
 * band-colored fill, fine tick marks, the mono number, and a one-word label.
 * Always number + label + color (never color alone).
 */
/**
 * THE BAR TAKES THE `-solid` TONE; THE NUMERAL TAKES THE BASE TONE.
 * ---------------------------------------------------------------------------
 * They are different colours on purpose. The bar is a graphic — it only has to
 * clear WCAG's 3:1 non-text floor, so it uses the vivid band colour (cyan,
 * mint, amber, orange, coral) that carries the brand. The numeral beside it is
 * text at 4.5:1, which those vivid tones cannot reach on a light canvas, so it
 * uses the deeper sibling.
 *
 * Both used to read the text tone, which made every meter in the product paint
 * dark teal / olive / brown — technically compliant and visually the muddy
 * "enterprise" look the palette exists to get away from.
 */
const fillFor: Record<ScoreBandKey, string> = {
  infocus: 'bg-hl-score-infocus-solid',
  sharp: 'bg-hl-score-sharp-solid',
  legible: 'bg-hl-score-legible-solid',
  soft: 'bg-hl-score-soft-solid',
  outfocus: 'bg-hl-score-outfocus-solid',
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
      <span className={cn('hl-mono', textFor[band.key])}>{value}</span>
      {showLabel ? <span className="hl-caption text-hl-fg-tertiary">{band.label}</span> : null}
    </div>
  )
}
