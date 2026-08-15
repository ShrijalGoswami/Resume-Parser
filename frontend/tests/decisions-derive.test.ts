import { describe, it, expect } from 'vitest'
import { decisionsFrom } from '../components/hirelens/decisions/decisions-screen'
import type { ActivityEvent } from '../types/campaign'

/**
 * Decisions is a read over `activity_events`, so the whole surface is only as
 * correct as this filter. The risk it guards is a record that claims to be the
 * hiring history and quietly includes things nobody decided.
 */

function event(partial: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'e1',
    recruiter_id: 'r1',
    campaign_id: 'c1',
    candidate_id: 'p1',
    type: 'candidate_stage_changed',
    summary: 'Moved Priya to shortlisted',
    payload: { stage: 'shortlisted' },
    created_at: '2026-08-15T10:00:00Z',
    ...partial,
  }
}

describe('decisionsFrom', () => {
  it('keeps the five stages that represent a decision', () => {
    const events = ['shortlisted', 'interview', 'offer', 'hired', 'rejected'].map((stage, i) =>
      event({ id: `e${i}`, payload: { stage } }),
    )
    expect(decisionsFrom(events).map((r) => r.stage)).toEqual([
      'shortlisted',
      'interview',
      'offer',
      'hired',
      'rejected',
    ])
  })

  it('excludes arrival stages — nobody decided anything', () => {
    // A résumé landing in `sourced`, or being picked up for `screening`, is the
    // work arriving, not a call being made. Counting either would inflate the
    // record with every upload.
    const events = ['sourced', 'screening'].map((stage, i) =>
      event({ id: `e${i}`, payload: { stage } }),
    )
    expect(decisionsFrom(events)).toEqual([])
  })

  it('excludes every non-stage activity type', () => {
    const events = [
      event({ id: 'a', type: 'note_added', payload: {} }),
      event({ id: 'b', type: 'batch_analyzed', payload: {} }),
      event({ id: 'c', type: 'campaign_created', payload: {} }),
      event({ id: 'd', type: 'interview_pack_generated', payload: {} }),
    ]
    expect(decisionsFrom(events)).toEqual([])
  })

  it('does NOT confuse an AI recommendation with a hiring decision', () => {
    // The distinction this whole screen exists to hold: approving a machine's
    // suggestion is recorded in `agent_recommendations` (the AI Audit surface),
    // and must never surface here as though a candidate had been decided on.
    const events = [event({ id: 'x', type: 'copilot_message', payload: { stage: 'hired' } })]
    expect(decisionsFrom(events)).toEqual([])
  })

  it('carries the ids needed to deep-link back to the candidate', () => {
    const [row] = decisionsFrom([event({})])
    expect(row).toMatchObject({ roleId: 'c1', candidateId: 'p1', stage: 'shortlisted' })
  })

  it('survives an event with a missing or malformed payload', () => {
    // `payload` is free-form jsonb. A row without a stage must be dropped, not
    // rendered as an empty badge.
    const events = [
      event({ id: 'n1', payload: {} }),
      event({ id: 'n2', payload: { stage: null } as unknown as Record<string, unknown> }),
    ]
    expect(decisionsFrom(events)).toEqual([])
  })
})
