'use client'

import * as React from 'react'
import Link from 'next/link'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useCampaign, useCandidates, useCompareCandidates } from '../lib/api/workspace'
import { WorkspaceHeader } from './workspace-header'
import { PipelineLens } from './pipeline-lens'
import { AnalyticsLens } from './analytics-lens'
import { ActivityLens } from './activity-lens'
import { DeferredLens } from './deferred-lens'
import { AddCandidatesDialog } from './add-candidates-dialog'
import { ComparePanel } from './compare-panel'
import { CandidateDrawer } from './candidate/candidate-drawer'
import { LoadingScreen } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

/** Role Workspace (Design Bible §7). Lens comes from the `?lens=` param (server). */
export function RoleWorkspace({
  roleId,
  lens,
  initialCandidateId,
}: {
  roleId: string
  lens: string
  initialCandidateId: string | null
}) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Role">
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Role">
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell title="Role">
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedWorkspace roleId={roleId} lens={lens} initialCandidateId={initialCandidateId} />
}

/** Current path with/without the `?candidate=` param (no navigation). */
function candidateUrl(id: string | null): string {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('candidate', id)
  else url.searchParams.delete('candidate')
  return `${url.pathname}${url.search}`
}

function AuthedWorkspace({
  roleId,
  lens,
  initialCandidateId,
}: {
  roleId: string
  lens: string
  initialCandidateId: string | null
}) {
  const profile = useProfile()
  const campaign = useCampaign(roleId)
  const candidates = useCandidates(roleId)
  const compare = useCompareCandidates(roleId)

  const [addOpen, setAddOpen] = React.useState(false)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [compareIds, setCompareIds] = React.useState<string[]>([])
  const [candidateId, setCandidateId] = React.useState<string | null>(initialCandidateId)
  // True when the drawer added a history entry this session (so Back closes it).
  const openedViaPushRef = React.useRef(false)

  // Sync the drawer to Back/Forward navigation.
  React.useEffect(() => {
    const onPopState = () => {
      openedViaPushRef.current = false
      setCandidateId(new URL(window.location.href).searchParams.get('candidate'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openCandidate = (id: string) => {
    if (candidateId === null) {
      // Opening from closed pushes an entry, so Back closes the drawer.
      window.history.pushState(null, '', candidateUrl(id))
      openedViaPushRef.current = true
    } else {
      // Switching candidates replaces — no history clutter.
      window.history.replaceState(null, '', candidateUrl(id))
    }
    setCandidateId(id)
  }

  const closeCandidate = () => {
    if (openedViaPushRef.current) {
      openedViaPushRef.current = false
      window.history.back() // popstate clears candidateId
    } else {
      window.history.replaceState(null, '', candidateUrl(null))
      setCandidateId(null)
    }
  }

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const runCompare = (ids: string[]) => {
    setCompareIds(ids)
    compare.mutate(ids)
    setCompareOpen(true)
  }

  if (campaign.isLoading) {
    return (
      <AppShell title="Role" account={account}>
        <LoadingScreen label="Loading role" />
      </AppShell>
    )
  }
  if (campaign.isError || !campaign.data) {
    return (
      <AppShell title="Role" account={account}>
        <ErrorState
          variant="route"
          title="Couldn't load this role"
          onRetry={() => campaign.refetch()}
        />
      </AppShell>
    )
  }

  const count = candidates.data?.length ?? campaign.data.total_candidates ?? 0
  const stageCount = new Set((candidates.data ?? []).map((row) => row.raw.stage)).size || 5

  return (
    <AppShell account={account} breadcrumbs={[{ label: campaign.data.title }]}>
      <WorkspaceHeader
        campaign={campaign.data}
        candidateCount={count}
        stageCount={stageCount}
        onAddCandidates={() => setAddOpen(true)}
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-4">
        {lens === 'analytics' ? (
          <AnalyticsLens roleId={roleId} />
        ) : lens === 'activity' ? (
          <ActivityLens roleId={roleId} />
        ) : lens === 'forecast' ? (
          <DeferredLens kind="forecast" />
        ) : lens === 'report' ? (
          <DeferredLens kind="report" />
        ) : (
          <PipelineLens
            roleId={roleId}
            onCompare={runCompare}
            onAddCandidates={() => setAddOpen(true)}
            onOpenCandidate={openCandidate}
          />
        )}
      </div>

      <AddCandidatesDialog
        roleId={roleId}
        campaign={campaign.data}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <ComparePanel
        open={compareOpen}
        count={compareIds.length}
        result={compare}
        onRetry={() => compare.mutate(compareIds)}
        onClose={() => {
          setCompareOpen(false)
          compare.reset()
        }}
      />
      <CandidateDrawer roleId={roleId} candidateId={candidateId} onClose={closeCandidate} />
    </AppShell>
  )
}
