'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile, useActiveRoles } from '../lib/api/hooks'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { Button } from '../ui/button'
import { Greeting } from './greeting'
import { MorningBriefSection } from './morning-brief-section'
import { DecisionsSection } from './decisions-section'
import { RisksSection } from './risks-section'
import { WorthYourTimeSection } from './worth-your-time-section'
import { ActiveRolesSection } from './active-roles-section'
import { ActivitySection } from './activity-section'

function CenteredNotice({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display">{title}</h1>
      <p className="hl-body text-hl-fg-secondary">{description}</p>
      {action}
    </div>
  )
}

/**
 * Home (UX Spec §6). Route is /home during coexistence (the legacy app holds /
 * until cutover). Gates on the shared Supabase session so an unauthenticated
 * visitor gets a sign-in prompt, not a wall of errors.
 */
export function HomeScreen() {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Home">
        <CenteredNotice
          title="Sign-in isn't configured"
          description="This deployment is missing its Supabase environment variables."
        />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell title="Home">
        <LoadingScreen label="Loading your workspace" />
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell title="Home">
        <CenteredNotice
          title="Sign in to continue"
          description="Your hiring workspace is waiting."
          action={
            <Button variant="primary" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  return <AuthedHome />
}

function AuthedHome() {
  const profile = useProfile()
  const roles = useActiveRoles()

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const rolesEmpty =
    !roles.isLoading && !roles.isError && (roles.data?.length ?? 0) === 0

  return (
    <AppShell title="Home" account={account}>
      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        <Greeting name={profile.data?.full_name} />
        {rolesEmpty ? (
          <EmptyState
            variant="first-run"
            icon={Sparkles}
            title="Let's fill your first role"
            description="Create a role and start evaluating candidates. HireLens gets sharper as you go."
            action={
              // The create-role flow lives in the legacy app until the V3 Role
              // Workspace lands; this is a real destination, not a dead button.
              <Button variant="primary" asChild>
                <Link href="/campaigns/new">
                  <Plus /> Create a role
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <MorningBriefSection />
            <DecisionsSection />
            <RisksSection />
            <WorthYourTimeSection />
            <ActiveRolesSection />
            <ActivitySection />
          </>
        )}
      </div>
    </AppShell>
  )
}
