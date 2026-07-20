'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, Loader2, FlaskConical, Users, Gauge, Boxes, History, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as api from '@/services/prediction-api';
import type { Forecast, SimResult, Twin } from '@/types/prediction';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Forecast Dashboard', icon: TrendingUp },
  { id: 'simulator', label: 'Scenario Simulator', icon: FlaskConical },
  { id: 'capacity', label: 'Capacity Planning', icon: Users },
  { id: 'skills', label: 'Skill Forecast', icon: Gauge },
  { id: 'twin', label: 'Digital Twin', icon: Boxes },
  { id: 'outcomes', label: 'Outcome Explorer', icon: History },
] as const;

function fval(f: Forecast): string {
  if (f.unit === 'probability' || f.unit === 'index') return `${Math.round((f.probability || 0) * 100)}%`;
  if (f.unit === 'currency') return `$${(f.value || 0).toLocaleString()}`;
  return `${f.value}`;
}

export default function PredictionsPage() {
  const [tab, setTab] = useState<string>('dashboard');
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><TrendingUp className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Predictive Intelligence</h1>
            <p className="text-sm text-muted-foreground">Deterministic forecasts &amp; simulations from your organization&apos;s own hiring history.</p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition', tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/70 hover:bg-muted')}>
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'simulator' && <Simulator />}
        {tab === 'capacity' && <Capacity />}
        {tab === 'skills' && <Skills />}
        {tab === 'twin' && <TwinViewer />}
        {tab === 'outcomes' && <Outcomes />}
      </main>
    </div>
  );
}
function Loading() { return <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>; }

function ForecastCard({ f }: { f: Forecast }) {
  const pct = f.unit === 'probability' || f.unit === 'index' ? Math.round((f.probability || 0) * 100) : null;
  const risky = f.type.includes('risk') || f.type.includes('dropout') || f.type.includes('shortage');
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{f.type.replace(/_/g, ' ')}</span>
        <span className="text-[11px] text-muted-foreground">{f.confidence}% conf.</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{fval(f)}</p>
      {pct !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', risky ? (pct > 60 ? 'bg-rose-500' : 'bg-amber-500') : pct > 60 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} /></div>
      )}
      <p className="mt-2 text-sm text-muted-foreground">{f.summary}</p>
      {f.evidence.length > 0 && (
        <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-primary">Evidence &amp; factors</summary>
          <ul className="mt-1 space-y-0.5">{f.evidence.map((e, i) => <li key={i} className="text-[11px] text-muted-foreground">• {e}</li>)}</ul>
          <div className="mt-1.5 flex flex-wrap gap-1">{f.factors.map((x, i) => <span key={i} className={cn('rounded px-1.5 py-0.5 text-[10px]', x.impact === 'positive' ? 'bg-emerald-50 text-emerald-700' : x.impact === 'negative' ? 'bg-rose-50 text-rose-700' : 'bg-muted text-muted-foreground')}>{x.name}: {x.detail}</span>)}</div>
        </details>
      )}
    </div>
  );
}

