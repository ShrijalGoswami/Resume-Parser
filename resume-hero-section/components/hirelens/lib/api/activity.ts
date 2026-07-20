import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ApiError } from '@/lib/api-error'
import type { ActivityEvent } from '@/types/campaign'

/**
 * Client wrapper for the existing global recruiter activity feed
 * (`GET /api/v1/activity`, backend account.py). The endpoint exists; only the
 * client function was missing. Same Supabase-Bearer auth as the shared services.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const V1 = `${API_BASE_URL}/api/v1`

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function getActivity(limit = 20): Promise<ActivityEvent[]> {
  const res = await fetch(`${V1}/activity?limit=${limit}`, { headers: await authHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<ActivityEvent[]>
}
