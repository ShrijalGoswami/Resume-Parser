'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

export interface SessionState {
  session: Session | null
  loading: boolean
  configured: boolean
}

/**
 * Reads the shared Supabase session (established via /auth/*, same origin). Authed
 * surfaces gate on this before fetching, so an unauthenticated visitor gets a
 * sign-in prompt instead of a wall of errors. Read-only — ending the session is
 * `useLogout` (the authentication layer owns the logout workflow, not the UI).
 */
export function useSession(): SessionState {
  const configured = isSupabaseConfigured()
  const [state, setState] = React.useState<{ session: Session | null; loading: boolean }>({
    session: null,
    loading: configured,
  })

  React.useEffect(() => {
    if (!configured) return
    const supabase = getSupabaseBrowserClient()
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, loading: false })
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [configured])

  return { ...state, configured }
}

/**
 * The single V4 logout workflow. The authentication layer owns every step —
 * Supabase sign-out, cached-user-state cleanup, and redirect — so a logout
 * control only has to call `logout()`. Future side-effects (analytics, cross-tab
 * broadcast, etc.) belong here, keeping every logout button consistent.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter()
  const queryClient = useQueryClient()

  return React.useCallback(async () => {
    if (isSupabaseConfigured()) {
      // Ends the session on this device; useSession's onAuthStateChange listener
      // clears its local session state.
      await getSupabaseBrowserClient().auth.signOut()
    }
    // Purge ALL cached user data. clear() (not invalidate/reset/remove) because a
    // logout must trigger no refetch against a dead session and must leave no
    // authed data readable by the next user on this device — see the report.
    queryClient.clear()
    router.replace('/auth/login')
    router.refresh()
  }, [router, queryClient])
}
