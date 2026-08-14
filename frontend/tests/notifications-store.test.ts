// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  localNotificationState,
  subscribeToNotificationState,
} from '../components/hirelens/notifications/local-source'
import type { NotificationStateSource } from '../components/hirelens/notifications/types'

const KEY = 'hl:notifications:state'

beforeEach(() => {
  window.localStorage.clear()
})

describe('localNotificationState', () => {
  // The UI is written against the interface, not this implementation — this
  // assertion is what lets a backend-backed source drop in unchanged.
  it('satisfies the NotificationStateSource contract', () => {
    const source: NotificationStateSource = localNotificationState
    expect(typeof source.read).toBe('function')
    expect(typeof source.markRead).toBe('function')
    expect(typeof source.markAllRead).toBe('function')
    expect(typeof source.markUnread).toBe('function')
    expect(typeof source.dismiss).toBe('function')
  })

  it('starts empty', async () => {
    expect(await localNotificationState.read()).toEqual({ readIds: [], dismissedIds: [] })
  })

  it('round-trips read ids through storage', async () => {
    await localNotificationState.markRead(['rec:1'])
    expect((await localNotificationState.read()).readIds).toEqual(['rec:1'])
  })

  it('does not duplicate an id marked read twice', async () => {
    await localNotificationState.markRead(['rec:1'])
    await localNotificationState.markRead(['rec:1', 'rec:2'])
    expect((await localNotificationState.read()).readIds).toEqual(['rec:1', 'rec:2'])
  })

  it('marks many read at once', async () => {
    await localNotificationState.markAllRead(['a', 'b', 'c'])
    expect((await localNotificationState.read()).readIds).toEqual(['a', 'b', 'c'])
  })

  it('reverses a single id with markUnread, leaving the others', async () => {
    await localNotificationState.markAllRead(['a', 'b'])
    await localNotificationState.markUnread('a')
    expect((await localNotificationState.read()).readIds).toEqual(['b'])
  })

  it('dismissing also marks read, so a restored item never reappears unread', async () => {
    await localNotificationState.dismiss('a')
    const state = await localNotificationState.read()
    expect(state.dismissedIds).toEqual(['a'])
    expect(state.readIds).toEqual(['a'])
  })

  it('degrades to empty on corrupt stored JSON rather than throwing', async () => {
    window.localStorage.setItem(KEY, '{not json')
    expect(await localNotificationState.read()).toEqual({ readIds: [], dismissedIds: [] })
  })

  it('discards non-string entries from a hand-edited value', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ readIds: ['ok', 3, null], dismissedIds: 'no' }))
    expect(await localNotificationState.read()).toEqual({ readIds: ['ok'], dismissedIds: [] })
  })

  it('notifies subscribers on write so other mounts and tabs stay in sync', async () => {
    let calls = 0
    const unsubscribe = subscribeToNotificationState(() => {
      calls += 1
    })
    await localNotificationState.markRead(['a'])
    expect(calls).toBe(1)
    unsubscribe()
    await localNotificationState.markRead(['b'])
    expect(calls).toBe(1)
  })
})
