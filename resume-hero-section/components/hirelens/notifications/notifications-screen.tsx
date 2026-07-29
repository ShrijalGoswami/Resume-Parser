'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { LoadingScreen, LoadingLines } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { NotificationItem } from './notification-item'
import { useNotifications } from './use-notifications'
import type { NotificationView } from './types'

const NOTIFICATION_CRUMBS = [{ label: 'Notifications' }]

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'recommendation', label: 'Needs a decision' },
  { id: 'activity', label: 'Activity' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function matches(item: NotificationView, filter: FilterId): boolean {
  switch (filter) {
    case 'unread':
      return !item.read
    case 'recommendation':
      return item.kind === 'recommendation'
    case 'activity':
      return item.kind === 'activity'
    default:
      return true
  }
}

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Notifications Center — the full surface behind the top-bar panel.
 *
 * Same data layer as the panel (`useNotifications`), so read state stays in
 * lockstep between the two. Filters are client-side over an already-loaded
 * feed; when a real notifications endpoint arrives with server-side filtering,
 * the filter ids map onto its query params.
 */
export function NotificationsScreen() {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={NOTIFICATION_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={NOTIFICATION_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={NOTIFICATION_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedNotifications />
}

function AuthedNotifications() {
  const profile = useProfile()
  const { items, unreadCount, isLoading, isError, refetch, markRead, markUnread, markAllRead, dismiss } =
    useNotifications()
  const [filter, setFilter] = React.useState<FilterId>('all')

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const filtered = items.filter((item) => matches(item, filter))

  let body: React.ReactNode
  if (isLoading) {
    body = <LoadingLines lines={6} />
  } else if (isError) {
    body = (
      <ErrorState
        variant="route"
        title="Couldn't load your notifications"
        onRetry={refetch}
      />
    )
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon={Bell}
        title="Nothing needs you right now"
        description="Recommendations awaiting a decision and activity across your roles show up here."
      />
    )
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        variant="zero-results"
        title="Nothing in this filter"
        description="Try another filter to see the rest of your notifications."
        action={
          <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
            Show all
          </Button>
        }
      />
    )
  } else {
    body = (
      <ul className="overflow-hidden rounded-hl-lg border border-hl-border bg-hl-canvas">
        {filtered.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            onMarkRead={markRead}
            onMarkUnread={markUnread}
            onDismiss={dismiss}
          />
        ))}
      </ul>
    )
  }

  return (
    <AppShell breadcrumbs={NOTIFICATION_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col px-8 pb-16 pt-10">
        <PageHeader
          title="Notifications"
          description={
            unreadCount > 0
              ? `${unreadCount} unread.`
              : 'Everything here has been seen.'
          }
          actions={
            unreadCount > 0 ? (
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                <CheckCheck aria-hidden />
                Mark all read
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter notifications">
            {FILTERS.map((option) => {
              const active = filter === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  aria-pressed={active}
                  className={cn(
                    'hl-small rounded-hl-md border px-2.5 py-1 outline-none transition-colors',
                    active
                      ? 'border-hl-accent-border bg-hl-accent-subtle text-hl-accent-fg'
                      : 'border-hl-border text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </PageHeader>
        {body}
      </div>
    </AppShell>
  )
}
