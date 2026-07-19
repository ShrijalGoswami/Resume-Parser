"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getOrgContext, listWorkspaces, switchWorkspace } from "@/services/org-api"
import type { OrgContext, Workspace } from "@/types/org"

interface OrgContextValue {
  context: OrgContext | null
  workspaces: Workspace[]
  loading: boolean
  refresh: () => Promise<void>
  hasPermission: (perm: string) => boolean
  hasFeature: (feature: string) => boolean
  switchTo: (workspaceId: string) => Promise<void>
}

const Ctx = createContext<OrgContextValue | null>(null)

export function useOrg(): OrgContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useOrg must be used within OrgProvider")
  return ctx
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, configured } = useAuth()
  const [context, setContext] = useState<OrgContext | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !configured) return
    setLoading(true)
    try {
      const [ctx, ws] = await Promise.all([getOrgContext(), listWorkspaces().catch(() => [])])
      setContext(ctx)
      setWorkspaces(ws)
    } catch {
      setContext(null)
    } finally {
      setLoading(false)
    }
  }, [user, configured])

  useEffect(() => { void refresh() }, [refresh])

  const switchTo = useCallback(async (workspaceId: string) => {
    await switchWorkspace(workspaceId)
    setContext((prev) => (prev ? { ...prev, workspace_id: workspaceId } : prev))
  }, [])

  const value = useMemo<OrgContextValue>(() => ({
    context, workspaces, loading, refresh,
    hasPermission: (perm) => !!context?.permissions.includes(perm),
    hasFeature: (feature) => !!context?.features[feature],
    switchTo,
  }), [context, workspaces, loading, refresh, switchTo])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
