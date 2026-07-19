'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, Loader2, FileDown, RefreshCw, Activity, TrendingUp, Users, Gauge,
  AlertTriangle, Lightbulb, Layers, ChevronDown, ChevronRight, HeartPulse,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { ErrorState, FeatureLockedState } from '@/components/workspace/states';
import { isFeatureGateError } from '@/lib/api-error';
import { generateExecutiveReport } from '@/services/report-api';
import { exportReportPdf } from '@/lib/report-pdf';
import type { ExecutiveReport } from '@/types/report';
import { cn } from '@/lib/utils';

const HEALTH_TONE: Record<string, string> = {
  Healthy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'At Risk': 'bg-amber-100 text-amber-800 border-amber-200',
  Critical: 'bg-rose-100 text-rose-800 border-rose-200',
};
const PRIORITY_TONE: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-700',
};

export default function ReportsPage() {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      setReport(await generateExecutiveReport({ focus: 'full' }));
    } catch (e) {
      if (isFeatureGateError(e)) setLocked(true);
      else setError(e instanceof Error ? e.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Executive Intelligence</h1>
              <p className="text-sm text-muted-foreground">What&apos;s happening in your hiring, why, and what to do.</p>
            </div>
          </div>
          {report && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className="mr-1.5 size-3.5" /> Regenerate
              </Button>
              <Button size="sm" onClick={() => exportReportPdf(report)}>
                <FileDown className="mr-1.5 size-3.5" /> Export PDF
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your hiring organization…</p>
          </div>
        ) : locked ? (
          <FeatureLockedState
            feature="Executive Reports"
            description="AI executive hiring reports are part of a higher plan. Upgrade, or ask an org admin to enable the 'executive_reports' feature, to generate them."
          />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : report ? (
          <Report report={report} />
        ) : null}
      </main>
    </div>
  );
}

