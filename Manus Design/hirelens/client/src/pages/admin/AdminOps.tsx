// Platform ops — System Status, Monitoring, Security Center, Error Logs (route-aware).
import { Activity, RefreshCw, Shield, ShieldAlert, Terminal } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatCard, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { errorLogs, systemComponents } from '@/lib/adminData';
import { toast } from 'sonner';

const latencySeries = [
  { t: '09:00', api: 36, ai: 1180 }, { t: '10:00', api: 38, ai: 1290 }, { t: '11:00', api: 41, ai: 1820 },
  { t: '12:00', api: 39, ai: 2400 }, { t: '13:00', api: 37, ai: 2950 }, { t: '14:00', api: 38, ai: 2870 },
];

const securityChecks = [
  { name: 'Enforce MFA for all admins', enabled: true, desc: 'TOTP or WebAuthn required at sign-in for privileged roles.' },
  { name: 'Session timeout (12 hours)', enabled: true, desc: 'Idle sessions are revoked automatically.' },
  { name: 'IP allowlist for admin console', enabled: false, desc: 'Restrict this console to corporate network ranges.' },
  { name: 'Anomalous login detection', enabled: true, desc: 'Impossible-travel and new-device heuristics with alerting.' },
  { name: 'Data export approval', enabled: true, desc: 'Bulk exports above 10K records require a second admin.' },
];

const openFindings = [
  { id: 'SEC-118', title: '5 failed login attempts — Julia Mendes (Helios Health)', severity: 'Critical', time: '2026-07-24 15:22', state: 'Account locked 15 min; user notified' },
  { id: 'SEC-117', title: 'Admin-scope API key unused for 61 days (Northwind)', severity: 'Warning', time: '2026-07-23 09:00', state: 'Revoked — legacy import script' },
  { id: 'SEC-116', title: 'SSO certificate expires in 21 days (Helios Health)', severity: 'Warning', time: '2026-07-22 08:00', state: 'Customer notified; rotation scheduled' },
];

export default function AdminOps() {
  const [location] = useLocation();
  const view = location.includes('monitoring') ? 'monitoring' : location.includes('security') ? 'security' : location.includes('errors') ? 'errors' : 'status';
  const [checks, setChecks] = useState(securityChecks);

  const titles: Record<string, [string, string]> = {
    status: ['System Status', 'Live health of every platform component'],
    monitoring: ['Monitoring', 'Latency, throughput, and saturation over the last 6 hours'],
    security: ['Security Center', 'Posture controls and open findings'],
    errors: ['Error Logs', 'Aggregated errors across services, deduplicated by signature'],
  };

  return (
    <AdminLayout title={titles[view][0]}>
      <div className="p-5 lg:p-7 max-w-[1200px] mx-auto space-y-6">
        <PageHeader
          title={titles[view][0]}
          desc={titles[view][1]}
          actions={
            view === 'status' ? (
              <Button variant="outline" size="sm" onClick={() => toast.success('Health checks re-run — all components responded')}>
                <RefreshCw size={14} className="mr-1.5" /> Re-run checks
              </Button>
            ) : undefined
          }
        />

        {(view === 'status' || view === 'monitoring') && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Overall uptime (30d)" value="99.94%" sub="SLA target: 99.9%" />
              <StatCard label="API p50 latency" value="38 ms" delta="stable" deltaUp sub="p99: 210 ms" delay={0.05} />
              <StatCard label="AI inference p50" value="2.9 s" delta="+1.7s" sub="OCR backlog — degraded" delay={0.1} />
              <StatCard label="Queue depth" value="184" sub="12 OCR jobs remaining" delay={0.15} />
            </div>

            <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
              {systemComponents.map((c) => (
                <div key={c.name} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'Operational' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-[13px] font-medium text-foreground flex-1">{c.name}</span>
                  <span className="font-mono text-[12px] text-foreground/50 hidden sm:block">uptime {c.uptime}%</span>
                  <span className="font-mono text-[12px] text-foreground/50 hidden sm:block">p50 {c.latency}</span>
                  <StatusBadge value={c.status} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Latency (last 6 hours)</h3>
              <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>API gateway (ms) vs AI inference (ms)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencySeries} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} />
                    <Line type="monotone" dataKey="api" name="API (ms)" stroke="oklch(0.55 0.15 200)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ai" name="AI (ms)" stroke="oklch(0.65 0.19 45)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {view === 'security' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Security score" value="94/100" delta="+2" deltaUp sub="last audit: Jul 20" />
              <StatCard label="Open findings" value="1" sub="2 resolved this week" delay={0.05} />
              <StatCard label="MFA adoption" value="98%" sub="admins: 100%" delay={0.1} />
              <StatCard label="Days since incident" value="112" sub="last: SEV-2, Apr 2026" delay={0.15} />
            </div>

            <section>
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Posture controls</h3>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {checks.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-4 px-5 py-3.5">
                    <Shield size={15} className={c.enabled ? 'text-emerald-600 shrink-0' : 'text-foreground/30 shrink-0'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{c.name}</p>
                      <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>{c.desc}</p>
                    </div>
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={() => {
                        setChecks((cs) => cs.map((x, xi) => (xi === i ? { ...x, enabled: !x.enabled } : x)));
                        toast.success(`"${c.name}" ${c.enabled ? 'disabled' : 'enabled'}`, { description: 'Logged as security.control_changed.' });
                      }}
                      aria-label={`Toggle ${c.name}`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Recent findings</h3>
              <div className="space-y-3">
                {openFindings.map((f) => (
                  <div key={f.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
                    <ShieldAlert size={16} className={f.severity === 'Critical' ? 'text-rose-500 shrink-0' : 'text-amber-500 shrink-0'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{f.title}</p>
                      <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{f.id} · {f.time} · {f.state}</p>
                    </div>
                    <StatusBadge value={f.severity} />
                    <Button variant="outline" size="sm" className="h-7" onClick={() => toast.success(`${f.id} acknowledged`, { description: 'Assigned to on-call security engineer.' })}>Acknowledge</Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {view === 'errors' && (
          <div className="space-y-3">
            {errorLogs.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Terminal size={14} className="text-foreground/40" />
                  <span className="font-mono text-[12px] font-semibold text-foreground">{e.service}</span>
                  <StatusBadge value={e.level} />
                  <span className="font-mono text-[11px] text-foreground/40 ml-auto">×{e.count} occurrences</span>
                </div>
                <p className="font-mono text-[12px] text-foreground/75 bg-secondary/50 rounded-md px-3 py-2" style={{ marginBottom: 6 }}>{e.message}</p>
                <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-foreground/45 font-mono">
                  <span>first: {e.first}</span>
                  <span>last: {e.last}</span>
                  <span>{e.id}</span>
                  <button className="text-accent hover:underline ml-auto" onClick={() => toast.success(`${e.id} muted for 24h`)}>Mute 24h</button>
                  <button className="text-accent hover:underline" onClick={() => toast.success(`Issue created from ${e.id}`, { description: 'Linked to the platform backlog.' })}>Create issue</button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Activity size={13} className="text-foreground/40" />
              <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>Errors are deduplicated by stack signature. Retention: 90 days.</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
