/**
 * AI Gateway diagnostics API client. Read-only: there is no runtime provider
 * switch, because V1 is Groq-only by product decision and there is nothing to
 * switch to. The provider is a deployment setting, validated at boot.
 *
 * No secrets are ever returned — only provider/model names, capability flags,
 * and counters.
 */
import type { AiConfig, AiHealth, AiUsage } from '@/types/ai-gateway'
import { authHeaders, V1 } from './auth-headers'
import { apiErrorFrom } from '@/lib/api-error';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  }
  const res = await fetch(`${V1}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<T>
}

export const getAiConfig = () => api<AiConfig>('/ai/config')
export const getAiUsage = () => api<AiUsage>('/ai/usage')
export const getAiHealth = () => api<AiHealth>('/ai/health')
