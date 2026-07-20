'use client'

import { useQuery } from '@tanstack/react-query'
import { searchTalent, searchSimilar } from '@/services/search-api'
import type { SearchFilters, TalentSearchResponse } from '@/types/search'

/**
 * Talent search hooks (reusing search-api). Results are always live from
 * `/search/talent`; only query/filter metadata is persisted client-side.
 */
export interface TalentSearchParams {
  query: string
  filters: SearchFilters
  campaignId?: string | null
  limit?: number
}

export function useTalentSearch(params: TalentSearchParams, enabled: boolean) {
  return useQuery<TalentSearchResponse>({
    queryKey: [
      'hl',
      'talent',
      'search',
      params.query,
      params.filters,
      params.campaignId ?? null,
      params.limit ?? 24,
    ],
    queryFn: () =>
      searchTalent(params.query, {
        campaignId: params.campaignId ?? null,
        limit: params.limit ?? 24,
        filters: params.filters,
      }),
    enabled: enabled && params.query.trim().length > 0,
    staleTime: 2 * 60_000,
  })
}

export interface SimilarSeed {
  candidateId: string
  campaignId?: string | null
  name: string
}

export function useSimilarCandidates(seed: SimilarSeed | null) {
  return useQuery<TalentSearchResponse>({
    queryKey: ['hl', 'talent', 'similar', seed?.candidateId ?? null, seed?.campaignId ?? null],
    queryFn: () => searchSimilar(seed!.candidateId, { campaignId: seed?.campaignId ?? null }),
    enabled: Boolean(seed),
    staleTime: 2 * 60_000,
  })
}
