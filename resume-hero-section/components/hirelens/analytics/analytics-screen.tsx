'use client'

import * as React from 'react'
import Link from 'next/link'
import { BarChart3, Download } from 'lucide-react'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useAnalyticsOverview } from '../lib/api/analytics'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { GateState } from '../states/gate-state'
import { usePermissionGate, PERMS } from '../lib/use-can'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { DataTable, type DataTableColumn } from '../ui/data-table'
import { ScoreMeter } from '../domain/score-meter'
import { BarList, ChartCard, Funnel, Histogram, StatusBar, TrendBars } from '@/components/workspace/charts'
import type { AnalyticsOverview, CandidateBrief, SkillCount } from '@/types/analytics'

const ANALYTICS_CRUMBS = [{ label: 'Analytics' }]

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
  const { session, loading, configured } = useSession()
  // The whole screen is one endpoint, `GET /analytics/overview`, gated by
  // `usage.view`. A recruiter reaching this URL used to get a full page of empty
  // charts built from a 403; now it says why. Export CSV needs no separate gate —
  // it serialises the overview already in memory and calls nothing.
  const gate = usePermissionGate(PERMS.USAGE_VIEW)

  if (!configured) {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={ANALYTICS_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
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
          title="Couldn't check your access"
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
  return <AuthedAnalytics />
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    // Analytics is a number-first surface: the figure carries the card and the
    // label supports it. `hl-metric` (40/600) against `hl-label` (13/620
    // uppercase) puts more than two scale steps between them, which is what
    // makes a KPI legible across a room rather than merely present.
    <Card className="flex flex-col gap-2 p-[var(--hl-card-pad)]">
      <p className="hl-label text-hl-fg-tertiary">{label}</p>
      <p className="hl-metric text-hl-fg">{value}</p>
      {note ? <p className="hl-caption text-hl-fg-tertiary">{note}</p> : null}
    </Card>
  )
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
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
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
    link.download = 'hirelens-analytics.csv'
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
        title="Couldn't load analytics"
        onRetry={() => analytics.refetch()}
      />
    )
  } else if (!data || data.overview.total_candidates === 0) {
    body = (
      <EmptyState
        icon={BarChart3}
        title="Nothing to measure yet"
        description="Analytics appear once candidates have been uploaded and analyzed."
      />
    )
  } else {
    const { overview, charts, ai_insights: insights } = data
    const review = insights.candidates_requiring_review

    body = (
      <div className="hl-stagger flex flex-col gap-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Active roles"
            value={String(overview.active_campaigns)}
            note={`${overview.total_campaigns} total`}
          />
          <Stat
            label="Candidates"
            value={String(overview.total_candidates)}
            note={`${overview.analyzed_candidates} analyzed · ${overview.awaiting_analysis} awaiting`}
          />
          <Stat
            label="Average match"
            value={
              overview.average_match_score === null
                ? '—'
                : `${Math.round(overview.average_match_score)}`
            }
            note={
              overview.average_ats_score === null
                ? undefined
                : `ATS ${Math.round(overview.average_ats_score)}`
            }
          />
          <Stat
            label="High quality"
            value={String(overview.high_quality_candidates)}
            note={`Scoring ${overview.high_quality_threshold} or above`}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Hiring funnel"
            subtitle="Candidates by pipeline stage"
            empty={charts.hiring_funnel.length === 0}
          >
            <Funnel data={charts.hiring_funnel} />
          </ChartCard>
          <ChartCard
            title="Analysis status"
            subtitle="Analyzed against awaiting analysis"
            empty={charts.status_breakdown.length === 0}
          >
            <StatusBar data={charts.status_breakdown} />
          </ChartCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Match score distribution"
            subtitle="How candidates score against their role"
            empty={charts.match_distribution.length === 0}
          >
            <Histogram data={charts.match_distribution} />
          </ChartCard>
          <ChartCard
            title="ATS score distribution"
            subtitle="Resume parse-ability"
            empty={charts.ats_distribution.length === 0}
          >
            <Histogram data={charts.ats_distribution} />
          </ChartCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Most common skills"
            subtitle="Across every analyzed candidate"
            empty={charts.top_skills.length === 0}
          >
            <BarList data={toBars(charts.top_skills)} />
          </ChartCard>
          <ChartCard
            title="Most common gaps"
            subtitle="Skills the roles ask for and candidates lack"
            empty={insights.common_missing_skills.length === 0}
          >
            <BarList data={toBars(insights.common_missing_skills)} />
          </ChartCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Experience distribution"
            subtitle="Years of experience"
            empty={charts.experience_distribution.length === 0}
          >
            <Histogram data={charts.experience_distribution} />
          </ChartCard>
          <ChartCard
            title="Upload volume"
            subtitle="Resumes received, most recent 30 days"
            empty={charts.upload_trend.length === 0}
          >
            <TrendBars data={charts.upload_trend} />
          </ChartCard>
        </section>

        {review.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="hl-h2">Awaiting your review</h2>
              <p className="hl-body text-hl-fg-tertiary">
                <span className="font-hl-mono tabular-nums">
                  {insights.candidates_requiring_review_count}
                </span>{' '}
                in total
              </p>
            </div>
            <DataTable
              rows={review}
              columns={reviewColumns}
              getRowId={(row) => row.candidate_id}
              getSearchText={(row) => `${row.name} ${row.campaign_title ?? ''}`}
              searchPlaceholder="Search candidates…"
              pageSize={10}
              initialSort={{ key: 'match', direction: 'desc' }}
              caption="Candidates awaiting review"
            />
          </section>
        ) : null}
      </div>
    )
  }

  return (
    <AppShell breadcrumbs={ANALYTICS_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pb-16 pt-10">
        <PageHeader
          title="Analytics"
          description="Pipeline health across every role you run."
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
