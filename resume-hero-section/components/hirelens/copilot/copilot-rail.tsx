'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Sparkles, X, ArrowUp, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useShell } from '../shell/shell-context'
import { useIsWide } from '../lib/use-media-query'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useCopilot } from './copilot-context'

/**
 * Copilot rail (UX Spec §4.3 / Design Bible §5.8). 360px. Push layout ≥1440
 * (content shrinks); overlay + scrim below. Toggled by ⌘J (shell spine) or the
 * top-bar button. This is the shell — header, empty thread with suggested
 * prompts, and composer — with no AI wiring.
 */
function RailContents() {
  const { setRailOpen } = useShell()
  const { contextLabel, suggestions } = useCopilot()
  const [draft, setDraft] = React.useState('')

  return (
    <div className="flex h-full flex-col bg-hl-subtle">
      <div className="flex h-[52px] items-center gap-2 border-b border-hl-border-subtle px-4">
        <Sparkles className="size-4 shrink-0 text-hl-prism-mid" aria-hidden />
        <span className="hl-body-medium">Copilot</span>
        {contextLabel ? (
          <Badge variant="accent" className="max-w-[10rem] truncate">
            {contextLabel}
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() => setRailOpen(false)}
          aria-label="Close Copilot"
          className="ml-auto rounded-hl-sm p-1 text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="hl-prism-border flex size-9 items-center justify-center rounded-full [--hl-prism-fill:var(--hl-ai-surface)]">
            <Sparkles className="size-4 text-hl-prism-mid" aria-hidden />
          </span>
          <p className="hl-small max-w-[15rem] text-hl-fg-secondary">
            Ask about this {contextLabel ? 'context' : 'workspace'} — ranking,
            risks, or a draft.
          </p>
        </div>
        {suggestions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDraft(suggestion)}
                className="hl-small rounded-hl-md border border-hl-border bg-hl-canvas px-3 py-2 text-left text-hl-fg-secondary outline-none transition-colors hover:border-hl-border-strong hover:text-hl-fg"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-hl-border-subtle p-3">
        <div className="rounded-hl-lg border border-hl-border bg-hl-canvas p-2 transition-colors focus-within:border-hl-accent">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Copilot&hellip;"
            rows={2}
            aria-label="Ask Copilot"
            className="hl-body block w-full resize-none bg-transparent px-1 text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="hl-caption inline-flex items-center gap-1 rounded-hl-sm px-1.5 py-1 text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg-secondary"
            >
              <Paperclip className="size-3.5" aria-hidden /> Context
            </button>
            <Button variant="ai" size="icon" disabled={!draft.trim()} aria-label="Send">
              <ArrowUp />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CopilotRail() {
  const { railOpen, setRailOpen } = useShell()
  const wide = useIsWide()

  if (wide) {
    // Push layout — an inline flex sibling; content shrinks when open.
    return (
      <aside
        aria-label="Copilot"
        className={cn(
          'h-full shrink-0 overflow-hidden border-l border-hl-border-subtle transition-[width] duration-[var(--hl-dur-base)]',
          railOpen ? 'w-[360px]' : 'w-0',
        )}
      >
        <div className="h-full w-[360px]">
          <RailContents />
        </div>
      </aside>
    )
  }

  // Overlay layout — portal with scrim.
  return (
    <DialogPrimitive.Root open={railOpen} onOpenChange={setRailOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="hl hl-rack-scrim fixed inset-0 z-[var(--hl-z-drawer)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-label="Copilot"
          className="hl fixed inset-y-0 right-0 z-[var(--hl-z-drawer)] w-[360px] max-w-[calc(100%-2rem)] shadow-[var(--hl-shadow-lg)] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
        >
          <DialogPrimitive.Title className="sr-only">Copilot</DialogPrimitive.Title>
          <RailContents />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
