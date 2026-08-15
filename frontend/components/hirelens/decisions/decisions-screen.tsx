'use client'

import * as React from 'react'
import Link from 'next/link'
import { Gavel } from 'lucide-react'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { RequireSession } from '../auth/require-session'
import { useProfile, useRecentActivity } from '../lib/api/hooks'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Skeleton } from '../ui/skeleton'
import { Badge } from '../ui/badge'
import { stageLabel } from '../workspace/stages'
import { relativeTime } from '../lib/format'
import type { ActivityEvent } from '@/types/campaign'

const DECISIONS_CRUMBS = [{ label: 'Decisions' }]

/**
 * Decisions — the record of hiring outcomes.
 *
 * NOT the Decision Ledger. That surface (now "AI Audit", `/ai-audit`) records
 * which AI *recommendations* a recruiter approved or overrode. This one records
 * what happened to *candidates*: who was shortlisted, who went to interview, who
 * got an offer, who was hired, who was rejected. Two different records that had
 * been sharing one word.
 *
 * WHERE THE DATA COMES FROM, AND WHAT THAT COSTS
 *
 * There is no decisions table and this phase does not add one. A hiring decision
 * is already persisted: moving a candidate writes a `candidate_stage_changed`
 * row to `activity_events` with the actor, the timestamp, the role, the
 * candidate and the new stage. This screen is a read over that — a presentation
 * layer, exactly as the architecture pass concluded.
 *
 * The honest limitation: `GET /activity` takes a `limit` and no type filter, so
 * this is the most recent slice of activity filtered client-side, not a complete
 * history. It is labelled as recent on screen rather than implying totality. A
 * server-side filter is queued as additive backend work; nothing here changes
 * when it lands except the ceiling.
 *
 * Also missing by design: WHY. The stage change records the outcome, not the
 * reasoning. Capturing a reason is a one-field addition to the existing
 * `activity_events.payload` jsonb — no migration — and is deliberately deferred
 * so this phase stays frontend-only.
 */

/** How many activity rows to scan for decisions. */
const ACTIVITY_WINDOW = 200

/**
 * The stages that constitute a decision. `sourced` and `screening` are where a
 * candidate arrives and waits — nobody decided anything — so a move into them
 * is not a decision and would only dilute the record.
 */
const DECISION_STAGES = new Set(['shortlisted', 'interview', 'offer', 'hired', 'rejected'])

/** Terminal outcomes read differently from progress, and are toned to say so. */
function toneFor(stage: string): 'success' | 'danger' | 'neutral' {
  if (stage === 'hired' || stage === 'offer') return 'success'
  if (stage === 'rejected') return 'danger'
  return 'neutral'
}

export interface DecisionRow {
  id: string
  stage: string
  roleId: string | null
  candidateId: string | null
  summary: string
  at: string | null
}

/**
 * Pull the decisions out of a raw activity feed. Exported for tests — this is
 * the whole of the screen's logic, and it is worth asserting directly that a
 * `note_added` or a `sourced` move never appears in a hiring record.
 */
export function decisionsFrom(events: ActivityEvent[]): DecisionRow[] {
  return events
    .filter((event) => event.type === 'candidate_stage_changed')
    .map((event) => ({
      id: event.id,
      stage: String(event.payload?.stage ?? ''),
      roleId: event.campaign_id ?? null,
      candidateId: event.candidate_id ?? null,
      summary: event.summary,
      at: event.created_at ?? null,
    }))
    .filter((row) => DECISION_STAGES.has(row.stage))
}

export function DecisionsScreen() {
  return (
    <RequireSession
      breadcrumbs={DECISIONS_CRUMBS}
      description="Your hiring record is here."
    >
      <AuthedDecisions />
    </RequireSession>
  )
}

function AuthedDecisions() {
  const profile = useProfile()
  const activity = useRecentActivity(ACTIVITY_WINDOW)

  const rows = React.useMemo(() => decisionsFrom(activity.data ?? []), [activity.data])

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  let body: React.ReactNode
  if (activity.isLoading) {
    body = (
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  } else if (activity.isError) {
    body = (
      <ErrorState
        title="Couldn’t load your decisions"
        description="The activity record didn’t respond. Try again in a moment."
        onRetry={() => activity.refetch()}
      />
    )
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        surface
        icon={Gavel}
        title="No decisions yet"
        description="When you shortlist, interview, offer, hire or reject someone, it’s recorded here — with the role, the candidate and when you decided."
      />
    )
  } else {
    body = (
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hl-border-subtle py-3 last:border-b-0"
          >
            <Badge variant={toneFor(row.stage)}>{stageLabel(row.stage)}</Badge>
            <span className="hl-body text-hl-fg">
              {/* Deep-link to the candidate when the event carries both ids.
                  A stage change always does; the guard is for the older rows a
                  long-lived workspace may still hold. */}
              {row.roleId && row.candidateId ? (
                <Link
                  href={`/jobs/${row.roleId}/candidates/${row.candidateId}`}
                  className="text-hl-accent-fg outline-none hover:underline"
                >
                  {row.summary}
                </Link>
              ) : (
                row.summary
              )}
            </span>
            <span className="ml-auto hl-caption text-hl-fg-tertiary">
              {row.at ? relativeTime(row.at) : '—'}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <AppShell breadcrumbs={DECISIONS_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 pb-14 pt-6">
        <PageHeader
          title="Decisions"
          description="Every candidate you moved forward or turned down, most recent first."
        />
        {body}
        {rows.length > 0 ? (
          // Said out loud rather than implied. The feed is a window, and a
          // record that quietly stops short is worse than one that says where
          // it stops.
          <p className="hl-caption text-hl-fg-tertiary">
            Showing decisions from your {ACTIVITY_WINDOW} most recent workspace events.
          </p>
        ) : null}
      </div>
    </AppShell>
  )
}
