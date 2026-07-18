'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { listCampaigns } from '@/services/campaigns-api';
import type { Campaign, CampaignStatus } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FILTERS: (CampaignStatus | 'all')[] = ['all', 'draft', 'active', 'paused', 'archived'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listCampaigns(filter === 'all' ? undefined : filter)
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaigns'))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Campaigns</h1>
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-1.5 h-4 w-4" /> New campaign
            </Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/5 text-primary hover:bg-primary/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No campaigns in this view.
          </div>
        ) : (
          <div className="grid gap-3">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40"
              >
                <div>
                  <div className="font-medium text-foreground">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.role_title || 'No role set'}
                    {c.location ? ` · ${c.location}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="capitalize">{c.status}</Badge>
                  <span className="text-xs text-muted-foreground">{c.candidate_count ?? 0} candidates</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
