import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Breadcrumbs (Design Bible §5.3). Current segment is emphasized. */
export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center gap-1.5', className)}>
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 text-hl-border-strong" aria-hidden />
            ) : null}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="hl-small truncate text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'truncate',
                  isLast ? 'hl-body-medium text-hl-fg' : 'hl-small text-hl-fg-tertiary',
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
