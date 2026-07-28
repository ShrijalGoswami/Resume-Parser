import { describe, it, expect } from 'vitest'
import { detectPageContext } from '../lib/copilot-context'

/**
 * The copilot's grounding context is derived from the route. This mapping was
 * written against the V1 `/campaigns/**` paths and never updated when those
 * surfaces became `/roles/**`, so after the migration nothing produced a
 * `candidate` or `campaign` context: the backend could ground an answer on a
 * specific record, but no route in the product ever asked it to.
 *
 * These pin both shapes so the V4 paths cannot silently stop grounding again.
 */
describe('detectPageContext — V4 routes', () => {
  it('grounds on a candidate under a role', () => {
    expect(detectPageContext('/roles/role-1/candidates/cand-2')).toEqual({
      type: 'candidate',
      campaign_id: 'role-1',
      candidate_id: 'cand-2',
    })
  })

  it('grounds on the role itself', () => {
    expect(detectPageContext('/roles/role-1')).toEqual({
      type: 'campaign',
      campaign_id: 'role-1',
    })
  })

  it('grounds a role sub-lens on the role', () => {
    expect(detectPageContext('/roles/role-1/decisions/dec-9')).toEqual({
      type: 'campaign',
      campaign_id: 'role-1',
    })
  })

  it('maps the V4 landing and analytics surfaces', () => {
    expect(detectPageContext('/home')).toEqual({ type: 'dashboard' })
    expect(detectPageContext('/analytics')).toEqual({ type: 'analytics' })
  })

  it('falls back to global off a grounded record', () => {
    expect(detectPageContext('/ask')).toEqual({ type: 'global' })
    expect(detectPageContext('/talent')).toEqual({ type: 'global' })
    expect(detectPageContext('/roles')).toEqual({ type: 'global' })
  })
})

describe('detectPageContext — retired legacy path shapes', () => {
  // The /campaigns/** shapes are still matched. Those URLs redirect to /roles/**
  // in next.config rather than 404ing, and the detector runs on the pathname the
  // client sees, so dropping these patterns would silently un-ground a bookmarked
  // link during the redirect hop.
  it('keeps the redirected campaign shapes working', () => {
    expect(detectPageContext('/campaigns/c-1/candidates/x-2')).toEqual({
      type: 'candidate',
      campaign_id: 'c-1',
      candidate_id: 'x-2',
    })
    expect(detectPageContext('/campaigns/c-1')).toEqual({
      type: 'campaign',
      campaign_id: 'c-1',
    })
    expect(detectPageContext('/dashboard')).toEqual({ type: 'dashboard' })
  })

  it('does not treat /campaigns/new as a campaign', () => {
    expect(detectPageContext('/campaigns/new')).toEqual({ type: 'global' })
  })

  it('treats the removed Classic routes as ungrounded', () => {
    // /insights used to map to `analytics`. The page is gone and there is no
    // redirect, so the route can only be a 404 — it must not claim a context.
    for (const route of ['/insights', '/reports', '/agent', '/knowledge', '/predictions']) {
      expect(detectPageContext(route)).toEqual({ type: 'global' })
    }
  })
})
