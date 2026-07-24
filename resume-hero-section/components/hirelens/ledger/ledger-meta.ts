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
 * The decision timestamp — the immutable `decided_at` stamped at decision time
 * (A2), falling back to `updated_at`/`created_at` only for legacy rows.
 */
export function decidedAt(rec: Recommendation): string | null {
  return rec.decided_at ?? rec.updated_at ?? rec.created_at ?? null
}

/** Most-recent decision first (by immutable decision time). */
export function sortLedger(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => (decidedAt(b) ?? '').localeCompare(decidedAt(a) ?? ''))
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

/** Real decision latency from created → decided, or null if unavailable. */
export function decisionLatency(rec: Recommendation): string | null {
  const decided = decidedAt(rec)
  if (!rec.created_at || !decided) return null
  const ms = new Date(decided).getTime() - new Date(rec.created_at).getTime()
  if (!(ms > 0)) return null
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'under a minute to decide'
  if (mins < 60) return `${mins} min to decide`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h to decide`
  return `${Math.round(hrs / 24)}d to decide`
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
