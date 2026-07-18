'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { ErrorState } from '@/components/workspace/states';
import { Skeleton } from '@/components/ui/skeleton';
import { BarList, ChartCard, Funnel, Histogram, StatusBar, TrendBars } from '@/components/workspace/charts';
import { getAnalyticsOverview } from '@/services/campaigns-api';
import type { AnalyticsOverview, CandidateBrief } from '@/types/analytics';
import { scoreBg, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function InsightsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getAnalyticsOverview(80)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load insights'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Executive Intelligence</h1>
          <p className="text-sm text-muted-foreground">Everything happening across your hiring — from real analyses.</p>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !data ? null : (
          <div className="space-y-8">
            {/* Section 1 — Executive Overview */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<Briefcase className="h-5 w-5" />} label="Active campaigns" value={data.overview.active_campaigns} />
              <Stat icon={<Users className="h-5 w-5" />} label="Total candidates" value={data.overview.total_candidates} />
              <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Analysed" value={data.overview.analyzed_candidates} />
              <Stat icon={<Clock className="h-5 w-5" />} label="Awaiting analysis" value={data.overview.awaiting_analysis} tone={data.overview.awaiting_analysis > 0 ? 'amber' : undefined} />
              <Stat icon={<Target className="h-5 w-5" />} label="Avg. match score" value={data.overview.average_match_score ?? '—'} />
              <Stat icon={<Target className="h-5 w-5" />} label="Avg. ATS score" value={data.overview.average_ats_score ?? '—'} />
              <Stat icon={<Star className="h-5 w-5" />} label={`High quality (≥${data.overview.high_quality_threshold})`} value={data.overview.high_quality_candidates} tone="emerald" />
              <Stat icon={<Briefcase className="h-5 w-5" />} label="Total campaigns" value={data.overview.total_campaigns} />
            </section>

            {/* Section 2 — AI Intelligence */}
            <section>
              <SectionTitle icon={<Sparkles className="h-4 w-4" />}>AI Intelligence</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <InsightCard title="Strongest candidate" icon={<Award className="h-4 w-4 text-emerald-600" />}>
                  {data.ai_insights.strongest_candidate ? <CandidateLine c={data.ai_insights.strongest_candidate} metric={data.ai_insights.strongest_candidate.overall_score} /> : <Muted />}
                </InsightCard>
                <InsightCard title="Highest ATS score" icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />}>
                  {data.ai_insights.highest_ats_candidate ? <CandidateLine c={data.ai_insights.highest_ats_candidate} metric={data.ai_insights.highest_ats_candidate.ats_score} /> : <Muted />}
                </InsightCard>
                <InsightCard title="Strongest talent pool" icon={<Briefcase className="h-4 w-4 text-primary" />}>
                  {data.ai_insights.strongest_talent_pool ? (
                    <Link href={`/campaigns/${data.ai_insights.strongest_talent_pool.campaign_id}`} className="flex items-center justify-between hover:underline">
                      <span className="text-sm font-medium text-foreground">{data.ai_insights.strongest_talent_pool.campaign_title || 'Campaign'}</span>
                      <span className={cn('rounded-md px-1.5 py-0.5 text-sm font-semibold', scoreBg(data.ai_insights.strongest_talent_pool.average_score))}>
                        {data.ai_insights.strongest_talent_pool.average_score}
                      </span>
                    </Link>
                  ) : <Muted />}
                </InsightCard>
                <InsightCard title="Most requested but absent" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
                  <BarList data={data.ai_insights.common_missing_skills.slice(0, 5).map((s) => ({ label: s.skill, value: s.count }))} colorClass="bg-amber-500" emptyLabel="No gaps found" />
                </InsightCard>
                <InsightCard title="Most common technologies" icon={<Sparkles className="h-4 w-4 text-primary" />}>
                  <BarList data={data.ai_insights.top_technologies.slice(0, 5).map((s) => ({ label: s.skill, value: s.count }))} emptyLabel="No skills yet" />
                </InsightCard>
                <InsightCard title={`Needs manual review (${data.ai_insights.candidates_requiring_review_count})`} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
                  {data.ai_insights.candidates_requiring_review.length ? (
                    <ul className="space-y-1.5">
                      {data.ai_insights.candidates_requiring_review.slice(0, 4).map((c) => <li key={c.candidate_id}><CandidateLine c={c} metric={c.overall_score} small /></li>)}
                    </ul>
                  ) : <Muted />}
                </InsightCard>
              </div>
            </section>

            {/* Section 3 — Visual Analytics */}
            <section>
              <SectionTitle icon={<TrendingUp className="h-4 w-4" />}>Visual Analytics</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                <ChartCard title="Hiring funnel" subtitle="Candidates by pipeline stage"><Funnel data={data.charts.hiring_funnel} /></ChartCard>
                <ChartCard title="Candidate status"><StatusBar data={data.charts.status_breakdown} /></ChartCard>
                <ChartCard title="Match score distribution"><Histogram data={data.charts.match_distribution} /></ChartCard>
                <ChartCard title="ATS score distribution"><Histogram data={data.charts.ats_distribution} /></ChartCard>
                <ChartCard title="Top skills" subtitle="Across all analyzed candidates"><BarList data={data.charts.top_skills.slice(0, 8).map((s) => ({ label: s.skill, value: s.count }))} /></ChartCard>
                <ChartCard title="Experience distribution"><BarList data={data.charts.experience_distribution.map((e) => ({ label: e.range, value: e.count }))} /></ChartCard>
                <div className="md:col-span-2">
                  <ChartCard title="Upload trend" subtitle="Candidates added over time"><TrendBars data={data.charts.upload_trend} /></ChartCard>
                </div>
              </div>
            </section>

            {/* Section 4 — Action Center */}
            <section>
              <SectionTitle icon={<Target className="h-4 w-4" />}>Action Center</SectionTitle>
              <div className="grid gap-3 md:grid-cols-3">
                <ActionCard title="Awaiting review" count={data.action_center.awaiting_review_count} tone="amber">
                  {data.action_center.awaiting_review.length ? (
                    <ul className="space-y-1.5">
                      {data.action_center.awaiting_review.slice(0, 5).map((c) => (
                        <li key={c.candidate_id}>
                          <Link href={`/campaigns/${c.campaign_id}/candidates/${c.candidate_id}`} className="text-sm text-foreground hover:text-primary hover:underline">{c.name}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : <Muted label="All caught up" />}
                </ActionCard>
                <ActionCard title="Stale active campaigns" count={data.action_center.stale_active_campaigns_count} tone="amber">
                  {data.action_center.stale_active_campaigns.length ? (
                    <ul className="space-y-1.5">
                      {data.action_center.stale_active_campaigns.slice(0, 5).map((c) => (
                        <li key={c.campaign_id}>
                          <Link href={`/campaigns/${c.campaign_id}`} className="text-sm text-foreground hover:text-primary hover:underline">{c.title || 'Campaign'}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : <Muted label="None" />}
                </ActionCard>
                <ActionCard title="Analyses running" count={data.action_center.analyses_running}>
                  <Muted label={data.action_center.analyses_running > 0 ? 'In progress' : 'None running'} />
                </ActionCard>
              </div>
            </section>

            {/* Section 5 — Recent Activity */}
            <section>
              <SectionTitle icon={<ActivityIcon className="h-4 w-4" />}>Recent Activity</SectionTitle>
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                {data.recent_activity.length === 0 ? (
                  <Muted label="No activity yet" />
                ) : (
                  <ol className="relative space-y-3 border-l border-border pl-5">
                    {data.recent_activity.map((e) => (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="text-sm text-foreground">{e.summary || e.type}</div>
                        <div className="text-xs text-muted-foreground">{relativeTime(e.created_at)}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: 'emerald' | 'amber' }) {
  const toneCls = tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary';
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneCls)}>{icon}</span>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">{icon}{children}</h2>;
}
function InsightCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{title}</div>
      {children}
    </div>
  );
}
function ActionCard({ title, count, tone, children }: { title: string; count: number; tone?: 'amber'; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', tone === 'amber' && count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground')}>{count}</span>
      </div>
      {children}
    </div>
  );
}
function CandidateLine({ c, metric, small }: { c: CandidateBrief; metric: number | null; small?: boolean }) {
  return (
    <Link href={`/campaigns/${c.campaign_id}/candidates/${c.candidate_id}`} className="flex items-center justify-between gap-2 hover:underline">
      <span className={cn('truncate text-foreground', small ? 'text-sm' : 'font-medium')}>{c.name}</span>
      {metric != null && <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-sm font-semibold', scoreBg(metric))}>{metric}</span>}
    </Link>
  );
}
function Muted({ label = 'Not available' }: { label?: string }) {
  return <span className="text-sm text-muted-foreground">{label}</span>;
}
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  );
}
