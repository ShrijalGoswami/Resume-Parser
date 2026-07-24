'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import {
  useCampaign,
  useCandidates,
  useCompareCandidates,
  useUpdateRole,
  useDeleteRole,
} from '../lib/api/workspace'
import { WorkspaceHeader } from './workspace-header'
import { PipelineLens } from './pipeline-lens'
import { TriageLens } from './triage/triage-lens'
import { AnalyticsLens } from './analytics-lens'
import { ActivityLens } from './activity-lens'
import { DeferredLens } from './deferred-lens'
import { AddCandidatesDialog } from './add-candidates-dialog'
import { ComparePanel } from './compare-panel'
import { CandidatePeek } from '../candidate-object'
import { RoleFormDialog } from '../roles/role-form-dialog'
import { TypedConfirmDialog } from '../settings/typed-confirm-dialog'
import { LoadingScreen } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { toast } from '../ui/use-toast'

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
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
  const router = useRouter()
  const updateRole = useUpdateRole(roleId)
  const deleteRole = useDeleteRole()

  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
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

  const onArchiveRole = () => {
    const previous = campaign.data?.status ?? 'active'
    updateRole.mutate(
      { status: 'archived' },
      {
        onSuccess: () => {
          toast({
            title: 'Role archived',
            action: { label: 'Undo', onClick: () => updateRole.mutate({ status: previous }) },
          })
          router.push('/roles')
        },
        onError: (err) =>
          toast({
            variant: 'danger',
            title: 'Could not archive the role',
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    )
  }

  const onConfirmDelete = () => {
    deleteRole.mutate(roleId, {
      onSuccess: () => {
        toast({ title: 'Role deleted' })
        router.replace('/roles')
      },
      onError: (err) =>
        toast({
          variant: 'danger',
          title: 'Could not delete the role',
          description: err instanceof Error ? err.message : undefined,
        }),
    })
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

  const crumbs =
    lens === 'triage'
      ? [{ label: campaign.data.title, href: `/roles/${roleId}` }, { label: 'Triage' }]
      : [{ label: campaign.data.title }]

  return (
    <AppShell account={account} breadcrumbs={crumbs}>
      <WorkspaceHeader
        campaign={campaign.data}
        candidateCount={count}
        stageCount={stageCount}
        onAddCandidates={() => setAddOpen(true)}
        onEditRole={() => setEditOpen(true)}
        onArchiveRole={onArchiveRole}
        onDeleteRole={() => setDeleteOpen(true)}
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-4">
        {lens === 'triage' ? (
          <TriageLens roleId={roleId} />
        ) : lens === 'analytics' ? (
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
      {candidateId ? (
        <CandidatePeek
          key={candidateId}
          roleId={roleId}
          candidateId={candidateId}
          open
          onOpenChange={(open) => {
            if (!open) closeCandidate()
          }}
        />
      ) : null}

      <RoleFormDialog
        mode="edit"
        role={campaign.data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <TypedConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this role?"
        description={`This permanently deletes “${campaign.data.title}” and its candidates. This cannot be undone.`}
        confirmWord={campaign.data.title}
        confirmLabel="Delete role"
        busy={deleteRole.isPending}
        onConfirm={onConfirmDelete}
      />
    </AppShell>
  )
}
