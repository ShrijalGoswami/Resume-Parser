'use client'

import * as React from 'react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * The session behind an emailed link, established before anything is asked for.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO SCREENS, ONE PROBLEM. `/auth/reset-password` and `/auth/accept-invite`
 * are both reached only by clicking a link in an email, and both then call
 * `supabase.auth.updateUser` against whatever session that link established.
 * Both used to render their form having verified nothing — so an expired link,
 * a link already spent, or one opened on a different device from the one that
 * requested it produced a working form. The person filled it in, submitted, and
 * only then learned there was no session to update: the failure arriving after
 * the effort, with no way forward from the screen they were standing on.
 *
 * The fix was written for the reset screen first. This hook is that logic
 * lifted out rather than copied, so the invite screen cannot drift from it —
 * and so the race below is fixed in one place rather than two.
 *
 * THE RACE. `getSession()` and `onAuthStateChange` resolve in either order.
 * Our `/auth/callback` route normally exchanges the token server-side and
 * writes the cookies, in which case `getSession` answers immediately. But a
 * link whose token rides in the URL *fragment* is resolved by the SDK in the
 * browser, and that can land after a `getSession` call which was started before
 * the session existed and therefore answers null.
 *
 * Taking that null would tear down a working form and tell the person their
 * link had expired while they were holding a valid one. So `getSession` may
 * confirm a session but may never retract one — the phase only ever moves
 * forward to 'valid'.
 *
 * `email` is read off the session for one reason: a password manager will not
 * offer to save a new credential without a username to attach it to, and
 * neither of these screens has an email field.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type LinkSessionStatus = 'checking' | 'valid' | 'invalid'

export interface LinkSession {
  status: LinkSessionStatus
  /** The account's own address, once known. Empty until then. */
  email: string
  /** False when Supabase is not configured — the screens say so rather than pretending. */
  configured: boolean
}

export function useLinkSession(): LinkSession {
  const configured = isSupabaseConfigured()
  // Seeded rather than corrected from the effect: with Supabase unconfigured
  // there is nothing to check, and starting at 'checking' only to fix it on the
  // first commit is a cascading render for a value known before the first one.
  const [status, setStatus] = React.useState<LinkSessionStatus>(
    configured ? 'checking' : 'invalid',
  )
  const [email, setEmail] = React.useState('')

  React.useEffect(() => {
    if (!configured) return
    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    // Subscribed BEFORE the read, so a session the SDK resolves in between is
    // not missed by both paths.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      // PASSWORD_RECOVERY is the recovery-link event; a plain session covers the
      // invite link and the already-signed-in visitor.
      if (event === 'PASSWORD_RECOVERY' || session) {
        if (session?.user?.email) setEmail(session.user.email)
        setStatus('valid')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user?.email) setEmail(data.session.user.email)
      // MUST NOT DOWNGRADE — see the race described above.
      setStatus((current) =>
        current === 'valid' ? 'valid' : data.session ? 'valid' : 'invalid',
      )
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [configured])

  return { status, email, configured }
}
