'use client';

import { useCallback, useState } from 'react';
import {
  Sparkles, Loader2, FileDown, RefreshCw, ClipboardList, Target, ThumbsDown,
  ShieldCheck, AlertTriangle, Clock, Users, Gauge, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/workspace/states';
import { generateInterview } from '@/services/interview-api';
import { exportInterviewPdf } from '@/lib/interview-pdf';
import type { InterviewGenerateRequest, InterviewPack } from '@/types/interview';
import { cn } from '@/lib/utils';

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700',
  Medium: 'bg-sky-50 text-sky-700',
  Hard: 'bg-amber-50 text-amber-700',
  Expert: 'bg-rose-50 text-rose-700',
};
const REC_TONE: Record<string, string> = {
  'Strong Hire': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Hire: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Borderline: 'bg-amber-50 text-amber-700 border-amber-200',
  'No Hire': 'bg-rose-50 text-rose-700 border-rose-200',
};

const QUICK_ACTIONS: { label: string; req: InterviewGenerateRequest }[] = [
  { label: 'Full pack', req: { focus: 'blueprint' } },
  { label: 'Harder questions', req: { focus: 'technical', instruction: 'Generate harder, expert-level technical questions.', sections: ['technical_questions'] } },
  { label: 'Only behavioral', req: { focus: 'behavioral', instruction: 'Focus on behavioral questions only.', sections: ['behavioral_questions'] } },
  { label: 'System design', req: { focus: 'technical', instruction: 'Focus on system design questions.', sections: ['technical_questions'] } },
  { label: 'Coding round', req: { focus: 'technical', instruction: 'Design a hands-on coding round.', sections: ['technical_questions', 'skill_verifications'] } },
];

function mergePack(prev: InterviewPack | null, next: InterviewPack): InterviewPack {
  if (!prev) return next;
  // Merge non-empty sections over the previous pack (interactive refinement).
  return {
    ...prev,
    ...next,
    executive_summary: next.executive_summary?.who || next.executive_summary?.why_shortlisted ? next.executive_summary : prev.executive_summary,
    interview_strategy: next.interview_strategy?.stages?.length || next.interview_strategy?.recommended_duration_minutes ? next.interview_strategy : prev.interview_strategy,
    technical_questions: next.technical_questions?.length ? next.technical_questions : prev.technical_questions,
    behavioral_questions: next.behavioral_questions?.length ? next.behavioral_questions : prev.behavioral_questions,
    skill_verifications: next.skill_verifications?.length ? next.skill_verifications : prev.skill_verifications,
    risks: next.risks?.length ? next.risks : prev.risks,
    scorecard: next.scorecard?.length ? next.scorecard : prev.scorecard,
    final_recommendation: next.final_recommendation?.recommendation ? next.final_recommendation : prev.final_recommendation,
  };
}

