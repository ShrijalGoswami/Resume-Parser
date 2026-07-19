'use client';

/** Reusable loading / empty / error states shared across the workspace. */
import Link from 'next/link';
import { AlertCircle, Inbox, Loader2, Lock, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Plan/permission gate state — shown when a capability is disabled for the
 * org's current plan or feature flags. This is an entitlement state, not a
 * system error, so it is deliberately calm (not red) and offers a next step.
 */
export function FeatureLockedState({
  feature,
  description,
}: {
  feature: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium text-foreground">{feature} is unavailable for your current plan</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ?? 'Upgrade your plan or ask an organization admin to enable this feature to unlock it.'}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/admin?tab=subscription">
            <Sparkles className="mr-1.5 h-4 w-4" /> View plans &amp; upgrade
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin?tab=feature-flags">Manage feature flags</Link>
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
