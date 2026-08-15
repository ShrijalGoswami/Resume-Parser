'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Upload } from 'lucide-react'
import { AppShell } from '../shell'
import { RequireSession } from '../auth/require-session'
import {
  useProfile,
  usePendingRecommendations,
  useUpdateRecommendation,
  useRecentActivity,
  useActiveRoles,
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

// "Today", not "Inbox" (Phase 9.1). An inbox promises a queue you process to
// zero; this screen is a briefing that is allowed to be quiet.
const INBOX_CRUMBS = [{ label: 'Today' }]

const SHELL = 'mx-auto flex w-full max-w-[1100px] flex-col gap-7 px-6 pb-14 pt-6'

/** Skeletons (never spinners) matching the Inbox layout. */
function InboxSkeleton() {
  return (
    <div className={SHELL} aria-hidden>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* The pipeline strip is a single hairline row now, not four tiles. */}
      <Skeleton className="h-11" />
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
  return (
    // `loadingFallback` is why the shared gate takes one: this screen had the
    // only session-loading state in the product that wasn't a generic spinner,
    // and a layout-shaped skeleton is worth keeping.
    <RequireSession
      breadcrumbs={INBOX_CRUMBS}
      description="Your day starts here."
      loadingFallback={<InboxSkeleton />}
    >
      <AuthedInbox />
    </RequireSession>
  )
}

function AuthedInbox() {
  const queryClient = useQueryClient()
  const profile = useProfile()
  const analytics = useInboxAnalytics()
  const recs = usePendingRecommendations()
  const activity = useRecentActivity(30)
  const update = useUpdateRecommendation()
  // Ungated campaign list — the honest test for "has this workspace ever been
  // used", which decides whether the empty state welcomes or reassures.
  const roles = useActiveRoles()

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
        title="Couldn’t load your inbox"
        description="The priority queue didn’t respond. Try again in a moment."
        onRetry={() => recs.refetch()}
      />
    )
  } else if (recommendations.length === 0 && events.length === 0) {
    /**
     * TWO DIFFERENT EMPTIES, and they were being given the same sentence.
     *
     * "No work needs your attention" is the steady-state answer: reassuring
     * when you have roles running and nothing pending. Shown to somebody who
     * signed up ninety seconds ago it is disorienting — they have just paid
     * attention to a signup form and expect to be told what to do, and instead
     * the product says everything is handled. It was also the first sentence in
     * the entire experience, since there is no onboarding flow: signup lands
     * straight here.
     *
     * `roles.data` distinguishes them. It is the campaigns list — ungated,
     * already fetched on other screens, and the honest test for "has this
     * workspace ever been used". While it is loading or errored we keep the
     * steady-state copy rather than guessing someone is new, because telling a
     * long-standing customer to create their first role is the worse mistake.
     */
    const firstRun = roles.data?.length === 0

    body = (
      <EmptyState
        surface
        variant="first-run"
        icon={Plus}
        title={firstRun ? 'Start with your first role' : 'No work needs your attention'}
        description={
          firstRun
            ? 'Describe the role you are hiring for, add the résumés you have, and HireLens will read all of them and bring the few worth your time into focus.'
            : "When candidates arrive or roles need a decision, they’ll show up here."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" asChild>
              <Link href="/jobs?new=1">
                <Plus aria-hidden /> Create role
              </Link>
            </Button>
            {/* A brand-new workspace has nothing to upload candidates INTO, so
                the second button would lead to an empty roles list. Offer it
                only once a role exists. */}
            {!firstRun ? (
              <Button variant="secondary" asChild>
                <Link href="/jobs">
                  <Upload aria-hidden /> Upload candidates
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
    )
  } else if (recommendations.length > 0) {
    body = (
      <InboxPriorityQueue
        recommendations={recommendations}
        aiReviewCount={reviewCount}
        onUpdate={onUpdate}
        pendingId={pendingId}
        onOpenCandidate={openCandidate}
        onPrefetchCandidate={prefetchCandidate}
      />
    )
  } else {
    // Recommendations resolved to none, but the workspace is alive (the feed
    // has events). The brief still answers its question out loud: a calm
    // sentence, not an empty region the reader has to interpret.
    body = (
      <p className="border-l-2 border-[var(--hl-accent-secondary)] py-0.5 pl-3 hl-body text-hl-fg-secondary">
        Nothing is waiting on your decision right now.
      </p>
    )
  }

  // The feed is the record, not the news: it renders after the queue and the
  // pipeline line, and only when the queue itself isn't loading or failed.
  const feed =
    !recs.isLoading && !recs.isError && events.length > 0 ? (
      <InboxActivityFeed events={events} />
    ) : null

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
        {/* Brief order (audit): the decisions first, then the pipeline line,
            then the record. The four-tile strip that used to open the screen
            is now the quiet hairline row after the queue — the counts are
            navigation, and navigation does not lead a morning brief. */}
        {body}
        <InboxSummary stats={stats} loading={analytics.isLoading} />
        {feed}
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