function Report({ report }: { report: ExecutiveReport }) {
  const es = report.executive_summary;
  const m = report.metrics;
  const p = report.productivity;

  return (
    <div className="space-y-5">
      {report.degraded && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" /> AI narrative unavailable — showing grounded metrics only.
        </div>
      )}

      {/* Executive Summary */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <HeartPulse className="size-4 text-primary" /> Executive Summary
          </h2>
          {es.pipeline_health && (
            <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', HEALTH_TONE[es.pipeline_health] ?? 'bg-muted')}>
              Pipeline: {es.pipeline_health}
            </span>
          )}
        </div>
        {es.headline && <p className="mt-2 text-sm font-medium text-foreground">{es.headline}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Campaigns" value={`${m.total_campaigns}`} sub={`${m.active_campaigns} active`} />
          <Kpi label="Candidates" value={`${m.total_candidates}`} />
          <Kpi label="Analyzed" value={`${m.analyzed_candidates}`} />
          <Kpi label="Awaiting" value={`${m.awaiting_analysis}`} tone={m.awaiting_analysis > 0 ? 'warn' : undefined} />
          <Kpi label="Avg match" value={m.average_match_score != null ? `${m.average_match_score}` : '—'} />
          <Kpi label="High quality" value={`${m.high_quality_candidates}`} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MiniList title="What changed" items={es.whats_changed} icon={<TrendingUp className="size-3.5" />} />
          <MiniList title="Blockers" items={es.blockers} icon={<AlertTriangle className="size-3.5" />} />
          <MiniList title="Immediate attention" items={es.immediate_attention} icon={<Activity className="size-3.5" />} />
        </div>
      </section>

      {/* Campaign Intelligence */}
      <Insight title="Campaign Intelligence" icon={<Layers className="size-4 text-primary" />} defaultOpen>
        {report.campaign_insights.length > 0 && (
          <div className="mb-4 space-y-2">
            {report.campaign_insights.map((c) => (
              <div key={c.campaign_id || c.title} className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-semibold text-foreground">{c.title} — <span className="font-normal text-muted-foreground">{c.headline}</span></p>
                {c.explanation && <p className="mt-1 text-sm text-muted-foreground">{c.explanation}</p>}
                {c.concerns.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.concerns.map((x, i) => <span key={i} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700">{x}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="px-2 py-1.5">Campaign</th><th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5">Candidates</th><th className="px-2 py-1.5">Awaiting</th><th className="px-2 py-1.5">Avg match</th><th className="px-2 py-1.5">Last activity</th>
            </tr></thead>
            <tbody>
              {report.campaigns.map((c) => (
                <tr key={c.campaign_id} className="border-b border-border/40">
                  <td className="px-2 py-2 font-medium text-foreground">{c.title}</td>
                  <td className="px-2 py-2 capitalize text-muted-foreground">{c.status}</td>
                  <td className="px-2 py-2 tabular-nums">{c.total_candidates}</td>
                  <td className="px-2 py-2 tabular-nums">{c.awaiting_analysis}</td>
                  <td className="px-2 py-2 tabular-nums">{c.average_match_score ?? '—'}</td>
                  <td className={cn('px-2 py-2 tabular-nums', (c.days_since_activity ?? 0) > 14 && 'text-amber-600')}>
                    {c.days_since_activity != null ? `${c.days_since_activity}d ago` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Insight>

      {/* Recruiter Productivity */}
      <Insight title="Recruiter Productivity" icon={<Users className="size-4 text-primary" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Kpi label="Uploaded" value={`${p.resumes_uploaded}`} />
          <Kpi label="Analyzed" value={`${p.candidates_analyzed}`} />
          <Kpi label="Comparisons" value={`${p.comparisons_run}`} />
          <Kpi label="Interview packs" value={`${p.interview_packs_generated}`} />
          <Kpi label="Copilot" value={`${p.copilot_messages}`} />
          <Kpi label="Stage moves" value={`${p.stage_changes}`} />
          <Kpi label="Notes" value={`${p.notes_added}`} />
        </div>
        {report.productivity_recommendations.length > 0 && <Bullets items={report.productivity_recommendations} className="mt-4" />}
      </Insight>

      {/* Skill Gap */}
      <Insight title="Skill Gap Intelligence" icon={<Gauge className="size-4 text-primary" />}>
        {report.skill_gap_analysis.summary && <p className="mb-3 text-sm text-muted-foreground">{report.skill_gap_analysis.summary}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          <TagGroup title="Emerging demand" items={report.skill_gap_analysis.emerging_demand} tone="sky" />
          <TagGroup title="Oversaturated" items={report.skill_gap_analysis.oversaturated} tone="slate" />
          <TagGroup title="Hard to fill" items={report.skill_gap_analysis.hard_to_fill_roles} tone="rose" />
        </div>
      </Insight>

      {/* Hiring Risks */}
      {report.hiring_risks.length > 0 && (
        <Insight title="Hiring Risks" icon={<AlertTriangle className="size-4 text-rose-600" />} defaultOpen>
          <div className="space-y-2">
            {report.hiring_risks.map((r, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-semibold text-foreground">{r.category}</p>
                <p className="mt-1 text-xs text-muted-foreground"><b>Evidence:</b> {r.evidence}</p>
                <p className="text-xs text-muted-foreground"><b>Impact:</b> {r.impact}</p>
                <p className="text-xs text-primary"><b>Action:</b> {r.suggested_action}</p>
              </div>
            ))}
          </div>
        </Insight>
      )}

      {/* AI Recommendations */}
      {report.recommendations.length > 0 && (
        <Insight title="AI Recommendations" icon={<Lightbulb className="size-4 text-primary" />} defaultOpen>
          <div className="space-y-2">
            {report.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', PRIORITY_TONE[r.priority] ?? 'bg-muted')}>{r.priority}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  {r.rationale && <p className="text-xs text-muted-foreground">{r.rationale}</p>}
                  {r.evidence && <p className="text-xs text-muted-foreground"><b>Evidence:</b> {r.evidence}</p>}
                </div>
              </div>
            ))}
          </div>
        </Insight>
      )}

      {/* Talent Snapshot */}
      <Insight title="Talent Snapshot" icon={<TrendingUp className="size-4 text-primary" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <SkillBars title="Most common technologies" items={report.talent_snapshot.top_technologies} tone="primary" />
          <SkillBars title="Most common gaps" items={report.talent_snapshot.common_missing_skills} tone="rose" />
        </div>
      </Insight>

      {report.sources_used.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Grounded in: {report.sources_used.map((s) => s.source).join(' · ')}
        </p>
      )}
    </div>
  );
}

function Insight({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">{icon} {title}</span>
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border/50 p-6">{children}</div>}
    </section>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-bold text-foreground', tone === 'warn' && 'text-amber-600')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function MiniList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{icon} {title}</p>
      {items?.length ? <Bullets items={items} /> : <p className="text-sm text-muted-foreground">—</p>}
    </div>
  );
}
function Bullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{it}
        </li>
      ))}
    </ul>
  );
}
function TagGroup({ title, items, tone }: { title: string; items: string[]; tone: 'sky' | 'slate' | 'rose' }) {
  const cls = { sky: 'bg-sky-50 text-sky-700', slate: 'bg-slate-100 text-slate-700', rose: 'bg-rose-50 text-rose-700' }[tone];
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items?.length ? (
        <div className="flex flex-wrap gap-1.5">{items.map((s, i) => <span key={i} className={cn('rounded px-1.5 py-0.5 text-[11px]', cls)}>{s}</span>)}</div>
      ) : <p className="text-sm text-muted-foreground">—</p>}
    </div>
  );
}
function SkillBars({ title, items, tone }: { title: string; items: { skill: string; count: number }[]; tone: 'primary' | 'rose' }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const bar = tone === 'primary' ? 'bg-primary' : 'bg-rose-400';
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length ? (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((i) => (
            <div key={i.skill} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-foreground/80">{i.skill}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', bar)} style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{i.count}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">—</p>}
    </div>
  );
}
