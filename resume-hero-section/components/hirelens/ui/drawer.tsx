'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, size = 'candidate', showClose = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'hl hl-rack-scrim fixed inset-0 z-[var(--hl-z-drawer)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'hl fixed inset-y-0 right-0 z-[var(--hl-z-drawer)] flex w-full flex-col border-l border-hl-border bg-hl-canvas text-hl-fg shadow-[var(--hl-shadow-lg)]',
        'rounded-l-[var(--hl-radius-xl)] duration-[var(--hl-dur-base)]',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:data-[state=open]:slide-in-from-right-0 motion-reduce:data-[state=closed]:slide-out-to-right-0',
        sizeMap[size],
        className,
      )}
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
))
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
    className={cn('hl-small text-hl-fg-secondary', className)}
    {...props}
  />
))
DrawerDescription.displayName = DialogPrimitive.Description.displayName
