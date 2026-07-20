'use client'

import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '../ui/dropdown-menu'

/**
 * Notifications (Design Bible §5.5). Bell with an unread dot (accent, not red)
 * opening a panel. Real feed wiring lands with the notifications data source;
 * the empty state is the calm default.
 */
export function Notifications({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          className="relative inline-flex size-8 items-center justify-center rounded-hl-md text-hl-fg-secondary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-hl-accent"
              aria-hidden
            />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-hl-border-subtle px-3 py-2">
          <span className="hl-body-medium">Notifications</span>
        </div>
        <div className="px-4 py-10 text-center">
          <p className="hl-small text-hl-fg-tertiary">You&rsquo;re all caught up.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
