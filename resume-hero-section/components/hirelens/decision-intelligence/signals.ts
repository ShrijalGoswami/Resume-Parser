import type { CandidateResult } from '@/types/batch'

/**
 * A hiring signal shown in the Confidence panel. Future-ready: today it's derived
 * from the candidate's real score components; a richer recommendation engine can
 * populate more signals without a UI redesign. Never a placeholder or estimate.
 */
export interface RecommendationSignal {
  label: string
  /** 0–100, from real backend data. */
  score: number
}

/** Real signals from the candidate's score components — omit any without a score. */
export function signalsFromResult(result: CandidateResult | null): RecommendationSignal[] {
  const components = result?.score?.components ?? []
  return components
    .filter((c) => c && c.name && c.max > 0)
    .map((c) => ({ label: c.name, score: Math.round((c.earned / c.max) * 100) }))
}
