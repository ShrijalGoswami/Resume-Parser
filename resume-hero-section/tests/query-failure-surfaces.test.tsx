// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import * as React from 'react'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { useQuery } from '@tanstack/react-query'
import { ApiProvider } from '../components/hirelens/lib/api/query-client'

afterEach(cleanup)

/**
 * A failed request must end up in an *error* state, never sit indefinitely in a
 * state that the surfaces render as "no data".
 *
 * Every V4 screen branches roughly as: isLoading → skeleton, isError → ErrorState,
 * else `data ?? []` → empty state. That last branch makes a positive claim ("No
 * strong matches", "No decisions recorded yet"). If a query can be observed with
 * `isLoading === false`, `isError === false` and no data, the UI asserts something
 * it never actually established.
 *
 * React Query can produce exactly that shape when it declines to run a fetch —
 * `status: 'pending'` with `fetchStatus: 'paused'` makes `isLoading` false because
 * it is defined as `isPending && isFetching`. These tests pin the client
 * configuration that keeps a failure moving to `isError` instead.
 */

function Probe() {
  const q = useQuery({
    queryKey: ['probe'],
    queryFn: async () => {
      throw new TypeError('Failed to fetch')
    },
    retry: 1,
    retryDelay: 1,
  })
  return (
    <div>
      <span data-testid="status">{q.status}</span>
      <span data-testid="fetchStatus">{q.fetchStatus}</span>
      <span data-testid="isLoading">{String(q.isLoading)}</span>
      <span data-testid="isError">{String(q.isError)}</span>
      {/* Mirrors the real branch order used across the V4 surfaces. */}
      <span data-testid="rendered">
        {q.isLoading ? 'SKELETON' : q.isError ? 'ERROR' : (q.data ? 'DATA' : 'EMPTY')}
      </span>
    </div>
  )
}

describe('failed queries surface as errors, not as empty data', () => {
  it('reaches isError rather than parking in a non-loading, non-error, dataless state', async () => {
    render(
      <ApiProvider>
        <Probe />
      </ApiProvider>,
    )

    await waitFor(
      () => expect(screen.getByTestId('status')).toHaveTextContent('error'),
      { timeout: 5000 },
    )
    expect(screen.getByTestId('isError')).toHaveTextContent('true')
    expect(screen.getByTestId('rendered')).toHaveTextContent('ERROR')
  })

  it('never renders the empty branch while the request is unresolved', async () => {
    render(
      <ApiProvider>
        <Probe />
      </ApiProvider>,
    )

    // Sample the render decision until the query settles. "EMPTY" at any point
    // before an error means the UI claimed there was no data prematurely.
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      seen.add(screen.getByTestId('rendered').textContent ?? '')
      if (screen.getByTestId('status').textContent === 'error') break
      await new Promise((r) => setTimeout(r, 25))
    }
    expect(seen.has('EMPTY')).toBe(false)
    expect(seen.has('ERROR')).toBe(true)
  })

  it('documents the state shape that makes the empty branch lie', async () => {
    // A query React Query declines to run reports isLoading false (because that
    // is `isPending && isFetching`) with no data and no error — the exact shape
    // the surfaces render as "no data". This is reachable today when the tab is
    // backgrounded: React Query pauses retries while the document is hidden, so
    // a first attempt that fails leaves the query at status 'pending' /
    // fetchStatus 'paused' until the tab is focused again.
    const { onlineManager } = await import('@tanstack/react-query')
    onlineManager.setOnline(false)
    try {
      render(
        <ApiProvider>
          <Probe />
        </ApiProvider>,
      )
      await waitFor(() =>
        expect(screen.getByTestId('fetchStatus')).toHaveTextContent('paused'),
      )
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      expect(screen.getByTestId('isError')).toHaveTextContent('false')
      // The consequence: the surface claims emptiness for data it never fetched.
      expect(screen.getByTestId('rendered')).toHaveTextContent('EMPTY')
    } finally {
      onlineManager.setOnline(true)
    }
  })
})
