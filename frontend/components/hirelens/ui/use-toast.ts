'use client'

import * as React from 'react'

/**
 * Toast store (Design Bible §4.9). A tiny module-level store so any component
 * can call `toast(...)` imperatively without prop drilling; the <Toaster />
 * subscribes and renders. Undo actions extend the default lifetime to 10s.
 */
export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  /** Override auto-dismiss (ms). Defaults to 5000, or 10000 with an action. */
  duration?: number
  action?: ToastAction
}

export interface ToastItem extends ToastOptions {
  id: string
}

let counter = 0
let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function toast(options: ToastOptions): string {
  const id = `hl-toast-${(counter += 1)}`
  items = [...items, { id, ...options }]
  emit()
  return id
}

export function dismissToast(id: string): void {
  items = items.filter((item) => item.id !== id)
  emit()
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function useToasts(): ToastItem[] {
  return React.useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  )
}
