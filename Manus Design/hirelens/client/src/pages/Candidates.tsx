// HireLens Candidates — professional table with search, filters, sorting, bulk actions, drawer.
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, Mail, Search, SlidersHorizontal, Tag, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { candidates, Candidate } from '@/lib/mockData';
import { toast } from 'sonner';

const stageStyle: Record<string, string> = {
  Applied: 'bg-slate-100 text-slate-700',
  Screening: 'bg-blue-50 text-blue-700',
  Interview: 'bg-violet-50 text-violet-700',
  Offer: 'bg-amber-50 text-amber-700',
  Hired: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-600',
};

type SortKey = 'name' | 'aiScore' | 'appliedDate';

const PAGE_SIZE = 10;

export default function Candidates() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [campaign, setCampaign] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('aiScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Candidate | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setPage(1); }, [query, stage, campaign]);

  const campaignNames = useMemo(() => Array.from(new Set(candidates.map((c) => c.campaign))), []);

  const filtered = useMemo(() => {
    const list = candidates.filter(
      (c) =>
        (stage === 'all' || c.stage === stage) &&
        (campaign === 'all' || c.campaign === campaign) &&
        (query === '' ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.role.toLowerCase().includes(query.toLowerCase()) ||
          c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))),
    );
    return [...list].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [query, stage, campaign, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const toggleAll = () => {
    setSelected((s) => {
      const pageIds = paged.map((c) => c.id);
      const allSelected = pageIds.every((id) => s.has(id));
      const n = new Set(s);
      pageIds.forEach((id) => (allSelected ? n.delete(id) : n.add(id)));
      return n;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const bulkAction = (action: string) => {
    toast.success(`${action} applied to ${selected.size} candidate${selected.size > 1 ? 's' : ''}`);
    setSelected(new Set());
  };

  const scoreColor = (s: number) => (s >= 88 ? 'text-emerald-600' : s >= 75 ? 'text-amber-600' : 'text-foreground/50');

  if (loading) {
    return (
      <AppLayout title="Candidates">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5" aria-busy="true" aria-label="Loading candidates">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-secondary animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-secondary/70 animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 flex-1 rounded-md bg-secondary animate-pulse" />
            <div className="h-9 w-36 rounded-md bg-secondary animate-pulse" />
            <div className="h-9 w-56 rounded-md bg-secondary animate-pulse" />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60">
                <div className="w-8 h-8 rounded-full bg-secondary animate-pulse shrink-0" />
                <div className="h-4 w-40 rounded bg-secondary animate-pulse" />
                <div className="h-4 w-24 rounded bg-secondary/70 animate-pulse hidden md:block" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-secondary animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Candidates">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Candidates</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
              <span className="font-mono">{filtered.length}</span> of <span className="font-mono">{candidates.length}</span> candidates
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => {
              const rows = [
                ['ID', 'Name', 'Email', 'Role', 'Campaign', 'Stage', 'AI Score', 'Location', 'Applied'],
                ...filtered.map((c) => [c.id, c.name, c.email, c.role, c.campaign, c.stage, String(c.aiScore), c.location, c.appliedDate]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = 'hirelens-candidates.csv';
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${filtered.length} candidates to CSV`);
            }}
          >
            <Download size={15} className="mr-1.5" /> Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, role, or tag..." className="pl-9" />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-36"><SlidersHorizontal size={13} className="mr-1 text-foreground/40" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaignNames.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-4 py-2.5"
            >
              <span className="text-sm font-medium text-foreground"><span className="font-mono">{selected.size}</span> selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => bulkAction('Stage change')}>Move stage</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction('Tag')}><Tag size={13} className="mr-1" />Add tag</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction('Email')}><Mail size={13} className="mr-1" />Email</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X size={14} /></Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users size={20} className="text-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground" style={{ marginBottom: 4 }}>No candidates match your filters</p>
            <p className="text-sm text-foreground/50" style={{ marginBottom: 16 }}>Try widening your search criteria.</p>
            <Button size="sm" variant="outline" onClick={() => { setQuery(''); setStage('all'); setCampaign('all'); }}>Clear all filters</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="pl-4 py-2.5 w-10">
                    <Checkbox checked={paged.length > 0 && paged.every((c) => selected.has(c.id))} onCheckedChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 font-medium text-foreground/60 hover:text-foreground text-xs uppercase tracking-wide">
                      Candidate <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="text-xs uppercase tracking-wide font-medium text-foreground/60">Campaign</span>
                  </th>
                  <th className="px-3 py-2.5">
                    <span className="text-xs uppercase tracking-wide font-medium text-foreground/60">Stage</span>
                  </th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('aiScore')} className="flex items-center gap-1 font-medium text-foreground/60 hover:text-foreground text-xs uppercase tracking-wide">
                      AI Score <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 hidden xl:table-cell">
                    <span className="text-xs uppercase tracking-wide font-medium text-foreground/60">Tags</span>
                  </th>
                  <th className="px-3 py-2.5 hidden md:table-cell">
                    <button onClick={() => toggleSort('appliedDate')} className="flex items-center gap-1 font-medium text-foreground/60 hover:text-foreground text-xs uppercase tracking-wide">
                      Applied <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paged.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setPreview(c)}>
                    <td className="pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} aria-label={`Select ${c.name}`} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${c.avatarColor} text-white text-xs font-semibold flex items-center justify-center shrink-0`}>{c.initials}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate" style={{ marginBottom: 0 }}>{c.name}</p>
                          <p className="font-mono text-[11px] text-foreground/40 truncate" style={{ marginBottom: 0 }}>{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <p className="text-foreground/70 truncate max-w-48" style={{ marginBottom: 0 }}>{c.campaign}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary" className={`${stageStyle[c.stage]} border-0 text-[11px]`}>{c.stage}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${c.aiScore >= 88 ? 'bg-emerald-500' : c.aiScore >= 75 ? 'bg-amber-500' : 'bg-foreground/30'}`} style={{ width: `${c.aiScore}%` }} />
                        </div>
                        <span className={`font-mono text-[13px] font-semibold ${scoreColor(c.aiScore)}`}>{c.aiScore}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <div className="flex gap-1 flex-wrap max-w-44">
                        {c.tags.slice(0, 2).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-secondary text-[11px] text-foreground/60">{t}</span>
                        ))}
                        {c.tags.length > 2 && <span className="text-[11px] text-foreground/40">+{c.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-foreground/50">{c.appliedDate}</span>
                    </td>
                    <td className="px-3 py-3">
                      <ChevronDown size={14} className="text-foreground/30 -rotate-90" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>
                  Showing <span className="font-mono">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-mono">{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-md text-xs font-mono transition-colors ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:bg-secondary'}`}
                      aria-label={`Page ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview drawer */}
      <AnimatePresence>
        {preview && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setPreview(null)}
            />
            <motion.div
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
                <span className="font-mono text-xs text-foreground/50">{preview.id}</span>
                <button onClick={() => setPreview(null)} className="p-1.5 hover:bg-secondary rounded-md transition-colors"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full ${preview.avatarColor} text-white text-lg font-semibold flex items-center justify-center`}>{preview.initials}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground" style={{ marginBottom: 2 }}>{preview.name}</h3>
                    <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>{preview.role} · {preview.location}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className={`font-mono text-xl font-bold ${scoreColor(preview.aiScore)}`} style={{ marginBottom: 0 }}>{preview.aiScore}</p>
                    <p className="text-[10px] uppercase tracking-wide text-foreground/40" style={{ marginBottom: 0 }}>AI Score</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-sm font-semibold text-foreground pt-1" style={{ marginBottom: 0 }}>{preview.confidence}</p>
                    <p className="text-[10px] uppercase tracking-wide text-foreground/40" style={{ marginBottom: 0 }}>Confidence</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-sm font-semibold text-foreground pt-1" style={{ marginBottom: 0 }}>{preview.experience}</p>
                    <p className="text-[10px] uppercase tracking-wide text-foreground/40" style={{ marginBottom: 0 }}>Experience</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40" style={{ marginBottom: 8 }}>AI Summary</p>
                  <p className="text-sm text-foreground/75 leading-relaxed" style={{ marginBottom: 0 }}>{preview.summary}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40" style={{ marginBottom: 8 }}>Tags</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {preview.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-secondary text-xs text-foreground/70">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-border p-4 shrink-0">
                <Button className="w-full bg-primary" onClick={() => { navigate(`/app/candidates/${preview.id}`); }}>
                  Open full profile <ArrowRight size={15} className="ml-1.5" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
