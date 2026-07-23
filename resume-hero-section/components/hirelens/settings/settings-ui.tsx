'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { PageHeader } from '../shell/page-header'

/** Section shell (Design Bible §6.8) — Stripe-calm header + body, 800px column.
 *  The header is the shared PageHeader (premium Fraunces title); the form body
 *  below stays in the dense UI voice. */
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={action} spacing="none" />
      {children}
    </section>
  )
}

/** A labelled form field with optional helper text below the control. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="hl-small font-medium text-hl-fg">
        {label}
      </label>
      {children}
      {hint ? <p className="hl-caption text-hl-fg-tertiary">{hint}</p> : null}
    </div>
  )
}

/** Native select styled to the system — no custom listbox needed for settings. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'hl-body h-[var(--hl-control-h-md)] rounded-hl-md border border-hl-border bg-hl-canvas px-2 text-hl-fg outline-none focus-visible:border-hl-accent disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
NativeSelect.displayName = 'NativeSelect'

/** A calm "not yet, and honest about it" note for backend-gapped capabilities. */
export function DeferredNote({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-hl-md border border-hl-border-subtle bg-hl-subtle p-3">
      <Clock className="mt-0.5 size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
      <div className="min-w-0">
        <p className="hl-small font-medium text-hl-fg">{title}</p>
        {children ? <p className="hl-caption mt-0.5 text-hl-fg-secondary">{children}</p> : null}
      </div>
    </div>
  )
}

/** Dirty-state save bar (UX Spec §10 — save on explicit Save). Hidden when clean. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  if (!dirty) return null
  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" size="sm" onClick={onSave} loading={saving}>
        Save changes
      </Button>
      <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
        Discard
      </Button>
    </div>
  )
}
