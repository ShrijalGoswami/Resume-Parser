// HireLens Analytics — funnel, conversions, time-to-hire, department comparison.
import { motion } from 'framer-motion';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { departmentStats, funnelData, hiringTrend } from '@/lib/mockData';
import { toast } from 'sonner';

const conversionCards = [
  { label: 'Application → Screen', value: '65%', trend: '+4%', up: true },
  { label: 'Screen → Interview', value: '40%', trend: '+2%', up: true },
  { label: 'Interview → Offer', value: '24%', trend: '-3%', up: false },
  { label: 'Offer → Hire', value: '67%', trend: '+8%', up: true },
];

const timeToHire = [
  { month: 'Feb', days: 26 }, { month: 'Mar', days: 24 }, { month: 'Apr', days: 23 },
  { month: 'May', days: 22 }, { month: 'Jun', days: 20 }, { month: 'Jul', days: 19 },
];

const sourceData = [
  { source: 'Careers page', candidates: 218, hires: 5, quality: 74 },
  { source: 'LinkedIn', candidates: 142, hires: 3, quality: 69 },
  { source: 'Referrals', candidates: 64, hires: 3, quality: 88 },
  { source: 'Job boards', candidates: 84, hires: 1, quality: 58 },
  { source: 'Agencies', candidates: 20, hires: 0, quality: 62 },
];

const skillsDemand = [
  { skill: 'Python', supply: 84, demand: 92 },
  { skill: 'Kubernetes', supply: 46, demand: 78 },
  { skill: 'React', supply: 72, demand: 64 },
  { skill: 'ML Ops', supply: 28, demand: 71 },
  { skill: 'Go', supply: 39, demand: 55 },
];

const funnelColors = [
  'oklch(0.35 0.05 250)', 'oklch(0.45 0.09 230)', 'oklch(0.55 0.15 200)',
  'oklch(0.62 0.13 195)', 'oklch(0.7 0.11 190)', 'oklch(0.78 0.1 185)',
];

export default function Analytics() {
  return (
    <AppLayout title="Analytics">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Hiring Analytics</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>Pipeline health across all campaigns · Feb – Jul 2026</p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => {
              const rows = [
                ['Section', 'Metric', 'Value'],
                ...conversionCards.map((c) => ['Conversion', c.label, c.value]),
                ...timeToHire.map((t) => ['Time to hire (days)', t.month, String(t.days)]),
                ...sourceData.map((s) => ['Source effectiveness', s.source, `${s.candidates} candidates / ${s.hires} hires / quality ${s.quality}`]),
                ...skillsDemand.map((s) => ['Skills', s.skill, `supply ${s.supply} / demand ${s.demand}`]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = 'hirelens-analytics-report.csv';
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Analytics report exported to CSV');
            }}
          >
            <Download size={15} className="mr-1.5" /> Export report
          </Button>
        </div>

        {/* Conversion cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {conversionCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-xs text-foreground/50" style={{ marginBottom: 8 }}>{c.label}</p>
              <div className="flex items-end justify-between">
                <p className="font-mono text-2xl font-semibold text-foreground" style={{ marginBottom: 0 }}>{c.value}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {c.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {c.trend}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Candidate Funnel</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 20 }}>All campaigns, current quarter</p>
            <div className="space-y-3">
              {funnelData.map((f, i) => (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-28 text-[13px] text-foreground/60 shrink-0">{f.stage}</span>
                  <div className="flex-1 h-7 rounded-md bg-secondary/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.percent}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full rounded-md flex items-center justify-end pr-2"
                      style={{ backgroundColor: funnelColors[i], minWidth: 44 }}
                    >
                      <span className="font-mono text-[11px] font-semibold text-white">{f.count}</span>
                    </motion.div>
                  </div>
                  <span className="font-mono w-12 text-right text-xs text-foreground/50 shrink-0">{f.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time to hire */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Time to Hire</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>Median days from application to acceptance</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeToHire} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[15, 28]} tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} formatter={(v) => [`${v} days`, 'Median']} />
                  <Line type="monotone" dataKey="days" stroke="oklch(0.55 0.15 200)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'oklch(0.55 0.15 200)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Applications by month */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Application Volume</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>Monthly applications with hires overlaid</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hiringTrend} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} cursor={{ fill: 'oklch(0.967 0.001 286.375)' }} />
                  <Bar dataKey="applications" radius={[5, 5, 0, 0]} name="Applications">
                    {hiringTrend.map((_, i) => (
                      <Cell key={i} fill={i === hiringTrend.length - 1 ? 'oklch(0.55 0.15 200)' : 'oklch(0.85 0.04 210)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department comparison */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Department Comparison</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 16 }}>Open roles, pipeline volume, and efficiency</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Department', 'Open', 'Candidates', 'Time to Hire', 'Offer Rate'].map((h) => (
                    <th key={h} className="pb-2 text-[11px] uppercase tracking-wide font-medium text-foreground/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {departmentStats.map((d) => (
                  <tr key={d.dept}>
                    <td className="py-3 font-medium text-foreground">{d.dept}</td>
                    <td className="py-3 font-mono text-foreground/70">{d.open}</td>
                    <td className="py-3 font-mono text-foreground/70">{d.candidates}</td>
                    <td className="py-3 font-mono text-foreground/70">{d.avgTimeToHire > 0 ? `${d.avgTimeToHire}d` : '—'}</td>
                    <td className="py-3">
                      {d.offerRate > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${d.offerRate}%` }} />
                          </div>
                          <span className="font-mono text-xs text-foreground/60">{d.offerRate}%</span>
                        </div>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Source analytics */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Source Effectiveness</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 16 }}>Where candidates come from, and which sources convert</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Source', 'Candidates', 'Hires', 'Quality Score'].map((h) => (
                    <th key={h} className="pb-2 text-[11px] uppercase tracking-wide font-medium text-foreground/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sourceData.map((s) => (
                  <tr key={s.source}>
                    <td className="py-3 font-medium text-foreground">{s.source}</td>
                    <td className="py-3 font-mono text-foreground/70">{s.candidates}</td>
                    <td className="py-3 font-mono text-foreground/70">{s.hires}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${s.quality >= 80 ? 'bg-emerald-500' : s.quality >= 65 ? 'bg-accent' : 'bg-amber-500'}`} style={{ width: `${s.quality}%` }} />
                        </div>
                        <span className="font-mono text-xs text-foreground/60">{s.quality}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Skills supply vs demand */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Skills: Supply vs Demand</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 16 }}>Candidate pool skill coverage against open-role requirements</p>
            <div className="space-y-4">
              {skillsDemand.map((s) => (
                <div key={s.skill}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="font-medium text-foreground">{s.skill}</span>
                    <span className="font-mono text-xs text-foreground/50">supply {s.supply} · demand {s.demand}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: `${s.demand}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${s.supply}%` }} />
                  </div>
                  {s.demand - s.supply > 20 && (
                    <p className="text-[11px] text-amber-600 mt-1" style={{ marginBottom: 0 }}>Gap: consider sourcing focus for {s.skill}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
