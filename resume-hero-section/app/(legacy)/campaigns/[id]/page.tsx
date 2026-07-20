'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Upload, Users } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { getCampaign, listCandidates } from '@/services/campaigns-api';
import type { Campaign, Candidate } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState } from '@/components/workspace/states';
import { CandidateTable } from '@/components/workspace/candidate-table';
import { UploadPanel } from '@/components/workspace/upload-panel';
import { STATUS_STYLES } from '@/lib/format';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [candLoading, setCandLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCandLoading(true);
    try {
      const [c, cands] = await Promise.all([getCampaign(id), listCandidates(id)]);
      setCampaign(c);
      setCandidates(cands);
      setError(null);
    } finally {
      setCandLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign'))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <Spinner label="Loading campaign…" />
      </div>
    );
  }
  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <ErrorState message={error} onRetry={() => { setLoading(true); refresh().finally(() => setLoading(false)); }} />
        </div>
      </div>
    );
  }
  if (!campaign) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/campaigns" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All campaigns
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{campaign.title}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[campaign.status] ?? 'bg-muted'}`}>
                {campaign.status}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {campaign.company && (
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{campaign.company}</span>
              )}
              <span>{campaign.role_title || 'No role set'}</span>
              {campaign.location && <span>{campaign.location}</span>}
              <span>{campaign.total_candidates ?? candidates.length} candidates</span>
            </p>
          </div>
          <div>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload resumes
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
          <Users className="h-4 w-4" /> Candidates
        </div>

        <CandidateTable
          candidates={candidates}
          campaignId={id}
          loading={candLoading && candidates.length === 0}
          error={error}
          onChanged={refresh}
          onRetry={refresh}
        />
      </main>

      {uploadOpen && (
        <UploadPanel
          campaignId={id}
          jobDescription={campaign.job_description}
          existingFilenames={candidates.map((c) => c.resume_filename || '').filter(Boolean)}
          onCandidateAdded={refresh}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}
