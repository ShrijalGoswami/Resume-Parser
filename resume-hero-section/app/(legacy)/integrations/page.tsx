'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plug, Loader2, CheckCircle2, XCircle, Zap, Plus, Trash2, Play, Mail, Calendar, MessageSquare, Video, Database, Webhook,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as api from '@/services/integration-api';
import type { AutomationRule, Connection, Execution, ProviderInfo, WorkflowStepT } from '@/types/integration';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail, calendar: Calendar, messaging: MessageSquare, meeting: Video, ats: Database, webhook: Webhook,
};
const TABS = [{ id: 'providers', label: 'Providers' }, { id: 'rules', label: 'Automation Rules' }, { id: 'executions', label: 'Execution History' }] as const;

export default function IntegrationsPage() {
  const [tab, setTab] = useState<string>('providers');
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Plug className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Integration Hub</h1>
            <p className="text-sm text-muted-foreground">Connect your hiring tools and automate workflows — HireLens orchestrates, you approve.</p>
          </div>
        </div>
        <div className="mb-6 flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/70 hover:bg-muted')}>{t.label}</button>
          ))}
        </div>
        {tab === 'providers' && <ProvidersTab />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'executions' && <ExecutionsTab />}
      </main>
    </div>
  );
}

function ProvidersTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.listProviders(), api.listConnections()]);
      setProviders(p); setConnections(c);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const connOf = (name: string) => connections.find((c) => c.provider === name && c.status === 'connected');

  async function connect(p: ProviderInfo) {
    setBusy(p.name);
    try {
      const res = await api.connectProvider(p.name, `${window.location.origin}/integrations`);
      if (res.authorize_url) window.location.href = res.authorize_url; // OAuth redirect
      else await load(); // non-OAuth (ATS/webhook) connected immediately
    } finally { setBusy(null); }
  }
  async function disconnect(name: string) { setBusy(name); try { await api.disconnectProvider(name); await load(); } finally { setBusy(null); } }
  async function test(name: string) { const r = await api.testProvider(name); setTestResult((t) => ({ ...t, [name]: `${r.detail}${r.simulated ? ' (dry-run)' : ''}` })); }

  if (loading) return <Loading />;
  const byCat: Record<string, ProviderInfo[]> = {};
  providers.forEach((p) => { (byCat[p.category] ??= []).push(p); });

  return (
    <div className="space-y-6">
      {Object.entries(byCat).map(([cat, list]) => {
        const Icon = CATEGORY_ICON[cat] ?? Plug;
        return (
          <div key={cat}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Icon className="size-3.5" /> {cat}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const conn = connOf(p.name);
                return (
                  <div key={p.name} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{p.display_name}</span>
                      {conn ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3" /> Connected</span>
                        : <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Not connected</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.actions.join(', ')}</p>
                    {testResult[p.name] && <p className="mt-1 text-[11px] text-primary">{testResult[p.name]}</p>}
                    <div className="mt-3 flex gap-2">
                      {conn
                        ? <Button size="sm" variant="outline" disabled={busy === p.name} onClick={() => disconnect(p.name)}>Disconnect</Button>
                        : <Button size="sm" disabled={busy === p.name} onClick={() => connect(p)}>{busy === p.name ? <Loader2 className="size-3.5 animate-spin" /> : p.requires_oauth ? 'Connect' : 'Enable'}</Button>}
                      <Button size="sm" variant="ghost" onClick={() => test(p.name)}>Test</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [event, setEvent] = useState('');
  const [steps, setSteps] = useState<WorkflowStepT[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p, e] = await Promise.all([api.listRules(), api.listProviders(), api.listEvents()]);
      setRules(r); setProviders(p); setEvents(e); if (!event && e[0]) setEvent(e[0]);
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <Loading />;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">New automation rule</p>
        <div className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" className="max-w-xs" />
          <select value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-lg border border-border/60 bg-background px-2 text-sm">{events.map((ev) => <option key={ev}>{ev}</option>)}</select>
        </div>
        <div className="mt-3 space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{i + 1}.</span>
              <select value={s.provider} onChange={(e) => setSteps((st) => st.map((x, j) => j === i ? { ...x, provider: e.target.value, action: (providers.find((p) => p.name === e.target.value)?.actions[0]) ?? '' } : x))} className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs">{providers.map((p) => <option key={p.name} value={p.name}>{p.display_name}</option>)}</select>
              <select value={s.action} onChange={(e) => setSteps((st) => st.map((x, j) => j === i ? { ...x, action: e.target.value } : x))} className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs">{(providers.find((p) => p.name === s.provider)?.actions ?? []).map((a) => <option key={a}>{a}</option>)}</select>
              <button onClick={() => setSteps((st) => st.filter((_, j) => j !== i))} className="text-rose-600"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setSteps((st) => [...st, { provider: providers[0]?.name ?? '', action: providers[0]?.actions[0] ?? '', params: {} }])}><Plus className="mr-1 size-3.5" /> Add step</Button>
        </div>
        <Button size="sm" className="mt-3" disabled={!name.trim() || steps.length === 0} onClick={async () => { await api.createRule(name.trim(), event, steps); setName(''); setSteps([]); load(); }}>Create rule</Button>
      </div>

      <div className="space-y-2">
        {rules.length === 0 && <p className="text-sm text-muted-foreground">No automation rules yet.</p>}
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-foreground">{r.name} <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">{r.trigger_event}</span></p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.steps.map((s) => `${s.provider}.${s.action}`).join(' → ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async () => { await api.updateRule(r.id, { enabled: !r.enabled }); load(); }} className={cn('relative h-6 w-11 rounded-full transition', r.enabled ? 'bg-primary' : 'bg-muted')}><span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition', r.enabled ? 'left-[22px]' : 'left-0.5')} /></button>
              <Button size="sm" variant="ghost" onClick={async () => { await api.emitEvent(r.trigger_event); }} title="Test-fire event"><Zap className="size-3.5" /></Button>
              <Button size="icon-sm" variant="ghost" onClick={async () => { await api.deleteRule(r.id); load(); }}><Trash2 className="size-3.5 text-rose-600" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutionsTab() {
  const [execs, setExecs] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setExecs(await api.listExecutions()); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <Loading />;
  return (
    <div className="space-y-2">
      {execs.length === 0 && <p className="text-sm text-muted-foreground">No executions yet — enable a rule and fire an event.</p>}
      {execs.map((e) => (
        <div key={e.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{e.rule_name || '—'} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70">{e.event}</span></span>
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', e.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                {e.status === 'success' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />} {e.status}
              </span>
              <span className="text-[11px] text-muted-foreground">{e.latency_ms}ms</span>
              {e.status !== 'success' && <Button size="sm" variant="outline" onClick={async () => { await api.replayExecution(e.id); load(); }}><Play className="mr-1 size-3" /> Replay</Button>}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {e.steps.map((s, i) => <span key={i} className={cn('rounded px-1.5 py-0.5', s.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{s.provider}.{s.action}{s.attempts > 1 ? ` ×${s.attempts}` : ''}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>; }
