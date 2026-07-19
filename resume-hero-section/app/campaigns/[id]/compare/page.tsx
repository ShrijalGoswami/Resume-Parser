'use client';

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Trophy, Medal, ShieldCheck, AlertTriangle, Target, Scale,
  ThumbsUp, ThumbsDown, Lightbulb, BookOpen, Loader2, Sparkles,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { ErrorState } from '@/components/workspace/states';
import { compareCandidates } from '@/services/comparison-api';
import type { CandidateComparisonReport } from '@/types/comparison';
import { cn } from '@/lib/utils';

const RECOMMENDATION_TONE: Record<string, string> = {
  'Strong Hire': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Hire: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Maybe: 'bg-amber-50 text-amber-700 border-amber-200',
  Reject: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <Suspense fallback={<CenterLoader />}>
        <CompareWorkspace campaignId={id} />
      </Suspense>
    </div>
  );
}

function CompareWorkspace({ campaignId }: { campaignId: string }) {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('candidates') || '';
  const candidateIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

  const [report, setReport] = useState<CandidateComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await compareCandidates(campaignId, candidateIds));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, idsParam]);

  useEffect(() => {
    if (candidateIds.length < 2 || candidateIds.length > 5) {
      setError('Select between 2 and 5 candidates to compare.');
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/campaigns/${campaignId}`} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to campaign
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Scale className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">AI Candidate Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Executive hiring analysis grounded in stored candidate data.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing {candidateIds.length} candidates…</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={candidateIds.length >= 2 && candidateIds.length <= 5 ? load : undefined} />
      ) : report ? (
        <Report report={report} />
      ) : null}
    </main>
  );
}

function Report({ report }: { report: CandidateComparisonReport }) {
  const es = report.executive_summary;
  return (
    <div className="space-y-6">
      {report.degraded && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          AI narrative was unavailable — this comparison is derived deterministically from stored scores.
        </div>
      )}

      {/* Executive Summary */}
      <Section title="Executive Summary" icon={<Trophy className="size-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Highlight icon={<Trophy className="size-4 text-amber-500" />} label="Best overall" value={es.best_candidate_name || '—'} />
          <Highlight icon={<Medal className="size-4 text-slate-400" />} label="Runner-up" value={es.runner_up_name || '—'} />
          <Meter label="Hiring confidence" value={es.hiring_confidence} />
          <Meter label="Comparison confidence" value={es.comparison_confidence} />
        </div>
        {es.overall_recommendation && (
          <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">
            {es.overall_recommendation}
          </p>
        )}
        {es.summary && <p className="mt-3 text-sm text-muted-foreground">{es.summary}</p>}
      </Section>

      {/* Candidate Ranking */}
      {report.rankings.length > 0 && (
        <Section title="Candidate Ranking" icon={<Medal className="size-4 text-primary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Candidate</th>
                  <th className="px-3 py-2">Overall</th>
                  <th className="px-3 py-2">AI Match</th>
                  <th className="px-3 py-2">ATS</th>
                  <th className="px-3 py-2">Experience</th>
                  <th className="px-3 py-2">Strength</th>
                  <th className="px-3 py-2">Weakness</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {[...report.rankings].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((r) => (
                  <tr key={r.candidate_id} className="border-b border-border/40">
                    <td className="px-3 py-2.5 font-bold text-foreground">{r.rank}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2.5"><ScorePill value={r.overall_score} /></td>
                    <td className="px-3 py-2.5 tabular-nums">{r.ai_match ? `${Math.round(r.ai_match)}%` : '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.ats_score || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.experience_summary || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-emerald-700">{r.strength_summary || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-rose-700">{r.weakness_summary || '—'}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/campaigns/${report.campaign_id}/candidates/${r.candidate_id}`}
                        className="whitespace-nowrap text-xs font-medium text-primary hover:underline">
                        Interview pack →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Skill Matrix */}
      {report.skill_matrix.length > 0 && (
        <Section title="Skill Matrix" icon={<Target className="size-4 text-primary" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {report.skill_matrix.map((s) => (
              <div key={s.candidate_id} className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 font-semibold text-foreground">{s.name}</p>
                <SkillRow label="Required" items={s.required_skills} tone="emerald" />
                <SkillRow label="Preferred" items={s.preferred_skills} tone="sky" />
                <SkillRow label="Unique" items={s.unique_skills} tone="violet" />
                <SkillRow label="Transferable" items={s.transferable_skills} tone="slate" />
                <SkillRow label="Missing" items={s.missing_skills} tone="rose" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Strengths */}
      {report.strengths.length > 0 && (
        <Section title="Strength Analysis" icon={<ThumbsUp className="size-4 text-emerald-600" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {report.strengths.map((s) => (
              <div key={s.candidate_id} className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 font-semibold text-foreground">{s.name}</p>
                <MiniList label="Technical" items={s.technical_strengths} />
                <MiniList label="Domain" items={s.domain_strengths} />
                <MiniList label="Communication" items={s.communication_indicators} />
                <MiniList label="Leadership" items={s.leadership_indicators} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {report.risks.some((r) => r.risks.length > 0) && (
        <Section title="Risk Analysis" icon={<ThumbsDown className="size-4 text-rose-600" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {report.risks.map((r) => (
              <div key={r.candidate_id} className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 font-semibold text-foreground">{r.name}</p>
                {r.risks.length ? (
                  <ul className="space-y-1.5">
                    {r.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        <span><span className="font-medium text-foreground">{risk.category}:</span> <span className="text-muted-foreground">{risk.detail}</span></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No significant risks identified.</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Hiring Recommendation */}
      {report.hiring_recommendations.length > 0 && (
        <Section title="Hiring Recommendation" icon={<ShieldCheck className="size-4 text-primary" />}>
          <div className="space-y-3">
            {report.hiring_recommendations.map((v) => (
              <div key={v.candidate_id} className="flex flex-wrap items-start gap-3 rounded-xl border border-border/60 p-4">
                <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold', RECOMMENDATION_TONE[v.recommendation] ?? 'bg-muted text-foreground')}>
                  {v.recommendation || 'N/A'}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{v.name}</p>
                  <p className="text-sm text-muted-foreground">{v.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Interview Focus */}
      {report.interview_focus.length > 0 && (
        <Section title="Interview Focus" icon={<Target className="size-4 text-primary" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {report.interview_focus.map((f) => (
              <div key={f.candidate_id} className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 font-semibold text-foreground">{f.name}</p>
                <MiniList label="Technical topics" items={f.technical_topics} />
                <MiniList label="Behavioral topics" items={f.behavioral_topics} />
                <MiniList label="Verify" items={f.weak_areas_to_verify} />
                {f.suggested_questions.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Suggested questions</p>
                    <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                      {f.suggested_questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Trade-off Analysis */}
      {report.tradeoffs.length > 0 && (
        <Section title="Trade-off Analysis" icon={<Scale className="size-4 text-primary" />}>
          <div className="space-y-3">
            {report.tradeoffs.map((t, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">{t.scenario} → <span className="text-primary">{t.choose_name}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{t.reasoning}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sources + Copilot hint */}
      {report.sources_used.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="size-3" /> Sources
          </span>
          {report.sources_used.map((s, i) => (
            <span key={`${s.source}-${i}`} title={s.detail} className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground/70">
              {s.source}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <Sparkles className="size-4 text-primary" />
        Ask the Copilot follow-ups like <span className="font-medium">“Who is the safer hire?”</span> or <span className="font-medium">“Why is {es.best_candidate_name || 'the top candidate'} ranked first?”</span>
      </div>
    </div>
  );
}

// ── Presentational helpers ──────────────────────────────────────────────────
function CenterLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">{icon} {title}</h2>
      {children}
    </section>
  );
}

function Highlight({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
      {icon}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span><span className="font-bold text-foreground">{v}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = value >= 80 ? 'bg-emerald-100 text-emerald-800' : value >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
  return <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-sm font-semibold', tone)}>{Math.round(value)}</span>;
}

function SkillRow({ label, items, tone }: { label: string; items: string[]; tone: 'emerald' | 'sky' | 'violet' | 'slate' | 'rose' }) {
  if (!items?.length) return null;
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone];
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((s, i) => <span key={`${s}-${i}`} className={cn('rounded px-1.5 py-0.5 text-[11px]', cls)}>{s}</span>)}
      </div>
    </div>
  );
}

function MiniList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mb-2">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Lightbulb className="size-3" /> {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{it}
          </li>
        ))}
      </ul>
    </div>
  );
}
