import type { Recommendation, ApprovalStatus } from '@/types/agent'

/**
 * Decision Ledger helpers. The Ledger is the immutable record of AI
 * recommendations that reached a decision — resolved recommendations only, read
 * as they were at decision time. No outcome, regret, or retrospective scoring.
 */
export function isResolved(rec: Recommendation): boolean {
  return rec.status !== 'pending'
}

/**
 * The decision timestamp — the immutable `decided_at`, stamped by a DB trigger
 * at decision time and frozen thereafter (migration 0015).
 *
 * STRICT ON PURPOSE. This used to fall back to `updated_at ?? created_at`, which
 * meant a legacy row with no `decided_at` displayed the moment the AGENT WROTE
 * the recommendation in a column headed "Date" on an audit surface — a different
 * event's timestamp, presented as the decision's. An audit record that guesses
 * when something happened is worse than one that admits it does not know, so a
 * missing decision time now reads as missing.
 */
export function decidedAt(rec: Recommendation): string | null {
  return rec.decided_at ?? null
}

/**
 * Ordering key only — never displayed. Falling back here keeps a legacy row in a
 * sensible position in the list without ever claiming its fallback is the
 * decision time.
 */
function sortKey(rec: Recommendation): string {
  return rec.decided_at ?? rec.updated_at ?? rec.created_at ?? ''
}

/** Most-recent decision first. */
export function sortLedger(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
}

/**
 * Who recorded the decision. `decided_by` is the deciding recruiter's id, and
 * the repository scopes every read to the signed-in recruiter, so in practice it
 * is the viewer — but that is asserted by matching ids, not assumed. When the id
 * does not match (or no profile is loaded) the raw id is shown rather than a
 * guessed name: this product does not invent people.
 */
export function actorLabel(rec: Recommendation, viewerId?: string | null): string | null {
  if (!rec.decided_by) return null
  if (viewerId && rec.decided_by === viewerId) return 'You'
  return rec.decided_by.slice(0, 8).toUpperCase()
}

export interface DecisionMeta {
  label: string
  /** 'positive' → green check · 'override' → amber · 'neutral' → muted. Never red. */
  tone: 'positive' | 'override' | 'neutral'
}

export function decisionMeta(status: ApprovalStatus): DecisionMeta {
  switch (status) {
    case 'approved':
      return { label: 'Approved', tone: 'positive' }
    case 'executed':
      return { label: 'Executed', tone: 'positive' }
    case 'dismissed':
      return { label: 'Overridden', tone: 'override' }
    case 'rejected':
      return { label: 'Rejected', tone: 'neutral' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

/**
 * Elapsed time between the agent proposing and the human deciding.
 *
 * Worded as "sat for" rather than "to decide": both timestamps are real, but the
 * gap is wall-clock between two events, not time anyone spent deliberating. A
 * recommendation raised overnight and resolved at 9am did not take nine hours of
 * thought, and an audit record should not imply that it did.
 */
export function decisionLatency(rec: Recommendation): string | null {
  const decided = decidedAt(rec)
  if (!rec.created_at || !decided) return null
  const ms = new Date(decided).getTime() - new Date(rec.created_at).getTime()
  if (!(ms > 0)) return null
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'decided within a minute of being raised'
  if (mins < 60) return `sat ${mins} min before the call`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `sat ${hrs}h before the call`
  return `sat ${Math.round(hrs / 24)}d before the call`
}

/** A short, stable display id from the real record id. */
export function recordLabel(rec: Recommendation): string {
  return `REC · ${rec.id.slice(0, 8).toUpperCase()}`
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}
