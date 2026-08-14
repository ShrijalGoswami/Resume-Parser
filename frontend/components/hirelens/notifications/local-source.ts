'use client'

import {
  EMPTY_NOTIFICATION_STATE,
  type NotificationState,
  type NotificationStateSource,
} from './types'

/**
 * localStorage-backed implementation of `NotificationStateSource`.
 *
 * Read/dismissed flags are per-device today because no backend records them.
 * That is an honest limitation, not a simulation: nothing here invents a
 * notification — the feed itself is derived from real recruiter data (see
 * `derive.ts`), and this module only remembers which of those the user has
 * already seen.
 *
 * Mirrors the storage conventions in `lib/local-store.ts` (same change event,
 * same tolerant parse) so a stale or hand-edited value degrades to "nothing
 * read" instead of throwing.
 */
const STORAGE_KEY = 'hl:notifications:state'
const CHANGE_EVENT = 'hl-local-store-change'

function readSync(): NotificationState {
  if (typeof window === 'undefined') return EMPTY_NOTIFICATION_STATE
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_NOTIFICATION_STATE
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationState>
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds.filter(isString) : [],
      dismissedIds: Array.isArray(parsed.dismissedIds)
        ? parsed.dismissedIds.filter(isString)
        : [],
    }
  } catch {
    return EMPTY_NOTIFICATION_STATE
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function write(next: NotificationState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function union(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming]))
}

export const localNotificationState: NotificationStateSource = {
  async read() {
    return readSync()
  },
  async markRead(ids) {
    const current = readSync()
    write({ ...current, readIds: union(current.readIds, ids) })
  },
  async markAllRead(ids) {
    const current = readSync()
    write({ ...current, readIds: union(current.readIds, ids) })
  },
  async markUnread(id) {
    const current = readSync()
    write({ ...current, readIds: current.readIds.filter((value) => value !== id) })
  },
  async dismiss(id) {
    const current = readSync()
    write({
      readIds: union(current.readIds, [id]),
      dismissedIds: union(current.dismissedIds, [id]),
    })
  },
}

/** Subscribe to cross-tab and same-tab writes. Used to keep queries fresh. */
export function subscribeToNotificationState(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}
