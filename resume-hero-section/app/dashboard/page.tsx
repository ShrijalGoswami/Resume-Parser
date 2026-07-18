'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpDown,
  Briefcase,
  Building2,
  Clock,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { LoadingRows, ErrorState, EmptyState } from '@/components/workspace/states';
import { Pagination } from '@/components/workspace/pagination';
import { listCampaigns } from '@/services/campaigns-api';
import type { Campaign, CampaignStatus } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { relativeTime, formatDate, scoreBg, STATUS_STYLES } from '@/lib/format';

const PAGE_SIZE = 8;
const STATUS_FILTERS: (CampaignStatus | 'all')[] = ['all', 'active', 'draft', 'paused', 'archived'];
type SortKey = 'recent' | 'candidates' | 'score' | 'title';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Last activity' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'score', label: 'Avg. score' },
  { key: 'title', label: 'Title' },
];

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CampaignStatus | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCampaigns(await listCampaigns());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Derived, filtered, sorted list.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = campaigns.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.role_title ?? '').toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'candidates':
          return (b.total_candidates ?? 0) - (a.total_candidates ?? 0);
        case 'score':
          return (b.average_match_score ?? -1) - (a.average_match_score ?? -1);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return (
            new Date(b.last_activity_at ?? b.created_at ?? 0).getTime() -
            new Date(a.last_activity_at ?? a.created_at ?? 0).getTime()
          );
      }
    });
    return list;
  }, [campaigns, query, status, sort]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Keep page in range when filters shrink the list.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const totals = useMemo(
    () => ({
      campaigns: campaigns.length,
      candidates: campaigns.reduce((s, c) => s + (c.total_candidates ?? 0), 0),
      awaiting: campaigns.reduce((s, c) => s + (c.awaiting_analysis ?? 0), 0),
    }),
    [campaigns]
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Recruiter Workspace</h1>
            <p className="text-sm text-muted-foreground">Manage your hiring campaigns and candidates.</p>
          </div>
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-1.5 h-4 w-4" /> New campaign
            </Link>
          </Button>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryStat icon={<Briefcase className="h-5 w-5" />} label="Campaigns" value={totals.campaigns} />
          <SummaryStat icon={<Users className="h-5 w-5" />} label="Candidates" value={totals.candidates} />
          <SummaryStat
            icon={<Clock className="h-5 w-5" />}
            label="Awaiting analysis"
            value={totals.awaiting}
          />
        </div>

        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search campaigns, company, role…"
              className="pl-9"
              aria-label="Search campaigns"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                  status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowUpDown className="h-4 w-4" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border/60 bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Sort campaigns"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* List */}
        {loading ? (
          <LoadingRows rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create your first hiring campaign to start ranking candidates."
            icon={<Briefcase className="h-6 w-6" />}
            action={
              <Button asChild className="mt-1">
                <Link href="/campaigns/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Create campaign
                </Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching campaigns"
            description="Try a different search or status filter."
            icon={<Search className="h-6 w-6" />}
          />
        ) : (
          <>
            <div className="grid gap-3">
              {pageItems.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </main>
    </div>
  );
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-xl font-semibold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  return (
    <Link
      href={`/campaigns/${c.id}`}
      className="group block rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-foreground">{c.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                STATUS_STYLES[c.status] ?? 'bg-muted text-muted-foreground'
              }`}
            >
              {c.status}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {c.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {c.company}
              </span>
            )}
            <span>{c.role_title || 'No role set'}</span>
            <span>Created {formatDate(c.created_at)}</span>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Candidates" value={String(c.total_candidates ?? 0)} />
        <Metric label="Awaiting" value={String(c.awaiting_analysis ?? 0)} />
        <Metric
          label="Avg. score"
          value={c.average_match_score != null ? String(c.average_match_score) : '—'}
          badgeClass={c.average_match_score != null ? scoreBg(c.average_match_score) : undefined}
        />
        <Metric label="Last activity" value={relativeTime(c.last_activity_at)} />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {badgeClass ? (
        <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-sm font-semibold ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <div className="text-sm font-semibold text-foreground">{value}</div>
      )}
    </div>
  );
}
