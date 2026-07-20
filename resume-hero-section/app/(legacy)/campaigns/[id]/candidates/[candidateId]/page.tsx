'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Download,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Spinner, ErrorState, EmptyState } from '@/components/workspace/states';
import {
  getCandidate,
  listNotes,
  createNote,
  deleteNote,
  candidateActivity,
  getResumeUrl,
} from '@/services/campaigns-api';
import type { Candidate, RecruiterNote, ActivityEvent } from '@/types/campaign';
import { toRow, HIRE_STYLES } from '@/lib/candidate';
import { InterviewIntelligence } from '@/components/interview/interview-intelligence';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { scoreBg, relativeTime, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type ExperienceEntry = { company?: string; role?: string; duration?: string; description?: string[] };
type EducationEntry = { institution?: string; degree?: string; duration?: string; gpa?: string };

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const { id, candidateId } = use(params);
  const { toast } = useToast();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<RecruiterNote[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    const [c, n, a] = await Promise.all([
      getCandidate(id, candidateId),
      listNotes(id, candidateId).catch(() => []),
      candidateActivity(id, candidateId).catch(() => []),
    ]);
    setCandidate(c);
    setNotes(n);
    setActivity(a);
    setError(null);
  }, [id, candidateId]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load candidate'))
      .finally(() => setLoading(false));
  }, [load]);

  async function addNote() {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const note = await createNote(id, candidateId, noteBody.trim());
      setNotes((p) => [note, ...p]);
      setNoteBody('');
      candidateActivity(id, candidateId).then(setActivity).catch(() => {});
    } catch (e) {
      toast({ title: 'Could not save note', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  }
  async function removeNote(noteId: string) {
    try {
      await deleteNote(id, candidateId, noteId);
      setNotes((p) => p.filter((x) => x.id !== noteId));
    } catch (e) {
      toast({ title: 'Could not delete note', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  }
  async function openResume() {
    try {
      const { url } = await getResumeUrl(id, candidateId);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast({ title: 'No resume available', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <Spinner label="Loading candidate…" />
      </div>
    );
  }
  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <ErrorState message={error || 'Candidate not found'} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} />
        </div>
      </div>
    );
  }

  const row = toRow(candidate);
  const result = (candidate.latest_analysis?.result ?? {}) as Record<string, unknown>;
  const resume = (result.resume_data ?? {}) as Record<string, unknown>;
  const experience = (resume.experience as ExperienceEntry[]) ?? [];
  const education = (resume.education as EducationEntry[]) ?? [];
  const skills = (resume.skills as string[]) ?? row.topSkills;
  const certifications = (resume.certifications as string[]) ?? [];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href={`/campaigns/${id}`} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to campaign
        </Link>

        {/* header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{row.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {row.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{row.email}</span>}
              {resume.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{String(resume.phone)}</span> : null}
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', HIRE_STYLES[row.hire])}>{row.hire}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreBadge label="Match" value={row.overallScore} />
            <ScoreBadge label="ATS" value={row.atsScore} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/search?similar=${candidateId}&campaign=${id}`}>
                <Users className="mr-1.5 h-4 w-4" /> Find similar
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={openResume} disabled={!row.resumePath}>
              <Download className="mr-1.5 h-4 w-4" /> Resume
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="interview">
            <InterviewIntelligence campaignId={id} candidateId={candidateId} />
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            {row.summary && (
              <Section title="Summary">
                <p className="text-sm text-foreground">{row.summary}</p>
              </Section>
            )}
            <Section title="Skills" icon={<Sparkles className="h-4 w-4" />}>
              {skills.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s, i) => (
                    <span key={`${s}-${i}`} className="rounded-md bg-primary/5 px-2 py-0.5 text-xs text-primary">{s}</span>
                  ))}
                </div>
              ) : <Muted />}
            </Section>
            <Section title="Experience" icon={<Briefcase className="h-4 w-4" />}>
              {experience.length ? (
                <ul className="space-y-3">
                  {experience.map((e, i) => (
                    <li key={i} className="border-l-2 border-border pl-3">
                      <div className="font-medium text-foreground">{e.role || 'Role'}{e.company ? ` · ${e.company}` : ''}</div>
                      {e.duration && <div className="text-xs text-muted-foreground">{e.duration}</div>}
                      {Array.isArray(e.description) && e.description.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
                          {e.description.slice(0, 4).map((d, j) => <li key={j}>{d}</li>)}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <Muted />}
            </Section>
            <Section title="Education" icon={<GraduationCap className="h-4 w-4" />}>
              {education.length ? (
                <ul className="space-y-2">
                  {education.map((e, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-foreground">{e.degree || 'Degree'}</span>
                      {e.institution ? <span className="text-muted-foreground"> · {e.institution}</span> : null}
                      {e.gpa ? <span className="text-muted-foreground"> · {e.gpa}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : <Muted />}
            </Section>
            {certifications.length > 0 && (
              <Section title="Certifications" icon={<Award className="h-4 w-4" />}>
                <div className="flex flex-wrap gap-1.5">
                  {certifications.map((c, i) => (
                    <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c}</span>
                  ))}
                </div>
              </Section>
            )}
          </TabsContent>

          {/* AI Analysis */}
          <TabsContent value="ai" className="space-y-4">
            {row.status !== 'analyzed' ? (
              <EmptyState title="Not analyzed yet" description="Run analysis to see AI insights for this candidate." icon={<Sparkles className="h-6 w-6" />} />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile label="Overall match" value={row.overallScore} />
                  <StatTile label="ATS score" value={row.atsScore} />
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Hiring recommendation</div>
                    <span className={cn('mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium', HIRE_STYLES[row.hire])}>{row.hire}</span>
                  </div>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">
                  The recommendation reflects <b>overall fit to this role</b> — match score, experience, strengths and risks —
                  and is intentionally independent of the <b>ATS score</b>, which only measures resume formatting and
                  keyword readiness. A resume can be ATS-perfect yet a weak fit (or vice-versa).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Section title="Strengths"><ChipList items={row.strengths} tone="emerald" /></Section>
                  <Section title="Weaknesses"><ChipList items={row.weaknesses} tone="rose" /></Section>
                </div>
                <Section title="Missing skills"><ChipList items={row.missingSkills} tone="amber" /></Section>
                <Section title="Why this recommendation">
                  <p className="text-sm text-foreground">{row.recommendationText || row.matchCategory || '—'}</p>
                </Section>
              </>
            )}
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="space-y-4">
            <Section title="Add a note">
              <div className="space-y-2">
                <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} placeholder="Interview feedback, next steps…" />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addNote} disabled={savingNote || !noteBody.trim()}>
                    {savingNote && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save note
                  </Button>
                </div>
              </div>
            </Section>
            {notes.length === 0 ? (
              <EmptyState title="No notes yet" description="Add the first note about this candidate." />
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="group flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
                    </div>
                    <button onClick={() => removeNote(n.id)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label="Delete note">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions on this candidate will appear here." />
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-5">
                {activity.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="text-sm text-foreground">{e.summary || e.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(e.created_at)} · {relativeTime(e.created_at)}</div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">{icon}{title}</div>
      {children}
    </div>
  );
}
function Muted() {
  return <span className="text-sm text-muted-foreground">Not provided</span>;
}
function ScoreBadge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      {value != null ? (
        <span className={cn('inline-block rounded-lg px-2.5 py-1 text-lg font-semibold', scoreBg(value))}>{value}</span>
      ) : (
        <span className="text-lg text-muted-foreground">—</span>
      )}
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
function StatTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold', value != null ? '' : 'text-muted-foreground')}>{value ?? '—'}</div>
    </div>
  );
}
function ChipList({ items, tone }: { items: string[]; tone: 'emerald' | 'rose' | 'amber' }) {
  const cls = { emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700' }[tone];
  if (!items.length) return <Muted />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => <span key={`${s}-${i}`} className={cn('rounded-md px-2 py-0.5 text-xs', cls)}>{s}</span>)}
    </div>
  );
}