export function InterviewIntelligence({
  campaignId, candidateId,
}: { campaignId: string; candidateId: string }) {
  const [pack, setPack] = useState<InterviewPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (req: InterviewGenerateRequest, label: string, merge = false) => {
    setLoading(true);
    setBusyLabel(label);
    setError(null);
    try {
      const res = await generateInterview(campaignId, candidateId, req);
      setPack((prev) => (merge ? mergePack(prev, res) : res));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview generation failed');
    } finally {
      setLoading(false);
      setBusyLabel(null);
    }
  }, [campaignId, candidateId]);

  if (!pack && !loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">AI Interview Workbench</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Generate a complete, grounded interview plan — strategy, technical &amp; behavioral
          questions, skill verification, risk analysis, an interviewer scorecard, and a hiring
          recommendation.
        </p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <Button className="mt-5" onClick={() => run({ focus: 'blueprint' }, 'Full pack')}>
          <Sparkles className="mr-1.5 size-4" /> Generate interview pack
        </Button>
      </div>
    );
  }

  if (loading && !pack) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-16 shadow-sm">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Designing the interview{busyLabel ? ` · ${busyLabel}` : ''}…</p>
      </div>
    );
  }

  if (!pack) return <EmptyState title="No interview pack" description="Generate one to get started." icon={<ClipboardList className="size-6" />} />;

  const es = pack.executive_summary;
  const st = pack.interview_strategy;
  const fr = pack.final_recommendation;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <span className="mr-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Interactive</span>
        {QUICK_ACTIONS.map((a) => (
          <Button key={a.label} variant="outline" size="sm" disabled={loading}
            onClick={() => run(a.req, a.label, a.req.focus !== 'blueprint')}>
            {loading && busyLabel === a.label ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {a.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => run({ focus: 'blueprint' }, 'Full pack')}>
            <RefreshCw className="mr-1.5 size-3.5" /> Regenerate
          </Button>
          <Button size="sm" onClick={() => exportInterviewPdf(pack)}>
            <FileDown className="mr-1.5 size-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {pack.degraded && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" /> AI narrative was unavailable — this pack is derived from stored analysis.
        </div>
      )}

      {/* Executive Summary */}
      <Section title="Executive Summary" icon={<ClipboardList className="size-4 text-primary" />}>
        {es.who && <p className="text-sm text-foreground">{es.who}</p>}
        {es.why_shortlisted && <p className="mt-2 text-sm text-muted-foreground"><b className="text-foreground">Why shortlisted:</b> {es.why_shortlisted}</p>}
        {es.key_differentiators.length > 0 && <Bullets items={es.key_differentiators} className="mt-2" />}
      </Section>

      {/* Interview Plan */}
      <Section title="Interview Plan" icon={<Clock className="size-4 text-primary" />}>
        <div className="flex flex-wrap gap-4 text-sm">
          {st.recommended_duration_minutes > 0 && <Stat icon={<Clock className="size-4" />} label="Duration" value={`${st.recommended_duration_minutes} min`} />}
          {st.suggested_interviewer_profile && <Stat icon={<Users className="size-4" />} label="Interviewer" value={st.suggested_interviewer_profile} />}
        </div>
        {st.stages.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {st.stages.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                <span><b className="text-foreground">{s.name}</b>{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}{s.focus ? <span className="text-muted-foreground"> — {s.focus}</span> : null}</span>
              </li>
            ))}
          </ol>
        )}
        {st.priority_focus_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {st.priority_focus_areas.map((f, i) => <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{f}</span>)}
          </div>
        )}
      </Section>

      {/* Technical */}
      {pack.technical_questions.length > 0 && (
        <Section title="Technical Questions" icon={<Target className="size-4 text-primary" />}>
          <div className="space-y-3">
            {pack.technical_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {q.question}
                  <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-bold', DIFFICULTY_TONE[q.difficulty] ?? 'bg-muted')}>{q.difficulty}</span>
                  {q.skill && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">{q.skill}</span>}
                </p>
                {q.reason && <p className="mt-1 text-xs text-muted-foreground"><b>Why:</b> {q.reason}</p>}
                {q.expected_answer && <p className="mt-1 text-xs text-muted-foreground"><b>Strong answer:</b> {q.expected_answer}</p>}
                {q.red_flags.length > 0 && <MiniBullets label="Red flags" items={q.red_flags} tone="rose" />}
                {q.evaluation_criteria.length > 0 && <MiniBullets label="Evaluation" items={q.evaluation_criteria} tone="slate" />}
                {q.followups.length > 0 && <MiniBullets label="Follow-ups" items={q.followups} tone="slate" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Behavioral */}
      {pack.behavioral_questions.length > 0 && (
        <Section title="Behavioral Questions" icon={<Users className="size-4 text-primary" />}>
          <div className="space-y-3">
            {pack.behavioral_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {q.question}
                  {q.competency && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">{q.competency}</span>}
                </p>
                {q.reason && <p className="mt-1 text-xs text-muted-foreground"><b>Why:</b> {q.reason}</p>}
                {q.expected_answer && <p className="mt-1 text-xs text-muted-foreground"><b>Strong answer:</b> {q.expected_answer}</p>}
                {q.warning_signs.length > 0 && <MiniBullets label="Warning signs" items={q.warning_signs} tone="rose" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skill Verification */}
      {pack.skill_verifications.length > 0 && (
        <Section title="Skill Verification" icon={<CheckCircle2 className="size-4 text-primary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="px-2 py-1.5">Skill</th><th className="px-2 py-1.5">How to verify</th><th className="px-2 py-1.5">Confidence</th>
              </tr></thead>
              <tbody>
                {pack.skill_verifications.map((v, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{v.skill}</td>
                    <td className="px-2 py-2 text-muted-foreground">{v.verification_method}{v.hands_on_exercise ? <><br /><span className="text-xs"><b>Exercise:</b> {v.hands_on_exercise}</span></> : null}</td>
                    <td className="px-2 py-2">{v.confidence_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Risk */}
      {pack.risks.length > 0 && (
        <Section title="Risk Assessment" icon={<ThumbsDown className="size-4 text-rose-600" />}>
          <div className="space-y-2">
            {pack.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-border/60 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div>
                  <p><b className="text-foreground">{r.category}</b> — <span className="text-muted-foreground">{r.detail}</span></p>
                  {r.how_to_investigate && <p className="mt-0.5 text-xs text-muted-foreground"><b>Investigate:</b> {r.how_to_investigate}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Scorecard */}
      {pack.scorecard.length > 0 && (
        <Section title="Interviewer Scorecard" icon={<Gauge className="size-4 text-primary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="px-2 py-1.5">Category</th><th className="px-2 py-1.5">Weight</th><th className="px-2 py-1.5">Focus</th><th className="px-2 py-1.5">Score</th>
              </tr></thead>
              <tbody>
                {pack.scorecard.map((c, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{c.category}</td>
                    <td className="px-2 py-2 tabular-nums">{c.weight}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.suggested_focus || c.notes || '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground">☐ / 5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Recommendation */}
      <Section title="Final Recommendation" icon={<ShieldCheck className="size-4 text-primary" />}>
        {fr.recommendation && (
          <span className={cn('inline-block rounded-full border px-3 py-1 text-sm font-semibold', REC_TONE[fr.recommendation] ?? 'bg-muted')}>{fr.recommendation}</span>
        )}
        {fr.reasoning && <p className="mt-2 text-sm text-foreground">{fr.reasoning}</p>}
        {fr.uncertainty && <p className="mt-1 text-sm text-muted-foreground"><b>Uncertainty:</b> {fr.uncertainty}</p>}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">{icon} {title}</h3>
      {children}
    </section>
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
function MiniBullets({ label, items, tone }: { label: string; items: string[]; tone: 'rose' | 'slate' }) {
  const cls = tone === 'rose' ? 'text-rose-600' : 'text-muted-foreground';
  return (
    <div className="mt-1.5">
      <p className={cn('text-[11px] font-bold uppercase tracking-wide', cls)}>{label}</p>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((it, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{it}</li>)}
      </ul>
    </div>
  );
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5">
      <span className="text-primary">{icon}</span>
      <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground">{value}</p></div>
    </div>
  );
}
