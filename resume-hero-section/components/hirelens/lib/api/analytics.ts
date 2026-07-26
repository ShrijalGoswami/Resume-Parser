'use client'

import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview } from '@/services/campaigns-api'
import type { AnalyticsOverview } from '@/types/analytics'

/**
 * Analytics data hook — a thin React Query wrapper over the existing
 * `GET /analytics/overview` service (reused as-is per the coexistence
 * contract; the legacy `/insights` screen calls the same endpoint).
 *
 * `threshold` is the backend's "high quality" score cutoff and is part of the
 * query key so changing it refetches rather than serving a stale slice.
 */
export const analyticsKeys = {
  overview: (threshold: number) => ['hl', 'analytics', 'overview', threshold] as const,
}

export function useAnalyticsOverview(threshold = 80) {
  return useQuery<AnalyticsOverview>({
    queryKey: analyticsKeys.overview(threshold),
    queryFn: () => getAnalyticsOverview(threshold),
  })
}
