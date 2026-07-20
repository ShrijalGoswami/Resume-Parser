'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCampaign,
  listCandidates,
  updateCandidateStage,
  bulkDeleteCandidates,
  campaignActivity,
} from '@/services/campaigns-api'
import { compareCandidates } from '@/services/comparison-api'
import { searchTalent } from '@/services/search-api'
import { toRow, type CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

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
