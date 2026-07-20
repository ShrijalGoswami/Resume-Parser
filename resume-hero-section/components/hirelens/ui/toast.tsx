'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { Info, CircleCheck, TriangleAlert, CircleX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToasts, dismissToast, type ToastVariant } from './use-toast'

const iconFor: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
}

const edgeFor: Record<ToastVariant, string> = {
  info: 'before:bg-[color:var(--hl-info)]',
  success: 'before:bg-[color:var(--hl-success)]',
  warning: 'before:bg-[color:var(--hl-warning)]',
  danger: 'before:bg-[color:var(--hl-danger)]',
}

const iconColorFor: Record<ToastVariant, string> = {
  info: 'text-hl-info',
  success: 'text-hl-success',
  warning: 'text-hl-warning',
  danger: 'text-hl-danger',
}

/**
 * Toaster (Design Bible §4.9). Bottom-right stack, auto-dismiss 5s (10s with an
 * action), pause on hover, swipe to dismiss, semantic left edge + icon.
 * Mount once inside the V3 shell.
 */
export function Toaster() {
  const toasts = useToasts()

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {toasts.map((item) => {
        const variant = item.variant ?? 'info'
        const Icon = iconFor[variant]
        const duration = item.duration ?? (item.action ? 10000 : 5000)
        return (
          <ToastPrimitive.Root
            key={item.id}
            duration={duration}
            onOpenChange={(open) => {
              if (!open) dismissToast(item.id)
            }}
            className={cn(
              'hl relative flex items-start gap-3 overflow-hidden rounded-hl-md border border-hl-border bg-hl-canvas p-3 pl-4 text-hl-fg shadow-[var(--hl-shadow-md)]',
              'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
              edgeFor[variant],
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
              'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out data-[swipe=end]:fade-out-80',
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', iconColorFor[variant])} aria-hidden />
            <div className="flex-1 pt-px">
              {item.title ? (
                <ToastPrimitive.Title className="hl-body-medium">
                  {item.title}
                </ToastPrimitive.Title>
              ) : null}
              {item.description ? (
                <ToastPrimitive.Description className="hl-small text-hl-fg-secondary">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            {item.action ? (
              <ToastPrimitive.Action altText={item.action.label} asChild>
                <button
                  type="button"
                  onClick={item.action.onClick}
                  className="hl-body-medium shrink-0 rounded-hl-sm px-2 py-1 text-hl-accent-fg outline-none transition-colors hover:bg-hl-accent-subtle"
                >
                  {item.action.label}
                </button>
              </ToastPrimitive.Action>
            ) : null}
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="shrink-0 rounded-hl-sm p-0.5 text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg"
            >
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport className="hl fixed bottom-0 right-0 z-[var(--hl-z-toast)] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  )
}
