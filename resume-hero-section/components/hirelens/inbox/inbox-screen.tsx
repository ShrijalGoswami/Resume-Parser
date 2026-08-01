'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Upload } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import {
  useProfile,
  usePendingRecommendations,
  useUpdateRecommendation,
  useRecentActivity,
} from '../lib/api/hooks'
import { getCandidate } from '@/services/campaigns-api'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'
import { CandidatePeek } from '../candidate-object'
import { QuotaMeter } from '../entitlements'
import { InboxHeader } from './inbox-header'
import { InboxSummary } from './inbox-summary'
import { InboxPriorityQueue } from './inbox-priority-queue'
import { InboxActivityFeed } from './inbox-activity-feed'
import { useInboxAnalytics, summaryStats, aiReviewCount } from './inbox-data'
import type { ApprovalStatus } from '@/types/agent'

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
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      <p className="hl-body text-hl-fg-secondary">{description}</p>
      {action}
    </div>
  )
}

const SHELL = 'mx-auto flex w-full max-w-[1100px] flex-col gap-7 px-6 pb-14 pt-6'

/** Skeletons (never spinners) matching the Inbox layout. */
function InboxSkeleton() {
  return (
    <div className={SHELL} aria-hidden>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

/**
 * The Inbox — the recruiter's command center ("what should I work on right now?").
 * One vertical flow: header → executive summary → priority queue → activity feed.
 * Gates on the shared Supabase session, then composes real data. Consumes the
 * frozen CandidatePeek (v1.x) without modifying or forking it.
 */
export function InboxScreen() {
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
        <InboxSkeleton />
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell breadcrumbs={INBOX_CRUMBS}>
        <CenteredNotice
          title="Sign in to continue"
          description="Your inbox is waiting."
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
  const queryClient = useQueryClient()
  const profile = useProfile()
  const analytics = useInboxAnalytics()
  const recs = usePendingRecommendations()
  const activity = useRecentActivity(30)
  const update = useUpdateRecommendation()

  const [selected, setSelected] = React.useState<{ roleId: string; candidateId: string } | null>(
    null,
  )

  const stats = React.useMemo(() => summaryStats(analytics.data), [analytics.data])
  const reviewCount = React.useMemo(() => aiReviewCount(analytics.data), [analytics.data])
  const recommendations = React.useMemo(() => recs.data ?? [], [recs.data])
  const events = React.useMemo(() => activity.data ?? [], [activity.data])

  const onUpdate = React.useCallback(
    (id: string, status: ApprovalStatus) => update.mutate({ id, status }),
    [update],
  )
  const prefetchCandidate = React.useCallback(
    (roleId: string, candidateId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['hl', 'role', roleId, 'candidate', candidateId],
        queryFn: () => getCandidate(roleId, candidateId),
      })
    },
    [queryClient],
  )
  const openCandidate = React.useCallback(
    (roleId: string, candidateId: string) => setSelected({ roleId, candidateId }),
    [],
  )

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined
  const org = profile.data?.company ?? undefined
  const name = profile.data?.full_name ?? undefined

  const pendingId = update.isPending ? (update.variables?.id ?? null) : null

  // The command center is the priority queue; it drives the primary loading/error
  // gate. Summary and feed degrade gracefully around it.
  let body: React.ReactNode
  if (recs.isLoading) {
    body = (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" aria-hidden />
        ))}
      </div>
    )
  } else if (recs.isError) {
    body = (
      <ErrorState
        title="Couldn't load your inbox"
        description="The priority queue didn't respond. Try again in a moment."
        onRetry={() => recs.refetch()}
      />
    )
  } else if (recommendations.length === 0 && events.length === 0) {
    body = (
      <EmptyState
        surface
        variant="first-run"
        icon={Plus}
        title="No work needs your attention"
        description="When candidates arrive or roles need a decision, they'll show up here."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" asChild>
              <Link href="/roles?new=1">
                <Plus aria-hidden /> Create role
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/roles">
                <Upload aria-hidden /> Upload candidates
              </Link>
            </Button>
          </div>
        }
      />
    )
  } else {
    body = (
      <>
        {recommendations.length > 0 ? (
          <InboxPriorityQueue
            recommendations={recommendations}
            aiReviewCount={reviewCount}
            onUpdate={onUpdate}
            pendingId={pendingId}
            onOpenCandidate={openCandidate}
            onPrefetchCandidate={prefetchCandidate}
          />
        ) : null}
        <InboxActivityFeed events={events} />
      </>
    )
  }

  return (
    <AppShell breadcrumbs={INBOX_CRUMBS} account={account}>
      <div className={SHELL}>
        <InboxHeader name={name} org={org} />
        {/* Résumé credits. Silent below 80% by design — an always-on meter turns
            an allowance into a countdown and teaches the recruiter to watch a
            number instead of working. It appears while there is still room to
            act, and it appears HERE because the Inbox is the screen they open
            first, not buried in Settings where they would meet the wall before
            the warning. Founding and unlimited orgs never see it. */}
        <QuotaMeter metric="resumes" />
        <InboxSummary stats={stats} loading={analytics.isLoading} />
        {body}
      </div>
      {selected ? (
        <CandidatePeek
          key={selected.candidateId}
          roleId={selected.roleId}
          candidateId={selected.candidateId}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : null}
    </AppShell>
  )
}
