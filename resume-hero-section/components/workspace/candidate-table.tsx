'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  GitCompare,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Candidate } from '@/types/campaign';
import {
  toRow,
  type CandidateRow,
  type HireLabel,
  HIRE_ORDER,
  HIRE_STYLES,
} from '@/lib/candidate';
import { bulkDeleteCandidates, getResumeUrl } from '@/services/campaigns-api';
import { EmptyState, ErrorState, LoadingRows } from '@/components/workspace/states';
import { Pagination } from '@/components/workspace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { scoreBg, formatDate, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;
type SortKey = 'match' | 'ats' | 'experience' | 'uploaded' | 'name' | 'recommendation';
const HIRE_OPTIONS: HireLabel[] = ['Strong Hire', 'Hire', 'Maybe', 'Reject'];

interface Filters {
  minMatch: string;
  maxMatch: string;
  minAts: string;
  minExp: string;
  hire: Set<HireLabel>;
  status: 'all' | 'analyzed' | 'awaiting';
  missingSkill: string;
  requiredSkill: string;
  uploadedAfter: string;
}
const EMPTY_FILTERS: Filters = {
  minMatch: '',
  maxMatch: '',
  minAts: '',
  minExp: '',
  hire: new Set(),
  status: 'all',
  missingSkill: '',
  requiredSkill: '',
  uploadedAfter: '',
};

