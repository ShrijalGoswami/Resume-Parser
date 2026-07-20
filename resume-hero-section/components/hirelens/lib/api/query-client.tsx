'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * V3 data layer (React Query). Additive to the P0 provider stack — it does not
 * change any existing shell behavior. Calm defaults: 60s freshness, one retry,
 * no refetch-on-focus (the surfaces refresh explicitly).
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
