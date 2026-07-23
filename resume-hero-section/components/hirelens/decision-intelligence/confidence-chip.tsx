import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Confidence chip (Stitch Decision Intelligence). Green only at high confidence;
 * everything below is NEUTRAL GRAY — never red (Design Bible: low AI confidence
 * is neutral, not an error). Driven by the real recommendation confidence.
 */
export type ConfidenceTone = 'high' | 'building' | 'low'

export function confidenceMeta(confidence: number | null): { label: string; tone: ConfidenceTone } {
  if (confidence == null) return { label: 'Confidence unavailable', tone: 'low' }
  if (confidence >= 0.66) return { label: 'High confidence', tone: 'high' }
  if (confidence >= 0.5) return { label: 'Building confidence', tone: 'building' }
  return { label: 'Low confidence', tone: 'low' }
}

export function ConfidenceChip({ confidence }: { confidence: number | null }) {
  const { label, tone } = confidenceMeta(confidence)
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
    </span>
  )
}
