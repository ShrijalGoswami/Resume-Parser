import { cn } from '@/lib/utils'
import { confidenceBand, type ConfidenceKey } from '../lib/format'

/** Confidence pill (Design Bible §3.6, §4.6). Low is neutral, never red. */
const textFor: Record<ConfidenceKey, string> = {
  high: 'text-hl-confidence-high',
  medium: 'text-hl-confidence-med',
  low: 'text-hl-confidence-low',
}
const dotFor: Record<ConfidenceKey, string> = {
  high: 'bg-[color:var(--hl-confidence-high)]',
  medium: 'bg-[color:var(--hl-confidence-med)]',
  low: 'bg-[color:var(--hl-confidence-low)]',
}

export function ConfidencePill({ value, className }: { value: number; className?: string }) {
  const band = confidenceBand(value)
  return (
    <span
      className={cn(
        'hl-caption inline-flex items-center gap-1 rounded-full bg-hl-muted px-2 py-0.5',
        textFor[band.key],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotFor[band.key])} aria-hidden />
      {band.label}
    </span>
  )
}
