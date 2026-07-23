import type { CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

// Focus scale lives in the shared lib now; re-exported so existing triage
// imports keep working.
export { focusBand, type FocusBand } from '../../lib/focus-scale'

/**
 * Triage grouping (hybrid: AI recommendation + score sanity guard). The AI's
 * `hire` label is the primary signal, but a candidate only auto-sorts into a
 * pile when the score agrees — any label↔score contradiction (or missing score,
 * or Maybe/Unrated) falls to NEEDS YOU. Automation handles the obvious; humans
 * handle ambiguity. Every input is real backend data — nothing invented.
 */
export type TriageGroup = 'accept' | 'reject' | 'needs'

/** Fit at/above this is "healthy" enough to trust an accept. */
export const ACCEPT_MIN_SCORE = 70
/** Fit below this is "genuinely low" enough to trust a reject. */
export const REJECT_MAX_SCORE = 55

/** Stages that mean the candidate has already been triaged (a decision is recorded). */
const RESOLVED_STAGES: PipelineStage[] = ['shortlisted', 'interview', 'offer', 'hired', 'rejected']

export function isResolved(row: CandidateRow): boolean {
  return RESOLVED_STAGES.includes(row.raw.stage)
}

export function triageGroup(row: CandidateRow): TriageGroup {
  const score = row.overallScore
  if (score == null) return 'needs'
  const positive = row.hire === 'Strong Hire' || row.hire === 'Hire'
  if (positive && score >= ACCEPT_MIN_SCORE) return 'accept'
  if (row.hire === 'Reject' && score < REJECT_MAX_SCORE) return 'reject'
  return 'needs'
}

/** A contradiction the guard caught — a strong recommendation with a weak score, or vice-versa. */
export function isContradiction(row: CandidateRow): boolean {
  const score = row.overallScore
  if (score == null) return false
  const positive = row.hire === 'Strong Hire' || row.hire === 'Hire'
  if (positive && score < ACCEPT_MIN_SCORE) return true
  if (row.hire === 'Reject' && score >= REJECT_MAX_SCORE) return true
  return false
}

export interface TriagePartition {
  accept: CandidateRow[]
  reject: CandidateRow[]
  needs: CandidateRow[]
  done: CandidateRow[]
  total: number
}

/** Split the role's candidates into the triage piles + the already-resolved set. */
export function partitionTriage(rows: CandidateRow[]): TriagePartition {
  const accept: CandidateRow[] = []
  const reject: CandidateRow[] = []
  const needs: CandidateRow[] = []
  const done: CandidateRow[] = []

  for (const row of rows) {
    if (isResolved(row)) {
      done.push(row)
      continue
    }
    const group = triageGroup(row)
    if (group === 'accept') accept.push(row)
    else if (group === 'reject') reject.push(row)
    else needs.push(row)
  }

  // Highest-fit uncertainty first — the most consequential judgments lead.
  needs.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
  return { accept, reject, needs, done, total: rows.length }
}
