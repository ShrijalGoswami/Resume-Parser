// HireLens Dashboard — Institutional Clarity. Inter only; JetBrains Mono for numbers/IDs.
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Briefcase, CalendarClock, FileUp,
  MessageSquare, Sparkles, TrendingUp, Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  activityFeed, campaigns, candidates, hiringTrend, interviews,
} from '@/lib/mockData';

const kpis = [
  { label: 'Active Candidates', value: 247, suffix: '', delta: '+12%', up: true, icon: Users, note: 'vs last month' },
  { label: 'Open Campaigns', value: 4, suffix: '', delta: '+1', up: true, icon: Briefcase, note: 'this quarter' },
  { label: 'Avg Time to Hire', value: 19, suffix: ' days', delta: '-2 days', up: true, icon: TrendingUp, note: 'improving' },
  { label: 'Offers Accepted', value: 12, suffix: '', delta: '+3', up: true, icon: Sparkles, note: 'this quarter' },
];

const aiSuggestions = [
  { id: 1, text: '4 high-match candidates in Senior Backend Engineer have waited 5+ days for review.', action: 'Review now', href: '/app/candidates' },
  { id: 2, text: 'Grace Liu (91) closely matches Engineering Manager, ML — consider fast-tracking.', action: 'View profile', href: '/app/candidates/CND-1011' },
  { id: 3, text: 'Enterprise AE campaign conversion dropped 8% this week. Screening criteria may be too strict.', action: 'See analytics', href: '/app/analytics' },
];

