'use client'

import * as React from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { AppShell } from '../shell'
import { RequireSession } from '../auth/require-session'
import { stageLabel } from '../workspace/stages'
import { PageHeader } from '../shell/page-header'
import { useProfile, useActiveRoles } from '../lib/api/hooks'
import { useQuery } from '@tanstack/react-query'
import { listCampaigns } from '@/services/campaigns-api'
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
import { FeatureLock, PlanGate, usePlanGate } from '../entitlements'
import type { CandidateRow } from '@/lib/candidate'
import type { Campaign } from '@/types/campaign'

const INTERVIEW_CRUMBS = [{ label: 'Interviews' }]


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
  return (
    <RequireSession breadcrumbs={INTERVIEW_CRUMBS}>
      <AuthedInterviews initial={initial} />
    </RequireSession>
  )
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
    // The canonical map, not `capitalize` on the raw enum — six other surfaces
    // already label stages from here, and CSS casing only happens to work
    // because every current stage is one word.
    render: (row) => (
      <span className="text-hl-fg-secondary">{stageLabel(row.raw.stage)}</span>
    ),
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
      <ErrorState variant="route" title="Couldn’t load your roles" onRetry={() => roles.refetch()} />
    )
  } else if (!roles.data || roles.data.length === 0) {
    body = <NoActiveRoles />
  } else {
    body = <RoleInterviews roles={roles.data} initial={initial} />
  }

  return (
    <AppShell breadcrumbs={INTERVIEW_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 pb-12 pt-6">
        <PageHeader
          title="Interviews"
          description="Prepare a grounded interview from a candidate’s own evidence."
        />
        {body}
      </div>
    </AppShell>
  )
}

/**
 * "No active roles" was true and unhelpful.
 *
 * The audit found this screen announcing an empty workspace to someone who had
 * just built a role — because the role was still a DRAFT, and this list only
 * asks for active ones. The sentence was accurate and the reader was left to
 * guess why their work had vanished.
 *
 * So it asks a second, cheap question before saying anything: are there roles
 * in some other state? If there are, it says which, and points at the thing
 * that would fix it. Nothing about the backend changed — the screen simply
 * stopped reporting one status as though it were the whole picture.
 */
function NoActiveRoles() {
  const all = useQuery({ queryKey: ['hl', 'campaigns', 'all'], queryFn: () => listCampaigns() })

  // Say nothing until the second question has an answer. `?? 0` meant that
  // while this query was in flight the screen asserted "No roles yet — create
  // a role", then replaced it with "you have 1 role in draft" a moment later.
  // The first sentence was not a loading state; it was a different, wrong
  // answer, and it is the one a fast reader takes away.
  if (all.isPending) return <LoadingScreen label="Checking your roles" />

  // A failed second query is not evidence that no roles exist. It leaves the
  // screen knowing exactly one thing — none are active — so that is all it
  // says, without a count it cannot stand behind.
  const total = all.isError ? null : (all.data?.length ?? 0)
  const inactive = total ?? 0

  return (
    <EmptyState
      surface
      icon={ClipboardList}
      title={total === 0 ? 'No roles yet' : 'No roles are active yet'}
      description={
        total === 0
          ? 'Create a role and add candidates before preparing an interview.'
          : total === null
            ? 'Interviews are prepared from active roles, and none of yours are active right now.'
            : `Interviews are prepared from active roles. You have ${inactive} role${inactive === 1 ? '' : 's'} in draft or another state — activate one to prepare an interview from it.`
      }
      action={
        <Button variant="primary" asChild>
          {/* The destination is named for the surface it reaches (Jobs); the
              copy above still says "role" for the thing itself, which is the
              word the product uses everywhere for a single opening. */}
          <Link href="/jobs">{total === 0 ? 'Go to Jobs' : 'Review your jobs'}</Link>
        </Button>
      }
    />
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
  // Read once here so the lock can name the tier; `PlanGate` below owns the
  // loading and error states.
  const interviewPlan = usePlanGate('interview_intelligence')

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
            title="Couldn’t load candidates"
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
                description="Upload résumés to the role, then come back to prepare an interview."
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
            {/* Generating a pack calls `/campaigns/{id}/interview`, which is
                behind `require_entitlement("interview_intelligence")`. Only the
                generator is gated: the candidate table above reads ungated
                campaign data, so the screen stays useful and a Free team can
                still see who is up for interview — they just cannot have the
                pack written for them. */}
            <PlanGate
              feature="interview_intelligence"
              fallback={
                <FeatureLock
                  feature="interview_intelligence"
                  requiredPlan={
                    interviewPlan.state === 'denied' ? interviewPlan.requiredPlan : null
                  }
                />
              }
            >
              <InterviewIntelligence
                key={`${roleId}:${selected.id}`}
                campaignId={roleId}
                candidateId={selected.id}
              />
            </PlanGate>
          </section>
        ) : (
          <p className="hl-body px-1 text-hl-fg-tertiary">
            Select a candidate to generate an interview pack.
          </p>
        )}

        <DeferredNote title="Scheduling and scorecards aren’t available yet">
          Interview packs are generated on demand and are not stored. Calendar scheduling,
          interviewer assignment, and saved scorecards need backend support that doesn’t exist
          yet — so they are absent rather than simulated.
      </DeferredNote>
    </div>
  )
}
