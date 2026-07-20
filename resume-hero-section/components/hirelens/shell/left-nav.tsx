'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import { primaryNav, settingsNav, type NavItem } from './nav-config'
import { useShell } from './shell-context'
import { useMediaQuery } from '../lib/use-media-query'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import { WorkspaceSwitcher } from './workspace-switcher'
import { AccountMenu, type AccountMenuProps } from './account-menu'

/** Left nav rail (Design Bible §5.1) — 240 expanded / 56 collapsed. */
function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = item.isActive(pathname)
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center gap-2.5 rounded-hl-md px-2.5 outline-none transition-colors',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-hl-accent-subtle text-hl-accent-fg'
          : 'text-hl-fg-secondary hover:bg-hl-muted hover:text-hl-fg',
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-hl-accent"
          aria-hidden
        />
      ) : null}
      <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.9} />
      {collapsed ? null : <span className="hl-body-medium">{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }
  return link
}

export interface LeftNavProps {
  account?: AccountMenuProps
}

export function LeftNav({ account }: LeftNavProps) {
  const { navCollapsed, toggleNav, setNavCollapsed } = useShell()
  const belowXl = useMediaQuery('(max-width: 1279px)')

  React.useEffect(() => {
    // Auto-collapse below 1280 (Design Bible §4.1).
    if (belowXl) setNavCollapsed(true)
  }, [belowXl, setNavCollapsed])

  const collapsed = navCollapsed

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-hl-border-subtle bg-hl-subtle transition-[width] duration-[var(--hl-dur-base)]',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div className={cn('flex items-center p-3', collapsed && 'justify-center px-0')}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-2">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>

      <div className="flex flex-col gap-0.5 px-2 pb-2">
        <NavLink item={settingsNav} collapsed={collapsed} />
        <AccountMenu {...account} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleNav}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mt-1 flex h-8 items-center gap-2.5 rounded-hl-md px-2.5 text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="hl-small">Collapse</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}
