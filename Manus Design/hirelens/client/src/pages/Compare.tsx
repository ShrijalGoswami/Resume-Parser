// HireLens Compare — side-by-side candidate comparison with AI reasoning per dimension.
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, GitCompare, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { candidates } from '@/lib/mockData';
import { toast } from 'sonner';

const dimensions = ['System Design', 'Programming', 'Leadership', 'Communication', 'Domain Fit'];

const reasoningByDim: Record<string, string> = {
  'System Design': 'The left candidate documents larger-scale architecture work with explicit trade-off analysis, while the right candidate\'s systems experience is described at a higher level without scale metrics. Advantage: left, with high confidence.',
  Programming: 'Both show deep hands-on work in modern backend stacks. The difference is marginal and within the noise of resume-based assessment.',
  Leadership: 'The right candidate has managed larger teams (8 vs 6) and describes formal management responsibilities, while the left candidate\'s leadership is primarily project-based. Advantage: right.',
  Communication: 'The left candidate has public writing and two conference talks — externally verifiable signals. The right candidate\'s communication evidence is internal only.',
  'Domain Fit': 'Both have B2B SaaS backgrounds. The left candidate\'s HR-tech exposure maps directly to this role\'s domain, which strengthens ramp-up speed.',
};

export default function Compare() {
  const [, navigate] = useLocation();
  const [leftId, setLeftId] = useState(candidates[0].id);
  const [rightId, setRightId] = useState(candidates[1].id);

  const left = useMemo(() => candidates.find((c) => c.id === leftId)!, [leftId]);
  const right = useMemo(() => candidates.find((c) => c.id === rightId)!, [rightId]);

  const getSkill = (c: typeof left, dim: string) => c.skills.find((s) => s.name === dim)?.level ?? 70;

  return (
    <AppLayout title="Comparison Workspace">
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Compare Candidates</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>Side-by-side analysis with AI reasoning for every difference — not just scores.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success('Comparison export started — PDF will download shortly')}>
            Export comparison
          </Button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: leftId, set: setLeftId, c: left, side: 'A' },
            { id: rightId, set: setRightId, c: right, side: 'B' },
          ].map(({ id, set, c, side }) => (
            <div key={side} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground/50">CANDIDATE {side}</span>
                <Select value={id} onValueChange={set}>
                  <SelectTrigger className="w-48 h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidates.slice(0, 15).map((cd) => (
                      <SelectItem key={cd.id} value={cd.id}>{cd.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${c.avatarColor} text-white font-semibold flex items-center justify-center shrink-0`}>{c.initials}</div>
                <div className="min-w-0 flex-1">
                  <button onClick={() => navigate(`/app/candidates/${c.id}`)} className="text-[15px] font-semibold text-foreground hover:text-accent transition-colors truncate block">
                    {c.name}
                  </button>
                  <p className="text-xs text-foreground/50 truncate" style={{ marginBottom: 0 }}>{c.role} · {c.experience}</p>
                </div>
                <div className={`font-mono text-2xl font-bold ${c.aiScore >= 88 ? 'text-emerald-600' : c.aiScore >= 75 ? 'text-amber-600' : 'text-foreground/50'}`}>
                  {c.aiScore}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dimension comparison */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <GitCompare size={15} className="text-foreground/50" />
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Dimension-by-dimension</h3>
          </div>
          <div className="divide-y divide-border/60">
            {dimensions.map((dim, i) => {
              const lv = getSkill(left, dim);
              const rv = getSkill(right, dim);
              const leftWins = lv > rv;
              return (
                <motion.div
                  key={dim}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                  className="px-6 py-5"
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-3">
                    <div className="flex items-center gap-3 justify-end">
                      <span className={`font-mono text-sm font-semibold ${leftWins ? 'text-emerald-600' : 'text-foreground/50'}`}>{lv}</span>
                      <div className="w-40 h-2 rounded-full bg-secondary overflow-hidden" style={{ direction: 'rtl' }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${lv}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
                          className={`h-full rounded-full ${leftWins ? 'bg-emerald-500' : 'bg-foreground/25'}`}
                        />
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-foreground/70 w-32 text-center">{dim}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-40 h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${rv}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
                          className={`h-full rounded-full ${!leftWins ? 'bg-emerald-500' : 'bg-foreground/25'}`}
                        />
                      </div>
                      <span className={`font-mono text-sm font-semibold ${!leftWins ? 'text-emerald-600' : 'text-foreground/50'}`}>{rv}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 max-w-2xl mx-auto">
                    <Sparkles size={13} className="text-accent shrink-0 mt-0.5" />
                    <p className="text-[13px] text-foreground/60 leading-relaxed" style={{ marginBottom: 0 }}>{reasoningByDim[dim]}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Verdict */}
        {/* Strength / weakness matrix */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { c: left, side: 'A' },
            { c: right, side: 'B' },
          ].map(({ c, side }) => (
            <div key={side} className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground/50 inline-block" style={{ marginBottom: 12 }}>CANDIDATE {side} · {c.name.toUpperCase()}</p>
              <div className="space-y-2.5 mb-4">
                {c.strengths.slice(0, 2).map((s) => (
                  <div key={s.title} className="flex gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{s.title}</p>
                      <p className="text-xs text-foreground/55 leading-snug" style={{ marginBottom: 0 }}>{s.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {c.risks.slice(0, 2).map((r) => (
                  <div key={r.title} className="flex gap-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{r.title}</p>
                      <p className="text-xs text-foreground/55 leading-snug" style={{ marginBottom: 0 }}>{r.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-accent" />
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>AI Recommendation</h3>
          </div>
          <p className="text-sm text-foreground/75 leading-relaxed" style={{ marginBottom: 14 }}>
            {left.name} shows stronger evidence for this role's core requirement — large-scale system design — with externally verifiable communication signals. {right.name} brings deeper formal management experience, which matters more if team leadership is the primary need. If the role is weighted toward hands-on architecture (as the campaign description suggests), the evidence favors {left.aiScore >= right.aiScore ? left.name : right.name}. Both merit interviews; the difference is in sequencing, not exclusion.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-primary" onClick={() => navigate(`/app/candidates/${left.id}`)}>
              Open {left.name.split(' ')[0]}'s profile <ArrowRight size={14} className="ml-1" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/app/candidates/${right.id}`)}>
              Open {right.name.split(' ')[0]}'s profile
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
