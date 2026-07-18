'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy, Upload, Users } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { analyzeBatch } from '@/services/api';
import {
  getCampaign,
  listCandidates,
  persistBatch,
  updateCandidateStage,
} from '@/services/campaigns-api';
import type { Campaign, Candidate, PipelineStage } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const STAGES: PipelineStage[] = [
  'sourced', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected',
];

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, cands] = await Promise.all([getCampaign(id), listCandidates(id)]);
    setCampaign(c);
    setCandidates(sortByScore(cands));
  }, [id]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign'))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !campaign) return;
    if (!campaign.job_description?.trim()) {
      toast({ title: 'Add a job description first', description: 'Candidates are ranked against the JD.', variant: 'destructive' });
      return;
    }
    setAnalyzing(true);
    try {
      // 1) Existing, unchanged AI pipeline.
      const batch = await analyzeBatch(campaign.job_description, files);
      // 2) Persist the result under this campaign (no recompute).
      const stored = await persistBatch(id, batch);
      toast({ title: 'Analysis stored', description: `${stored.length} candidates added to the campaign.` });
      await refresh();
    } catch (err) {
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function changeStage(candidate: Candidate, stage: PipelineStage) {
    try {
      const updated = await updateCandidateStage(id, candidate.id, stage);
      setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, stage: updated.stage } : c)));
    } catch (err) {
      toast({ title: 'Could not update stage', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-destructive">{error || 'Not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/campaigns" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All campaigns
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{campaign.title}</h1>
              <Badge variant="secondary" className="capitalize">{campaign.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign.role_title || 'No role set'}
              {campaign.location ? ` · ${campaign.location}` : ''}
            </p>
          </div>
          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx"
              multiple
              hidden
              onChange={handleFiles}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {analyzing ? 'Analyzing…' : 'Analyze resumes'}
            </Button>
          </div>
        </div>

        {campaign.job_description ? (
          <details className="mb-6 rounded-2xl border border-border/60 bg-card p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium text-foreground">Job description</summary>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{campaign.job_description}</p>
          </details>
        ) : (
          <div className="mb-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            No job description yet — add one to rank candidates accurately.
          </div>
        )}

        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" /> Candidates ({candidates.length})
        </div>

        {candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No candidates yet. Click <strong>Analyze resumes</strong> to rank and store applicants.
          </div>
        ) : (
          <div className="grid gap-3">
            {candidates.map((c, i) => (
              <CandidateCard key={c.id} candidate={c} index={i} onStageChange={changeStage} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CandidateCard({
  candidate,
  index,
  onStageChange,
}: {
  candidate: Candidate;
  index: number;
  onStageChange: (c: Candidate, stage: PipelineStage) => void;
}) {
  const a = (candidate.latest_analysis?.result ?? {}) as Record<string, unknown>;
  const score = (a.overall_score as number) ?? (candidate.latest_analysis?.overall_score as number) ?? null;
  const category = (a.match_category as string) ?? '';

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
            {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
          </span>
          <div>
            <div className="font-medium text-foreground">{candidate.full_name || candidate.resume_filename || 'Candidate'}</div>
            <div className="text-xs text-muted-foreground">
              {candidate.email || 'No email'}
              {category ? ` · ${category}` : ''}
            </div>
          </div>
        </div>
        {score !== null && (
          <div className="text-right">
            <div className="text-lg font-semibold text-foreground">{score}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => onStageChange(candidate, s)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition ${
              candidate.stage === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-primary/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function sortByScore(cands: Candidate[]): Candidate[] {
  return [...cands].sort((a, b) => {
    const sa = (a.latest_analysis?.overall_score as number) ?? -1;
    const sb = (b.latest_analysis?.overall_score as number) ?? -1;
    return sb - sa;
  });
}
