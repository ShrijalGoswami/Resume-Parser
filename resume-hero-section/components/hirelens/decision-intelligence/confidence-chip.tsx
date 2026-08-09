import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { confidenceBand } from '../lib/format'

/**
 * Confidence chip (Decision Intelligence). Green only at high confidence;
 * everything below is NEUTRAL GRAY — never red (Design Bible: low AI confidence
 * is neutral, not an error). Driven by the real recommendation confidence.
 *
 * The thresholds live in `confidenceBand` and are NOT repeated here. This file
 * used to compare the raw backend integer against 0.66/0.5 as though it were a
 * ratio, which made every recommendation read "High confidence" — see the note
 * on `confidencePercent`.
 */
export type ConfidenceTone = 'high' | 'building' | 'low'

const toneFor: Record<'high' | 'medium' | 'low', ConfidenceTone> = {
  high: 'high',
  medium: 'building',
  low: 'low',
}

export function confidenceMeta(confidence: number | null): {
  label: string
  tone: ConfidenceTone
  percent: number | null
} {
  if (confidence == null) return { label: 'Confidence unavailable', tone: 'low', percent: null }
  const band = confidenceBand(confidence)
  return { label: band.label, tone: toneFor[band.key], percent: band.percent }
}

export function ConfidenceChip({ confidence }: { confidence: number | null }) {
  const { label, tone, percent } = confidenceMeta(confidence)
  const high = tone === 'high'
  return (
    <span
      className={cn(
        'hl-caption inline-flex items-center gap-1.5 rounded-hl-sm px-2 py-0.5',
        high ? 'bg-hl-score-sharp/10 text-hl-score-sharp' : 'bg-hl-muted text-hl-fg-secondary',
      )}
    >
      {high ? (
        <CircleCheck className="size-3.5" aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-hl-fg-tertiary" aria-hidden />
      )}
      {label}
      {/* The number itself, so the band is checkable rather than taken on faith.
          Mono because it is data. */}
      {percent !== null ? (
        <span className="font-hl-mono tabular-nums opacity-70">{percent}</span>
      ) : null}
    </span>
  )
}
