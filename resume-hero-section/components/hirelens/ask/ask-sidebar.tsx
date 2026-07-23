'use client'

import * as React from 'react'
import { Plus, ListChecks, BrainCircuit, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/copilot'

export interface AskNavProps {
  conversations: Conversation[]
  conversationsLoading: boolean
  activeThreadId: string | null
  view: 'thread' | 'backlog' | 'brain'
  pendingCount: number
  suggestions: string[]
  onNewThread: () => void
  onOpenThread: (id: string) => void
  onOpenBacklog: () => void
  onOpenBrain: () => void
  onPickSuggestion: (prompt: string) => void
}

/**
 * Ask left column (UX Spec §9.1) — thread history, the Agent backlog entry with
 * its pending badge, and suggested prompts. Rendered in the desktop rail and,
 * below lg, inside a threads drawer.
 */
export function AskNav({
  conversations,
  conversationsLoading,
  activeThreadId,
  view,
  pendingCount,
  suggestions,
  onNewThread,
  onOpenThread,
  onOpenBacklog,
  onOpenBrain,
  onPickSuggestion,
}: AskNavProps) {
  // ↑/↓ move focus between threads when the list has focus (UX Spec §9),
  // without hijacking the conversation's own scroll.
  const onThreadKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = Array.from(
      event.currentTarget
        .closest('ul')
        ?.querySelectorAll<HTMLButtonElement>('button[data-thread]') ?? [],
    )
    const index = buttons.indexOf(event.currentTarget)
    const next = event.key === 'ArrowDown' ? buttons[index + 1] : buttons[index - 1]
    next?.focus()
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <Button variant="secondary" size="sm" onClick={onNewThread} className="justify-start">
        <Plus /> New thread
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="hl-caption px-1 pb-1 text-hl-fg-tertiary">Threads</p>
        {conversationsLoading ? (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-8" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="hl-caption px-1 py-2 text-hl-fg-tertiary">
            No threads yet — ask a question to start one.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((conversation) => {
              const active = view === 'thread' && conversation.id === activeThreadId
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    data-thread
                    onClick={() => onOpenThread(conversation.id)}
                    onKeyDown={onThreadKeyDown}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'hl-small w-full truncate rounded-hl-md px-2 py-1.5 text-left outline-none transition-colors',
                      active
                        ? 'bg-hl-accent-subtle text-hl-accent-fg'
                        : 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
                    )}
                  >
                    {conversation.title || 'Untitled thread'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-hl-border-subtle pt-3">
        <NavRow
          icon={ListChecks}
          label="Agent backlog"
          active={view === 'backlog'}
          onClick={onOpenBacklog}
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
        <NavRow
          icon={BrainCircuit}
          label="Browse the org brain"
          active={view === 'brain'}
          onClick={onOpenBrain}
        />
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-hl-border-subtle pt-3">
          <p className="hl-caption px-1 text-hl-fg-tertiary">Suggested</p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPickSuggestion(suggestion)}
              className="hl-caption flex items-start gap-1.5 rounded-hl-md px-2 py-1.5 text-left text-hl-fg-secondary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
            >
              <Sparkles className="mt-0.5 size-3 shrink-0 text-hl-prism-mid" aria-hidden />
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NavRow({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'hl-small flex items-center gap-2 rounded-hl-md px-2 py-1.5 text-left outline-none transition-colors',
        active
          ? 'bg-hl-accent-subtle text-hl-accent-fg'
          : 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined ? (
        <Badge variant="accent" className="shrink-0">
          {badge}
        </Badge>
      ) : null}
    </button>
  )
}
