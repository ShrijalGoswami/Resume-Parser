'use client'

import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

export interface SessionState {
  session: Session | null
  loading: boolean
  configured: boolean
}

/**
 * Reads the shared Supabase session (established by the v1.0 sign-in flow, same
 * origin). Home and other authed surfaces gate on this before fetching, so an
 * unauthenticated visitor gets a sign-in prompt instead of a wall of errors.
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
