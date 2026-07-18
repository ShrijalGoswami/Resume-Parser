'use client';

/**
 * Reusable, dependency-free chart primitives for the analytics dashboard.
 * Design per the dataviz method: single-hue magnitude bars (no cycled
 * categorical palette), one axis, recessive track, selective direct labels,
 * per-mark hover (title), accessible (role/aria + values in text tokens).
 * Colors come from design-system tokens so they stay consistent.
 */
import { cn } from '@/lib/utils';

const PRIMARY = 'bg-primary';
const TRACK = 'bg-muted';

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {empty ? <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p> : children}
    </div>
  );
}

/** Horizontal magnitude bars (top skills, missing skills, experience). */
export function BarList({
  data,
  colorClass = PRIMARY,
  emptyLabel = 'No data',
}: {
  data: { label: string; value: number }[];
  colorClass?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="space-y-2.5" role="list">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm" title={`${d.label}: ${d.value}`}>
          <span className="truncate text-muted-foreground" title={d.label}>{d.label}</span>
          <span className={cn('h-2.5 overflow-hidden rounded-full', TRACK)} role="img" aria-label={`${d.label}: ${d.value}`}>
            <span className={cn('block h-full rounded-full', colorClass)} style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums text-foreground">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical histogram (score distributions). Single hue. */
export function Histogram({ data }: { data: { range: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="py-4 text-center text-sm text-muted-foreground">No scores yet</p>;
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
      {data.map((d) => (
        <div key={d.range} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.range}: ${d.count}`}>
          <span className="text-xs font-medium tabular-nums text-foreground">{d.count || ''}</span>
          <div
            className={cn('w-full rounded-t bg-primary', d.count === 0 && 'bg-muted')}
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, minHeight: 2 }}
            role="img"
            aria-label={`${d.range}: ${d.count}`}
          />
          <span className="text-[10px] text-muted-foreground">{d.range}</span>
        </div>
      ))}
    </div>
  );
}

/** Hiring funnel — decreasing horizontal bars by stage. */
export function Funnel({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="py-4 text-center text-sm text-muted-foreground">No candidates yet</p>;
  return (
    <ul className="space-y-1.5" role="list">
      {data.map((d) => (
        <li key={d.stage} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-sm" title={`${d.stage}: ${d.count}`}>
          <span className="truncate capitalize text-muted-foreground">{d.stage}</span>
          <span className="h-5 overflow-hidden rounded-md bg-muted">
            <span
              className="flex h-full items-center rounded-md bg-primary/80"
              style={{ width: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          </span>
          <span className="text-right font-medium tabular-nums text-foreground">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Status breakdown — reserved status colors WITH labels (never color-alone). */
export function StatusBar({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const colorFor = (label: string) =>
    label.toLowerCase().includes('await') ? 'bg-amber-500' : 'bg-emerald-500';
  if (total === 0) return <p className="py-4 text-center text-sm text-muted-foreground">No candidates yet</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="Candidate status breakdown">
        {data.map((d) => (
          <span
            key={d.label}
            className={cn('h-full', colorFor(d.label))}
            style={{ width: `${(d.count / total) * 100}%` }}
            title={`${d.label}: ${d.count}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-4 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', colorFor(d.label))} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium tabular-nums text-foreground">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Upload trend — sparkline-style bars over time (single hue, magnitude). */
export function TrendBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">No uploads yet</p>;
  const recent = data.slice(-30);
  return (
    <div className="flex items-end gap-1" style={{ height: 100 }}>
      {recent.map((d) => (
        <div
          key={d.date}
          className="flex-1 rounded-t bg-primary/80"
          style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }}
          title={`${d.date}: ${d.count} uploaded`}
          role="img"
          aria-label={`${d.date}: ${d.count} uploaded`}
        />
      ))}
    </div>
  );
}
