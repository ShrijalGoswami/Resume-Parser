'use client'

import Link from 'next/link'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu'
import { ThemeToggle } from '../theme/theme-toggle'
import { DensityToggle } from '../theme/density-toggle'

/**
 * Account menu (Design Bible §5.6). Identity, theme + density controls, settings,
 * sign out. Name/email render when provided (wired to the auth source later).
 */
export interface AccountMenuProps {
  name?: string
  email?: string
  avatarUrl?: string
  collapsed?: boolean
  onSignOut?: () => void
}

export function AccountMenu({
  name = 'Account',
  email,
  avatarUrl,
  collapsed = false,
  onSignOut,
}: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            'flex items-center gap-2.5 rounded-hl-md px-2 py-1.5 outline-none transition-colors hover:bg-hl-muted',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar name={name} src={avatarUrl} size={collapsed ? 24 : 26} />
          {collapsed ? null : (
            <span className="hl-body-medium truncate text-hl-fg">{name}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64">
        {email ? (
          <>
            <div className="px-2 py-1.5">
              <p className="hl-body-medium truncate">{name}</p>
              <p className="hl-caption truncate text-hl-fg-tertiary">{email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="hl-small text-hl-fg-secondary">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="hl-small text-hl-fg-secondary">Density</span>
          <DensityToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSignOut?.()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
