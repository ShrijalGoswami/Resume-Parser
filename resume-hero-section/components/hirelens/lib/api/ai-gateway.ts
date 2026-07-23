'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAiConfig, getAiUsage, getAiHealth, switchAiProvider } from '@/services/ai-gateway-api'
import type { AiConfig, AiHealth, AiUsage } from '@/types/ai-gateway'

/**
 * AI Gateway hooks (UX Spec §10). Config/usage/health are read-only snapshots;
 * the provider switch is org-admin only and audited server-side. Health/usage
 * are in-memory + process-local on the backend, so they refresh on an interval.
 */
export const aiGatewayKeys = {
  config: ['hl', 'settings', 'ai', 'config'] as const,
  usage: ['hl', 'settings', 'ai', 'usage'] as const,
  health: ['hl', 'settings', 'ai', 'health'] as const,
}

export function useAiConfig() {
  return useQuery<AiConfig>({ queryKey: aiGatewayKeys.config, queryFn: getAiConfig })
}

export function useAiUsage() {
  return useQuery<AiUsage>({
    queryKey: aiGatewayKeys.usage,
    queryFn: getAiUsage,
    refetchInterval: 30_000,
  })
}

export function useAiHealth() {
  return useQuery<AiHealth>({
    queryKey: aiGatewayKeys.health,
    queryFn: getAiHealth,
    refetchInterval: 30_000,
  })
}

export function useSwitchProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) => switchAiProvider(provider),
    onSuccess: (config) => {
      queryClient.setQueryData(aiGatewayKeys.config, config)
      queryClient.invalidateQueries({ queryKey: aiGatewayKeys.health })
    },
  })
}
