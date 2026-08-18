'use client'

import * as React from 'react'
import Link from 'next/link'
import { BarChart3, Download } from 'lucide-react'
import { AppShell } from '../shell'
import { RequireSession } from '../auth/require-session'
import { PageHeader } from '../shell/page-header'
import { useProfile } from '../lib/api/hooks'
import { useAnalyticsOverview } from '../lib/api/analytics'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { GateState } from '../states/gate-state'
import { usePermissionGate, PERMS } from '../lib/use-can'
import { usePlanGate } from '../lib/entitlements'
import { FeatureLock } from '../entitlements'
import { Button } from '../ui/button'
import { DataTable, type DataTableColumn } from '../ui/data-table'
import { ScoreMeter } from '../domain/score-meter'
import { relativeTime } from '../lib/format'
import { DayColumns, Distribution, MagnitudeRows, NoData, Panel, SplitBar } from './analytics-charts'
import { escapeCsvCell } from './csv'
import type { AnalyticsOverview, CandidateBrief, SkillCount } from '@/types/analytics'

// The screen is called Reports (Phase 9.1). The endpoint behind it is still
// `GET /analytics/overview`, and this module keeps its name — the rename was
// recruiter-facing vocabulary, not an API or a file move.
const ANALYTICS_CRUMBS = [{ label: 'Reports' }]

/**
 * Analytics (Executive Overview). Restores the surface the nav rail had been
 * pointing at before it was removed for 404ing.
 *
 * Every number on this screen comes from `GET /analytics/overview` — the same
 * endpoint the legacy `/insights` screen reads. Sections whose data the backend
 * does not return are absent rather than stubbed: there are no conversion-rate,
 * source-effectiveness, or skills supply/demand panels here, because nothing
 * computes them yet. A panel with no data renders its own empty state.
 */
export function AnalyticsScreen() {
  return (
    <RequireSession breadcrumbs={ANALYTICS_CRUMBS}>
      <GatedAnalytics />
    </RequireSession>
  )
}

/**
 * Everything past the session gate. Split out so `RequireSession` owns the
 * signed-out branch and this function owns only the two gates that are specific
 * to Reports — the permission and the plan.
 */
function GatedAnalytics() {
  // The whole screen is one endpoint, `GET /analytics/overview`, gated by
  // `usage.view`. A recruiter reaching this URL used to get a full page of empty
  // charts built from a 403; now it says why. Export CSV needs no separate gate —
  // it serialises the overview already in memory and calls nothing.
  const gate = usePermissionGate(PERMS.USAGE_VIEW)
  // Permission first, THEN plan — the same order as the route's own dependency
  // list (`RequireUsageView, require_entitlement("advanced_analytics")`), so the
  // client and the server never disagree about which of the two a user is told.
  // It is also the honest order: selling an upgrade to a viewer whose role still
  // could not open the screen takes money for nothing.
  const plan = usePlanGate('advanced_analytics')

  if (gate.state === 'loading') {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (gate.state === 'error') {
    // Couldn't establish the role — say that, and offer the action that fixes
    // it. Claiming a permission problem here would be a guess, and a defamatory
    // one when it lands on an owner.
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <ErrorState
          variant="route"
          title="Couldn’t check your access"
          onRetry={gate.retry}
        />
      </AppShell>
    )
  }
  if (gate.state === 'denied') {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <div className="mx-auto w-full max-w-xl px-6 py-24">
          <GateState
            reason="permission"
            title="Analytics is available to hiring managers, admins, and owners."
          />
        </div>
      </AppShell>
    )
  }
  if (plan.state === 'denied') {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <div className="mx-auto w-full max-w-xl px-6 py-24">
          {/* The shared lock — same component, same sentence, same CTA as every
              other locked surface. Nothing about Analytics is composed here. */}
          <FeatureLock feature="advanced_analytics" requiredPlan={plan.requiredPlan} />
        </div>
      </AppShell>
    )
  }
  return <AuthedAnalytics />
}

