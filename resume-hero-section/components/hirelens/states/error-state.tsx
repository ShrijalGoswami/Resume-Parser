'use client'

import * as React from 'react'
import { TriangleAlert, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

/**
 * Error state (Design Bible §4.10 / UX §4.5). `inline` for a failed card/section
 * (page survives); `route` for a full-page failure with a copyable request ID.
 * Never expose stack traces or provider names — the request ID is the only
 * diagnostic. Errors explain and point forward; they do not apologize.
 */
export interface ErrorStateProps {
  variant?: 'inline' | 'route'
  title?: string
  description?: string
  requestId?: string
  onRetry?: () => void
  supportHref?: string
  className?: string
}

export function ErrorState({
  variant = 'inline',
  title,
  description,
  requestId,
  onRetry,
  supportHref = 'mailto:support@hirelens.app',
  className,
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false)

  const copyRequestId = React.useCallback(() => {
    if (!requestId || !navigator.clipboard) return
    void navigator.clipboard.writeText(requestId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [requestId])

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-start gap-3 rounded-hl-md border border-hl-border border-l-[3px] border-l-[color:var(--hl-danger)] bg-hl-canvas p-3',
          className,
        )}
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-hl-danger" aria-hidden />
        <div className="flex-1">
          <p className="hl-body-medium">{title ?? "This didn't load"}</p>
          {description ? (
            <p className="hl-small text-hl-fg-secondary">{description}</p>
          ) : null}
        </div>
        {onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      <TriangleAlert className="size-6 text-hl-danger" strokeWidth={1.5} aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h1 className="hl-display">{title ?? "This page didn't load"}</h1>
        <p className="hl-body text-hl-fg-secondary">
          {description ?? 'Try again. If it keeps happening, contact support with the ID below.'}
        </p>
      </div>
      {requestId ? (
        <button
          type="button"
          onClick={copyRequestId}
          className="hl-mono inline-flex items-center gap-1.5 rounded-hl-sm border border-hl-border bg-hl-subtle px-2 py-1 text-hl-fg-secondary outline-none transition-colors hover:text-hl-fg"
        >
          {copied ? (
            <Check className="size-3.5 text-hl-success" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {requestId}
          <span className="sr-only">{copied ? 'Copied request ID' : 'Copy request ID'}</span>
        </button>
      ) : null}
      <div className="flex items-center gap-2">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button variant="ghost" asChild>
          <a href={supportHref}>Contact support</a>
        </Button>
      </div>
    </div>
  )
}
