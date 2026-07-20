import * as React from 'react'
import { Lock, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Feature-gate state (Design Bible §4.9). A calm upsell/permission surface —
 * never an error. One icon, one line, a single CTA.
 *  - `plan`       → "… is available on the Growth plan" + Upgrade
 *  - `permission` → "You need Recruiter access to view this" + Request access
 */
export interface GateStateProps {
  reason: 'plan' | 'permission'
  title: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export function GateState({ reason, title, icon, action, className }: GateStateProps) {
  const Glyph = icon ?? (reason === 'plan' ? Sparkles : Lock)
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <Glyph className="size-5 text-hl-fg-tertiary" strokeWidth={1.5} aria-hidden />
      <p className="hl-body max-w-sm text-hl-fg-secondary">{title}</p>
      {action}
    </div>
  )
}
