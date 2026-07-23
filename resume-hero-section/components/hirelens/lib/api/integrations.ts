'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listProviders,
  listConnections,
  getHealth,
  listEvents,
  connectProvider,
  disconnectProvider,
  testProvider,
  listRules,
  createRule,
  updateRule,
  deleteRule,
} from '@/services/integration-api'
import type {
  AutomationRule,
  Connection,
  ProviderInfo,
  WorkflowStepT,
} from '@/types/integration'

/**
 * Integration Hub hooks (UX Spec §10). Wrappers over the shared integration-api;
 * connect/disconnect/rule mutations are INTEGRATION_MANAGE-gated server-side.
 */
export const integrationKeys = {
  providers: ['hl', 'settings', 'integrations', 'providers'] as const,
  connections: ['hl', 'settings', 'integrations', 'connections'] as const,
  health: ['hl', 'settings', 'integrations', 'health'] as const,
  events: ['hl', 'settings', 'integrations', 'events'] as const,
  rules: ['hl', 'settings', 'integrations', 'rules'] as const,
}

export function useProviders() {
  return useQuery<ProviderInfo[]>({
    queryKey: integrationKeys.providers,
    queryFn: listProviders,
    staleTime: 10 * 60_000,
  })
}

export function useConnections() {
  return useQuery<Connection[]>({
    queryKey: integrationKeys.connections,
    queryFn: listConnections,
  })
}

export function useIntegrationHealth() {
  return useQuery({ queryKey: integrationKeys.health, queryFn: getHealth })
}

export function useIntegrationEvents() {
  return useQuery<string[]>({
    queryKey: integrationKeys.events,
    queryFn: listEvents,
    staleTime: 10 * 60_000,
  })
}

export function useConnectProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, redirectUri }: { provider: string; redirectUri: string }) =>
      connectProvider(provider, redirectUri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.connections }),
  })
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) => disconnectProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.connections })
      queryClient.invalidateQueries({ queryKey: integrationKeys.health })
    },
  })
}

export function useTestProvider() {
  return useMutation({ mutationFn: (provider: string) => testProvider(provider) })
}

export function useAutomationRules() {
  return useQuery<AutomationRule[]>({ queryKey: integrationKeys.rules, queryFn: listRules })
}

export function useCreateRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      name,
      triggerEvent,
      steps,
    }: {
      name: string
      triggerEvent: string
      steps: WorkflowStepT[]
    }) => createRule(name, triggerEvent, steps),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.rules }),
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<AutomationRule, 'enabled' | 'name' | 'trigger_event' | 'steps'>>
    }) => updateRule(id, patch),
    // Optimistic: the enable toggle responds instantly, and only the edited rule
    // is affected (no shared "isPending" disabling every other switch).
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: integrationKeys.rules })
      const previous = queryClient.getQueryData<AutomationRule[]>(integrationKeys.rules)
      queryClient.setQueryData<AutomationRule[]>(
        integrationKeys.rules,
        (old) => old?.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)) ?? [],
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(integrationKeys.rules, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.rules }),
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.rules }),
  })
}
