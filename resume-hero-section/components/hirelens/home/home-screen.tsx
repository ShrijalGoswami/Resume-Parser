'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Inbox, Search } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import {
  useProfile,
  useActiveRoles,
  usePendingRecommendations,
  useGenerateBrief,
} from '../lib/api/hooks'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { BriefingHeader } from './briefing-header'
import { DecisionHero } from './decision-hero'
import { DecisionTier } from './decision-list'
import { FocusRail } from './focus-rail'
import { tierFor, sortDecisions, emptyInboxState } from './inbox-meta'
import type { AgentBriefing } from '@/types/agent'

const INBOX_CRUMBS = [{ label: 'Inbox' }]

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
      <h1 className="hl-display-md">{title}</h1>
      <p className="hl-body text-hl-fg-secondary">{description}</p>
      {action}
    </div>
  )
}

/**
 * Inbox / Arrival (Stitch "Decision Inbox — The Briefing"). Route is /home during
 * coexistence. Re-presents the real recommendation queue (usePendingRecommendations)
 * and the on-demand AI brief (useGenerateBrief). Gates on the shared Supabase
 * session so an unauthenticated visitor gets a sign-in prompt, not a wall of errors.
 */
export function HomeScreen() {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={INBOX_CRUMBS}>
        <CenteredNotice
          title="Sign-in isn't configured"
          description="This deployment is missing its Supabase environment variables."
        />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell breadcrumbs={INBOX_CRUMBS}>
        <LoadingScreen label="Loading your inbox" />
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell breadcrumbs={INBOX_CRUMBS}>
        <CenteredNotice
          title="Sign in to continue"
          description="Your decision inbox is waiting."
          action={
            <Button variant="primary" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  return <AuthedInbox />
}

function AuthedInbox() {
  const profile = useProfile()
  const roles = useActiveRoles()
  const recs = usePendingRecommendations()
  const [brief, setBrief] = React.useState<AgentBriefing | null>(null)
  const generate = useGenerateBrief()

  const onGenerate = React.useCallback(() => {
    generate.mutate(undefined, { onSuccess: (data) => setBrief(data.briefing) })
  }, [generate])

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const sorted = React.useMemo(() => sortDecisions(recs.data ?? []), [recs.data])
  const hero = sorted[0]
  const rest = sorted.slice(1)
  const nowItems = rest.filter((r) => tierFor(r.severity) === 'now')
  const todayItems = rest.filter((r) => tierFor(r.severity) === 'today')
  const rolesEmpty = !roles.isLoading && !roles.isError && (roles.data?.length ?? 0) === 0

  let content: React.ReactNode
  if (recs.isLoading) {
    content = <LoadingScreen label="Loading your inbox" />
  } else if (recs.isError) {
    content = (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <ErrorState
          title="Couldn't load your inbox"
          description="The decision queue didn't respond. Try again in a moment."
          onRetry={() => recs.refetch()}
        />
      </div>
    )
  } else if (sorted.length === 0) {
    // No pending decisions. The copy is honest either way (never "all caught up"
    // before a scan) and always offers a next step — see emptyInboxState (A5).
    const empty = emptyInboxState(rolesEmpty)
    content = (
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <EmptyState
          variant="first-run"
          icon={empty.variant === 'first-run' ? Plus : Inbox}
          title={empty.title}
          description={empty.description}
          action={
            <Button variant="primary" asChild>
              <Link href={empty.cta.href}>
                {empty.variant === 'first-run' ? <Plus /> : <Search />} {empty.cta.label}
              </Link>
            </Button>
          }
        />
      </div>
    )
  } else {
    content = (
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-10 px-6 pb-24 pt-8 lg:flex-row lg:gap-16">
        <div className="flex min-w-0 flex-1 flex-col gap-10 lg:max-w-[760px]">
          <BriefingHeader
            nowCount={nowItems.length + (hero && tierFor(hero.severity) === 'now' ? 1 : 0)}
            todayCount={todayItems.length + (hero && tierFor(hero.severity) === 'today' ? 1 : 0)}
            briefing={brief}
            onGenerate={onGenerate}
            generating={generate.isPending}
          />
          {hero ? <DecisionHero rec={hero} /> : null}
          <div className="flex flex-col gap-10">
            <DecisionTier label="Needs you now" items={nowItems} />
            <DecisionTier label="Today" items={todayItems} />
          </div>
        </div>
        <FocusRail items={sorted.slice(0, 3)} />
      </div>
    )
  }

  return (
    <AppShell breadcrumbs={INBOX_CRUMBS} account={account}>
      {content}
    </AppShell>
  )
}
