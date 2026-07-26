import { ApiError } from '@/lib/api-error'
import type { ActivityEvent } from '@/types/campaign'
import { authHeaders, V1 } from '@/services/auth-headers'

/**
 * Client wrapper for the existing global recruiter activity feed
 * (`GET /api/v1/activity`, backend account.py). The endpoint exists; only the
 * client function was missing. Same Supabase-Bearer auth as the shared services.
 */

export async function getActivity(limit = 20): Promise<ActivityEvent[]> {
  const res = await fetch(`${V1}/activity?limit=${limit}`, { headers: await authHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<ActivityEvent[]>
}
