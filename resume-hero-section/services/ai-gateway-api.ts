/**
 * AI Gateway admin API client. Read endpoints are open to any authenticated
 * recruiter; the runtime provider switch is org-admin only (ORG_MANAGE) and
 * audited server-side. No secrets are ever returned — only provider/model
 * names, capability flags, and counters.
 */
import type { AiConfig, AiHealth, AiUsage } from '@/types/ai-gateway'
import { authHeaders, V1 } from './auth-headers'

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
