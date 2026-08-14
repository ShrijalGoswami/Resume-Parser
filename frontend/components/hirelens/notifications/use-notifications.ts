'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePendingRecommendations, useRecentActivity } from '../lib/api/hooks'
import { localNotificationState, subscribeToNotificationState } from './local-source'
import { deriveNotifications } from './derive'
import { EMPTY_NOTIFICATION_STATE, type NotificationStateSource, type NotificationView } from './types'

/**
 * The single binding between the Notifications UI and its data layer. Point
 * this at a network-backed `NotificationStateSource` and the whole feature
 * becomes server-persisted without touching a component.
 */
const source: NotificationStateSource = localNotificationState

const stateKey = ['hl', 'notifications', 'state'] as const

function useNotificationState() {
  const queryClient = useQueryClient()

  // Writes from another tab (or another mount in this one) invalidate the cache.
  React.useEffect(
    () =>
      subscribeToNotificationState(() => {
        queryClient.invalidateQueries({ queryKey: stateKey })
      }),
    [queryClient],
  )

  return useQuery({
    queryKey: stateKey,
    queryFn: () => source.read(),
    initialData: EMPTY_NOTIFICATION_STATE,
  })
}

export interface UseNotificationsResult {
  items: NotificationView[]
  unreadCount: number
  isLoading: boolean
  isError: boolean
  refetch: () => void
  markRead: (id: string) => void
  markUnread: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
}

/**
 * Notification feed + read state, joined.
 *
 * The feed is real recruiter data (see `derive.ts`); the read/dismissed flags
 * come from the source above. Dismissed records are filtered out entirely.
 */
export function useNotifications(): UseNotificationsResult {
  const queryClient = useQueryClient()
  const recommendations = usePendingRecommendations()
  const activity = useRecentActivity(30)
  const state = useNotificationState()

  const items = React.useMemo(() => {
    const flags = state.data ?? EMPTY_NOTIFICATION_STATE
    const dismissed = new Set(flags.dismissedIds)
    const read = new Set(flags.readIds)
    return deriveNotifications({
      recommendations: recommendations.data,
      activity: activity.data,
    })
      .filter((item) => !dismissed.has(item.id))
      .map((item) => ({ ...item, read: read.has(item.id) }))
  }, [recommendations.data, activity.data, state.data])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: stateKey })

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => source.markRead(ids),
    onSuccess: invalidate,
  })
  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => source.markUnread(id),
    onSuccess: invalidate,
  })
  const markAllReadMutation = useMutation({
    mutationFn: (ids: string[]) => source.markAllRead(ids),
    onSuccess: invalidate,
  })
  const dismissMutation = useMutation({
    mutationFn: (id: string) => source.dismiss(id),
    onSuccess: invalidate,
  })

  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    isLoading: recommendations.isLoading || activity.isLoading,
    isError: recommendations.isError && activity.isError,
    refetch: () => {
      recommendations.refetch()
      activity.refetch()
    },
    markRead: (id) => markReadMutation.mutate([id]),
    markUnread: (id) => markUnreadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(items.map((item) => item.id)),
    dismiss: (id) => dismissMutation.mutate(id),
  }
}
