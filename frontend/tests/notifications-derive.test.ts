import { describe, it, expect } from 'vitest'
import { deriveNotifications } from '../components/hirelens/notifications/derive'
import type { Recommendation } from '../types/agent'
import type { ActivityEvent } from '../types/campaign'

function rec(over: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'r1',
    workflow: 'scan',
    dedupe_key: 'k',
    category: 'action',
    severity: 'high',
    confidence: 0.8,
    title: 'Review Ada Lovelace',
    why: 'Strong match sitting idle',
    evidence: [],
    data_sources: [],
    tools_used: [],
    recommended_action: 'review',
    suggested_tool: '',
    tool_params: {},
    campaign_id: 'camp1',
    campaign_title: 'Backend Engineer',
    candidate_id: 'cand1',
    candidate_name: 'Ada Lovelace',
    status: 'pending',
    created_at: '2026-07-20T10:00:00Z',
    updated_at: null,
    decided_at: null,
    decided_by: null,
    ...over,
  } as Recommendation
}

function event(over: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'e1',
    recruiter_id: 'rec1',
    campaign_id: 'camp1',
    candidate_id: null,
    type: 'candidate.uploaded',
    summary: '3 resumes uploaded',
    payload: {},
    created_at: '2026-07-21T10:00:00Z',
    ...over,
  }
}

describe('deriveNotifications', () => {
  it('projects recommendations and activity into one feed', () => {
    const items = deriveNotifications({ recommendations: [rec()], activity: [event()] })
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.kind)).toContain('recommendation')
    expect(items.map((i) => i.kind)).toContain('activity')
  })

  it('namespaces ids so the two sources can never collide', () => {
    const items = deriveNotifications({
      recommendations: [rec({ id: 'same' })],
      activity: [event({ id: 'same' })],
    })
    expect(new Set(items.map((i) => i.id)).size).toBe(2)
    expect(items.map((i) => i.id).sort()).toEqual(['act:same', 'rec:same'])
  })

  it('orders newest first', () => {
    const items = deriveNotifications({
      recommendations: [rec({ id: 'old', created_at: '2026-07-01T00:00:00Z' })],
      activity: [event({ id: 'new', created_at: '2026-07-25T00:00:00Z' })],
    })
    expect(items[0].id).toBe('act:new')
  })

  it('sinks undated records instead of sorting them as epoch zero', () => {
    const items = deriveNotifications({
      recommendations: [
        rec({ id: 'undated', created_at: null }),
        rec({ id: 'dated', created_at: '2026-07-01T00:00:00Z' }),
      ],
    })
    expect(items[items.length - 1].id).toBe('rec:undated')
  })

  it('links a recommendation to the candidate when both ids are present', () => {
    const [item] = deriveNotifications({ recommendations: [rec()] })
    expect(item.href).toBe('/roles/camp1/candidates/cand1')
  })

  it('falls back to the role when there is no candidate', () => {
    const [item] = deriveNotifications({ recommendations: [rec({ candidate_id: null })] })
    expect(item.href).toBe('/roles/camp1')
  })

  it('normalizes an unrecognized severity rather than passing it through', () => {
    const [item] = deriveNotifications({ recommendations: [rec({ severity: 'bogus' })] })
    expect(item.severity).toBe('medium')
  })

  it('preserves a recognized severity regardless of case', () => {
    const [item] = deriveNotifications({ recommendations: [rec({ severity: 'URGENT' })] })
    expect(item.severity).toBe('urgent')
  })

  it('returns an empty feed for empty input — it never invents notifications', () => {
    expect(deriveNotifications({})).toEqual([])
  })
})
