'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Skeleton } from '../ui/skeleton'
import { useMessages, useCreateConversation, usePostMessage } from '../lib/api/ask'
import { UserTurn, AssistantTurn, ThinkingTurn } from './ask-message'
import { AskComposer } from './ask-composer'
import { ScenarioSimulator } from './scenario-simulator'
import { isWhatIf, ASK_EXAMPLES } from './intent'
import type { CopilotPageContext, ConversationMessagePublic } from '@/types/copilot'

const CONTEXT: CopilotPageContext = { type: 'global' }

/**
 * The Ask conversation canvas (UX Spec §9). A single reading column: a Fraunces
 * landing hero on first run, else the thread of turns, each assistant answer an
 * AIAnswer. When the preceding question is a what-if, an inline ScenarioSimulator
 * is offered beneath the answer. One composer routes everything.
 */
export function AskThread({
  threadId,
  seed,
  onThreadCreated,
  onNewThread,
}: {
  threadId: string | null
  seed: string
  onThreadCreated: (id: string) => void
  onNewThread: () => void
}) {
  const messages = useMessages(threadId)
  const create = useCreateConversation()
  const post = usePostMessage()

  const [draft, setDraft] = React.useState(seed)
  const [pending, setPending] = React.useState<string | null>(null)
  const [errorText, setErrorText] = React.useState<string | null>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null)

  const turns = React.useMemo<ConversationMessagePublic[]>(() => messages.data ?? [], [messages.data])
  const hasConversation = turns.length > 0 || pending !== null || errorText !== null

  const send = React.useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || pending) return
      setDraft('')
      setErrorText(null)
      setPending(question)
      try {
        let id = threadId
        if (!id) {
          const conversation = await create.mutateAsync({
            context: CONTEXT,
            title: question.slice(0, 60),
          })
          id = conversation.id
          onThreadCreated(id)
        }
        await post.mutateAsync({ id, message: question, context: CONTEXT })
      } catch {
        setErrorText(question)
      } finally {
        setPending(null)
        inputRef.current?.focus()
      }
    },
    [create, post, pending, threadId, onThreadCreated],
  )

  // Keep the newest turn in view as the conversation grows.
  React.useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [turns.length, pending, errorText])

  // `/` focuses the composer when not already typing (UX Spec §9).
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (!typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[800px] px-4 py-6">
          {threadId && messages.isLoading ? (
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : threadId && messages.isError ? (
            <ErrorState
              variant="inline"
              title="This thread didn’t load"
              onRetry={() => messages.refetch()}
            />
          ) : !hasConversation ? (
            <LandingHero onPick={send} />
          ) : (
            <div className="flex flex-col gap-4">
              {turns.map((turn, index) => (
                <Turn
                  key={turn.id}
                  turn={turn}
                  previous={turns[index - 1]}
                  onFollowup={send}
                />
              ))}
              {pending !== null ? (
                <>
                  <UserTurn content={pending} />
                  <ThinkingTurn />
                </>
              ) : null}
              {errorText !== null ? (
                <>
                  <UserTurn content={errorText} />
                  <ErrorState
                    variant="inline"
                    title="That didn’t go through"
                    onRetry={() => send(errorText)}
                  />
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-hl-border-subtle bg-hl-canvas p-4">
        <div className="mx-auto max-w-[800px]">
          <AskComposer
            draft={draft}
            onDraftChange={setDraft}
            onSend={() => send(draft)}
            onNewThread={onNewThread}
            disabled={pending !== null}
            placeholder={hasConversation ? 'Ask a follow-up…' : 'Ask anything about your hiring…'}
            inputRef={inputRef}
          />
          <p className="hl-caption mt-1.5 text-hl-fg-tertiary">
            Enter to send · Shift+Enter for a new line · ⌘↵ new thread
          </p>
        </div>
      </div>
    </div>
  )
}

function Turn({
  turn,
  previous,
  onFollowup,
}: {
  turn: ConversationMessagePublic
  previous?: ConversationMessagePublic
  onFollowup: (question: string) => void
}) {
  if (turn.role === 'user') return <UserTurn content={turn.content} />

  const whatIf = previous?.role === 'user' ? isWhatIf(previous.content) : false

  return (
    <div className="flex flex-col gap-3">
      {turn.structured ? (
        <AssistantTurn response={turn.structured} onFollowup={onFollowup} />
      ) : (
        <div className="hl-prism-edge rounded-r-[var(--hl-radius-lg)] bg-hl-ai-surface p-4">
          <p className="hl-body text-hl-fg">{turn.content}</p>
        </div>
      )}
      {whatIf ? <ScenarioSimulator seedQuery={previous?.content} /> : null}
    </div>
  )
}

function LandingHero({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <EmptyState
      icon={Sparkles}
      title="Ask anything about your hiring"
      description="One place for what you’ve learned, what’s true now, and what happens next."
    >
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {ASK_EXAMPLES.map((example) => (
          <button
            key={example.prompt}
            type="button"
            onClick={() => onPick(example.prompt)}
            className="flex flex-col gap-1 rounded-hl-md border border-hl-border bg-hl-canvas px-3 py-2 text-left outline-none transition-colors hover:border-hl-border-strong"
          >
            <span className="hl-caption text-hl-prism-mid">{example.mode}</span>
            <span className="hl-small text-hl-fg-secondary">{example.prompt}</span>
          </button>
        ))}
      </div>
      <p className="hl-small text-hl-fg-tertiary">
        The more you use HireLens, the smarter this gets.
      </p>
    </EmptyState>
  )
}
