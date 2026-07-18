'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Loader2, Plus, Users } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { listCampaigns, getProfile } from '@/services/campaigns-api';
import type { Campaign, RecruiterProfile } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([getProfile(), listCampaigns()]);
        setProfile(p);
        setCampaigns(c);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCandidates = campaigns.reduce((sum, c) => sum + (c.candidate_count ?? 0), 0);
  const activeCount = campaigns.filter((c) => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">Your hiring command center.</p>
          </div>
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-1.5 h-4 w-4" /> New campaign
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <StatCard icon={<Briefcase className="h-5 w-5" />} label="Campaigns" value={campaigns.length} />
              <StatCard icon={<ArrowRight className="h-5 w-5" />} label="Active" value={activeCount} />
              <StatCard icon={<Users className="h-5 w-5" />} label="Candidates" value={totalCandidates} />
            </div>

            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent campaigns</h2>
            {campaigns.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-3">
                {campaigns.slice(0, 6).map((c) => (
                  <CampaignRow key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40"
    >
      <div>
        <div className="font-medium text-foreground">{campaign.title}</div>
        <div className="text-xs text-muted-foreground">{campaign.role_title || 'No role set'}</div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="capitalize">{campaign.status}</Badge>
        <span className="text-xs text-muted-foreground">{campaign.candidate_count ?? 0} candidates</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      <Button asChild className="mt-4">
        <Link href="/campaigns/new">
          <Plus className="mr-1.5 h-4 w-4" /> Create your first campaign
        </Link>
      </Button>
    </div>
  );
}
