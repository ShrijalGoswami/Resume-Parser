'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getCampaign,
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCandidates,
  updateCandidateStage,
  bulkDeleteCandidates,
  campaignActivity,
} from '@/services/campaigns-api'
import { compareCandidates } from '@/services/comparison-api'
import { searchTalent } from '@/services/search-api'
import { toRow, type CandidateRow } from '@/lib/candidate'
import type {
  PipelineStage,
  Campaign,
  CampaignCreateInput,
  CampaignUpdateInput,
} from '@/types/campaign'

/**
 * Role Workspace data hooks — React Query over the shared @/services/* (reused
 * as-is). Candidates are normalized through lib/candidate `toRow` (the canonical
 * reader for latest_analysis). Auth is the shared Supabase session.
 */
export const roleKeys = {
  campaign: (id: string) => ['hl', 'role', id, 'campaign'] as const,
  candidates: (id: string) => ['hl', 'role', id, 'candidates'] as const,
  activity: (id: string) => ['hl', 'role', id, 'activity'] as const,
}

export function useCampaign(roleId: string) {
  return useQuery({ queryKey: roleKeys.campaign(roleId), queryFn: () => getCampaign(roleId) })
}

export function useCandidates(roleId: string) {
  return useQuery({
    queryKey: roleKeys.candidates(roleId),
    queryFn: async (): Promise<CandidateRow[]> => (await listCandidates(roleId)).map(toRow),
  })
}

export function useCampaignActivity(roleId: string) {
  return useQuery({ queryKey: roleKeys.activity(roleId), queryFn: () => campaignActivity(roleId) })
}

/** Move a candidate to a stage — optimistic, with rollback. */
export function useUpdateStage(roleId: string) {
  const queryClient = useQueryClient()
  const key = roleKeys.candidates(roleId)
  return useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: string; stage: PipelineStage }) =>
      updateCandidateStage(roleId, candidateId, stage),
    onMutate: async ({ candidateId, stage }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CandidateRow[]>(key)
      queryClient.setQueryData<CandidateRow[]>(
        key,
        (old) =>
          old?.map((row) =>
            row.id === candidateId ? { ...row, raw: { ...row.raw, stage } } : row,
          ) ?? [],
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useBulkDeleteCandidates(roleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (candidateIds: string[]) => bulkDeleteCandidates(roleId, candidateIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.candidates(roleId) }),
  })
}

export function useCompareCandidates(roleId: string) {
  return useMutation({
    mutationFn: (candidateIds: string[]) => compareCandidates(roleId, candidateIds),
  })
}

export function useSearchIntoRole(roleId: string) {
  return useMutation({
    mutationFn: (query: string) => searchTalent(query, { campaignId: roleId }),
  })
}

// ── Role lifecycle (create / edit / delete) ──────────────────────────────────
// The Role Workspace is the single source of truth. Every role mutation must
// refresh the roles list, Home's active roles, the workspace detail, and its
// candidates — a stale detail is what would keep the JD upload-gate locked.

/** Role LIST key. Shares the `['hl','campaigns']` prefix with Home's useActiveRoles. */
export const roleListKey = (status?: string) => ['hl', 'campaigns', status ?? 'all'] as const

/** The exact set of queries a role mutation must invalidate. Pure — unit-tested. */
export function roleInvalidationKeys(roleId?: string): unknown[][] {
  const keys: unknown[][] = [['hl', 'campaigns']] // all role lists + Home active roles (prefix)
  if (roleId) {
    keys.push([...roleKeys.campaign(roleId)])
    keys.push([...roleKeys.candidates(roleId)])
  }
  return keys
}

export function invalidateRoleQueries(queryClient: QueryClient, roleId?: string): void {
  for (const queryKey of roleInvalidationKeys(roleId)) {
    queryClient.invalidateQueries({ queryKey })
  }
}

// Mutation configs — extracted (pure) so the create/update/delete + invalidation
// logic is unit-testable without React (tests/role-mutations.test.ts).
export function createRoleMutation(queryClient: QueryClient) {
  return {
    mutationFn: (input: CampaignCreateInput) => createCampaign(input),
    onSuccess: (campaign: Campaign) => invalidateRoleQueries(queryClient, campaign.id),
  }
}

export function updateRoleMutation(queryClient: QueryClient, roleId: string) {
  return {
    mutationFn: (patch: CampaignUpdateInput) => updateCampaign(roleId, patch),
    onSuccess: () => invalidateRoleQueries(queryClient, roleId),
  }
}

export function deleteRoleMutation(queryClient: QueryClient) {
  return {
    mutationFn: (roleId: string) => deleteCampaign(roleId),
    onSuccess: (_data: void, roleId: string) => invalidateRoleQueries(queryClient, roleId),
  }
}

/** All roles for the /roles list (optionally filtered by status). */
export function useRoles(status?: string) {
  return useQuery({ queryKey: roleListKey(status), queryFn: () => listCampaigns(status) })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation(createRoleMutation(queryClient))
}

export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient()
  return useMutation(updateRoleMutation(queryClient, roleId))
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation(deleteRoleMutation(queryClient))
}
