import type { Recommendation } from '@/types/agent'

/**
 * Decision Inbox mapping helpers (Stitch "Decision Inbox — The Briefing"). Turn
 * the real recommendation queue into the Briefing's tiers, focus-scale signals,
 * and destinations — no fabricated fields.
 */
export type Tier = 'now' | 'today'

/** urgent/high demand attention now; medium/low are today's work. */
export function tierFor(severity: string): Tier {
  return severity === 'urgent' || severity === 'high' ? 'now' : 'today'
}

const SEVERITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export function severityRank(severity: string): number {
  return SEVERITY_ORDER[severity] ?? 4
}

/** Highest-severity first, then most recent — the Briefing's reading order. */
export function sortDecisions(items: Recommendation[]): Recommendation[] {
  return [...items].sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity)
    if (bySeverity !== 0) return bySeverity
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

/** Focus-scale dot color for a decision's severity (number+label+color, never color alone). */
export function severityDotClass(severity: string): string {
  switch (severity) {
    case 'urgent':
      return 'bg-hl-score-outfocus'
    case 'high':
      return 'bg-hl-score-soft'
    case 'medium':
      return 'bg-hl-score-legible'
    default:
      return 'bg-hl-score-sharp'
  }
}

/**
 * Where "Open decision" leads — the Decision Intelligence memo (Approve/Override
 * the AI recommendation). The memo links onward to the candidate Dossier for the
 * full read. Inbox decides on the AI; the Dossier evaluates the human.
 */
export function decisionHref(rec: Recommendation): string {
  if (rec.campaign_id) return `/roles/${rec.campaign_id}/decisions/${rec.id}`
  return '/home'
}

/** Compact relative age from an ISO timestamp: "just now", "12m", "3h", "2d". */
export function relativeAge(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}

/** New if created within the last 24h (drives the "new" signal, from real data). */
export function isRecent(iso: string | null): boolean {
  if (!iso) return false
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return false
  return Date.now() - then < 24 * 60 * 60 * 1000
}
