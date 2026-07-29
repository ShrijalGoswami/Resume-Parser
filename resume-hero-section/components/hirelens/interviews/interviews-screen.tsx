'use client'

import * as React from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { useSession } from '../lib/api/use-session'
import { useProfile, useActiveRoles } from '../lib/api/hooks'
import { useCandidates } from '../lib/api/workspace'
import { LoadingScreen, LoadingLines } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { DataTable, type DataTableColumn } from '../ui/data-table'
import { NativeSelect, DeferredNote } from '../settings/settings-ui'
import { ScoreMeter } from '../domain/score-meter'
import { HireBadge } from '../workspace/hire-badge'
import { InterviewIntelligence } from '@/components/interview/interview-intelligence'
import type { CandidateRow } from '@/lib/candidate'
import type { Campaign } from '@/types/campaign'

const INTERVIEW_CRUMBS = [{ label: 'Interviews' }]

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Interview workbench.
 *
 * Scope is set by what the backend actually serves. The only interview endpoint
 * that exists is `POST /campaigns/{id}/candidates/{id}/interview`, which
 * generates a grounded interview pack — so this screen is a way to reach that
 * generator: pick a role, pick a candidate, generate.
 *
 * There is deliberately no scheduling, no calendar, no saved scorecards and no
 * interview list. None of those have a backend, and a UI that appeared to
 * schedule an interview while writing nothing anywhere would be a lie about the
 * product's capabilities. The gap is stated on-screen instead.
 *
 * The pack itself renders through the existing `InterviewIntelligence` module —
 * the same component the legacy candidate page mounts, unchanged.
 */
export function InterviewsScreen({ initial }: { initial?: { role?: string; candidate?: string } }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={INTERVIEW_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={INTERVIEW_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={INTERVIEW_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedInterviews initial={initial} />
}

const candidateColumns: DataTableColumn<CandidateRow>[] = [
  {
    key: 'name',
    header: 'Candidate',
    sortValue: (row) => row.name,
    render: (row) => (
      <div className="min-w-0">
        <p className="hl-body-medium truncate text-hl-fg">{row.name}</p>
        {row.matchCategory ? (
          <p className="hl-caption truncate text-hl-fg-tertiary">{row.matchCategory}</p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'fit',
    header: 'Fit',
    sortValue: (row) => row.overallScore,
    render: (row) =>
      row.overallScore === null ? (
        <span className="hl-caption text-hl-fg-tertiary">—</span>
      ) : (
        <ScoreMeter score={row.overallScore} showLabel={false} />
      ),
  },
  {
    key: 'verdict',
    header: 'Verdict',
    sortValue: (row) => row.hire,
    render: (row) => <HireBadge hire={row.hire} />,
  },
  {
    key: 'stage',
    header: 'Stage',
    sortValue: (row) => row.raw.stage,
    className: 'capitalize',
    render: (row) => <span className="text-hl-fg-secondary">{row.raw.stage}</span>,
  },
]

function AuthedInterviews({ initial }: { initial?: { role?: string; candidate?: string } }) {
  const profile = useProfile()
  const roles = useActiveRoles()

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  let body: React.ReactNode
  if (roles.isLoading) {
    body = <LoadingScreen label="Loading roles" />
  } else if (roles.isError) {
    body = (
      <ErrorState variant="route" title="Couldn't load your roles" onRetry={() => roles.refetch()} />
    )
  } else if (!roles.data || roles.data.length === 0) {
    body = (
      <EmptyState
        icon={ClipboardList}
        title="No active roles"
        description="Open a role and add candidates before preparing an interview."
        action={
          <Button variant="primary" asChild>
            <Link href="/roles">Go to Roles</Link>
          </Button>
        }
      />
    )
  } else {
    body = <RoleInterviews roles={roles.data} initial={initial} />
  }

  return (
    <AppShell breadcrumbs={INTERVIEW_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pb-16 pt-10">
        <PageHeader
          title="Interviews"
          description="Prepare a grounded interview from a candidate's own evidence."
        />
        {body}
      </div>
    </AppShell>
  )
}

/**
 * Mounted only once at least one role exists, so `roleId` is always a real id
 * and the candidates query never fires against an empty campaign path.
 */
function RoleInterviews({
  roles,
  initial,
}: {
  roles: Campaign[]
  initial?: { role?: string; candidate?: string }
}) {
  const deepLinked = initial?.role && roles.some((role) => role.id === initial.role)
  const [roleId, setRoleId] = React.useState<string>(
    deepLinked ? (initial?.role as string) : roles[0].id,
  )
  const [candidateId, setCandidateId] = React.useState<string | null>(initial?.candidate ?? null)

  const candidates = useCandidates(roleId)
  const selected = candidates.data?.find((row) => row.id === candidateId) ?? null

  // A candidate from a previous role must not stay selected after switching.
  const onRoleChange = (next: string) => {
    setRoleId(next)
    setCandidateId(null)
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <label className="hl-small text-hl-fg-secondary" htmlFor="interview-role">
            Role
          </label>
          <NativeSelect
            id="interview-role"
            value={roleId}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </NativeSelect>
        </div>

        {candidates.isLoading ? (
          <LoadingLines lines={5} />
        ) : candidates.isError ? (
          <ErrorState
            variant="inline"
            title="Couldn't load candidates"
            onRetry={() => candidates.refetch()}
          />
        ) : (
          <DataTable
            rows={candidates.data ?? []}
            columns={candidateColumns}
            getRowId={(row) => row.id}
            getSearchText={(row) => `${row.name} ${row.email}`}
            searchPlaceholder="Search candidates…"
            pageSize={8}
            initialSort={{ key: 'fit', direction: 'desc' }}
            onRowClick={(row) => setCandidateId(row.id)}
            getRowLabel={(row) => `Prepare an interview for ${row.name}`}
            caption="Candidates in this role"
            empty={
              <EmptyState
                variant="zero-results"
                title="No candidates in this role yet"
                description="Upload resumes to the role, then come back to prepare an interview."
              />
            }
          />
        )}

        {selected ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="hl-h2">Interview pack · {selected.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setCandidateId(null)}>
                Clear selection
              </Button>
            </div>
            <InterviewIntelligence
              key={`${roleId}:${selected.id}`}
              campaignId={roleId}
              candidateId={selected.id}
            />
          </section>
        ) : (
          <p className="hl-body px-1 text-hl-fg-tertiary">
            Select a candidate to generate an interview pack.
          </p>
        )}

        <DeferredNote title="Scheduling and scorecards aren't available yet">
          Interview packs are generated on demand and are not stored. Calendar scheduling,
          interviewer assignment, and saved scorecards need backend support that doesn&rsquo;t exist
          yet — so they are absent rather than simulated.
      </DeferredNote>
    </div>
  )
}
