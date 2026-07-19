'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Brain, Loader2, Search, Clock, Sparkles, Network, Database, ScrollText, TrendingUp, Trash2,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as api from '@/services/knowledge-api';
import type { GraphResult, MemoryHit, MemoryItem, Preferences, SkillEvolution, TimelineBucket } from '@/types/knowledge';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'explorer', label: 'Memory Explorer', icon: Search },
  { id: 'timeline', label: 'Hiring Timeline', icon: Clock },
  { id: 'preferences', label: 'Preference Learning', icon: Sparkles },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'decisions', label: 'Decision History', icon: ScrollText },
  { id: 'sources', label: 'Knowledge Sources', icon: Database },
] as const;

export default function KnowledgePage() {
  const [tab, setTab] = useState<string>('explorer');
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Brain className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Knowledge Center</h1>
            <p className="text-sm text-muted-foreground">Your organization&apos;s long-term hiring memory — accumulated automatically, used by every AI capability.</p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition', tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/70 hover:bg-muted')}>
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {tab === 'explorer' && <Explorer />}
          {tab === 'timeline' && <Timeline />}
          {tab === 'preferences' && <PreferencesTab />}
          {tab === 'graph' && <GraphTab />}
          {tab === 'decisions' && <Decisions />}
          {tab === 'sources' && <Sources />}
        </div>
      </main>
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>; }

function MemoryCard({ m, why }: { m: MemoryItem; why?: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-sm text-foreground">{m.value_text}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{m.source}</span>
        <span>{(m.occurred_at || '').slice(0, 10)}</span>
        <span className={cn('font-semibold', m.confidence >= 75 ? 'text-emerald-600' : m.confidence >= 50 ? 'text-amber-600' : 'text-muted-foreground')}>{m.confidence}% confidence</span>
        {m.entities?.slice(0, 4).map((e, i) => <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{e.name}</span>)}
      </div>
      {why && why.length > 0 && <p className="mt-1 text-[11px] italic text-muted-foreground">Why selected: {why.join(' · ')}</p>}
    </div>
  );
}

function Explorer() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MemoryHit[] | null>(null);
  const [all, setAll] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMemory().then(setAll).finally(() => setLoading(false)); }, []);
  async function search() { if (query.trim()) setHits(await api.retrieveMemory(query.trim())); }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Ask the memory… e.g. who did we hire for backend?" className="pl-9" /></div>
        <Button onClick={search} disabled={!query.trim()}>Retrieve</Button>
      </div>
      {hits ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{hits.length} relevant memories (explainable ranking)</p>
          {hits.map((h) => <MemoryCard key={h.id} m={h} why={h._why} />)}
          {hits.length === 0 && <p className="text-sm text-muted-foreground">No matching memories.</p>}
        </div>
      ) : loading ? <Loading /> : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{all.length} memories in organizational memory</p>
          {all.slice(0, 30).map((m) => <MemoryCard key={m.id} m={m} />)}
          {all.length === 0 && <p className="text-sm text-muted-foreground">No memory yet — it accumulates as you use the AI capabilities.</p>}
        </div>
      )}
    </div>
  );
}

function Timeline() {
  const [buckets, setBuckets] = useState<TimelineBucket[]>([]);
  const [evo, setEvo] = useState<SkillEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([api.getTimeline(12), api.getSkillEvolution()]).then(([t, e]) => { setBuckets(t); setEvo(e); }).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Memory over time</p>
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.month} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium text-foreground">{b.month} <span className="text-xs text-muted-foreground">· {b.count} memories</span></p>
              <ul className="mt-1 space-y-0.5">{b.highlights.map((h, i) => <li key={i} className="text-xs text-muted-foreground">• {h}</li>)}</ul>
            </div>
          ))}
          {buckets.length === 0 && <p className="text-sm text-muted-foreground">No timeline yet.</p>}
        </div>
      </div>
      {evo.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><TrendingUp className="size-4 text-primary" /> Skill demand evolution</p>
          <div className="space-y-1.5">{evo.map((e) => <div key={e.month} className="flex items-center gap-2 text-xs"><span className="w-16 text-muted-foreground">{e.month}</span><div className="flex flex-wrap gap-1">{e.top.map((s) => <span key={s.skill} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{s.skill} ({s.count})</span>)}</div></div>)}</div>
        </div>
      )}
    </div>
  );
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getPreferences().then(setPrefs).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (!prefs) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Learned from {prefs.total_evidence} pieces of evidence — never hardcoded.</p>
      <PrefGroup title="Preferred technologies" items={prefs.preferred_technologies.map((t) => ({ label: t.name, n: t.evidence }))} />
      <PrefGroup title="Preferred universities" items={prefs.preferred_universities.map((t) => ({ label: t.name, n: t.evidence }))} />
      <PrefGroup title="Decision patterns" items={prefs.decision_patterns.map((t) => ({ label: t.outcome, n: t.count }))} />
    </div>
  );
}
function PrefGroup({ title, items }: { title: string; items: { label: string; n: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length ? <div className="space-y-1">{items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs"><span className="w-32 shrink-0 truncate text-foreground/80">{i.label}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(i.n / max) * 100}%` }} /></div><span className="w-6 text-right text-muted-foreground">{i.n}</span></div>
      ))}</div> : <p className="text-sm text-muted-foreground">Not enough evidence yet.</p>}
    </div>
  );
}

function GraphTab() {
  const [entity, setEntity] = useState('');
  const [g, setG] = useState<GraphResult | null>(null);
  async function go() { if (entity.trim()) setG(await api.getGraph(entity.trim(), 2)); }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={entity} onChange={(e) => setEntity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Entity to traverse (e.g. a candidate or campaign name)" className="max-w-sm" />
        <Button onClick={go} disabled={!entity.trim()}>Traverse</Button>
      </div>
      {g && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">{g.summary.node_count} nodes · {g.summary.edge_count} edges in the graph</p>
          <div className="mb-3 flex flex-wrap gap-1.5">{g.nodes.map((n) => <span key={n.name} className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/80">{n.name} <span className="text-[10px] text-muted-foreground">{n.type}</span></span>)}</div>
          <div className="space-y-1">{g.edges.map((e, i) => <p key={i} className="text-xs text-muted-foreground"><b className="text-foreground/80">{e.source}</b> —{e.relation}→ <b className="text-foreground/80">{e.target}</b></p>)}</div>
          {g.nodes.length <= 1 && <p className="text-sm text-muted-foreground">No relationships found for that entity yet.</p>}
        </div>
      )}
    </div>
  );
}

function Decisions() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); api.getMemory('decision').then(setItems).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.id} className="flex items-start gap-2">
          <div className="flex-1"><MemoryCard m={m} /></div>
          <Button size="icon-sm" variant="ghost" onClick={async () => { await api.invalidateItem(m.id); load(); }} title="Invalidate"><Trash2 className="size-3.5 text-rose-600" /></Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No decision history yet.</p>}
    </div>
  );
}

function Sources() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getSources().then(setCounts).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([source, n]) => (
        <div key={source} className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-semibold capitalize text-foreground">{source || 'unknown'}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{n}</p>
          <p className="text-[11px] text-muted-foreground">memories ingested</p>
        </div>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No sources yet.</p>}
    </div>
  );
}
