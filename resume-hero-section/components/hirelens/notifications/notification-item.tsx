'use client'

import Link from 'next/link'
import { Check, Sparkles, Activity as ActivityIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '../lib/format'
import type { NotificationView } from './types'

const KIND_ICON = {
  recommendation: Sparkles,
  activity: ActivityIcon,
} as const

/** Severity tints reuse the semantic scale; never color-alone — the icon and
 *  the unread dot carry the same information. */
const SEVERITY_TONE: Record<NotificationView['severity'], string> = {
  urgent: 'text-hl-danger',
  high: 'text-hl-warning',
  medium: 'text-hl-fg-secondary',
  low: 'text-hl-fg-tertiary',
}

export function NotificationItem({
  item,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  compact = false,
}: {
  item: NotificationView
  onMarkRead: (id: string) => void
  onMarkUnread?: (id: string) => void
  onDismiss?: (id: string) => void
  /** Panel density — hides the secondary row actions. */
  compact?: boolean
}) {
  const Icon = KIND_ICON[item.kind]
  const stamp = relativeTime(item.createdAt)

  const content = (
    <>
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-hl-sm bg-hl-subtle',
          SEVERITY_TONE[item.severity],
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('hl-body block', item.read ? 'text-hl-fg-secondary' : 'text-hl-fg')}>
          {item.title}
        </span>
        <span className="hl-caption mt-0.5 flex flex-wrap items-center gap-x-1.5 text-hl-fg-tertiary">
          {item.detail ? <span className="truncate">{item.detail}</span> : null}
          {item.detail && stamp ? <span aria-hidden>·</span> : null}
          {stamp ? <span className="font-hl-mono">{stamp}</span> : null}
        </span>
      </span>
      {!item.read ? (
        <span
          className="mt-2 size-1.5 shrink-0 rounded-full bg-hl-accent"
          aria-label="Unread"
          role="status"
        />
      ) : null}
    </>
  )

  return (
    <li
      className={cn(
        'group flex items-start gap-2.5 border-b border-hl-border-subtle px-3 py-2.5 last:border-b-0',
        !item.read && 'bg-hl-accent-subtle/40',
      )}
    >
      {item.href ? (
        <Link
          href={item.href}
          onClick={() => onMarkRead(item.id)}
          className="flex min-w-0 flex-1 items-start gap-2.5 rounded-hl-sm outline-none hover:underline"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onMarkRead(item.id)}
          className="flex min-w-0 flex-1 items-start gap-2.5 rounded-hl-sm text-left outline-none"
        >
          {content}
        </button>
      )}

      {!compact ? (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => (item.read ? onMarkUnread?.(item.id) : onMarkRead(item.id))}
            aria-label={item.read ? 'Mark as unread' : 'Mark as read'}
            title={item.read ? 'Mark as unread' : 'Mark as read'}
            className="inline-flex size-6 items-center justify-center rounded-hl-sm text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
          >
            <Check className="size-3.5" aria-hidden />
          </button>
          {onDismiss ? (
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label="Dismiss notification"
              title="Dismiss"
              className="inline-flex size-6 items-center justify-center rounded-hl-sm text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      ) : null}
    </li>
  )
}