export function CandidateTable({
  candidates,
  campaignId,
  loading,
  error,
  onChanged,
  onRetry,
  onAnalyze,
}: {
  candidates: Candidate[];
  campaignId: string;
  loading?: boolean;
  error?: string | null;
  onChanged: () => void;
  onRetry?: () => void;
  onAnalyze?: (candidateIds: string[]) => void;
}) {
  const { toast } = useToast();
  const rows = useMemo(() => candidates.map(toRow), [candidates]);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('match');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const awaitingCount = rows.filter((r) => r.status === 'awaiting').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    const minMatch = num(filters.minMatch);
    const maxMatch = num(filters.maxMatch);
    const minAts = num(filters.minAts);
    const minExp = num(filters.minExp);
    const miss = filters.missingSkill.trim().toLowerCase();
    const req = filters.requiredSkill.trim().toLowerCase();
    const after = filters.uploadedAfter ? new Date(filters.uploadedAfter).getTime() : null;

    let list = rows.filter((r) => {
      if (q) {
        const hay = [
          r.name,
          r.email,
          ...r.topSkills,
          ...r.matchingSkills,
          r.matchCategory ?? '',
          r.experience != null ? `${r.experience} years` : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (minMatch != null && (r.overallScore ?? -1) < minMatch) return false;
      if (maxMatch != null && (r.overallScore ?? 101) > maxMatch) return false;
      if (minAts != null && (r.atsScore ?? -1) < minAts) return false;
      if (minExp != null && (r.experience ?? -1) < minExp) return false;
      if (filters.hire.size > 0 && !filters.hire.has(r.hire)) return false;
      if (miss && !r.missingSkills.some((s) => s.toLowerCase().includes(miss))) return false;
      if (
        req &&
        !r.matchingSkills.concat(r.topSkills).some((s) => s.toLowerCase().includes(req))
      )
        return false;
      if (after != null && (!r.uploadedAt || new Date(r.uploadedAt).getTime() < after)) return false;
      return true;
    });

    const dir = asc ? 1 : -1;
    list = [...list].sort((a, b) => {
      let c = 0;
      switch (sort) {
        case 'ats':
          c = (a.atsScore ?? -1) - (b.atsScore ?? -1);
          break;
        case 'experience':
          c = (a.experience ?? -1) - (b.experience ?? -1);
          break;
        case 'uploaded':
          c =
            new Date(a.uploadedAt ?? 0).getTime() - new Date(b.uploadedAt ?? 0).getTime();
          break;
        case 'name':
          c = a.name.localeCompare(b.name);
          break;
        case 'recommendation':
          c = HIRE_ORDER[a.hire] - HIRE_ORDER[b.hire];
          break;
        default:
          c = (a.overallScore ?? -1) - (b.overallScore ?? -1);
      }
      return c * dir;
    });
    return list;
  }, [rows, query, filters, sort, asc]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount =
    (filters.minMatch ? 1 : 0) +
    (filters.maxMatch ? 1 : 0) +
    (filters.minAts ? 1 : 0) +
    (filters.minExp ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.missingSkill ? 1 : 0) +
    (filters.requiredSkill ? 1 : 0) +
    (filters.uploadedAfter ? 1 : 0) +
    filters.hire.size;

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(false);
    }
    setPage(1);
  }

  const pageIds = pageRows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function downloadResume(r: CandidateRow) {
    if (!r.resumePath) {
      toast({ title: 'No resume stored', description: `${r.name} has no uploaded resume file.` });
      return;
    }
    try {
      const { url } = await getResumeUrl(campaignId, r.id);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast({ title: 'Could not open resume', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  }

  // ---- bulk actions (extensible registry) ----
  const selectedRows = filtered.filter((r) => selected.has(r.id));
  async function bulkDelete() {
    if (selectedRows.length === 0) return;
    if (!confirm(`Delete ${selectedRows.length} candidate(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { deleted } = await bulkDeleteCandidates(campaignId, [...selected]);
      toast({ title: 'Candidates removed', description: `${deleted} deleted.` });
      setSelected(new Set());
      onChanged();
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }
  function bulkExport() {
    if (selectedRows.length === 0) return;
    const cols = ['Name', 'Email', 'Match', 'ATS', 'Experience', 'Recommendation', 'Missing Skills', 'Status', 'Uploaded'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [cols.join(',')].concat(
      selectedRows.map((r) =>
        [
          r.name,
          r.email,
          r.overallScore ?? '',
          r.atsScore ?? '',
          r.experience ?? '',
          r.hire,
          r.missingSkills.join('; '),
          r.status,
          r.uploadedAt ? formatDate(r.uploadedAt) : '',
        ]
          .map((v) => esc(String(v)))
          .join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_${campaignId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selectedRows.length} candidates → CSV.` });
  }
  function bulkAnalyze() {
    const analyzable = selectedRows.filter((r) => r.resumePath);
    if (!onAnalyze || analyzable.length === 0) {
      toast({
        title: 'Nothing to analyze',
        description: 'Selected candidates have no stored resume to (re)analyze. Upload resumes to enable this.',
      });
      return;
    }
    onAnalyze(analyzable.map((r) => r.id));
  }

  if (loading) return <LoadingRows rows={6} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0)
    return (
      <EmptyState
        title="No candidates yet"
        description="Upload resumes to rank and analyze candidates for this campaign."
        icon={<FileText className="h-6 w-6" />}
      />
    );

  return (
    <div>
      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, skills, experience…"
            className="pl-9"
            aria-label="Search candidates"
          />
        </div>
        <Button
          variant={activeFilterCount ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
        <select
          value={sort}
          onChange={(e) => toggleSort(e.target.value as SortKey)}
          className="rounded-lg border border-border/60 bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          aria-label="Sort by"
        >
          <option value="match">Match score</option>
          <option value="ats">ATS score</option>
          <option value="experience">Experience</option>
          <option value="uploaded">Upload date</option>
          <option value="name">Name</option>
          <option value="recommendation">Recommendation</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setAsc((v) => !v)} title="Toggle direction">
          {asc ? '↑' : '↓'}
        </Button>
      </div>

      {/* filter panel */}
      {showFilters && (
        <div className="mb-3 grid gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <NumRange label="Match score" min={filters.minMatch} max={filters.maxMatch}
            onMin={(v) => setFilters((f) => ({ ...f, minMatch: v }))}
            onMax={(v) => setFilters((f) => ({ ...f, maxMatch: v }))} />
          <Field label="Min ATS">
            <Input type="number" value={filters.minAts} onChange={(e) => setFilters((f) => ({ ...f, minAts: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Min experience (yrs)">
            <Input type="number" value={filters.minExp} onChange={(e) => setFilters((f) => ({ ...f, minExp: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Analysis status">
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters['status'] }))}
              className="w-full rounded-lg border border-border/60 bg-background px-2 py-2 text-sm">
              <option value="all">All</option>
              <option value="analyzed">Analyzed</option>
              <option value="awaiting">Awaiting</option>
            </select>
          </Field>
          <Field label="Missing skill">
            <Input value={filters.missingSkill} onChange={(e) => setFilters((f) => ({ ...f, missingSkill: e.target.value }))} placeholder="e.g. Kubernetes" />
          </Field>
          <Field label="Required skill">
            <Input value={filters.requiredSkill} onChange={(e) => setFilters((f) => ({ ...f, requiredSkill: e.target.value }))} placeholder="e.g. Python" />
          </Field>
          <Field label="Uploaded after">
            <Input type="date" value={filters.uploadedAfter} onChange={(e) => setFilters((f) => ({ ...f, uploadedAfter: e.target.value }))} />
          </Field>
          <Field label="Hiring recommendation">
            <div className="flex flex-wrap gap-1">
              {HIRE_OPTIONS.map((h) => (
                <button key={h} onClick={() => setFilters((f) => {
                  const next = new Set(f.hire);
                  next.has(h) ? next.delete(h) : next.add(h);
                  return { ...f, hire: next };
                })}
                  className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    filters.hire.has(h) ? HIRE_STYLES[h] : 'border-border text-muted-foreground')}>
                  {h}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
              <X className="mr-1 h-4 w-4" /> Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* partial-analysis banner */}
      {awaitingCount > 0 && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {awaitingCount} candidate{awaitingCount > 1 ? 's are' : ' is'} awaiting analysis.
        </div>
      )}

      {/* bulk bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={bulkAnalyze} disabled={busy}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Analyze
            </Button>
            <Button size="sm" variant="outline" onClick={bulkExport} disabled={busy}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast({ title: 'Compare coming soon', description: 'Side-by-side comparison lands in a later sprint.' })} disabled={busy}>
              <GitCompare className="mr-1.5 h-4 w-4" /> Compare
            </Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />} Delete
            </Button>
          </div>
        </div>
      )}

      {/* table */}
      {filtered.length === 0 ? (
        <EmptyState title="No matching candidates" description="Adjust your search or filters." icon={<Search className="h-6 w-6" />} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label="Select all on page" />
                </th>
                <th className="px-3 py-2">Candidate</th>
                <HeadCell label="Match" onClick={() => toggleSort('match')} active={sort === 'match'} asc={asc} />
                <HeadCell label="ATS" onClick={() => toggleSort('ats')} active={sort === 'ats'} asc={asc} />
                <HeadCell label="Exp" onClick={() => toggleSort('experience')} active={sort === 'experience'} asc={asc} />
                <HeadCell label="Recommendation" onClick={() => toggleSort('recommendation')} active={sort === 'recommendation'} asc={asc} />
                <th className="px-3 py-2">Skills</th>
                <th className="px-3 py-2">Status</th>
                <HeadCell label="Uploaded" onClick={() => toggleSort('uploaded')} active={sort === 'uploaded'} asc={asc} />
                <th className="w-8 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <CandidateRowView
                  key={r.id}
                  row={r}
                  campaignId={campaignId}
                  selected={selected.has(r.id)}
                  expanded={expanded.has(r.id)}
                  onSelect={() => toggleRow(r.id)}
                  onExpand={() => toggleExpand(r.id)}
                  onDownload={() => downloadResume(r)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

function HeadCell({ label, onClick, active, asc }: { label: string; onClick: () => void; active: boolean; asc: boolean }) {
  return (
    <th className="px-3 py-2">
      <button onClick={onClick} className={cn('inline-flex items-center gap-1 font-medium', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
        {label}
        {active && <span className="text-[10px]">{asc ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: CandidateRow['status'] }) {
  const map: Record<string, string> = {
    analyzed: 'bg-emerald-50 text-emerald-700',
    awaiting: 'bg-amber-50 text-amber-700',
    analyzing: 'bg-blue-50 text-blue-700',
    failed: 'bg-rose-50 text-rose-700',
  };
  const label: Record<string, string> = { analyzed: 'Analyzed', awaiting: 'Awaiting', analyzing: 'Analyzing…', failed: 'Failed' };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', map[status])}>
      {status === 'analyzing' && <Loader2 className="h-3 w-3 animate-spin" />}
      {label[status]}
    </span>
  );
}

function CandidateRowView({
  row: r,
  campaignId,
  selected,
  expanded,
  onSelect,
  onExpand,
  onDownload,
}: {
  row: CandidateRow;
  campaignId: string;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onDownload: () => void;
}) {
  return (
    <>
      <tr className={cn('border-b border-border/40 transition hover:bg-muted/30', selected && 'bg-primary/5')}>
        <td className="px-3 py-2.5">
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${r.name}`} />
        </td>
        <td className="px-3 py-2.5">
          <Link href={`/campaigns/${campaignId}/candidates/${r.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
            {r.name}
          </Link>
          <div className="text-xs text-muted-foreground">{r.email || '—'}</div>
        </td>
        <td className="px-3 py-2.5">
          {r.overallScore != null ? (
            <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-sm font-semibold', scoreBg(r.overallScore))}>{r.overallScore}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 tabular-nums">{r.atsScore ?? '—'}</td>
        <td className="px-3 py-2.5 tabular-nums">{r.experience != null ? `${r.experience}y` : '—'}</td>
        <td className="px-3 py-2.5">
          <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium', HIRE_STYLES[r.hire])}>{r.hire}</span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {r.topSkills.slice(0, 3).map((s) => (
              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
            ))}
            {r.topSkills.length > 3 && <span className="text-[10px] text-muted-foreground">+{r.topSkills.length - 3}</span>}
          </div>
        </td>
        <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={r.uploadedAt ? formatDate(r.uploadedAt) : ''}>{relativeTime(r.uploadedAt)}</td>
        <td className="px-3 py-2.5">
          <button onClick={onExpand} className="text-muted-foreground hover:text-foreground" aria-label="Toggle details">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/40 bg-muted/20">
          <td colSpan={10} className="px-6 py-4">
            {r.status !== 'analyzed' ? (
              <p className="text-sm text-muted-foreground">This candidate has not been analyzed yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Preview title="Summary">{r.summary || '—'}</Preview>
                <div className="flex flex-wrap items-start gap-4">
                  <Chips title="Strengths" items={r.strengths} tone="emerald" />
                  <Chips title="Weaknesses" items={r.weaknesses} tone="rose" />
                </div>
                <Chips title="Missing skills" items={r.missingSkills} tone="amber" />
                <Preview title="Recommendation">{r.recommendationText || r.hire}</Preview>
                <div className="md:col-span-2">
                  <Button size="sm" variant="outline" onClick={onDownload} disabled={!r.resumePath}>
                    <FileText className="mr-1.5 h-4 w-4" /> {r.resumePath ? 'View resume' : 'No resume file'}
                  </Button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}
function Chips({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'rose' | 'amber' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-1">
          {items.map((s, i) => (
            <span key={`${s}-${i}`} className={cn('rounded px-1.5 py-0.5 text-[11px]', cls)}>{s}</span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function NumRange({ label, min, max, onMin, onMax }: { label: string; min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input type="number" value={min} onChange={(e) => onMin(e.target.value)} placeholder="min" className="w-full" />
        <span className="text-muted-foreground">–</span>
        <Input type="number" value={max} onChange={(e) => onMax(e.target.value)} placeholder="max" className="w-full" />
      </div>
    </div>
  );
}
