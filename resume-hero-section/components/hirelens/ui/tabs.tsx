'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * Tabs (Design Bible §4.7). `underline` for content tabs; `segmented` for the
 * LensSwitcher. The list's variant flows to its triggers via context.
 */
type TabsVariant = 'underline' | 'segmented'

const TabsVariantContext = React.createContext<TabsVariant>('underline')

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = 'underline', ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'segmented'
          ? 'inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1'
          : 'inline-flex items-center gap-4 border-b border-hl-border',
        className,
      )}
      {...props}
    />
  </TabsVariantContext.Provider>
))
TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext)
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'hl-body-medium inline-flex items-center gap-1.5 whitespace-nowrap text-hl-fg-secondary outline-none transition-[color,background-color,border-color] duration-[var(--hl-dur-fast)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
        variant === 'segmented'
          ? 'rounded-hl-sm px-3 py-1 data-[state=active]:bg-hl-canvas data-[state=active]:text-hl-accent-fg data-[state=active]:shadow-[var(--hl-shadow-xs)]'
          : 'border-b-2 border-transparent pb-2 data-[state=active]:border-hl-accent data-[state=active]:text-hl-fg',
        className,
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('outline-none', className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName
