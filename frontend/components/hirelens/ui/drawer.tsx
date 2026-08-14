'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fontVariables } from '../theme/fonts'

/**
 * Drawer / Peek (Design Bible §4.4, §4.9). Right-side overlay that enters with
 * Rack Focus — the backdrop dims + desaturates + blurs the surface behind while
 * the panel resolves sharp. 480 (candidate) / 560 (wide: compare, report).
 * Reduced motion keeps the dim and drops the transform/blur (globals + Tailwind
 * motion-reduce variants).
 */
export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close

const sizeMap = {
  candidate: 'sm:max-w-[480px]',
  wide: 'sm:max-w-[560px]',
} as const

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof sizeMap
  showClose?: boolean
}

/**
 * Attribute that survives a re-render. Radix restores focus by holding a
 * REFERENCE to the node that was focused when the drawer opened — which is
 * correct until that node is replaced rather than moved. The candidate tables
 * are virtualized (`useVirtualizer` + `measureElement`), so opening a drawer
 * re-renders the list and the name button Radix is holding is detached from the
 * document. Focusing a detached node silently does nothing, so focus fell to
 * `<body>`: Escape out of a candidate and a keyboard user was at the top of the
 * page, needing ~15 tabs through the rail to get back to the row they were on.
 *
 * Put this on whatever opens a drawer and focus is re-found by query on close,
 * whether or not the original element instance still exists.
 */
export const DRAWER_FOCUS_KEY = 'data-drawer-focus-key'

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, size = 'candidate', showClose = true, onCloseAutoFocus, ...props }, ref) => {
  // Captured on mount — i.e. when the drawer opens — because by the time it
  // closes `document.activeElement` is inside the drawer.
  const opener = React.useRef<{ node: HTMLElement | null; key: string | null }>({
    node: null,
    key: null,
  })

  React.useEffect(() => {
    const active = document.activeElement
    opener.current =
      active instanceof HTMLElement
        ? { node: active, key: active.getAttribute(DRAWER_FOCUS_KEY) }
        : { node: null, key: null }
  }, [])

  const restoreFocus = React.useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return

      const { node, key } = opener.current
      // Prefer the original instance; fall back to re-querying by key for the
      // virtualized case, where the instance is gone but the row is still there.
      const target =
        node && node.isConnected
          ? node
          : key
            ? document.querySelector<HTMLElement>(`[${DRAWER_FOCUS_KEY}="${CSS.escape(key)}"]`)
            : null

      if (!target) return // Let Radix do its default thing rather than guess.
      event.preventDefault()
      target.focus()
    },
    [onCloseAutoFocus],
  )

  return (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        fontVariables,
        'hl hl-rack-scrim fixed inset-0 z-[var(--hl-z-drawer)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        fontVariables,
        'hl fixed inset-y-0 right-0 z-[var(--hl-z-drawer)] flex w-full flex-col border-l border-hl-border bg-hl-canvas text-hl-fg shadow-[var(--hl-shadow-lg)]',
        'rounded-l-[var(--hl-radius-xl)] duration-[var(--hl-dur-base)]',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:data-[state=open]:slide-in-from-right-0 motion-reduce:data-[state=closed]:slide-out-to-right-0',
        sizeMap[size],
        className,
      )}
      onCloseAutoFocus={restoreFocus}
      {...props}
    >
      {showClose ? (
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-hl-sm p-1 text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      ) : null}
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
  )
})
DrawerContent.displayName = DialogPrimitive.Content.displayName

/** Sticky header (Design Bible §4.4). */
export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-start gap-3 border-b border-hl-border-subtle bg-hl-canvas p-4 pr-10',
        className,
      )}
      {...props}
    />
  )
}

export function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto p-4', className)} {...props} />
}

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('hl-h2', className)} {...props} />
))
DrawerTitle.displayName = DialogPrimitive.Title.displayName

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('hl-body text-hl-fg-secondary', className)}
    {...props}
  />
))
DrawerDescription.displayName = DialogPrimitive.Description.displayName
