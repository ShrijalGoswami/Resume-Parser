import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import type { Campaign } from '@/types/campaign'

// Mock the service layer (hoisted so the vi.mock factory can reference the spies).
const { createCampaign, updateCampaign, deleteCampaign } = vi.hoisted(() => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}))

vi.mock('@/services/campaigns-api', () => ({
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // other named exports workspace.ts imports at module load (never called here):
  getCampaign: vi.fn(),
  listCampaigns: vi.fn(),
  listCandidates: vi.fn(),
  updateCandidateStage: vi.fn(),
  bulkDeleteCandidates: vi.fn(),
  campaignActivity: vi.fn(),
}))

import {
  roleInvalidationKeys,
  invalidateRoleQueries,
  createRoleMutation,
  updateRoleMutation,
  deleteRoleMutation,
} from '../components/hirelens/lib/api/workspace'

const fakeQueryClient = () => ({ invalidateQueries: vi.fn() }) as unknown as QueryClient
const asCampaign = (partial: Partial<Campaign>) => partial as Campaign

beforeEach(() => {
  createCampaign.mockReset()
  updateCampaign.mockReset()
  deleteCampaign.mockReset()
})

describe('roleInvalidationKeys — single source of truth for what refreshes', () => {
  it('invalidates the shared campaigns list prefix with no role id', () => {
    expect(roleInvalidationKeys()).toEqual([['hl', 'campaigns']])
  })

  it('adds workspace detail + candidates when a role id is given (JD gate never stale)', () => {
    expect(roleInvalidationKeys('r1')).toEqual([
      ['hl', 'campaigns'],
      ['hl', 'role', 'r1', 'campaign'],
      ['hl', 'role', 'r1', 'candidates'],
    ])
  })
})

describe('invalidateRoleQueries', () => {
  it('invalidates every key: roles list (+ home active roles), detail, candidates', () => {
    const qc = fakeQueryClient()
    invalidateRoleQueries(qc, 'r1')
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3)
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'campaigns'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'role', 'r1', 'campaign'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['hl', 'role', 'r1', 'candidates'],
    })
  })
})

describe('createRoleMutation', () => {
  it('creates via the service and invalidates on success', async () => {
    const qc = fakeQueryClient()
    createCampaign.mockResolvedValue({ id: 'r1', title: 'Backend Eng' })
    const m = createRoleMutation(qc)

    const created = await m.mutationFn({ title: 'Backend Eng' })
    expect(createCampaign).toHaveBeenCalledWith({ title: 'Backend Eng' })

    m.onSuccess(asCampaign(created))
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'campaigns'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'role', 'r1', 'campaign'] })
  })
})

describe('updateRoleMutation', () => {
  it('patches via the service and invalidates the role on success', async () => {
    const qc = fakeQueryClient()
    updateCampaign.mockResolvedValue({ id: 'r1' })
    const m = updateRoleMutation(qc, 'r1')

    await m.mutationFn({ job_description: 'new JD' })
    expect(updateCampaign).toHaveBeenCalledWith('r1', { job_description: 'new JD' })

    m.onSuccess()
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'role', 'r1', 'campaign'] })
  })

  it('archive is an update with status "archived"', async () => {
    const qc = fakeQueryClient()
    updateCampaign.mockResolvedValue({ id: 'r1' })
    const m = updateRoleMutation(qc, 'r1')

    await m.mutationFn({ status: 'archived' })
    expect(updateCampaign).toHaveBeenCalledWith('r1', { status: 'archived' })
  })
})

describe('deleteRoleMutation', () => {
  it('deletes via the service and invalidates the role on success', async () => {
    const qc = fakeQueryClient()
    deleteCampaign.mockResolvedValue(undefined)
    const m = deleteRoleMutation(qc)

    await m.mutationFn('r1')
    expect(deleteCampaign).toHaveBeenCalledWith('r1')

    m.onSuccess(undefined, 'r1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['hl', 'role', 'r1', 'campaign'] })
  })
})