/**
 * A figure in the hairline strip.
 *
 * Four KPI cards were the wrong instrument: they gave "total campaigns" the
 * same visual weight as the thing the reader came for, and on a workspace with
 * one role they read as a dashboard mock-up. The strip states the same numbers
 * in one line and lets the sections below carry the argument.
 *
 * `value === null` means NOT KNOWN and prints an em dash. It is never coalesced
 * to zero — the same rule the inbox summary strip already follows, for the same
 * reason: a confident wrong number cannot be told apart from a real one.
 */
function Figure({ label, value, note }: { label: string; value: number | string | null; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <span className="hl-mono-lg text-hl-fg">{value === null ? '—' : value}</span>
        <span className="hl-small text-hl-fg-secondary">{label}</span>
      </div>
      {note ? <p className="hl-caption text-hl-fg-tertiary">{note}</p> : null}
    </div>
  )
}

/** Points at one real candidate, so it carries the copper evidence rule. */
function CandidateLine({
  who,
  lead,
  metric,
}: {
  who: CandidateBrief
  lead: string
  metric: string
}) {
  return (
    <div className="border-l-2 border-[var(--hl-accent-secondary)] py-0.5 pl-3">
      <p className="hl-caption text-hl-fg-tertiary">{lead}</p>
      <p className="hl-body text-hl-fg">
        <span className="hl-body-medium">{who.name}</span>
        {who.campaign_title ? (
          <span className="text-hl-fg-secondary"> · {who.campaign_title}</span>
        ) : null}
      </p>
      <p className="hl-caption text-hl-fg-secondary">{metric}</p>
    </div>
  )
}

/** The distribution band a threshold falls into, e.g. 80 → "80-100". */
function bandFor(ranges: { range: string }[], threshold: number): string | undefined {
  return ranges.find((r) => {
    const lo = Number(r.range.split('-')[0])
    return Number.isFinite(lo) && lo >= threshold
  })?.range
}

const reviewColumns: DataTableColumn<CandidateBrief>[] = [
  {
    key: 'name',
    header: 'Candidate',
    sortValue: (row) => row.name,
    render: (row) => <span className="hl-body-medium text-hl-fg">{row.name}</span>,
  },
  {
    key: 'role',
    header: 'Role',
    sortValue: (row) => row.campaign_title ?? null,
    render: (row) => (
      <span className="text-hl-fg-secondary">{row.campaign_title ?? '—'}</span>
    ),
  },
  {
    key: 'match',
    header: 'Match',
    sortValue: (row) => row.overall_score,
    render: (row) =>
      row.overall_score === null ? (
        <span className="hl-caption text-hl-fg-tertiary">—</span>
      ) : (
        <ScoreMeter score={row.overall_score} showLabel={false} />
      ),
  },
  {
    key: 'ats',
    header: 'ATS',
    align: 'right',
    sortValue: (row) => row.ats_score,
    render: (row) => (
      <span className="hl-mono">
        {row.ats_score === null ? '—' : Math.round(row.ats_score)}
      </span>
    ),
  },
]

/** Flattens the overview into a CSV of exactly what the backend returned. */
function toCsv(data: AnalyticsOverview): string {
  const rows: string[][] = [['Section', 'Metric', 'Value']]
  const push = (section: string, metric: string, value: string | number | null) =>
    rows.push([section, metric, value === null ? '' : String(value)])

  const o = data.overview
  push('Overview', 'Active campaigns', o.active_campaigns)
  push('Overview', 'Total campaigns', o.total_campaigns)
  push('Overview', 'Total candidates', o.total_candidates)
  push('Overview', 'Analyzed candidates', o.analyzed_candidates)
  push('Overview', 'Awaiting analysis', o.awaiting_analysis)
  push('Overview', 'Average match score', o.average_match_score)
  push('Overview', 'Average ATS score', o.average_ats_score)
  push('Overview', `High quality (≥${o.high_quality_threshold})`, o.high_quality_candidates)

  data.charts.hiring_funnel.forEach((d) => push('Hiring funnel', d.stage, d.count))
  data.charts.match_distribution.forEach((d) => push('Match distribution', d.range, d.count))
  data.charts.ats_distribution.forEach((d) => push('ATS distribution', d.range, d.count))
  data.charts.status_breakdown.forEach((d) => push('Status', d.label, d.count))
  data.charts.experience_distribution.forEach((d) => push('Experience', d.range, d.count))
  data.charts.upload_trend.forEach((d) => push('Upload trend', d.date, d.count))
  data.charts.top_skills.forEach((d) => push('Top skills', d.skill, d.count))
  data.ai_insights.common_missing_skills.forEach((d) => push('Missing skills', d.skill, d.count))

  return rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n')
}

