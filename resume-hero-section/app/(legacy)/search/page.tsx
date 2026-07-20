'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Sparkles, Loader2, Star, StarOff, History, Users, SlidersHorizontal,
  ArrowRight, GitCompare,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/workspace/states';
import { searchTalent, searchSimilar } from '@/services/search-api';
import { listCampaigns } from '@/services/campaigns-api';
import type { SearchResultItem, TalentSearchResponse, SavedSearch } from '@/types/search';
import type { Campaign } from '@/types/campaign';
import { cn } from '@/lib/utils';

const HISTORY_KEY = 'hirelens.search.history';
const SAVED_KEY = 'hirelens.search.saved';
const EXAMPLES = [
  'Backend engineers with production FastAPI experience',
  'Candidates with LLM production experience',
  'People who worked on recommendation systems',
  'Strong Python engineers with weak frontend exposure',
];

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export default function TalentSearchPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
        <TalentSearch />
      </Suspense>
    </div>
  );
}

function TalentSearch() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [campaignId, setCampaignId] = useState<string>('');
  const [minScore, setMinScore] = useState('');
  const [minExp, setMinExp] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [response, setResponse] = useState<TalentSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setHistory(readLS<string[]>(HISTORY_KEY, []));
    setSaved(readLS<SavedSearch[]>(SAVED_KEY, []));
    listCampaigns().then(setCampaigns).catch(() => {});
  }, []);

  const runText = useCallback(async (q: string, campaign: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const filters = {
        min_score: minScore ? Number(minScore) : null,
        min_experience: minExp ? Number(minExp) : null,
      };
      const res = await searchTalent(trimmed, { campaignId: campaign || null, filters });
      setResponse(res);
      setHistory((prev) => {
        const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 8);
        writeLS(HISTORY_KEY, next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minScore, minExp]);

  const runSimilar = useCallback(async (candidateId: string, campaign: string) => {
    setLoading(true);
    setError(null);
    setQuery('');
    try {
      const res = await searchSimilar(candidateId, { campaignId: campaign || null });
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // React to URL params (?q= / ?similar= / ?campaign=) once on mount.
  useEffect(() => {
    const c = searchParams.get('campaign') || '';
    const similar = searchParams.get('similar');
    const q = searchParams.get('q');
    if (c) setCampaignId(c);
    if (similar) {
      void runSimilar(similar, c);
    } else if (q) {
      setQuery(q);
      void runText(q, c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaved = useMemo(
    () => saved.some((s) => s.query === query.trim() && (s.campaignId ?? '') === campaignId),
    [saved, query, campaignId],
  );

  function toggleSave() {
    const q = query.trim();
    if (!q) return;
    setSaved((prev) => {
      const exists = prev.find((s) => s.query === q && (s.campaignId ?? '') === campaignId);
      const next = exists
        ? prev.filter((s) => s.id !== exists.id)
        : [{ id: `${Date.now()}`, query: q, campaignId: campaignId || null }, ...prev].slice(0, 20);
      writeLS(SAVED_KEY, next);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Talent Search</h1>
          <p className="text-sm text-muted-foreground">Find people by meaning — describe who you need in plain language.</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runText(query, campaignId); }}
              placeholder="e.g. backend engineers with production FastAPI and Kubernetes experience"
              className="h-11 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" className="size-11" onClick={() => setShowFilters((v) => !v)} title="Filters">
            <SlidersHorizontal className="size-4" />
          </Button>
          <Button className="h-11" onClick={() => runText(query, campaignId)} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Search className="mr-1.5 size-4" /> Search</>}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleSave} title={isSaved ? 'Unsave' : 'Save search'} disabled={!query.trim()}>
            {isSaved ? <Star className="size-4 fill-amber-400 text-amber-400" /> : <StarOff className="size-4" />}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-border/50 pt-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Campaign</span>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-sm">
                <option value="">All my candidates</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Min overall score</span>
              <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Min experience (yrs)</span>
              <Input type="number" value={minExp} onChange={(e) => setMinExp(e.target.value)} placeholder="0" />
            </label>
          </div>
        )}
      </div>

      {/* Examples / history / saved (before a search runs) */}
      {!response && !loading && !error && (
        <div className="mt-6 space-y-6">
          <Chips title="Try a search" icon={<Sparkles className="size-3.5" />} items={EXAMPLES}
            onPick={(q) => { setQuery(q); runText(q, campaignId); }} />
          {saved.length > 0 && (
            <Chips title="Saved searches" icon={<Star className="size-3.5" />} items={saved.map((s) => s.query)}
              onPick={(q) => { setQuery(q); runText(q, campaignId); }} />
          )}
          {history.length > 0 && (
            <Chips title="Recent" icon={<History className="size-3.5" />} items={history}
              onPick={(q) => { setQuery(q); runText(q, campaignId); }} />
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-16 shadow-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching by meaning…</p>
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : response ? (
          response.results.length === 0 ? (
            <EmptyState title="No semantic matches" description="Try broader wording, or re-index the campaign if candidates were just analyzed." icon={<Search className="size-6" />} />
          ) : (
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" /> {response.count} match{response.count === 1 ? '' : 'es'}
                <span className="text-xs">· engine {response.provider}</span>
                {response.indexed > 0 && <span className="text-xs">· indexed {response.indexed} new</span>}
              </p>
              <div className="space-y-3">
                {response.results.map((r) => (
                  <ResultCard key={r.candidate_id} r={r} onSimilar={() => runSimilar(r.candidate_id, r.campaign_id ?? '')} />
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>
    </main>
  );
}

function ResultCard({ r, onSimilar }: { r: SearchResultItem; onSimilar: () => void }) {
  const pct = Math.round(r.similarity * 100);
  const href = r.campaign_id ? `/campaigns/${r.campaign_id}/candidates/${r.candidate_id}` : undefined;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="font-semibold text-foreground hover:text-primary hover:underline">{r.name}</Link>
          ) : (
            <span className="font-semibold text-foreground">{r.name}</span>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {r.overall_score != null && <span>Overall {Math.round(r.overall_score)}/100</span>}
            {r.ats_score != null && <span>ATS {Math.round(r.ats_score)}</span>}
            {r.years_experience != null && <span>{r.years_experience}y exp</span>}
            {r.stage && <span className="capitalize">{r.stage}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-foreground">
              <span>Match</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onSimilar} title="Find similar candidates">
            <GitCompare className="mr-1.5 size-3.5" /> Similar
          </Button>
        </div>
      </div>
      {r.matched_concepts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Matched</span>
          {r.matched_concepts.map((c, i) => (
            <span key={`${c}-${i}`} className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Chips({ title, icon, items, onPick }: { title: string; icon: React.ReactNode; items: string[]; onPick: (q: string) => void }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{icon} {title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((q, i) => (
          <button key={`${q}-${i}`} onClick={() => onPick(q)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/80 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            {q} <ArrowRight className="size-3 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );
}
