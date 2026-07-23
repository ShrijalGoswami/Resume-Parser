// Types mirroring the AI Gateway admin surface (app/routes/admin.py, app/ai/gateway/*).
// No secrets are ever present — only provider/model names and counters.

export interface AiRoleSelection {
  provider: string
  model: string
}

export interface AiProviderSpec {
  name: string
  display_name: string
  capabilities: string[]
  context_window: number
  max_output_tokens: number
  key_configured: boolean
  health: string
}

export interface AiHealthEntry {
  state: string // healthy | rate_limited | temporary_failure | unavailable | disabled
  reason: string
  cooldown_remaining_s: number
  consecutive_failures?: number
  last_error?: string
}

export interface AiConfig {
  active_provider: string
  override_active: boolean
  fallback_enabled: boolean
  fallback_chain: string[]
  disabled_providers: string[]
  roles: Record<string, AiRoleSelection>
  embeddings: { provider: string; model: string; dimensions: number }
  providers: AiProviderSpec[]
  provider_health: Record<string, AiHealthEntry>
}

export interface AiUsageCounter {
  requests?: number
  provider_calls?: number
  retries?: number
  prompt_tokens?: number
  completion_tokens?: number
  estimated_cost_usd?: number
  success_rate?: number
  [key: string]: number | undefined
}

export interface AiUsage {
  total_requests: number
  total_provider_calls: number
  total_retries: number
  total_fallbacks: number
  recent_fallbacks: unknown[]
  total_tokens: number
  total_estimated_cost_usd: number
  by_capability: Record<string, AiUsageCounter>
  by_model: Record<string, AiUsageCounter>
  by_provider: Record<string, AiUsageCounter>
  provider_health: Record<string, unknown>
  qa: Record<string, number>
}

export interface AiHealth {
  providers: Record<string, AiHealthEntry>
  fallbacks: { total: number; recent: unknown[] }
}
