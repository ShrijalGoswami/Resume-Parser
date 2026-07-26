// Shared admin console primitives: PageHeader, StatCard, StatusBadge, EmptyState, AdminTable.
// Style: institutional light, teal accent; tables support sort/search/filter/paginate/select.
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground" style={{ marginBottom: desc ? 3 : 0 }}>{title}</h2>
        {desc && <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, delta, deltaUp, delay = 0 }: { label: string; value: string; sub?: string; delta?: string; deltaUp?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <p className="text-[11px] uppercase tracking-wide text-foreground/45 font-medium" style={{ marginBottom: 6 }}>{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="font-mono text-[22px] font-semibold text-foreground leading-none" style={{ marginBottom: 0 }}>{value}</p>
        {delta && (
          <span className={`text-[11px] font-medium ${deltaUp ? 'text-emerald-600' : 'text-rose-600'}`}>{delta}</span>
        )}
      </div>
      {sub && <p className="text-[11px] text-foreground/45 mt-1.5" style={{ marginBottom: 0 }}>{sub}</p>}
    </motion.div>
  );
}

const badgeStyles: Record<string, string> = {
  // status
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Trial: 'bg-sky-50 text-sky-700 border-sky-200',
  Open: 'bg-sky-50 text-sky-700 border-sky-200',
  Processing: 'bg-sky-50 text-sky-700 border-sky-200',
  Invited: 'bg-sky-50 text-sky-700 border-sky-200',
  Info: 'bg-sky-50 text-sky-700 border-sky-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200',
  Available: 'bg-slate-50 text-slate-600 border-slate-200',
  Closed: 'bg-slate-50 text-slate-600 border-slate-200',
  'Past due': 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Warning: 'bg-amber-50 text-amber-700 border-amber-200',
  Degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  Suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  Churned: 'bg-rose-50 text-rose-700 border-rose-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
  Error: 'bg-rose-50 text-rose-700 border-rose-200',
  Revoked: 'bg-rose-50 text-rose-700 border-rose-200',
  Void: 'bg-slate-50 text-slate-500 border-slate-200',
  Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200',
  Normal: 'bg-sky-50 text-sky-700 border-sky-200',
  Low: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${badgeStyles[value] ?? 'bg-secondary text-foreground/60 border-border'}`}>
      {value}
    </span>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-14 text-center bg-card/50">
      <div className="w-10 h-10 rounded-full bg-secondary mx-auto flex items-center justify-center mb-3">
        <Inbox size={17} className="text-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground" style={{ marginBottom: 3 }}>{title}</p>
      <p className="text-[13px] text-foreground/50 max-w-sm mx-auto" style={{ marginBottom: action ? 14 : 0 }}>{desc}</p>
      {action}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function AdminTable<T extends { id: string }>({
  rows, columns, searchKeys, pageSize = 8, filters, bulkActions, onRowClick, searchPlaceholder = 'Search...',
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys: (row: T) => string;
  pageSize?: number;
  filters?: ReactNode;
  bulkActions?: (selected: string[], clear: () => void) => ReactNode;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) out = out.filter((r) => searchKeys(r).toLowerCase().includes(q.toLowerCase()));
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a); const bv = col.sortValue!(b);
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, sortKey, sortDir, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const clear = () => setSelected([]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder} className="h-8 pl-8 text-[13px]" />
        </div>
        {filters}
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && bulkActions ? bulkActions(selected, clear) : (
            <span className="font-mono text-[11px] text-foreground/45">{filtered.length} rows</span>
          )}
        </div>
      </div>
      {paged.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-foreground/50" style={{ marginBottom: 8 }}>No results{q ? ` for "${q}"` : ''}.</p>
          {q && <Button variant="outline" size="sm" onClick={() => setQ('')}>Clear search</Button>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left">
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={paged.length > 0 && paged.every((r) => selected.includes(r.id))}
                    onCheckedChange={(c) => setSelected(c ? Array.from(new Set([...selected, ...paged.map((r) => r.id)])) : selected.filter((id) => !paged.some((r) => r.id === id)))}
                    aria-label="Select all rows on page"
                  />
                </th>
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 text-[11px] uppercase tracking-wide font-medium text-foreground/50 whitespace-nowrap ${c.className ?? ''}`}>
                    {c.sortable ? (
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {c.header}
                        {sortKey === c.key && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                      </button>
                    ) : c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paged.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-secondary/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={(c) => setSelected(c ? [...selected, row.id] : selected.filter((id) => id !== row.id))}
                      aria-label={`Select ${row.id}`}
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 ${c.className ?? ''}`}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <span className="font-mono text-[11px] text-foreground/45">Page {safePage} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft size={14} />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
