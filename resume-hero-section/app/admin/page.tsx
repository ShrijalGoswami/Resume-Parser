'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Layers, Users, ShieldCheck, ToggleLeft, Gauge, ScrollText, CreditCard, KeyRound, Loader2, Plus, Trash2, Copy,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrg } from '@/components/org/org-provider';
import * as api from '@/services/org-api';
import type { ApiKey, AuditLog, OrgMember, Subscription, UsageCounter, Workspace } from '@/types/org';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'settings', label: 'Settings', icon: Building2 },
  { id: 'workspaces', label: 'Workspaces', icon: Layers },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldCheck },
  { id: 'flags', label: 'Feature Flags', icon: ToggleLeft },
  { id: 'usage', label: 'Usage', icon: Gauge },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
] as const;
const ROLES = ['owner', 'admin', 'hiring_manager', 'recruiter', 'interviewer', 'viewer'];
const PLANS = ['free', 'professional', 'business', 'enterprise'];

export default function AdminPage() {
  const { context, refresh } = useOrg();
  const [tab, setTab] = useState<string>('settings');

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Building2 className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Organization Administration</h1>
            <p className="text-sm text-muted-foreground">
              {context ? `${context.organization.name} · ${context.plan} plan · you are ${context.role}` : 'Loading…'}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/70 hover:bg-muted')}>
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {tab === 'settings' && <SettingsTab onSaved={refresh} />}
          {tab === 'workspaces' && <WorkspacesTab />}
          {tab === 'members' && <MembersTab />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'flags' && <FlagsTab onChanged={refresh} />}
          {tab === 'usage' && <UsageTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'subscription' && <SubscriptionTab onChanged={refresh} />}
          {tab === 'apikeys' && <ApiKeysTab />}
        </div>
      </main>
    </div>
  );
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    setLoading(true);
    fn().then((d) => { setData(d); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : 'Failed')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}

function Loading() { return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>; }
function Err({ msg }: { msg: string }) { return <p className="py-6 text-center text-sm text-rose-600">{msg}</p>; }

function SettingsTab({ onSaved }: { onSaved: () => void }) {
  const { data, loading, error } = useAsync(api.getOrganization);
  const [name, setName] = useState('');
  useEffect(() => { if (data) setName(data.name); }, [data]);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  return (
    <div className="max-w-md space-y-3">
      <label className="block space-y-1"><span className="text-sm font-medium text-foreground">Organization name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Plan: <b>{data?.plan}</b></p>
      <Button size="sm" onClick={async () => { await api.updateOrganization({ name }); onSaved(); }}>Save</Button>
    </div>
  );
}

function WorkspacesTab() {
  const { data, loading, error, reload } = useAsync(api.listWorkspaces);
  const [name, setName] = useState('');
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New workspace name" className="max-w-xs" />
        <Button size="sm" onClick={async () => { if (name.trim()) { await api.createWorkspace(name.trim()); setName(''); reload(); } }}><Plus className="mr-1 size-3.5" /> Create</Button>
      </div>
      <ul className="divide-y divide-border/50">
        {(data as Workspace[]).map((w) => (
          <li key={w.id} className="flex items-center justify-between py-2.5"><span className="text-sm font-medium text-foreground">{w.name}</span><span className="text-xs text-muted-foreground">{w.description}</span></li>
        ))}
      </ul>
    </div>
  );
}

