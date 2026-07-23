'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sun,
  Moon,
  Monitor,
  Rows3,
  Rows4,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { navGroups, settingsNav, type NavItem } from './nav-config'
import { useShell } from './shell-context'
import { useMediaQuery } from '../lib/use-media-query'
import { useDensity } from '../lib/density'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import { WorkspaceSwitcher } from './workspace-switcher'
import { AccountMenu, type AccountMenuProps } from './account-menu'

/** Left nav rail (Stitch RC-1 "Instrument Rail" · Design Bible §5.1) — 240 expanded / 56 collapsed. */
function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = item.isActive(pathname)
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-2.5 rounded-hl-md px-2.5 outline-none transition-colors',
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
      {collapsed ? null : (
        <>
          <span className="hl-body-medium flex-1 truncate">{item.label}</span>
          {/* Keyboard-forward: the go-to key-hint is revealed on hover (Stitch RC-1). */}
          {item.shortcut ? (
            <span className="hidden shrink-0 rounded-hl-sm border border-hl-border bg-hl-canvas px-1 text-[10px] tracking-widest text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)] group-hover:inline-flex">
              {item.shortcut}
            </span>
          ) : null}
        </>
      )}
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

// True on the client, false during SSR — keeps the theme icon hydration-safe
// (matches ThemeToggle).
const emptySubscribe = () => () => {}

/**
 * RC-1 bottom-rail control trio: settings · density · theme, as single-icon
 * entry points. The full segmented controls remain in the account dropdown
 * (below); these are the quick, always-visible affordances RC-1 shows.
 */
function RailControls() {
  const { theme, setTheme } = useTheme()
  const { density, setDensity } = useDensity()
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const currentTheme = isClient ? theme ?? 'system' : 'system'
  const ThemeIcon = currentTheme === 'light' ? Sun : currentTheme === 'dark' ? Moon : Monitor
  const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light'
  const DensityIcon = density === 'compact' ? Rows4 : Rows3

  const btn =
    'flex size-8 items-center justify-center rounded-hl-md text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg'

  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <Link href={settingsNav.href} aria-label="Settings" title="Settings" className={btn}>
        <Settings className="size-[18px]" />
      </Link>
      <button
        type="button"
        onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
        aria-label={`Density: ${density}`}
        title={`Density: ${density}`}
        className={btn}
      >
        <DensityIcon className="size-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={`Theme: ${currentTheme}`}
        title={`Theme: ${currentTheme}`}
        className={btn}
      >
        <ThemeIcon className="size-[18px]" />
      </button>
    </div>
  )
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
      {/* Brand zone: matches the 52px top-bar height and carries the header
          divider so the rule reads continuously across rail + header. */}
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center border-b border-hl-border-subtle px-2',
          collapsed && 'justify-center px-0',
        )}
      >
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Grouped navigation (WORKSPACE · INTELLIGENCE). */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-2 pt-4">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {collapsed ? null : (
              <span className="mb-1 px-3 text-[10px] uppercase tracking-widest text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)]">
                {group.label}
              </span>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </div>

      {/* RC-1 bottom rail: control trio + account (dropdown preserved) + collapse. */}
      <div className="flex flex-col border-t border-hl-border-subtle px-2 pb-2 pt-2">
        {collapsed ? null : <RailControls />}
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
