// Admin Dashboard — platform KPIs, MRR trend, org growth, activity, system health strip.
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ScrollText, Sparkles, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatCard, StatusBadge } from '@/components/admin/Shared';
import { auditEvents, mrrTrend, orgs, systemComponents, tickets, usageTrend } from '@/lib/adminData';

export default function AdminDashboard() {
  const activeOrgs = orgs.filter((o) => o.status === 'Active').length;
  const totalMrr = orgs.filter((o) => o.status !== 'Churned').reduce((s, o) => s + o.mrr, 0);
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'Pending').length;

  return (
    <AdminLayout title="Dashboard">
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto space-y-5">
        <PageHeader
          title="Platform overview"
          desc="Live health of the HireLens platform — commercial, usage, and operational signals."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="MRR" value={`$${totalMrr.toLocaleString()}`} delta="+3.5%" deltaUp sub="vs June" />
          <StatCard label="Active organizations" value={String(activeOrgs)} delta="+1" deltaUp sub={`${orgs.length} total · 1 trial`} delay={0.05} />
          <StatCard label="Monthly active users" value="783" delta="+8.6%" deltaUp sub="July, all orgs" delay={0.1} />
          <StatCard label="AI analyses this month" value="17,800" delta="+17%" deltaUp sub="794K API calls" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Monthly recurring revenue</h3>
              <Link href="/admin/usage" className="text-[12px] text-accent hover:underline inline-flex items-center gap-1">Usage analytics <ArrowRight size={12} /></Link>
            </div>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>Feb – Jul 2026</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrTrend} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']} contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} />
                  <Area type="monotone" dataKey="mrr" stroke="oklch(0.55 0.15 200)" strokeWidth={2.5} fill="url(#mrrFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>System health</h3>
              <Link href="/admin/status" className="text-[12px] text-accent hover:underline">Details</Link>
            </div>
            <div className="space-y-2.5">
              {systemComponents.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'Operational' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[13px] text-foreground/70 truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-foreground/45 shrink-0">{c.latency}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 rounded-lg bg-amber-50/60 border border-amber-200 px-3 py-2">
              <p className="text-[12px] text-amber-800" style={{ marginBottom: 0 }}>
                AI inference latency elevated (2.9s vs 1.2s target) — OCR batch from Quantum Retail is queued.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Recent audit activity</h3>
              <Link href="/admin/audit" className="text-[12px] text-accent hover:underline inline-flex items-center gap-1">All events <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-1">
              {auditEvents.slice(0, 6).map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0"
                >
                  <StatusBadge value={e.severity} />
                  <span className="font-mono text-[12px] text-foreground/70 truncate">{e.action}</span>
                  <span className="text-[12px] text-foreground/50 truncate flex-1">{e.target}</span>
                  <span className="font-mono text-[11px] text-foreground/40 shrink-0">{e.time.slice(11, 16)}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: Building2, label: 'Organizations', desc: `${activeOrgs} active · 1 past due`, path: '/admin/organizations' },
              { icon: Users, label: 'Users', desc: '20 across all orgs · 2 invited', path: '/admin/users' },
              { icon: Sparkles, label: 'AI usage', desc: '403K credits consumed this month', path: '/admin/ai-usage' },
              { icon: ScrollText, label: `Support tickets`, desc: `${openTickets} open or pending`, path: '/admin/support' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.path} href={s.path} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-accent/50 hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-foreground/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground" style={{ marginBottom: 1 }}>{s.label}</p>
                    <p className="text-[12px] text-foreground/50 truncate" style={{ marginBottom: 0 }}>{s.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-foreground/30 group-hover:text-accent transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Platform usage</h3>
          <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>AI analyses and active users, last 6 months</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.45 0.09 230)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="oklch(0.45 0.09 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} />
                <Area type="monotone" dataKey="analyses" name="AI analyses" stroke="oklch(0.45 0.09 230)" strokeWidth={2} fill="url(#anFill)" />
                <Area type="monotone" dataKey="activeUsers" name="Active users" stroke="oklch(0.55 0.15 200)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
