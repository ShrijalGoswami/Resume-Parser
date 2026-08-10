'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
// MessageSquareText, not Sparkles (V2 §8/§23): the ask affordance names the
// act of asking a question, not the technology answering it.
import { Search, MessageSquareText, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useShell } from '../shell/shell-context'
import { primaryNav, settingsNav } from '../shell/nav-config'
import { useCan, PERMS } from '../lib/use-can'
import { useOrgContext } from '../lib/api/org-context'
import { hasPerm } from '../settings/permissions'
import { Kbd } from '../ui/kbd'
import { useCommandRegistry, type CommandItem, type CommandGroup } from './command-registry'

/**
 * Command palette (UX Spec §4.2 / Design Bible §5.7). The universal entry point:
 * navigate, run context actions, or ask. Modes are auto-detected from the input
 * (no mode UI). Opens from ⌘K (shell spine) or the top-bar launcher. This is the
 * infrastructure — built-in navigation plus whatever surfaces register.
 */
const groupLabels: Record<CommandGroup, string> = {
  navigate: 'Jump to',
  action: 'Actions',
  ask: 'Ask AI',
}
const groupOrder: CommandGroup[] = ['navigate', 'action', 'ask']

function matches(item: CommandItem, query: string): boolean {
  if (!query) return true
  const haystack = `${item.label} ${item.keywords?.join(' ') ?? ''}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((token) => haystack.includes(token))
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useShell()
  const router = useRouter()
  const { items: registered } = useCommandRegistry()
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)

  // The palette is a second door onto the same rail, so it honours the same
  // `perm` field — otherwise hiding Ask from the rail would just move it to ⌘K.
  const ctx = useOrgContext()
  const permissions = ctx.data?.permissions
  const canAsk = useCan(PERMS.AI_USE)

  const navItems = React.useMemo<CommandItem[]>(
    () =>
      [...primaryNav, settingsNav]
        .filter((nav) => !nav.perm || !permissions || hasPerm(permissions, nav.perm))
        .map((nav) => ({
          id: `nav:${nav.href}`,
          group: 'navigate' as const,
          label: nav.label,
          icon: nav.icon,
          perform: () => router.push(nav.href),
        })),
    [router, permissions],
  )

  const trimmed = query.trim()
  const isQuestion =
    trimmed.length > 0 && (trimmed.endsWith('?') || trimmed.split(/\s+/).length >= 4)

  const results = React.useMemo<CommandItem[]>(() => {
    const base = [...navItems, ...registered].filter((item) => matches(item, query))
    // Typing a question offers to route it to Ask. Without `ai.use` that lands
    // on a gate state, so the offer is withdrawn rather than made and broken.
    if (isQuestion && canAsk) {
      base.push({
        id: 'ask:current',
        group: 'ask',
        label: trimmed,
        icon: MessageSquareText,
        perform: () => router.push(`/ask?q=${encodeURIComponent(trimmed)}`),
      })
    }
    return base
  }, [navItems, registered, query, isQuestion, trimmed, router, canAsk])

  const sections = React.useMemo(
    () =>
      groupOrder
        .map((group) => ({ group, items: results.filter((item) => item.group === group) }))
        .filter((section) => section.items.length > 0),
    [results],
  )
  const flat = React.useMemo(() => sections.flatMap((section) => section.items), [sections])

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      setCommandOpen(open)
      if (!open) {
        setQuery('')
        setActiveIndex(0)
      }
    },
    [setCommandOpen],
  )

  const runItem = React.useCallback(
    (item: CommandItem) => {
      item.perform()
      setCommandOpen(false)
    },
    [setCommandOpen],
  )

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, flat.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = flat[activeIndex]
      if (item) runItem(item)
    }
  }

  const activeId = flat[activeIndex]?.id

  return (
    <DialogPrimitive.Root open={commandOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="hl hl-rack-scrim fixed inset-0 z-[var(--hl-z-palette)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className="hl fixed left-1/2 top-[15vh] z-[var(--hl-z-palette)] w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-hl-xl border border-hl-border bg-hl-canvas text-hl-fg shadow-[var(--hl-shadow-lg)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search to jump to a page, run an action, or ask a question.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-2 border-b border-hl-border-subtle px-4">
            {isQuestion ? (
              // Copper, not the prism: V2 §16 marks system/AI affordances with
              // the copper rule, and the sparkle is banned outright.
              <MessageSquareText
                className="size-4 shrink-0 text-[var(--hl-accent-secondary)]"
                aria-hidden
              />
            ) : (
              <Search className="size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
            )}
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              placeholder="Search or ask&hellip;"
              aria-label="Search or run a command"
              role="combobox"
              aria-expanded
              aria-controls="hl-command-list"
              aria-activedescendant={activeId ? `hl-command-${activeId}` : undefined}
              className="hl-body h-12 flex-1 bg-transparent text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
            />
            <Kbd>Esc</Kbd>
          </div>

          <div
            id="hl-command-list"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
          >
            {flat.length === 0 ? (
              <p className="hl-body px-3 py-8 text-center text-hl-fg-tertiary">
                No results for “{query}”.
              </p>
            ) : (
              sections.map((section) => (
                <div key={section.group} className="mb-1">
                  <p className="hl-label px-2 py-1.5 text-hl-fg-tertiary">
                    {groupLabels[section.group]}
                  </p>
                  {section.items.map((item) => {
                    const index = flat.indexOf(item)
                    const active = index === activeIndex
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`hl-command-${item.id}`}
                        role="option"
                        aria-selected={active}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => runItem(item)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-hl-md px-2 py-1.5 text-left outline-none',
                          active && 'bg-hl-accent-subtle',
                        )}
                      >
                        {Icon ? (
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              active ? 'text-hl-accent-fg' : 'text-hl-fg-tertiary',
                            )}
                            aria-hidden
                          />
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'hl-body flex-1 truncate',
                            active ? 'text-hl-accent-fg' : 'text-hl-fg',
                          )}
                        >
                          {item.group === 'ask' ? `Ask AI: ${item.label}` : item.label}
                        </span>
                        {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                        {active ? (
                          <CornerDownLeft className="size-3.5 text-hl-fg-tertiary" aria-hidden />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