function Dashboard() {
  const [f, setF] = useState<Forecast[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.getForecasts().then(setF).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{f.map((x) => <ForecastCard key={x.type} f={x} />)}</div>;
}

function Simulator() {
  const [types, setTypes] = useState<{ forecast_types: string[]; scenarios: Record<string, string> }>({ forecast_types: [], scenarios: {} });
  const [ftype, setFtype] = useState('offer_acceptance');
  const [levers, setLevers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getTypes().then((t) => { setTypes(t); if (t.forecast_types[0]) setFtype('offer_acceptance'); }); }, []);
  async function run() { setBusy(true); try { setResult(await api.simulate(ftype, levers, { open_roles: 15 })); } finally { setBusy(false); } }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Forecast:</span>
          <select value={ftype} onChange={(e) => setFtype(e.target.value)} className="rounded-lg border border-border/60 bg-background px-2 py-1 text-sm">{types.forecast_types.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Scenario levers</p>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {Object.entries(types.scenarios).map(([lever, desc]) => (
            <label key={lever} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0 text-foreground/80" title={desc}>{lever.replace(/_/g, ' ')}</span>
              <Input type="number" value={levers[lever] ?? ''} onChange={(e) => setLevers((l) => ({ ...l, [lever]: Number(e.target.value) || 0 }))} placeholder="0" className="h-8 w-24" />
            </label>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={run} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Simulate'}</Button>
      </div>
      {result && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {result.direction === 'improves' ? <ArrowUpRight className="size-4 text-emerald-600" /> : result.direction === 'worsens' ? <ArrowDownRight className="size-4 text-rose-600" /> : <Activity className="size-4" />}
            {result.summary}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-3"><p className="text-xs text-muted-foreground">Baseline</p><p className="text-xl font-bold text-foreground">{fval(result.baseline)}</p><p className="text-xs text-muted-foreground">{result.baseline.summary}</p></div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">With scenario</p><p className="text-xl font-bold text-primary">{fval(result.scenario)}</p><p className="text-xs text-muted-foreground">{result.scenario.summary}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Capacity() {
  const [roles, setRoles] = useState(15);
  const [cap, setCap] = useState<Forecast | null>(null);
  const [cost, setCost] = useState<Forecast | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async () => { setBusy(true); try { const [c, k] = await Promise.all([api.runForecast('recruiter_capacity', { open_roles: roles }), api.runForecast('hiring_cost', { open_roles: roles })]); setCap(c); setCost(k); } finally { setBusy(false); } }, [roles]);
  useEffect(() => { run(); }, [run]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">Open roles:</span><Input type="number" value={roles} onChange={(e) => setRoles(Number(e.target.value) || 0)} className="h-9 w-28" /><Button size="sm" onClick={run} disabled={busy}>Forecast</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">{cap && <ForecastCard f={cap} />}{cost && <ForecastCard f={cost} />}</div>
    </div>
  );
}

function Skills() {
  const [f, setF] = useState<Forecast | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.runForecast('skill_shortage').then(setF).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (!f) return null;
  const bottlenecks = (f.alternatives?.bottleneck_skills as string[]) || [];
  return (
    <div className="space-y-3">
      <ForecastCard f={f} />
      {bottlenecks.length > 0 && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Projected bottleneck skills</p><div className="flex flex-wrap gap-1.5">{bottlenecks.map((s) => <span key={s} className="rounded-full bg-rose-50 px-2 py-0.5 text-sm text-rose-700">{s}</span>)}</div></div>}
    </div>
  );
}

function TwinViewer() {
  const [t, setT] = useState<Twin | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.getTwin().then(setT).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  if (!t) return null;
  const stats = [
    ['Campaigns', `${t.total_campaigns} (${t.active_campaigns} active)`], ['Candidates', `${t.total_candidates}`],
    ['Recruiters', `${t.recruiter_count}`], ['Avg match', `${Math.round(t.average_match)}`],
    ['Offer→hire', `${Math.round(t.offer_conversion * 100)}%`], ['Interview→offer', `${Math.round(t.interview_pass_rate * 100)}%`],
    ['Velocity', `${t.velocity_days}d`], ['Throughput', `${t.throughput_per_recruiter}/recruiter`],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(([k, v]) => <div key={k} className="rounded-xl border border-border/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p><p className="text-lg font-bold text-foreground">{v}</p></div>)}</div>
      <div><p className="mb-2 text-sm font-semibold text-foreground">Hiring funnel</p><div className="flex flex-wrap gap-1.5">{Object.entries(t.funnel).map(([stage, n]) => <span key={stage} className="rounded bg-muted px-2 py-0.5 text-xs text-foreground/80">{stage}: {n}</span>)}</div></div>
      {t.skill_shortages.length > 0 && <div><p className="mb-2 text-sm font-semibold text-foreground">Skill gaps</p><div className="flex flex-wrap gap-1.5">{t.skill_shortages.slice(0, 8).map((s) => <span key={s.skill} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{s.skill} ({s.count})</span>)}</div></div>}
    </div>
  );
}

function Outcomes() {
  const [rows, setRows] = useState<Array<{ id: string; forecast_type: string; probability: number | null; value: number | null; confidence: number; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getHistory().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Recorded forecasts — the outcome evaluator compares these to realised results over time (model governance).</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No recorded forecasts yet — run some from the dashboard or copilot.</p> : (
        <table className="w-full text-sm"><thead><tr className="border-b border-border/60 text-left text-xs text-muted-foreground"><th className="px-2 py-1.5">Type</th><th className="px-2 py-1.5">Prediction</th><th className="px-2 py-1.5">Confidence</th><th className="px-2 py-1.5">When</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border/40"><td className="px-2 py-2 font-medium text-foreground">{r.forecast_type}</td><td className="px-2 py-2">{r.probability != null ? `${Math.round(r.probability * 100)}%` : r.value}</td><td className="px-2 py-2 text-muted-foreground">{r.confidence}%</td><td className="px-2 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
