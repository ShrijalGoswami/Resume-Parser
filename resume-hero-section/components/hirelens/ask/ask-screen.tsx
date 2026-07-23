'use client'

import * as React from 'react'
import Link from 'next/link'
import { PanelLeft } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile, usePendingRecommendations } from '../lib/api/hooks'
import { useConversations, useAskSuggestions } from '../lib/api/ask'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerTitle } from '../ui/drawer'
import { LoadingScreen } from '../states/loading'
import { AskNav, type AskNavProps } from './ask-sidebar'
import { AskThread } from './ask-thread'
import { AgentBacklog } from './agent-backlog'
import { BrainBrowser } from './brain-browser'
import { ASK_EXAMPLES } from './intent'

export type AskView = 'thread' | 'backlog' | 'brain'

export interface AskInitial {
  q: string
  threadId: string | null
  view: AskView
}

interface UiState {
  view: AskView
  threadId: string | null
  q: string
}

function buildUrl(state: UiState): string {
  const params = new URLSearchParams()
  if (state.view === 'backlog') params.set('view', 'backlog')
  else if (state.view === 'brain') params.set('view', 'brain')
  else if (state.threadId) params.set('thread', state.threadId)
  else if (state.q) params.set('q', state.q)
  const query = params.toString()
  return `/ask${query ? `?${query}` : ''}`
}

function parseSearch(search: string): UiState {
  const params = new URLSearchParams(search)
  const view = params.get('view')
  return {
    view: view === 'backlog' ? 'backlog' : view === 'brain' ? 'brain' : 'thread',
    threadId: params.get('thread'),
    q: params.get('q') ?? '',
  }
}

export function AskScreen({ initial }: { initial: AskInitial }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Ask">
        <div className="hl-display p-12 text-center">Sign-in isn&rsquo;t configured</div>
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Ask">
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell title="Ask">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="hl-display">Sign in to continue</h1>
          <Button variant="primary" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    )
  }
  return <AuthedAsk initial={initial} />
}

function AuthedAsk({ initial }: { initial: AskInitial }) {
  const profile = useProfile()
  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const conversations = useConversations()
  const pending = usePendingRecommendations()
  const suggestionsQuery = useAskSuggestions()

  const [ui, setUi] = React.useState<UiState>({
    view: initial.view,
    threadId: initial.threadId,
    q: initial.q,
  })
  const [navSeq, setNavSeq] = React.useState(0)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const uiRef = React.useRef(ui)
  React.useEffect(() => {
    uiRef.current = ui
  }, [ui])

  // Explicit navigation: update state, remount the center (bump navSeq), push a
  // shareable URL, and close the mobile drawer.
  const go = React.useCallback((next: UiState) => {
    setUi(next)
    setNavSeq((sequence) => sequence + 1)
    window.history.pushState(null, '', buildUrl(next))
    setDrawerOpen(false)
  }, [])

  // A thread that was just created mid-send: update the URL in place WITHOUT a
  // remount, so the in-flight answer keeps streaming into the same view.
  const threadCreated = React.useCallback((id: string) => {
    const next: UiState = { ...uiRef.current, threadId: id, q: '' }
    setUi(next)
    window.history.replaceState(null, '', buildUrl(next))
  }, [])

  React.useEffect(() => {
    const onPopState = () => {
      setUi(parseSearch(window.location.search))
      setNavSeq((sequence) => sequence + 1)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openThread = React.useCallback(
    (id: string) => {
      const current = uiRef.current
      if (current.view === 'thread' && current.threadId === id) {
        setDrawerOpen(false)
        return
      }
      go({ view: 'thread', threadId: id, q: '' })
    },
    [go],
  )
  const newThread = React.useCallback(
    (seed = '') => go({ view: 'thread', threadId: null, q: seed }),
    [go],
  )
  const openBacklog = React.useCallback(() => {
    if (uiRef.current.view === 'backlog') {
      setDrawerOpen(false)
      return
    }
    go({ view: 'backlog', threadId: null, q: '' })
  }, [go])
  const openBrain = React.useCallback(() => {
    if (uiRef.current.view === 'brain') {
      setDrawerOpen(false)
      return
    }
    go({ view: 'brain', threadId: null, q: '' })
  }, [go])

  const suggestions = React.useMemo(() => {
    const fetched = (suggestionsQuery.data ?? []).flatMap((group) => group.questions)
    const base = fetched.length > 0 ? fetched : ASK_EXAMPLES.map((example) => example.prompt)
    return base.slice(0, 5)
  }, [suggestionsQuery.data])

  const navProps: AskNavProps = {
    conversations: conversations.data ?? [],
    conversationsLoading: conversations.isLoading,
    activeThreadId: ui.threadId,
    view: ui.view,
    pendingCount: pending.data?.length ?? 0,
    suggestions,
    onNewThread: () => newThread(),
    onOpenThread: openThread,
    onOpenBacklog: openBacklog,
    onOpenBrain: openBrain,
    onPickSuggestion: (prompt) => newThread(prompt),
  }

  const center =
    ui.view === 'backlog' ? (
      <AgentBacklog />
    ) : ui.view === 'brain' ? (
      <BrainBrowser onAskInThread={(query) => newThread(query)} />
    ) : (
      <AskThread
        threadId={ui.threadId}
        seed={ui.q}
        onThreadCreated={threadCreated}
        onNewThread={() => newThread()}
      />
    )

  return (
    <AppShell title="Ask" account={account}>
      <div className="flex h-full">
        <aside className="hidden w-60 shrink-0 border-r border-hl-border-subtle lg:block">
          <AskNav {...navProps} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-hl-border-subtle p-2 lg:hidden">
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(true)}>
              <PanelLeft /> Threads
            </Button>
          </div>
          <div key={navSeq} className="min-h-0 flex-1">
            {center}
          </div>
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent size="candidate">
          <DrawerTitle className="sr-only">Threads</DrawerTitle>
          <div className="min-h-0 flex-1 pt-6">
            <AskNav {...navProps} />
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  )
}
