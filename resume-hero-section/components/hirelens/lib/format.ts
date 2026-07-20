/** V3 formatting helpers. */

export function relativeTime(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

export type ScoreBandKey = 'infocus' | 'sharp' | 'legible' | 'soft' | 'outfocus'

/** Focus scale (Design Bible §3.4). Score is 0–100. */
export function scoreBand(score: number): { key: ScoreBandKey; label: string } {
  if (score >= 85) return { key: 'infocus', label: 'In focus' }
  if (score >= 70) return { key: 'sharp', label: 'Sharp' }
  if (score >= 55) return { key: 'legible', label: 'Legible' }
  if (score >= 40) return { key: 'soft', label: 'Soft' }
  return { key: 'outfocus', label: 'Out of focus' }
}

export type ConfidenceKey = 'high' | 'medium' | 'low'

/** Confidence band (Design Bible §3.6). Accepts a 0–1 ratio or 0–100 percent. */
export function confidenceBand(value: number): { key: ConfidenceKey; label: string } {
  const ratio = value > 1 ? value / 100 : value
  if (ratio >= 0.75) return { key: 'high', label: 'High confidence' }
  if (ratio >= 0.5) return { key: 'medium', label: 'Medium confidence' }
  return { key: 'low', label: 'Low confidence' }
}