function MembersTab() {
  const { data, loading, error, reload } = useAsync(api.listMembers);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('recruiter');
  const [msg, setMsg] = useState<string | null>(null);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@company.com" className="max-w-xs" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-border/60 bg-background px-2 text-sm">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        <Button size="sm" onClick={async () => { try { await api.inviteMember(email, role); setEmail(''); setMsg(null); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); } }}>Add member</Button>
      </div>
      {msg && <p className="text-xs text-amber-600">{msg}</p>}
      <ul className="divide-y divide-border/50">
        {(data as OrgMember[]).map((mem) => (
          <li key={mem.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="text-sm text-foreground">{mem.invited_email || mem.user_id.slice(0, 8)} <span className="text-xs text-muted-foreground">· {mem.status}</span></span>
            <div className="flex items-center gap-2">
              <select value={mem.role} onChange={async (e) => { await api.setMemberRole(mem.id, e.target.value); reload(); }} className="rounded-md border border-border/60 bg-background px-1.5 py-1 text-xs">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              <Button size="icon-sm" variant="ghost" onClick={async () => { await api.removeMember(mem.id); reload(); }} title="Remove"><Trash2 className="size-3.5 text-rose-600" /></Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RolesTab() {
  const { data, loading, error } = useAsync(api.getRoles);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Policy-based permissions per role (configurable server-side).</p>
      {Object.entries(data as Record<string, string[]>).map(([role, perms]) => (
        <div key={role} className="rounded-xl border border-border/60 p-3">
          <p className="mb-1.5 text-sm font-semibold capitalize text-foreground">{role.replace('_', ' ')}</p>
          <div className="flex flex-wrap gap-1">{perms.map((p) => <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70">{p}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

function FlagsTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useAsync(api.getFeatureFlags);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  const d = data as { features: string[]; resolved: Record<string, boolean> };
  return (
    <div className="space-y-2">
      <p className="mb-2 text-sm text-muted-foreground">Enable or disable capabilities per organization.</p>
      {d.features.map((f) => (
        <div key={f} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <span className="text-sm font-medium capitalize text-foreground">{f.replace(/_/g, ' ')}</span>
          <button
            onClick={async () => { await api.setFeatureFlag(f, !d.resolved[f]); reload(); onChanged(); }}
            className={cn('relative h-6 w-11 rounded-full transition', d.resolved[f] ? 'bg-primary' : 'bg-muted')}>
            <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition', d.resolved[f] ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
      ))}
    </div>
  );
}

function UsageTab() {
  const usage = useAsync(api.getUsage);
  const sub = useAsync(api.getSubscription);
  if (usage.loading || sub.loading) return <Loading />;
  if (usage.error) return <Err msg={usage.error} />;
  const metrics = (usage.data?.metrics ?? []) as UsageCounter[];
  const limits = (sub.data as Subscription | null)?.limits ?? {};
  const byMetric = Object.fromEntries(metrics.map((m) => [m.metric, m.value]));
  const keys = Array.from(new Set([...Object.keys(limits), ...metrics.map((m) => m.metric)]));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Usage this period ({usage.data?.period ?? 'current'}) vs plan limits.</p>
      {keys.map((k) => {
        const used = byMetric[k] ?? 0; const limit = limits[k] ?? -1; const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
        return (
          <div key={k}>
            <div className="mb-1 flex justify-between text-xs"><span className="capitalize text-foreground/80">{k.replace(/_/g, ' ')}</span><span className="text-muted-foreground">{used}{limit >= 0 ? ` / ${limit}` : ' · unlimited'}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', pct > 90 ? 'bg-rose-500' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function AuditTab() {
  const [action, setAction] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.getAuditLogs(action || undefined), [action]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action (e.g. member.invited)" className="max-w-xs" />
        <Button size="sm" variant="outline" onClick={reload}>Search</Button>
      </div>
      {loading ? <Loading /> : error ? <Err msg={error} /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-border/60 text-left text-xs text-muted-foreground"><th className="px-2 py-1.5">Action</th><th className="px-2 py-1.5">User</th><th className="px-2 py-1.5">Resource</th><th className="px-2 py-1.5">When</th></tr></thead>
            <tbody>
              {(data as AuditLog[]).map((l) => (
                <tr key={l.id} className="border-b border-border/40">
                  <td className="px-2 py-2 font-medium text-foreground">{l.action}</td>
                  <td className="px-2 py-2 text-muted-foreground">{l.user_email || '—'}</td>
                  <td className="px-2 py-2 text-muted-foreground">{l.resource_type}{l.resource_id ? `:${l.resource_id.slice(0, 8)}` : ''}</td>
                  <td className="px-2 py-2 text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {(data as AuditLog[]).length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">No audit records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SubscriptionTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useAsync(api.getSubscription);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  const sub = data as Subscription;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Current plan: <b className="capitalize text-foreground">{sub.plan}</b> ({sub.status})</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <button key={p} onClick={async () => { await api.updateSubscription(p); reload(); onChanged(); }}
            className={cn('rounded-xl border p-4 text-left transition', sub.plan === p ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40')}>
            <p className="font-semibold capitalize text-foreground">{p}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub.plan === p ? 'Current plan' : 'Switch to this plan'}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Billing/payments are not processed yet — this sets plan limits and feature defaults.</p>
    </div>
  );
}

function ApiKeysTab() {
  const { data, loading, error, reload } = useAsync(api.listApiKeys);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('read_only');
  const [secret, setSecret] = useState<string | null>(null);
  if (loading) return <Loading />;
  if (error) return <Err msg={error} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" className="max-w-xs" />
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-border/60 bg-background px-2 text-sm"><option value="read_only">read_only</option><option value="read_write">read_write</option><option value="admin">admin</option></select>
        <Button size="sm" onClick={async () => { if (name.trim()) { const r = await api.createApiKey(name.trim(), scope); setSecret(r.secret); setName(''); reload(); } }}><Plus className="mr-1 size-3.5" /> Create key</Button>
      </div>
      {secret && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <span className="font-mono text-amber-800">{secret}</span>
          <Button size="icon-sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(secret)}><Copy className="size-3.5" /></Button>
          <span className="text-xs text-amber-700">Copy now — shown once.</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Scoped API keys for future integrations (authentication wiring is a placeholder).</p>
      <ul className="divide-y divide-border/50">
        {(data as ApiKey[]).map((k) => (
          <li key={k.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-foreground">{k.name} <span className="font-mono text-xs text-muted-foreground">{k.prefix}…</span> <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{k.scope}</span>{k.revoked && <span className="ml-1 text-[11px] text-rose-600">revoked</span>}</span>
            {!k.revoked && <Button size="icon-sm" variant="ghost" onClick={async () => { await api.revokeApiKey(k.id); reload(); }} title="Revoke"><Trash2 className="size-3.5 text-rose-600" /></Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
