'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrgContext,
  listMembers,
  getRoles,
  inviteMember,
  setMemberRole,
  removeMember,
  listWorkspaces,
  createWorkspace,
  switchWorkspace,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getFeatureFlags,
  setFeatureFlag,
  getUsage,
  getAuditLogs,
  getSubscription,
  updateSubscription,
} from '@/services/org-api'
import { updateProfile } from '@/services/campaigns-api'
import { homeKeys } from './hooks'
import type {
  ApiKey,
  AuditLog,
  OrgContext,
  OrgMember,
  Subscription,
  UsageCounter,
  Workspace,
} from '@/types/org'
import type { RecruiterProfile } from '@/types/campaign'

/**
 * Settings/organization hooks (UX Spec §10) — thin React Query wrappers over the
 * shared org-api. Every mutation is RBAC-enforced server-side; the UI only gates
 * to avoid offering a control that would 403. Mutations invalidate their list.
 */
export const settingsKeys = {
  orgContext: ['hl', 'settings', 'org-context'] as const,
  members: ['hl', 'settings', 'members'] as const,
  roles: ['hl', 'settings', 'roles'] as const,
  workspaces: ['hl', 'settings', 'workspaces'] as const,
  apiKeys: ['hl', 'settings', 'api-keys'] as const,
  featureFlags: ['hl', 'settings', 'feature-flags'] as const,
  usage: ['hl', 'settings', 'usage'] as const,
  audit: (action: string) => ['hl', 'settings', 'audit', action] as const,
  subscription: ['hl', 'settings', 'subscription'] as const,
}

// ── Bootstrap / RBAC ──────────────────────────────────────────────────────────

export function useOrgContext() {
  return useQuery<OrgContext>({ queryKey: settingsKeys.orgContext, queryFn: getOrgContext })
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<RecruiterProfile>) => updateProfile(patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(homeKeys.profile, profile)
    },
  })
}

// ── Members & roles ─────────────────────────────────────────────────────────

export function useMembers() {
  return useQuery<OrgMember[]>({ queryKey: settingsKeys.members, queryFn: listMembers })
}

export function useRoles() {
  return useQuery<Record<string, string[]>>({ queryKey: settingsKeys.roles, queryFn: getRoles })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) => inviteMember(email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.members }),
  })
}

export function useSetMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => setMemberRole(id, role),
    // Optimistic: the role select reflects the choice immediately instead of
    // snapping back to the old value while the request is in flight.
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.members })
      const previous = queryClient.getQueryData<OrgMember[]>(settingsKeys.members)
      queryClient.setQueryData<OrgMember[]>(
        settingsKeys.members,
        (old) => old?.map((member) => (member.id === id ? { ...member, role } : member)) ?? [],
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(settingsKeys.members, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.members }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.members }),
  })
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery<Workspace[]>({ queryKey: settingsKeys.workspaces, queryFn: listWorkspaces })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createWorkspace(name, description ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.workspaces }),
  })
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) => switchWorkspace(workspaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.orgContext }),
  })
}

// ── API keys ──────────────────────────────────────────────────────────────────

export function useApiKeys() {
  return useQuery<ApiKey[]>({ queryKey: settingsKeys.apiKeys, queryFn: listApiKeys })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, scope }: { name: string; scope: string }) => createApiKey(name, scope),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys }),
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys }),
  })
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export function useFeatureFlags() {
  return useQuery({ queryKey: settingsKeys.featureFlags, queryFn: getFeatureFlags })
}

type FeatureFlagsData = {
  features: string[]
  resolved: Record<string, boolean>
  overrides: Record<string, boolean>
}

export function useSetFeatureFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flag, enabled }: { flag: string; enabled: boolean }) =>
      setFeatureFlag(flag, enabled),
    // Optimistic: the switch flips instantly rather than lagging a round-trip.
    onMutate: async ({ flag, enabled }) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.featureFlags })
      const previous = queryClient.getQueryData<FeatureFlagsData>(settingsKeys.featureFlags)
      queryClient.setQueryData<FeatureFlagsData>(settingsKeys.featureFlags, (old) =>
        old
          ? {
              ...old,
              resolved: { ...old.resolved, [flag]: enabled },
              overrides: { ...old.overrides, [flag]: enabled },
            }
          : old,
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(settingsKeys.featureFlags, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.featureFlags }),
  })
}

// ── Usage & audit ─────────────────────────────────────────────────────────────

export function useOrgUsage() {
  return useQuery<{ period: string | null; metrics: UsageCounter[] }>({
    queryKey: settingsKeys.usage,
    queryFn: getUsage,
  })
}

export function useAuditLogs(action?: string) {
  return useQuery<AuditLog[]>({
    queryKey: settingsKeys.audit(action ?? 'all'),
    queryFn: () => getAuditLogs(action),
  })
}

// ── Billing / plan ────────────────────────────────────────────────────────────

export function useSubscription() {
  return useQuery<Subscription>({ queryKey: settingsKeys.subscription, queryFn: getSubscription })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plan: string) => updateSubscription(plan),
    onSuccess: (subscription) => {
      queryClient.setQueryData(settingsKeys.subscription, subscription)
      queryClient.invalidateQueries({ queryKey: settingsKeys.orgContext })
    },
  })
}
