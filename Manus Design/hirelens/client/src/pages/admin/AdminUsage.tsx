// Usage Analytics & AI Usage — platform consumption metrics, per-org breakdown, cost curves.
import { Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatCard } from '@/components/admin/Shared';
import { Progress } from '@/components/ui/progress';
import { orgs, usageTrend } from '@/lib/adminData';

const aiBreakdown = [
  { feature: 'Resume analysis', credits: 218000, pct: 54 },
  { feature: 'Candidate comparison', credits: 82000, pct: 20 },
  { feature: 'Copilot conversations', credits: 61000, pct: 15 },
  { feature: 'Interview kit generation', credits: 28000, pct: 7 },
  { feature: 'Search & matching', credits: 14000, pct: 4 },
];

export default function AdminUsage() {
  const [location] = useLocation();
  const isAi = location.includes('ai-usage');

  return (
    <AdminLayout title={isAi ? 'AI Usage' : 'Usage Analytics'}>
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto space-y-6">
        <PageHeader
          title={isAi ? 'AI Usage' : 'Usage Analytics'}
          desc={isAi ? 'Credit consumption, inference costs, and model performance' : 'Platform activity across all organizations'}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isAi ? (
            <>
              <StatCard label="Credits consumed (Jul)" value="403K" delta="+17%" deltaUp sub="of 631K provisioned" />
              <StatCard label="Median analysis time" value="2.1s" delta="-0.3s" deltaUp sub="P99: 8.4s (OCR heavy)" delay={0.05} />
              <StatCard label="Inference cost" value="$8,140" delta="+11%" sub="$0.020 per analysis" delay={0.1} />
              <StatCard label="Analysis accuracy" value="96.8%" delta="+0.4pts" deltaUp sub="human-verified sample" delay={0.15} />
            </>
          ) : (
            <>
              <StatCard label="Monthly active users" value="783" delta="+8.6%" deltaUp sub="July, all orgs" />
              <StatCard label="API calls (Jul)" value="794K" delta="+13%" deltaUp sub="99.7% success rate" delay={0.05} />
              <StatCard label="Resumes processed" value="17,800" delta="+17%" deltaUp sub="2.1s median parse" delay={0.1} />
              <StatCard label="Storage used" value="345 GB" delta="+22 GB" sub="across 10 orgs" delay={0.15} />
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>{isAi ? 'AI analyses per month' : 'API call volume'}</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>Feb – Jul 2026</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageTrend} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => isAi ? `${(v / 1000).toFixed(0)}K` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} cursor={{ fill: 'oklch(0.967 0.001 286.375)' }} />
                  <Bar dataKey={isAi ? 'analyses' : 'apiCalls'} radius={[5, 5, 0, 0]} fill="oklch(0.55 0.15 200)" name={isAi ? 'Analyses' : 'API calls'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Active users</h3>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 12 }}>Monthly unique sign-ins</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13 }} />
                  <Line type="monotone" dataKey="activeUsers" stroke="oklch(0.45 0.09 230)" strokeWidth={2.5} dot={{ r: 3 }} name="Active users" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {isAi && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-accent" />
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Credit consumption by feature</h3>
            </div>
            <div className="space-y-3.5">
              {aiBreakdown.map((f) => (
                <div key={f.feature}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="font-medium text-foreground">{f.feature}</span>
                    <span className="font-mono text-[12px] text-foreground/50">{(f.credits / 1000).toFixed(0)}K · {f.pct}%</span>
                  </div>
                  <Progress value={f.pct} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Per-organization consumption</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Organization', 'Plan', 'AI credits', 'Storage', 'Seats'].map((h) => (
                    <th key={h} className="pb-2 text-[11px] uppercase tracking-wide font-medium text-foreground/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orgs.filter((o) => o.status !== 'Churned').map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 text-[13px] font-medium text-foreground">{o.name}</td>
                    <td className="py-2.5 text-[13px] text-foreground/60">{o.plan}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <Progress value={(o.aiCreditsUsed / o.aiCreditsTotal) * 100} className="h-1.5 flex-1" />
                        <span className="font-mono text-[11px] text-foreground/50 shrink-0">{Math.round((o.aiCreditsUsed / o.aiCreditsTotal) * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-[12px] text-foreground/60">{o.storageGb} GB</td>
                    <td className="py-2.5 font-mono text-[12px] text-foreground/60">{o.seatsUsed}/{o.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

