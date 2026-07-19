'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, Loader2, RefreshCw, AlertTriangle, ShieldAlert, UserCheck, ListChecks,
  CheckCircle2, XCircle, EyeOff, Sparkles, Wrench, BookOpen, Clock, Layers,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, FeatureLockedState } from '@/components/workspace/states';
import { isFeatureGateError } from '@/lib/api-error';
import { scanAgent, listRecommendations, updateRecommendation } from '@/services/agent-api';
import type { AgentBriefing, ApprovalStatus, Recommendation } from '@/types/agent';
import { cn } from '@/lib/utils';

const SEVERITY_TONE: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-800 border-rose-200',
  high: 'bg-amber-100 text-amber-800 border-amber-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};
const STATUS_TONE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  dismissed: 'bg-slate-100 text-slate-600',
  executed: 'bg-violet-50 text-violet-700',
};

export default function AgentPage() {
  const [briefing, setBriefing] = useState<AgentBriefing | null>(null);
  const [pending, setPending] = useState<Recommendation[]>([]);
  const [completed, setCompleted] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async (scan: boolean) => {
    scan ? setScanning(true) : setLoading(true);
    setError(null);
    setLocked(false);
    try {
      const [scanRes, all] = await Promise.all([
        scan ? scanAgent() : listRecommendations('pending').then((r) => ({ recommendations: r, briefing, generated: 0, total_open: r.length })),
        listRecommendations(),
      ]);
      setPending(scanRes.recommendations);
      if (scan) setBriefing(scanRes.briefing);
      setCompleted(all.filter((r) => r.status !== 'pending'));
    } catch (e) {
      if (isFeatureGateError(e)) setLocked(true);
      else setError(e instanceof Error ? e.message : 'Agent scan failed');
    } finally {
      setLoading(false);
      setScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void load(true); }, [load]);

  const act = async (rec: Recommendation, status: ApprovalStatus) => {
    setPending((prev) => prev.filter((r) => r.id !== rec.id));
    try {
      const updated = await updateRecommendation(rec.id, status);
      setCompleted((prev) => [updated, ...prev]);
    } catch {
      setPending((prev) => [rec, ...prev]); // rollback
    }
  };

  const bySeverity = (a: Recommendation, b: Recommendation) =>
    ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 4) - ({ urgent: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 4);

  const urgent = pending.filter((r) => r.severity === 'urgent' || r.category === 'urgent').sort(bySeverity);
  const campaignRisks = pending.filter((r) => r.category === 'campaign_risk').sort(bySeverity);
  const candidateAlerts = pending.filter((r) => r.category === 'candidate_alert' && r.severity !== 'urgent').sort(bySeverity);
  const actions = pending.filter((r) => r.category === 'action').sort(bySeverity);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Recruiting Agent</h1>
              <p className="text-sm text-muted-foreground">Proactively watches your pipeline and recommends actions for your approval.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => load(true)} disabled={scanning || loading}>
            {scanning ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />} Run scan
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">The agent is reviewing your pipeline…</p>
          </div>
        ) : locked ? (
          <FeatureLockedState
            feature="Autonomous Agent"
            description="The proactive recruiting agent is part of a higher plan. Upgrade, or ask an org admin to enable the 'autonomous_agent' feature, to run scans."
          />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(true)} />
        ) : (
          <div className="space-y-6">
            {briefing && (briefing.headline || briefing.summary) && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground"><Sparkles className="size-4 text-primary" /> {briefing.headline}</p>
                {briefing.summary && <p className="mt-1.5 text-sm text-muted-foreground">{briefing.summary}</p>}
                {briefing.priorities.length > 0 && (
                  <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-foreground/80">
                    {briefing.priorities.map((p, i) => <li key={i}>{p}</li>)}
                  </ol>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {pending.length} pending approval{pending.length === 1 ? '' : 's'} · the agent never changes data without your approval
                </p>
              </div>
            )}

            {pending.length === 0 && completed.length === 0 ? (
              <EmptyState title="Nothing needs attention" description="Your pipeline looks healthy. Run a scan anytime." icon={<CheckCircle2 className="size-6" />} />
            ) : (
              <>
                <Group title="Urgent Alerts" icon={<ShieldAlert className="size-4 text-rose-600" />} recs={urgent} onAct={act} />
                <Group title="Candidate Alerts" icon={<UserCheck className="size-4 text-primary" />} recs={candidateAlerts} onAct={act} />
                <Group title="Campaign Risks" icon={<AlertTriangle className="size-4 text-amber-600" />} recs={campaignRisks} onAct={act} />
                <Group title="Recommended Actions" icon={<ListChecks className="size-4 text-primary" />} recs={actions} onAct={act} />
                {completed.length > 0 && (
                  <Group title="Completed" icon={<CheckCircle2 className="size-4 text-emerald-600" />} recs={completed} onAct={act} completed />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Group({ title, icon, recs, onAct, completed }: {
  title: string; icon: React.ReactNode; recs: Recommendation[];
  onAct: (r: Recommendation, s: ApprovalStatus) => void; completed?: boolean;
}) {
  if (recs.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {title} <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70">{recs.length}</span>
      </h2>
      <div className="space-y-3">
        {recs.map((r) => <Card key={r.id} rec={r} onAct={onAct} completed={completed} />)}
      </div>
    </section>
  );
}

function Card({ rec, onAct, completed }: { rec: Recommendation; onAct: (r: Recommendation, s: ApprovalStatus) => void; completed?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize', SEVERITY_TONE[rec.severity] ?? 'bg-muted')}>{rec.severity}</span>
            {completed && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', STATUS_TONE[rec.status] ?? 'bg-muted')}>{rec.status}</span>}
            <span className="text-[11px] text-muted-foreground">{rec.confidence}% confidence</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-foreground">{rec.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{rec.why}</p>
        </div>
        {!completed && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" onClick={() => onAct(rec, 'approved')}><CheckCircle2 className="mr-1 size-3.5" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => onAct(rec, 'rejected')}><XCircle className="mr-1 size-3.5" /> Reject</Button>
            <Button size="sm" variant="ghost" onClick={() => onAct(rec, 'dismissed')} title="Dismiss"><EyeOff className="size-3.5" /></Button>
          </div>
        )}
      </div>

      {rec.recommended_action && (
        <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground"><b>Recommended:</b> {rec.recommended_action}</p>
      )}

      <button onClick={() => setOpen((v) => !v)} className="mt-2 text-xs font-medium text-primary hover:underline">
        {open ? 'Hide' : 'Show'} evidence &amp; sources
      </button>
      {open && (
        <div className="mt-2 grid gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><BookOpen className="size-3" /> Evidence</p>
            <ul className="space-y-0.5">
              {rec.evidence.map((e, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{e}</li>)}
            </ul>
          </div>
          <div className="space-y-2">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><Layers className="size-3" /> Data sources</p>
              <div className="flex flex-wrap gap-1">{rec.data_sources.map((s, i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70">{s}</span>)}</div>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><Wrench className="size-3" /> Engine</p>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{rec.suggested_tool || '—'}</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {rec.campaign_title && <span className="inline-flex items-center gap-1"><Layers className="size-3" /> {rec.campaign_title}</span>}
        {rec.candidate_id && rec.campaign_id && (
          <Link href={`/campaigns/${rec.campaign_id}/candidates/${rec.candidate_id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <UserCheck className="size-3" /> {rec.candidate_name || 'Candidate'}
          </Link>
        )}
        {rec.created_at && <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {new Date(rec.created_at).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}
