import type { Metadata } from 'next'
import { AskScreen, type AskView } from '@/components/hirelens/ask/ask-screen'

// Renders as "Copilot · Hirevo" through the route group's title template.
// The ROUTE stays `/ask` (Phase 9.3 renames the product name, not the URL).
export const metadata: Metadata = { title: 'Copilot' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; thread?: string; view?: string }>
}) {
  const params = await searchParams
  const view: AskView =
    params.view === 'backlog' ? 'backlog' : params.view === 'brain' ? 'brain' : 'thread'
  return (
    <AskScreen
      initial={{
        q: params.q ?? '',
        threadId: params.thread ?? null,
        view,
      }}
    />
  )
}
