'use client';

import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import {
  FileDown, RefreshCw, ClipboardList, Target, ThumbsDown,
  ShieldCheck, AlertTriangle, Clock, Users, Gauge, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/workspace/states';
import { generateInterview } from '@/services/interview-api';
import { exportInterviewPdf } from '@/lib/interview-pdf';
import type { InterviewGenerateRequest, InterviewPack } from '@/types/interview';
import { cn } from '@/lib/utils';

/**
 * V2 semantic tokens, not the raw Tailwind palette.
 *
 * These were light-mode tints — `bg-emerald-50`, `bg-rose-50`, and a
 * `bg-violet-50` competency chip that V2 bans outright. On the charcoal canvas
 * they rendered as near-white plates with dark type: bright light-mode chips
 * punched into a dark screen. The semantic tokens carry the same meanings and
 * are defined for both themes, and every one of these pairs a colour with a
 * WORD, so the meaning survives desaturation (V2 §21).
 */
const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'bg-hl-success-bg text-hl-success',
  Medium: 'bg-hl-info-bg text-hl-info',
  Hard: 'bg-hl-warning-bg text-hl-warning',
  Expert: 'bg-hl-danger-bg text-hl-danger',
};
const REC_TONE: Record<string, string> = {
  'Strong Hire': 'bg-hl-success-bg text-hl-success border-hl-success/40',
  Hire: 'bg-hl-success-bg text-hl-success border-hl-success/30',
  Borderline: 'bg-hl-warning-bg text-hl-warning border-hl-warning/40',
  'No Hire': 'bg-hl-danger-bg text-hl-danger border-hl-danger/40',
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
  // The last request made, so Regenerate repeats it verbatim. After a scoped
  // quick action ("Only behavioral"), regenerating re-runs just that scope —
  // a full-pack regeneration costs ~7K tokens where the scoped one costs ~2-4K.
  const lastRun = useRef<{ req: InterviewGenerateRequest; label: string; merge: boolean }>({
    req: { focus: 'blueprint' }, label: 'Full pack', merge: false,
  });

  const run = useCallback(async (req: InterviewGenerateRequest, label: string, merge = false) => {
    setLoading(true);
    setBusyLabel(label);
    setError(null);
    lastRun.current = { req, label, merge };
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
      <div className="rounded-hl-lg border border-hl-border bg-hl-subtle p-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-hl-md bg-hl-muted">
          {/* A clipboard, not a sparkle (V2 §8): what this prepares is an
              interview, and the icon should say so. */}
          <ClipboardList className="size-6 text-hl-fg-secondary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Interview workbench</h3>
        <p className="mx-auto mt-1 max-w-lg hl-body text-muted-foreground">
          Generate a complete, grounded interview plan — strategy, technical &amp; behavioral
          questions, skill verification, risk analysis, an interviewer scorecard, and a hiring
          recommendation.
        </p>
        {error && <p className="mt-3 hl-body text-hl-danger">{error}</p>}
        <Button className="mt-5" onClick={() => run({ focus: 'blueprint' }, 'Full pack')}>
          Generate interview pack
        </Button>
      </div>
    );
  }

  if (loading && !pack) return <GeneratingPack label={busyLabel} />;

  if (!pack) return <EmptyState title="No interview pack" description="Generate one to get started." icon={<ClipboardList className="size-6" />} />;

  const es = pack.executive_summary;
  const st = pack.interview_strategy;
  const fr = pack.final_recommendation;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      {/* Same surface as `Section` below: V2 takes elevation from the
          background step, not from a drop shadow (§7). This bar kept
          `bg-card`/`shadow-sm` through the colour sweep, so it sat one step
          BELOW the sections it heads while casting the only shadow on screen. */}
      <div className="flex flex-wrap items-center gap-2 rounded-hl-lg border border-hl-border bg-hl-subtle p-3">
        <span className="mr-1 hl-label text-muted-foreground">Interactive</span>
        {QUICK_ACTIONS.map((a) => (
          <Button key={a.label} variant="outline" size="sm" disabled={loading}
            onClick={() => run(a.req, a.label, a.req.focus !== 'blueprint')}>
            {loading && busyLabel === a.label ? (
              <span className="mr-1.5 inline-block h-0.5 w-4 overflow-hidden rounded-full bg-hl-muted align-middle" aria-hidden>
                <span className="hl-indeterminate block h-full w-1/3 rounded-full bg-[var(--hl-accent-secondary)]" />
              </span>
            ) : null}
            {a.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={loading}
            onClick={() => run(lastRun.current.req, lastRun.current.label, lastRun.current.merge)}>
            <RefreshCw className="mr-1.5 size-3.5" /> Regenerate
          </Button>
          <Button size="sm" onClick={() => exportInterviewPdf(pack)}>
            <FileDown className="mr-1.5 size-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {pack.degraded && (
        <div className="flex items-center gap-2 rounded-hl-md border border-hl-warning/40 bg-hl-warning-bg px-4 py-3 hl-body text-hl-warning">
          <AlertTriangle className="size-4 shrink-0" /> AI narrative was unavailable — this pack is derived from stored analysis.
        </div>
      )}

      {/* Executive Summary */}
      <Section title="Executive Summary" icon={<ClipboardList className="size-4 text-hl-fg-tertiary" />}>
        {es.who && <p className="hl-body text-foreground">{es.who}</p>}
        {es.why_shortlisted && <p className="mt-2 hl-body text-muted-foreground"><b className="text-foreground">Why shortlisted:</b> {es.why_shortlisted}</p>}
        {es.key_differentiators.length > 0 && <Bullets items={es.key_differentiators} className="mt-2" />}
      </Section>

      {/* Interview Plan */}
      <Section title="Interview Plan" icon={<Clock className="size-4 text-hl-fg-tertiary" />}>
        <div className="flex flex-wrap gap-4 hl-body">
          {st.recommended_duration_minutes > 0 && <Stat icon={<Clock className="size-4" />} label="Duration" value={`${st.recommended_duration_minutes} min`} />}
          {st.suggested_interviewer_profile && <Stat icon={<Users className="size-4" />} label="Interviewer" value={st.suggested_interviewer_profile} />}
        </div>
        {st.stages.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {st.stages.map((s, i) => (
              <li key={i} className="flex items-start gap-2 hl-body">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-hl-muted hl-caption text-hl-fg-secondary">{i + 1}</span>
                <span><b className="text-foreground">{s.name}</b>{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}{s.focus ? <span className="text-muted-foreground"> — {s.focus}</span> : null}</span>
              </li>
            ))}
          </ol>
        )}
        {st.priority_focus_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {/* Topic labels, not decisions — same neutral chip as the skill and
                competency chips they sit beside. Terracotta is reserved for
                things the reader can act on; these are read, not clicked. */}
            {st.priority_focus_areas.map((f, i) => <span key={i} className="rounded-full bg-hl-muted px-2 py-0.5 hl-badge text-hl-fg-secondary">{f}</span>)}
          </div>
        )}
      </Section>

      {/* Technical */}
      {pack.technical_questions.length > 0 && (
        <Section title="Technical Questions" icon={<Target className="size-4 text-hl-fg-tertiary" />}>
          <div className="space-y-3">
            {pack.technical_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <p className="flex flex-wrap items-center gap-2 hl-body-medium font-semibold text-foreground">
                  {q.question}
                  <span className={cn('rounded px-1.5 py-0.5 hl-badge', DIFFICULTY_TONE[q.difficulty] ?? 'bg-muted')}>{q.difficulty}</span>
                  {q.skill && <span className="rounded bg-hl-muted px-1.5 py-0.5 hl-badge text-hl-fg-secondary">{q.skill}</span>}
                </p>
                {q.reason && <p className="mt-1 hl-small text-muted-foreground"><b>Why:</b> {q.reason}</p>}
                {q.expected_answer && <p className="mt-1 hl-small text-muted-foreground"><b>Strong answer:</b> {q.expected_answer}</p>}
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
        <Section title="Behavioral Questions" icon={<Users className="size-4 text-hl-fg-tertiary" />}>
          <div className="space-y-3">
            {pack.behavioral_questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <p className="flex flex-wrap items-center gap-2 hl-body-medium font-semibold text-foreground">
                  {q.question}
                  {/* Was bg-violet-50/text-violet-700 — violet is banned (V2 §23). */}
                  {q.competency && <span className="rounded bg-hl-muted px-1.5 py-0.5 hl-badge text-hl-fg-secondary">{q.competency}</span>}
                </p>
                {q.reason && <p className="mt-1 hl-small text-muted-foreground"><b>Why:</b> {q.reason}</p>}
                {q.expected_answer && <p className="mt-1 hl-small text-muted-foreground"><b>Strong answer:</b> {q.expected_answer}</p>}
                {q.warning_signs.length > 0 && <MiniBullets label="Warning signs" items={q.warning_signs} tone="rose" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skill Verification */}
      {pack.skill_verifications.length > 0 && (
        <Section title="Skill Verification" icon={<CheckCircle2 className="size-4 text-hl-fg-tertiary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] hl-small">
              <thead><tr className="border-b border-border/60 text-left hl-label text-muted-foreground">
                <th className="px-2 py-1.5">Skill</th><th className="px-2 py-1.5">How to verify</th><th className="px-2 py-1.5">Confidence</th>
              </tr></thead>
              <tbody>
                {pack.skill_verifications.map((v, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{v.skill}</td>
                    <td className="px-2 py-2 text-muted-foreground">{v.verification_method}{v.hands_on_exercise ? <><br /><span className="hl-small"><b>Exercise:</b> {v.hands_on_exercise}</span></> : null}</td>
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
        <Section title="Risk Assessment" icon={<ThumbsDown className="size-4 text-hl-danger" />}>
          <div className="space-y-2">
            {pack.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-border/60 p-3 hl-body">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-hl-warning" />
                <div>
                  <p><b className="text-foreground">{r.category}</b> — <span className="text-muted-foreground">{r.detail}</span></p>
                  {r.how_to_investigate && <p className="mt-0.5 hl-small text-muted-foreground"><b>Investigate:</b> {r.how_to_investigate}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Scorecard */}
      {pack.scorecard.length > 0 && (
        <Section title="Interviewer Scorecard" icon={<Gauge className="size-4 text-hl-fg-tertiary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] hl-small">
              <thead><tr className="border-b border-border/60 text-left hl-label text-muted-foreground">
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
      <Section title="Final Recommendation" icon={<ShieldCheck className="size-4 text-hl-fg-tertiary" />}>
        {fr.recommendation && (
          <span className={cn('inline-block rounded-full border px-3 py-1 hl-badge', REC_TONE[fr.recommendation] ?? 'bg-muted')}>{fr.recommendation}</span>
        )}
        {fr.reasoning && <p className="mt-2 hl-body text-foreground">{fr.reasoning}</p>}
        {fr.uncertainty && <p className="mt-1 hl-body text-muted-foreground"><b>Uncertainty:</b> {fr.uncertainty}</p>}
      </Section>
    </div>
  );
}

/**
 * Generating a pack is a single ~11 second call with no streaming, and a
 * spinner over "Designing the interview…" reads as a hang long before it
 * returns. It cannot be made to arrive incrementally, and pretending otherwise
 * — a typing effect, a fake percentage — would be inventing progress the
 * backend never reports.
 *
 * So it says what is actually happening: a copper progress rule, the section
 * being written, and after a few seconds an honest note that the whole pack
 * arrives at once.
 */
function GeneratingPack({ label }: { label: string | null }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle py-16"
      role="status"
      aria-live="polite"
    >
      <p className="hl-body text-hl-fg-secondary">
        Writing the interview{label ? ` · ${label}` : ''}…
      </p>
      <span className="block h-0.5 w-28 overflow-hidden rounded-full bg-hl-muted" aria-hidden>
        <span className="hl-indeterminate block h-full w-1/3 rounded-full bg-[var(--hl-accent-secondary)]" />
      </span>
      {slow ? (
        <p className="hl-caption max-w-sm text-center text-hl-fg-tertiary">
          The pack is written in one pass — questions, evidence and scorecard
          arrive together rather than one at a time.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Section icons are chrome, and chrome is neutral.
 *
 * All seven were terracotta — the colour V2 reserves for the thing you can
 * act on. Nine accent-coloured glyphs down the page spend that meaning on
 * labels, so by the time the reader reaches "Export PDF" the colour no longer
 * says "this one". The two icons that stayed coloured are the two that carry a
 * judgement: Risk Assessment (danger) and its per-risk warning triangle.
 */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-hl-lg border border-hl-border bg-hl-subtle p-5">
      <h3 className="mb-3 flex items-center gap-2 hl-h3 text-foreground">{icon} {title}</h3>
      {children}
    </section>
  );
}
function Bullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 hl-small text-muted-foreground">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{it}
        </li>
      ))}
    </ul>
  );
}
function MiniBullets({ label, items, tone }: { label: string; items: string[]; tone: 'rose' | 'slate' }) {
  const cls = tone === 'rose' ? 'text-hl-danger' : 'text-muted-foreground';
  return (
    <div className="mt-1.5">
      <p className={cn('hl-label', cls)}>{label}</p>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((it, i) => <li key={i} className="flex items-start gap-2 hl-small text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />{it}</li>)}
      </ul>
    </div>
  );
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5">
      <span className="text-hl-fg-tertiary">{icon}</span>
      <div><p className="hl-label text-muted-foreground">{label}</p><p className="hl-body-medium text-foreground">{value}</p></div>
    </div>
  );
}
