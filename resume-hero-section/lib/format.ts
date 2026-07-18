/** Small shared formatting helpers used across the recruiter workspace. */

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Human relative time, e.g. "3h ago", "2d ago". */
export function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Tailwind text color class for a 0–100 score. */
export function scoreColor(score?: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 85) return 'text-emerald-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

export function scoreBg(score?: number | null): string {
  if (score == null) return 'bg-muted text-muted-foreground';
  if (score >= 85) return 'bg-emerald-50 text-emerald-700';
  if (score >= 70) return 'bg-blue-50 text-blue-700';
  if (score >= 50) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  archived: 'bg-slate-100 text-slate-500',
};
