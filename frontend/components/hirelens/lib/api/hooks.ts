'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listRecommendations, updateRecommendation, scanAgent } from '@/services/agent-api'
import { listCampaigns, getProfile } from '@/services/campaigns-api'
import { getForecasts } from '@/services/prediction-api'
import type { ApprovalStatus, Recommendation } from '@/types/agent'
import type { Campaign, RecruiterProfile, ActivityEvent } from '@/types/campaign'
import type { Forecast } from '@/types/prediction'
import { getActivity } from './activity'

/**
 * V3 Home data hooks — thin React Query wrappers over the shared @/services/*
 * (reused as-is per the coexistence contract). Auth is the shared Supabase
 * session; a 403 feature-gate surfaces as an error the UI maps to a gate state.
 */
export const homeKeys = {
  profile: ['hl', 'profile'] as const,
  recommendations: (status: string) => ['hl', 'recommendations', status] as const,
  campaigns: (status: string) => ['hl', 'campaigns', status] as const,
  forecasts: ['hl', 'forecasts'] as const,
  activity: (limit: number) => ['hl', 'activity', limit] as const,
}

export function useProfile() {
  return useQuery<RecruiterProfile>({ queryKey: homeKeys.profile, queryFn: getProfile })
}

export function usePendingRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: homeKeys.recommendations('pending'),
    queryFn: () => listRecommendations('pending'),
  })
}

export function useActiveRoles() {
  return useQuery<Campaign[]>({
    queryKey: homeKeys.campaigns('active'),
    queryFn: () => listCampaigns('active'),
  })
}

export function useForecasts() {
  return useQuery<Forecast[]>({ queryKey: homeKeys.forecasts, queryFn: getForecasts })
}

export function useRecentActivity(limit = 20) {
  return useQuery<ActivityEvent[]>({
    queryKey: homeKeys.activity(limit),
    queryFn: () => getActivity(limit),
  })
}

/** Approve / dismiss (and undo) a recommendation — optimistic, with rollback. */
export function useUpdateRecommendation() {
  const queryClient = useQueryClient()
  const key = homeKeys.recommendations('pending')

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApprovalStatus }) =>
      updateRecommendation(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Recommendation[]>(key)
      if (status !== 'pending') {
        queryClient.setQueryData<Recommendation[]>(
          key,
          (old) => old?.filter((item) => item.id !== id) ?? [],
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Run the agent to produce a fresh Morning Brief — user-initiated only. */
export function useGenerateBrief() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: scanAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.recommendations('pending') })
    },
  })
}
