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
  // `perm` field — otherwise hiding Copilot from the rail would just move it to ⌘K.
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

  /**
   * WHERE FOCUS GOES WHEN THE PALETTE CLOSES.
   *
   * Radix's own focus restoration is not landing here. Measured 12 Aug 2026:
   * open the palette from the Inbox nav link or from the top-bar launcher,
   * press Escape, and `document.activeElement` is `<body>` — at 200ms and still
   * at 3.5s, so it is not the exit animation. The trap itself works (focus
   * stayed inside across 15 tabs), which is what makes the miss easy to ship:
   * everything about the open dialog is correct.
   *
   * The cost is paid entirely by keyboard and screen-reader users. ⌘K is the
   * product's universal entry point, so dismissing it drops you at the top of
   * the document and you tab back through the whole shell to reach the control
   * you were on. A mouse user never sees it.
   *
   * So the opener is captured on open and refocused on dismiss.
   *
   * RESTORE ONLY ON DISMISS, NEVER AFTER RUNNING AN ITEM. Selecting a command
   * navigates; pulling focus back to a launcher on the page being left fights
   * the destination for it, and on a route change the saved node is gone
   * anyway. `ranItemRef` marks that case so this yields instead.
   */
  const openerRef = React.useRef<HTMLElement | null>(null)
  const ranItemRef = React.useRef(false)

  /**
   * THE OPENER CANNOT BE CAPTURED WHEN THE PALETTE OPENS, BECAUSE NOTHING TELLS
   * US THAT IT DID.
   *
   * `onOpenChange` fires only for changes Radix itself initiates — Escape, a
   * click on the overlay. Both ways this palette actually opens (the global ⌘K
   * listener in `shell-context`, and the top-bar launcher) set `commandOpen`
   * straight on the shell context, so Radix's `Root` simply receives
   * `open={true}` and no callback runs. An opener captured there is captured on
   * close, when focus is already inside the dialog — which is why the first
   * attempt at this fix restored focus to the palette's own input.
   *
   * So the last externally focused element is tracked continuously instead.
   * Anything inside the dialog is ignored, leaving the ref holding whatever the
   * user was on before it opened, however it was opened.
   */
  React.useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('[role="dialog"]')) return
      openerRef.current = target
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) ranItemRef.current = false
      setCommandOpen(open)
      if (!open) {
        setQuery('')
        setActiveIndex(0)
      }
      // The refocus itself happens in `onCloseAutoFocus` on the Content, not
      // here. Restoring from this callback does not survive: it runs before
      // Radix unmounts its focus scope, and the scope's own handler then moves
      // focus again — measured, with a `requestAnimationFrame` deferral, still
      // landing on <body>. `onCloseAutoFocus` is the hook that runs at that
      // moment and can preempt it.
    },
    [setCommandOpen],
  )

  /**
   * Put focus back where it came from. `preventDefault` suppresses Radix's own
   * restore, which is the thing that was failing — without it this call is
   * simply overwritten a tick later.
   */
  const onCloseAutoFocus = React.useCallback((event: Event) => {
    const opener = openerRef.current
    const ranItem = ranItemRef.current
    ranItemRef.current = false
    // After running a command we are navigating; the destination owns focus.
    if (ranItem) return
    // A detached node cannot take focus, and asking it to leaves focus on
    // <body> — the exact bug this exists to fix.
    if (!opener || !document.contains(opener)) return
    event.preventDefault()
    opener.focus()
  }, [])

  const runItem = React.useCallback(
    (item: CommandItem) => {
      ranItemRef.current = true
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
          onCloseAutoFocus={onCloseAutoFocus}
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
