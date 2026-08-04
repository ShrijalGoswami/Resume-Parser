import { describe, it, expect } from 'vitest'
import {
  summaryStats,
  aiReviewCount,
  groupActivity,
} from '../components/hirelens/inbox/inbox-data'
import type { AnalyticsOverview } from '../types/analytics'
import type { ActivityEvent } from '../types/campaign'

/** Minimal AnalyticsOverview with only the fields the Inbox reads. */
function overview(over: Partial<{
  active_campaigns: number
  awaiting_review_count: number
  funnel: { stage: string; count: number }[]
  review_count: number
}> = {}): AnalyticsOverview {
  return {
    overview: { active_campaigns: over.active_campaigns ?? 0 },
    ai_insights: { candidates_requiring_review_count: over.review_count ?? 0 },
    charts: { hiring_funnel: over.funnel ?? [] },
    action_center: { awaiting_review_count: over.awaiting_review_count ?? 0 },
  } as unknown as AnalyticsOverview
}

function event(id: string, at: number): ActivityEvent {
  return {
    id,
    recruiter_id: 'r1',
    type: 'stage_change',
    summary: `event ${id}`,
    payload: {},
    created_at: new Date(at).toISOString(),
  }
}

// Anchor to local midnight so the buckets are deterministic regardless of the
// wall-clock hour the suite runs at.
const now = new Date()
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

describe('summaryStats — the four navigation summaries (real fields only)', () => {
  it('maps active campaigns, awaiting review, and funnel stages', () => {
    const stats = summaryStats(
      overview({
        active_campaigns: 5,
        awaiting_review_count: 12,
        funnel: [
          { stage: 'Interview', count: 3 },
          { stage: 'Offer', count: 1 },
        ],
      }),
    )
    expect(stats.map((s) => [s.label, s.value])).toEqual([
      ['Open roles', 5],
      ['Awaiting review', 12],
      ['Interviews pending', 3],
      ['Offers outstanding', 1],
    ])
    // Every summary is a navigation link.
    expect(stats.every((s) => s.href.startsWith('/'))).toBe(true)
  })

  it('reports UNKNOWN, never zero, when the overview is unavailable', () => {
    // The failure this replaces: `/analytics/overview` is gated on
    // `advanced_analytics` (Pro), and the Inbox is where every plan lands. So
    // every Free and Plus organization opened the product to four confident
    // zeros — "Open roles 0 · Awaiting review 0" — with a full pipeline.
    //
    // Loading, error, denied and ready are four distinct states. A wrong number
    // is worse than no number, because the reader cannot tell which they got.
    const stats = summaryStats(undefined)
    expect(stats.every((s) => s.value === null)).toBe(true)
    expect(stats.some((s) => s.value === 0)).toBe(false)
  })

  it('still distinguishes a real zero from an unknown one', () => {
    // A stage absent from a funnel the server DID return is genuinely zero.
    // Only the whole response being missing means "we do not know".
    const stats = summaryStats(overview({ active_campaigns: 0, funnel: [] }))
    expect(stats.map((s) => s.value)).toEqual([0, 0, 0, 0])
  })

  it('keeps every summary a navigation link in both states', () => {
    // The tiles are links first and counters second — they stay reachable when
    // the count behind them is not.
    for (const stats of [summaryStats(undefined), summaryStats(overview())]) {
      expect(stats).toHaveLength(4)
      expect(stats.every((s) => s.href.startsWith('/'))).toBe(true)
    }
  })
})

describe('aiReviewCount', () => {
  it('reads candidates_requiring_review_count, 0 when absent', () => {
    expect(aiReviewCount(overview({ review_count: 3 }))).toBe(3)
    expect(aiReviewCount(undefined)).toBe(0)
  })
})

describe('groupActivity — Today / Yesterday / Earlier', () => {
  it('buckets by day and omits empty groups, preserving order', () => {
    const groups = groupActivity([
      event('a', startOfToday + 3600_000), // this morning → Today
      event('b', startOfToday - 3600_000), // 1h before midnight → Yesterday
      event('c', startOfToday - 6 * 86_400_000), // 6 days ago → Earlier
    ])
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(groups[0].events.map((e) => e.id)).toEqual(['a'])
  })

  it('returns no groups for an empty feed', () => {
    expect(groupActivity([])).toEqual([])
  })
})