export const stageColor: Record<string, string> = {
  Applied: 'bg-slate-100 text-slate-700',
  Screening: 'bg-blue-50 text-blue-700',
  Interview: 'bg-violet-50 text-violet-700',
  Offer: 'bg-amber-50 text-amber-700',
  Hired: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-600',
};

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    const controls = animate(mv, target, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    return controls.stop;
  }, [target, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-md bg-secondary animate-pulse" />
        <div className="h-4 w-96 rounded-md bg-secondary/70 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="h-8 w-8 rounded-md bg-secondary animate-pulse" />
            <div className="h-7 w-20 rounded-md bg-secondary animate-pulse" />
            <div className="h-3 w-28 rounded-md bg-secondary/70 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-72 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const pendingReview = candidates.filter((c) => c.stage === 'Applied' || c.stage === 'Screening').slice(0, 5);
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Good afternoon, Sarah</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
              Here's what needs your judgment today — <span className="font-mono text-foreground/70">{pendingReview.length} candidates</span> awaiting review.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/campaigns?new=1')}>
              <Briefcase size={15} className="mr-1.5" /> New Campaign
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/campaigns/CMP-001?upload=1')}>
              <FileUp size={15} className="mr-1.5" /> Upload Resumes
            </Button>
            <Button size="sm" className="bg-primary" onClick={() => navigate('/app/copilot')}>
              <MessageSquare size={15} className="mr-1.5" /> Ask Copilot
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <Icon size={16} className="text-foreground/60" />
                  </div>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {kpi.delta}
                  </span>
                </div>
                <p className="font-mono text-2xl font-semibold text-foreground tracking-tight" style={{ marginBottom: 2 }}>
                  <Counter target={kpi.value} suffix={kpi.suffix} />
                </p>
                <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>{kpi.label} · {kpi.note}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Hiring Pipeline Trend</h3>
                  <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>Applications and interviews, last 6 months</p>
                </div>
                <Link href="/app/analytics">
                  <a className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                    Full analytics <ArrowRight size={12} />
                  </a>
                </Link>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hiringTrend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gInt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.35 0.05 250)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="oklch(0.35 0.05 250)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'oklch(0.552 0.016 285.938)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.004 286.32)', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }} />
                    <Area type="monotone" dataKey="applications" stroke="oklch(0.55 0.15 200)" strokeWidth={2} fill="url(#gApps)" name="Applications" />
                    <Area type="monotone" dataKey="interviews" stroke="oklch(0.35 0.05 250)" strokeWidth={2} fill="url(#gInt)" name="Interviews" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Pending Your Review</h3>
                  <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>AI has finished analysis — your judgment is next</p>
                </div>
                <Link href="/app/candidates">
                  <a className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                    All candidates <ArrowRight size={12} />
                  </a>
                </Link>
              </div>
              <div className="divide-y divide-border/60">
                {pendingReview.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/app/candidates/${c.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-full ${c.avatarColor} text-white text-xs font-semibold flex items-center justify-center shrink-0`}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" style={{ marginBottom: 0 }}>{c.name}</p>
                      <p className="text-xs text-foreground/50 truncate" style={{ marginBottom: 0 }}>{c.role}</p>
                    </div>
                    <Badge variant="secondary" className={`${stageColor[c.stage]} border-0 text-[11px]`}>{c.stage}</Badge>
                    <div className="w-20 text-right">
                      <span className="font-mono text-sm font-semibold text-foreground">{c.aiScore}</span>
                      <span className="text-xs text-foreground/40"> /100</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Active Campaigns</h3>
                  <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>Live hiring pipelines across departments</p>
                </div>
                <Link href="/app/campaigns">
                  <a className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                    All campaigns <ArrowRight size={12} />
                  </a>
                </Link>
              </div>
              <div className="px-5 pb-5 grid sm:grid-cols-3 gap-3">
                {activeCampaigns.map((cmp) => (
                  <button
                    key={cmp.id}
                    onClick={() => navigate(`/app/campaigns/${cmp.id}`)}
                    className="rounded-lg border border-border p-4 text-left hover:border-accent/50 hover:shadow-sm transition-all"
                  >
                    <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 4 }}>{cmp.id}</p>
                    <p className="text-sm font-medium text-foreground leading-snug" style={{ marginBottom: 6 }}>{cmp.name}</p>
                    <p className="text-xs text-foreground/50" style={{ marginBottom: 10 }}>{cmp.department} · {cmp.location}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/60"><span className="font-mono font-semibold text-foreground">{cmp.candidates}</span> candidates</span>
                      <span className="text-foreground/60"><span className="font-mono font-semibold text-accent">{cmp.matched}</span> matched</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-accent" />
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>AI Suggestions</h3>
              </div>
              <div className="space-y-3">
                {aiSuggestions.map((s) => (
                  <div key={s.id} className="rounded-lg bg-background border border-border/70 p-3.5">
                    <p className="text-[13px] text-foreground/80 leading-relaxed" style={{ marginBottom: 8 }}>{s.text}</p>
                    <button
                      onClick={() => navigate(s.href)}
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                    >
                      {s.action} <ArrowRight size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock size={16} className="text-foreground/50" />
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Upcoming Interviews</h3>
              </div>
              <div className="space-y-3">
                {interviews.map((iv) => (
                  <div key={iv.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="w-1 self-stretch rounded-full bg-accent/60 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate" style={{ marginBottom: 1 }}>{iv.candidate}</p>
                      <p className="text-xs text-foreground/50" style={{ marginBottom: 2 }}>{iv.type} · {iv.interviewer}</p>
                      <p className="font-mono text-[11px] text-foreground/60" style={{ marginBottom: 0 }}>{iv.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 16 }}>Recent Activity</h3>
              <div className="space-y-4">
                {activityFeed.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.type === 'ai' ? 'bg-accent' : a.type === 'offer' ? 'bg-emerald-500' : a.type === 'risk' ? 'bg-amber-500' : 'bg-foreground/25'}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] text-foreground/80 leading-snug" style={{ marginBottom: 1 }}>
                        <span className="font-medium text-foreground">{a.actor}</span> {a.action}{' '}
                        <span className="font-medium text-foreground">{a.target}</span>
                      </p>
                      <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
