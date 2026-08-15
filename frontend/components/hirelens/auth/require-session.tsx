'use client'

import * as React from 'react'
import Link from 'next/link'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { LoadingScreen } from '../states/loading'
import { Button } from '../ui/button'
import type { AccountMenuProps } from '../shell/account-menu'

/**
 * THE session gate. One boundary, one set of words, one type size.
 *
 * Ten screens each carried a private copy of this: a local `Notice` or
 * `CenteredNotice`, a `useSession()` call, and the same three branches
 * (unconfigured → loading → signed out). "Sign in to continue" was written into
 * thirteen files and "Sign-in isn't configured" into fourteen. They had already
 * drifted — some notices used `hl-display`, others `hl-display-md`, so the same
 * sentence rendered at two different sizes depending which screen you landed
 * on. That is not a styling slip; it is what duplication does on its own.
 *
 * The signed-out state renders INSIDE the shell rather than replacing it, which
 * is what the screens were already doing individually — the rail stays, so the
 * page still reads as a place in a product rather than a dead end.
 */

/** A centred message on the canvas. The one implementation. */
export function CenteredNotice({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      {/* `hl-display`, not `hl-display-md`. The 44px step is documented as a
          "focal moment" for auth and landing; a routine gate is not one. */}
      <h1 className="hl-display text-hl-fg">{title}</h1>
      {description ? <p className="hl-body text-hl-fg-secondary">{description}</p> : null}
      {action}
    </div>
  )
}

export interface RequireSessionProps {
  children: React.ReactNode
  /** Breadcrumbs for the shell while gating, so the location survives the gate. */
  breadcrumbs?: React.ComponentProps<typeof AppShell>['breadcrumbs']
  /** Fallback shell title when there are no breadcrumbs. */
  title?: string
  account?: AccountMenuProps
  /** Screen-specific reassurance under "Sign in to continue". */
  description?: string
  /** Skeleton matching the wrapped screen. Falls back to the generic loader. */
  loadingFallback?: React.ReactNode
}

export function RequireSession({
  children,
  breadcrumbs,
  title,
  account,
  description,
  loadingFallback,
}: RequireSessionProps) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={breadcrumbs} title={title} account={account}>
        <CenteredNotice
          title="Sign-in isn’t configured"
          description="This deployment is missing its Supabase environment variables."
        />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell breadcrumbs={breadcrumbs} title={title} account={account}>
        {loadingFallback ?? <LoadingScreen />}
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell breadcrumbs={breadcrumbs} title={title} account={account}>
        <CenteredNotice
          title="Sign in to continue"
          description={description}
          action={
            <Button variant="primary" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  return <>{children}</>
}