const toBars = (items: SkillCount[]) => items.map((s) => ({ label: s.skill, value: s.count }))

function AuthedAnalytics() {
  const profile = useProfile()
  const analytics = useAnalyticsOverview()

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const data = analytics.data

  const exportCsv = React.useCallback(() => {
    if (!data) return
    const url = URL.createObjectURL(new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'hirevo-analytics.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [data])

  let body: React.ReactNode
  if (analytics.isLoading) {
    body = <LoadingScreen label="Loading analytics" />
  } else if (analytics.isError) {
    body = (
      <ErrorState
        variant="route"
        title="Couldn’t load analytics"
        onRetry={() => analytics.refetch()}
      />
    )
  } else if (!data || data.overview.total_candidates === 0) {
    body = (
      <EmptyState
        surface
        icon={BarChart3}
        title="Nothing to measure yet"
        description="Analytics appear once candidates have been uploaded and analyzed."
      />
    )
  } else {
    const { overview, charts, ai_insights: insights, action_center: actions } = data
    const review = insights.candidates_requiring_review
    const analysed = overview.analyzed_candidates
    const trend = charts.upload_trend
    const stages = charts.hiring_funnel.filter((s) => s.count > 0)
    const experienceKnown = charts.experience_distribution.reduce((s, d) => s + d.count, 0)

    body = (
      <div className="hl-stagger flex flex-col gap-8">
        {/* ── 1. Where the workspace stands ───────────────────────────── */}
        <section className="flex flex-wrap items-start gap-x-10 gap-y-4 border-y border-hl-border-subtle py-4">
          <Figure label="active roles" value={overview.active_campaigns} note={`${overview.total_campaigns} in total`} />
          <Figure label="candidates" value={overview.total_candidates} note={`${analysed} analysed`} />
          <Figure
            label="average match"
            value={overview.average_match_score === null ? null : Math.round(overview.average_match_score)}
            note={overview.average_ats_score === null ? 'across analysed candidates' : `ATS ${Math.round(overview.average_ats_score)} · across analysed candidates`}
          />
          <Figure
            label={`at or above ${overview.high_quality_threshold}`}
            value={overview.high_quality_candidates}
            note="the high-quality bar"
          />
        </section>

        {/* ── 2. The decision signal ──────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="hl-h2">What the record says</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-hl-lg border border-hl-border bg-hl-subtle p-5">
              {overview.high_quality_candidates === 0 ? (
                <p className="hl-body text-hl-fg-secondary">
                  No candidate has scored {overview.high_quality_threshold} or above yet. The
                  strongest of the {analysed} analysed is still worth reading — a score is a
                  ranking aid, not a verdict.
                </p>
              ) : (
                <p className="hl-body text-hl-fg-secondary">
                  <span className="hl-mono text-hl-fg">{overview.high_quality_candidates}</span> of{' '}
                  <span className="hl-mono text-hl-fg">{analysed}</span> analysed candidates score{' '}
                  {overview.high_quality_threshold} or above.
                </p>
              )}
              {insights.strongest_candidate ? (
                <CandidateLine
                  who={insights.strongest_candidate}
                  lead="Strongest match"
                  metric={
                    insights.strongest_candidate.overall_score === null
                      ? 'No match score recorded'
                      : `Match ${Math.round(insights.strongest_candidate.overall_score)}`
                  }
                />
              ) : null}
              {insights.highest_ats_candidate &&
              insights.highest_ats_candidate.candidate_id !== insights.strongest_candidate?.candidate_id ? (
                <CandidateLine
                  who={insights.highest_ats_candidate}
                  lead="Cleanest résumé to parse"
                  metric={
                    insights.highest_ats_candidate.ats_score === null
                      ? 'No ATS score recorded'
                      : `ATS ${Math.round(insights.highest_ats_candidate.ats_score)}`
                  }
                />
              ) : null}
            </div>

            <Panel
              title="Match distribution"
              subtitle="How the analysed candidates score against their role"
              note={
                <>
                  {analysed} analysed candidate{analysed === 1 ? '' : 's'}. The copper rule marks the{' '}
                  {overview.high_quality_threshold} bar.
                </>
              }
            >
              <Distribution
                data={charts.match_distribution}
                markFrom={bandFor(charts.match_distribution, overview.high_quality_threshold)}
                markLabel={`${overview.high_quality_threshold} and above`}
              />
            </Panel>
          </div>
        </section>

        {/* ── 3. Pipeline reality ─────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="hl-h2">Where candidates stand</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Current stage"
              subtitle="A snapshot of where each candidate sits today"
              // Deliberately NOT called a funnel. A funnel needs stage
              // transitions over time and the backend stores only the current
              // stage per candidate, so conversion between stages cannot be
              // computed and is not shown. Stages with nobody in them are
              // omitted rather than drawn as empty rails.
              note="Stage transitions aren’t recorded, so this is a headcount by stage — not a conversion rate."
            >
              {stages.length === 0 ? (
                <NoData>No candidates have a stage yet.</NoData>
              ) : (
                <MagnitudeRows
                  data={stages.map((s) => ({
                    label: s.stage.charAt(0).toUpperCase() + s.stage.slice(1),
                    value: s.count,
                  }))}
                  labelWidth="6.5rem"
                />
              )}
            </Panel>

            <Panel
              title="Analysis coverage"
              subtitle="How much of the pipeline has actually been read"
              note={
                overview.awaiting_analysis > 0
                  ? `${overview.awaiting_analysis} candidate${overview.awaiting_analysis === 1 ? '' : 's'} still have no analysis, so every score below excludes them.`
                  : 'Every candidate in the workspace has been analysed.'
              }
            >
              <SplitBar
                parts={[
                  { label: 'Analysed', count: analysed, tone: 'neutral' },
                  { label: 'Awaiting analysis', count: overview.awaiting_analysis, tone: 'warning' },
                ]}
              />
            </Panel>
          </div>
        </section>

        {/* ── 4. Candidate distribution ───────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="hl-h2">Who is in the pool</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Résumé parse quality"
              subtitle="ATS score — how cleanly each résumé could be read"
              note="A low ATS score reflects the document, not the candidate."
            >
              <Distribution data={charts.ats_distribution} />
            </Panel>
            <Panel
              title="Experience"
              subtitle="Years of experience, where the résumé stated it"
              note={
                experienceKnown < analysed
                  ? `${experienceKnown} of ${analysed} analysed résumés stated years of experience; the rest are not counted here.`
                  : `All ${analysed} analysed résumés stated years of experience.`
              }
            >
              {experienceKnown === 0 ? (
                <NoData>No résumé stated years of experience.</NoData>
              ) : (
                <Distribution data={charts.experience_distribution} />
              )}
            </Panel>
          </div>
        </section>

        {/* ── 5. Role-level performance ───────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="hl-h2">Roles</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Strongest pool" subtitle="Average match score by role">
              {insights.strongest_talent_pool ? (
                <div className="border-l-2 border-[var(--hl-accent-secondary)] py-0.5 pl-3">
                  <p className="hl-body text-hl-fg">
                    {insights.strongest_talent_pool.campaign_title ?? 'Untitled role'}
                  </p>
                  <p className="hl-caption text-hl-fg-secondary">
                    Average match{' '}
                    <span className="hl-mono text-hl-fg">
                      {Math.round(insights.strongest_talent_pool.average_score)}
                    </span>
                  </p>
                </div>
              ) : (
                <NoData>No role has a scored candidate yet.</NoData>
              )}
            </Panel>

            <Panel
              title="Quiet roles"
              subtitle="Active roles with no recorded activity"
              note="Activity is only recorded from the last 25 events, so a busy older role can appear here."
            >
              {actions.stale_active_campaigns.length === 0 ? (
                <NoData>Every active role has recent activity.</NoData>
              ) : (
                <ul className="flex flex-col gap-2">
                  {actions.stale_active_campaigns.map((c) => (
                    <li key={c.campaign_id} className="hl-body">
                      <Link
                        href={`/jobs/${c.campaign_id}`}
                        className="text-hl-fg underline-offset-4 hover:underline"
                      >
                        {c.title ?? 'Untitled role'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </section>

        {/* ── 6. Supporting ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="hl-h2">Skills across the pool</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Most common skills" subtitle="Across every analysed candidate">
              {charts.top_skills.length === 0 ? (
                <NoData>No skills were extracted yet.</NoData>
              ) : (
                <MagnitudeRows data={toBars(charts.top_skills)} />
              )}
            </Panel>
            <Panel
              title="Most common gaps"
              subtitle="Skills the roles ask for and candidates lack"
              note="Counted across analysed candidates, not weighted by how much each role needs the skill."
            >
              {insights.common_missing_skills.length === 0 ? (
                <NoData>No missing skills were recorded.</NoData>
              ) : (
                <MagnitudeRows data={toBars(insights.common_missing_skills)} />
              )}
            </Panel>
          </div>
        </section>

        {trend.length > 0 ? (
          <Panel
            title="Résumés received"
            subtitle="By day"
            // The backend applies NO window here — it counts every candidate's
            // created_at. The previous subtitle said "most recent 30 days",
            // which was a range nobody computed. It states the real span.
            note={
              trend.length === 1
                ? `All on ${trend[0].date}.`
                : `${trend[0].date} to ${trend[trend.length - 1].date} · ${trend.length} day${trend.length === 1 ? '' : 's'} with activity.`
            }
          >
            <DayColumns data={trend} />
          </Panel>
        ) : null}

        {review.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="hl-h2">Flagged for a closer read</h2>
              <p className="hl-small text-hl-fg-tertiary">
                <span className="hl-mono text-hl-fg">
                  {insights.candidates_requiring_review_count}
                </span>{' '}
                in total
              </p>
            </div>
            <p className="hl-body max-w-2xl text-hl-fg-secondary">
              The analysis returned “consider for further review” for these — neither a clear yes
              nor a clear no.
            </p>
            <DataTable
              rows={review}
              columns={reviewColumns}
              getRowId={(row) => row.candidate_id}
              getSearchText={(row) => `${row.name} ${row.campaign_title ?? ''}`}
              searchPlaceholder="Search candidates…"
              pageSize={10}
              initialSort={{ key: 'match', direction: 'desc' }}
              caption="Candidates flagged for a closer read"
            />
          </section>
        ) : null}

        {data.recent_activity.length > 0 ? (
          <Panel title="Recent activity" subtitle="The last events recorded in this workspace">
            <ul className="flex flex-col gap-2.5">
              {data.recent_activity.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-4 hl-small">
                  <span className="text-hl-fg-secondary">{e.summary}</span>
                  <span className="hl-mono shrink-0 text-hl-fg-tertiary">
                    {relativeTime(e.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    )
  }

  return (
    <AppShell breadcrumbs={ANALYTICS_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 pb-12 pt-6">
        <PageHeader
          title="Reports"
          // The time context, stated rather than implied. There is no date
          // filter and the endpoint applies no window, so every figure is
          // all-time. Saying so is cheaper than letting a reader assume these
          // are this month's numbers.
          description="Everything below covers your whole workspace, all time — there is no date range yet."
          actions={
            data ? (
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                <Download aria-hidden />
                Export CSV
              </Button>
            ) : undefined
          }
        />
        {body}
      </div>
    </AppShell>
  )
}
