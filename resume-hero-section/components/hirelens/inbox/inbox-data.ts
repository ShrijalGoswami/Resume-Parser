'use client'

import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview } from '@/services/campaigns-api'
import type { AnalyticsOverview } from '@/types/analytics'
import type { ActivityEvent } from '@/types/campaign'

/**
 * Inbox data — real sources only, no fabricated metrics.
 *   Executive summary  ← AnalyticsOverview (active_campaigns, awaiting_review, funnel)
 *   Priority queue      ← pending agent recommendations (lib/api/hooks)
 *   Activity feed       ← global activity (lib/api/hooks useRecentActivity)
 * Derivations here are pure so screens can memoize them.
 */
export const inboxKeys = {
  analytics: ['hl', 'inbox', 'analytics'] as const,
}

export function useInboxAnalytics() {
  return useQuery<AnalyticsOverview>({
    queryKey: inboxKeys.analytics,
    queryFn: () => getAnalyticsOverview(),
    staleTime: 60_000,
  })
}

export interface SummaryStat {
  label: string
  value: number
  href: string
}

/** The four navigation summaries (not analytics). */
export function summaryStats(a: AnalyticsOverview | undefined): SummaryStat[] {
  const funnel = a?.charts.hiring_funnel ?? []
  const stage = (s: string) => funnel.find((f) => f.stage.toLowerCase().includes(s))?.count ?? 0
  return [
    { label: 'Open roles', value: a?.overview.active_campaigns ?? 0, href: '/roles' },
    { label: 'Awaiting review', value: a?.action_center.awaiting_review_count ?? 0, href: '/roles' },
    { label: 'Interviews pending', value: stage('interview'), href: '/roles' },
    { label: 'Offers outstanding', value: stage('offer'), href: '/roles' },
  ]
}

/** Candidates the AI flags for immediate review (drives the single AI line). */
export function aiReviewCount(a: AnalyticsOverview | undefined): number {
  return a?.ai_insights.candidates_requiring_review_count ?? 0
}

export interface ActivityGroup {
  label: string
  events: ActivityEvent[]
}

function dayBucket(iso: string | undefined): 'today' | 'yesterday' | 'earlier' {
  if (!iso) return 'earlier'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'earlier'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfToday - 86_400_000) return 'yesterday'
  return 'earlier'
}

/** Group the feed into Today / Yesterday / Earlier (empty groups omitted). */
export function groupActivity(events: ActivityEvent[]): ActivityGroup[] {
  const buckets: Record<'today' | 'yesterday' | 'earlier', ActivityEvent[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }
  for (const e of events) buckets[dayBucket(e.created_at)].push(e)
  const order: Array<['today' | 'yesterday' | 'earlier', string]> = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['earlier', 'Earlier'],
  ]
  return order.filter(([k]) => buckets[k].length > 0).map(([k, label]) => ({ label, events: buckets[k] }))
}
