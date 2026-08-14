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

/**
 * Normalise any confidence the product carries to a 0–100 percent.
 *
 * THE BACKEND CONTRACT IS 0–100. `app/schemas/agent.py` declares
 * `confidence: int = Field(ge=0, le=100)` and the agent workflows emit 50, 75,
 * 80, `min(95, …)`, `min(98, …)`. Candidate fit confidence is 0–100 as well.
 *
 * This exists because it was got wrong: the Decision Intelligence chip compared
 * the raw value against 0.66/0.5 as though it were a ratio, so every
 * recommendation — including a 50 — satisfied `>= 0.66` and rendered "High
 * confidence" with a green check. The same recommendation read "Medium" in the
 * Ask backlog, which normalised. A trust indicator that is always green is
 * worse than no indicator, so there is now exactly ONE way to read the number.
 *
 * A value at or below 1 is still treated as a 0–1 ratio, for older callers that
 * pass one; 1 means 100% either way, so the boundary is not ambiguous.
 */
export function confidencePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  const percent = value <= 1 ? value * 100 : value
  return Math.round(Math.max(0, Math.min(100, percent)))
}

/**
 * The confidence threshold table (Design Bible §3.6) — the SINGLE source of
 * these cut-offs. Do not re-declare them at a call site; call this instead.
 */
export function confidenceBand(value: number): {
  key: ConfidenceKey
  label: string
  percent: number
} {
  const percent = confidencePercent(value)
  if (percent >= 75) return { key: 'high', label: 'High confidence', percent }
  if (percent >= 50) return { key: 'medium', label: 'Medium confidence', percent }
  return { key: 'low', label: 'Low confidence', percent }
}
