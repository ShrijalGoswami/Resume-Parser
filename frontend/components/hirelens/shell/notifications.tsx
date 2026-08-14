'use client'

import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { LoadingLines } from '../states/loading'
import { NotificationItem } from '../notifications/notification-item'
import { useNotifications } from '../notifications/use-notifications'

const PANEL_LIMIT = 6

/**
 * Notifications (Design Bible §5.5). Bell with an unread dot (accent, not red)
 * opening a panel. The feed is real recruiter data — pending recommendations
 * and the activity log — joined with locally-recorded read state; see
 * `notifications/use-notifications.ts` for the single binding that makes it
 * server-persisted later. The empty state is the calm default.
 *
 * `unreadCount` stays supported for callers that already know the count
 * (TopBarProps); when omitted the panel counts for itself.
 */
export function Notifications({ unreadCount: unreadOverride }: { unreadCount?: number }) {
  const { items, unreadCount, isLoading, markRead, markAllRead } = useNotifications()
  const count = unreadOverride ?? unreadCount
  const visible = items.slice(0, PANEL_LIMIT)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          className="relative inline-flex size-hl-control-md items-center justify-center rounded-hl-md text-hl-fg-secondary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
        >
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-hl-accent"
              aria-hidden
            />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hl-border-subtle px-3 py-2">
          <span className="hl-body-medium">Notifications</span>
          {count > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="hl-caption inline-flex items-center gap-1 rounded-hl-sm text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Mark all read
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-3">
            <LoadingLines lines={3} />
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="hl-body text-hl-fg-tertiary">No notifications yet.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {visible.map((item) => (
              <NotificationItem key={item.id} item={item} onMarkRead={markRead} compact />
            ))}
          </ul>
        )}

        <div className="border-t border-hl-border-subtle p-1.5">
          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
