/**
 * AI Gateway admin API client. Read endpoints are open to any authenticated
 * recruiter; the runtime provider switch is org-admin only (ORG_MANAGE) and
 * audited server-side. No secrets are ever returned — only provider/model
 * names, capability flags, and counters.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AiConfig, AiHealth, AiUsage } from '@/types/ai-gateway'

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

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  }
  const res = await fetch(`${V1}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const getAiConfig = () => api<AiConfig>('/ai/config')
export const getAiUsage = () => api<AiUsage>('/ai/usage')
export const getAiHealth = () => api<AiHealth>('/ai/health')
export const switchAiProvider = (provider: string) =>
  api<AiConfig>('/ai/provider', { method: 'POST', body: JSON.stringify({ provider }) })
