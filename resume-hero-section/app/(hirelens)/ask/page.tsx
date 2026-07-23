import type { Metadata } from 'next'
import { AskScreen, type AskView } from '@/components/hirelens/ask/ask-screen'

export const metadata: Metadata = { title: 'Ask' }

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
