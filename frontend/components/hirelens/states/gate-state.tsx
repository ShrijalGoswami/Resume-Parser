import * as React from 'react'
import { Gauge, Lock, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Gate state (Design Bible §4.9) — a calm surface for "you can't do this yet".
 * Never an error: nothing is broken, and the user is not at fault.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS COMPONENT IS GENERIC AND MUST STAY THAT WAY.
 *
 * It knows the three SHAPES a gate can take. It does not know a single plan
 * name, price, feature key, metric, or anything about billing. It must never
 * import the entitlement catalog.
 *
 * Every product-specific string — "AI Copilot", "Upgrade to Enterprise",
 * "2 of 2 résumés used" — is composed by the catalog-aware layer in
 * `components/hirelens/entitlements/` and handed down as `title`, `description`,
 * `meta` and `action`. That is what keeps upsell copy derived from one table
 * instead of typed into a component, and it is asserted by a source-level test
 * in `tests/entitlement-components.test.tsx` rather than left to good manners.
 *
 * (An earlier version of this file's own documentation named a "Growth plan"
 * that has never existed in the product. That is exactly the drift the rule
 * prevents, and it survived here for months precisely because a comment is not
 * checked by anything.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The three reasons are different situations with different remedies, and
 * collapsing any two of them tells someone to do the wrong thing:
 *
 *  - `plan`       your ORGANIZATION has not bought this → upgrade (402)
 *  - `permission` your ROLE may not do this → ask an admin (403)
 *  - `quota`      you have used up an allowance → upgrade, or wait for renewal
 *
 * `plan` and `permission` are the axis separation the whole monetization design
 * rests on: telling a paying owner they "lack permission" is the worst sentence
 * a monetized product can show. `quota` is split from `plan` because a lock is
 * static and about capability, while a quota is dynamic, has numbers, and is
 * about volume — the same upgrade path, a different sentence.
 */
export interface GateStateProps {
  reason: 'plan' | 'permission' | 'quota'
  /** The one-line statement of the situation. Composed by the caller. */
  title: string
  /** Optional second line — what the capability does, or when it renews. */
  description?: string
  /**
   * A short factual line rendered below the copy, e.g. a usage figure. Kept
   * separate from `description` so it can be styled as data rather than prose,
   * and so a caller can supply numbers without writing a sentence around them.
   */
  meta?: React.ReactNode
  icon?: LucideIcon
  /** The remedy: an upgrade button, a request-access button, nothing. */
  action?: React.ReactNode
  className?: string
}

const DEFAULT_ICON: Record<GateStateProps['reason'], LucideIcon> = {
  plan: Sparkles,
  permission: Lock,
  quota: Gauge,
}

export function GateState({
  reason,
  title,
  description,
  meta,
  icon,
  action,
  className,
}: GateStateProps) {
  const Glyph = icon ?? DEFAULT_ICON[reason]
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <Glyph className="size-5 text-hl-fg-tertiary" strokeWidth={1.5} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <p className="hl-body text-hl-fg-secondary">{title}</p>
        {description ? <p className="hl-small text-hl-fg-tertiary">{description}</p> : null}
      </div>
      {meta ? <div className="hl-caption text-hl-fg-tertiary">{meta}</div> : null}
      {action}
    </div>
  )
}
