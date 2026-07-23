'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listConversations,
  createConversation,
  renameConversation,
  deleteConversation,
  listMessages,
  postMessage,
  fetchCopilotSuggestions,
} from '@/services/copilot-api'
import { listRecommendations, scanAgent } from '@/services/agent-api'
import { getTypes, simulate } from '@/services/prediction-api'
import { getMemory, retrieveMemory } from '@/services/knowledge-api'
import type {
  Conversation,
  ConversationMessagePublic,
  CopilotPageContext,
  PostMessageResponse,
  SuggestionGroup,
} from '@/types/copilot'
import type { Recommendation } from '@/types/agent'
import type { SimResult } from '@/types/prediction'
import type { MemoryHit, MemoryItem } from '@/types/knowledge'

/**
 * Ask data hooks (UX Spec §9). Thin React Query wrappers over the shared
 * @/services/* clients (reused as-is per the coexistence contract). The
 * persisted Recruiter Copilot is the routing engine: one message endpoint that
 * fans out to the agent, prediction, and grounded-knowledge engines and returns
 * a single structured answer. Agent-backlog hooks live in `hooks.ts` and are
 * reused so the sidebar badge, this backlog, and Home stay one shared cache.
 */
export const askKeys = {
  conversations: ['hl', 'ask', 'conversations'] as const,
  messages: (id: string) => ['hl', 'ask', 'messages', id] as const,
  suggestions: ['hl', 'ask', 'suggestions'] as const,
  recommendations: (status: string) => ['hl', 'ask', 'recommendations', status] as const,
  predictionTypes: ['hl', 'ask', 'prediction-types'] as const,
  memory: (kind: string) => ['hl', 'ask', 'memory', kind] as const,
}

// ── Threads (persisted conversations) ────────────────────────────────────────

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: askKeys.conversations,
    queryFn: listConversations,
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery<ConversationMessagePublic[]>({
    queryKey: askKeys.messages(conversationId ?? ''),
    queryFn: () => listMessages(conversationId as string),
    enabled: Boolean(conversationId),
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ context, title }: { context: CopilotPageContext; title?: string }) =>
      createConversation(context, title ?? 'New conversation'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: askKeys.conversations }),
  })
}

/**
 * Post a message and let the copilot route it. On success the confirmed turns
 * are appended to the messages cache directly (no refetch flicker while the
 * thread stays open), and the conversation list refreshes to pick up an
 * auto-generated title.
 */
export function usePostMessage() {
  const queryClient = useQueryClient()
  return useMutation<
    PostMessageResponse,
    Error,
    { id: string; message: string; context: CopilotPageContext }
  >({
    mutationFn: ({ id, message, context }) => postMessage(id, message, context),
    onSuccess: async (response) => {
      // Cancel any in-flight messages fetch (a brand-new thread fires one the
      // moment it is selected) so it can't clobber the confirmed turns we write
      // below. Dedupe by id in case a refetch already landed them.
      await queryClient.cancelQueries({ queryKey: askKeys.messages(response.conversation_id) })
      queryClient.setQueryData<ConversationMessagePublic[]>(
        askKeys.messages(response.conversation_id),
        (old) => {
          const base = old ?? []
          const seen = new Set(base.map((message) => message.id))
          const additions = [response.user_message, response.assistant_message].filter(
            (message) => !seen.has(message.id),
          )
          return [...base, ...additions]
        },
      )
      queryClient.invalidateQueries({ queryKey: askKeys.conversations })
    },
  })
}

export function useRenameConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: askKeys.conversations }),
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: askKeys.conversations }),
  })
}

export function useAskSuggestions() {
  return useQuery<SuggestionGroup[]>({
    queryKey: askKeys.suggestions,
    queryFn: fetchCopilotSuggestions,
    staleTime: 10 * 60_000,
  })
}

// ── Agent backlog (audit view) ───────────────────────────────────────────────

/** The whole picture — every recommendation across statuses (audit/history). */
export function useAllRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: askKeys.recommendations('all'),
    queryFn: () => listRecommendations(),
  })
}

/** Run the agent to refresh the backlog. Invalidates both the pending queue
 *  (shared with Home + the sidebar badge) and this view's full list. */
export function useAgentScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => scanAgent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hl', 'recommendations', 'pending'] })
      queryClient.invalidateQueries({ queryKey: askKeys.recommendations('all') })
    },
  })
}

// ── What-if simulator (deterministic prediction engine) ──────────────────────

export function usePredictionTypes() {
  return useQuery({
    queryKey: askKeys.predictionTypes,
    queryFn: getTypes,
    staleTime: 10 * 60_000,
  })
}

export function useSimulate() {
  return useMutation<
    SimResult,
    Error,
    { forecastType: string; levers: Record<string, number>; params?: Record<string, unknown> }
  >({
    mutationFn: ({ forecastType, levers, params }) => simulate(forecastType, levers, params ?? {}),
  })
}

// ── Org brain (knowledge explorer) ───────────────────────────────────────────

export function useMemoryList(kind?: string) {
  return useQuery<MemoryItem[]>({
    queryKey: askKeys.memory(kind ?? 'all'),
    queryFn: () => getMemory(kind),
  })
}

export function useRetrieveMemory() {
  return useMutation<MemoryHit[], Error, string>({
    mutationFn: (query: string) => retrieveMemory(query),
  })
}
