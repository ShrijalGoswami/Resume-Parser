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
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { navGroups, settingsNav, type NavItem } from './nav-config'
import { useShell } from './shell-context'
import { useMediaQuery } from '../lib/use-media-query'
import { useOrgContext } from '../lib/api/org-context'
import { hasPerm } from '../settings/permissions'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import { WorkspaceSwitcher } from './workspace-switcher'
import { AccountMenu, type AccountMenuProps } from './account-menu'

/** Left nav rail (Stitch RC-1 "Instrument Rail" · Design Bible §5.1) — 240 expanded / 56 collapsed. */
function NavLink({
  item,
  collapsed,
  locked,
}: {
  item: NavItem
  collapsed: boolean
  /** Entitlement lock: the item stays present and navigable, and gains a mark. */
  locked?: boolean
}) {
  const pathname = usePathname()
  const active = item.isActive(pathname)
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      // Collapsed, the link renders an icon and nothing else, so it has no
      // accessible name — the label only exists in a Tooltip, and a tooltip is
      // not a name. Assistive tech announced the whole primary rail as bare
      // "link". Expanded, the visible label already names it, so the attribute
      // is only added where it is missing (the Settings link below the rail was
      // already doing this).
      aria-label={collapsed ? (locked ? `${item.label} — not included in your plan` : item.label) : undefined}
      data-locked={locked ? 'true' : undefined}
      className={cn(
        // A nav row is not a button: `control-md` (36), not `control-lg` (44).
        // Nine rows at 44px made the rail 400px of chrome on a 695px canvas.
        'group relative flex h-hl-control-md items-center gap-2.5 rounded-hl-md px-2.5 outline-none',
        'transition-[background-color,color,transform] duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)]',
        collapsed && 'justify-center px-0',
        active
          ? 'hl-nav-active text-hl-fg'
          // HOVER IS NEUTRAL. IT MUST NOT BE THE ACCENT.
          // Inactive rows used to hover to `bg-hl-accent-subtle` (#F0EDFE),
          // which is within a hair of the plate the ACTIVE row carries
          // (`hl-nav-active`, the accent at 13%→5%). Passing the pointer down
          // the rail therefore lit each row up as though it were the selected
          // one, and the only thing still separating "where I am" from "what
          // is under my cursor" was the 3px marker.
          //
          // Violet in this rail now means exactly one thing: this is the page
          // you are on. Hover is a neutral surface change — the same
          // `bg-hl-muted` the rail's own settings, theme and collapse controls
          // have always used, so the rail is finally internally consistent too.
          : 'text-hl-fg-secondary hover:bg-hl-muted hover:text-hl-fg active:scale-[0.99]',
      )}
    >
      {active ? (
        <span
          // The active marker grows out of the rail edge rather than simply
          // being present — it is the one piece of motion in the nav.
          //
          // NO GLOW. This carried `0 0 12px` of the accent at 60% alpha — a
          // halo four times the width of the 3px bar casting it, and the
          // strongest glow anywhere in the product (the primary CTA's is 35%).
          // The design system reserves accent glow for the primary CTA and
          // live AI surfaces, on the grounds that a coloured shadow on
          // ordinary furniture reads as a bug rather than as premium; a
          // permanent glow bolted to the navigation is the clearest case of
          // that. The rail is chrome and should be the calmest surface on
          // screen — the marker identifies the page, it does not announce it.
          //
          // V2 §15: COPPER, FLAT, SQUARE. Copper rather than terracotta so the
          // navigation cannot be mistaken for the primary action — terracotta
          // is reserved for "do this", and a rail that shouts in the CTA colour
          // competes with the one button on screen that matters. Flat because
          // §7 forbids gradients on furniture. Square-ended because a rounded
          // cap on a 3px bar reads soft at the exact scale where precision is
          // the point.
          className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 bg-[var(--hl-accent-secondary)]"
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          'size-hl-icon-md shrink-0 transition-transform duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)]',
          !active && 'group-hover:scale-105',
        )}
        strokeWidth={active ? 2.3 : 1.9}
      />
      {collapsed ? null : (
        <>
          {/* Active items carry their state in weight as well as colour —
              colour alone is not a hierarchy, and it is not accessible. */}
          <span
            className={cn(
              'flex-1 truncate',
              active ? 'hl-ui font-semibold' : 'hl-ui',
            )}
          >
            {item.label}
          </span>
          {/* A locked destination is still a destination: it keeps its row, its
              label and its link, and gains a quiet mark. The mark replaces the
              key-hint rather than crowding it, because a shortcut to a locked
              screen is not the thing worth advertising. */}
          {locked ? (
            // V2 §8/§23 removes sparkles from the product. Here the glyph was
            // doubly wrong: a sparkle is the AI-theatre icon, and this mark
            // does not mean AI — it means "your plan does not include this".
            // A lock says exactly that, and says it to someone who has never
            // seen the product before.
            <Lock
              className="size-3.5 shrink-0 text-hl-fg-tertiary"
              strokeWidth={1.8}
              aria-hidden
            />
          ) : item.shortcut ? (
            <span className="hidden shrink-0 rounded-hl-sm border border-hl-border bg-hl-canvas px-1 hl-label-sm text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)] group-hover:inline-flex">
              {item.shortcut}
            </span>
          ) : null}
          {/* The glyph is decorative; the fact is not. Without this the rail
              announces a locked and an unlocked destination identically. */}
          {locked ? <span className="sr-only">Not included in your plan</span> : null}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">
          {locked ? `${item.label} — not included in your plan` : item.label}
        </TooltipContent>
      </Tooltip>
    )
  }
  return link
}

// True on the client, false during SSR — keeps the theme icon hydration-safe
// (matches ThemeToggle).
const emptySubscribe = () => () => {}

/**
 * RC-1 bottom-rail controls: settings · theme, as single-icon entry points.
 * The full segmented theme control remains in the account dropdown (below);
 * these are the quick, always-visible affordances RC-1 shows.
 */
function RailControls() {
  const { theme, setTheme } = useTheme()
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const currentTheme = isClient ? theme ?? 'system' : 'system'
  const ThemeIcon = currentTheme === 'light' ? Sun : currentTheme === 'dark' ? Moon : Monitor
  const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light'

  const btn =
    'flex size-hl-control-md items-center justify-center rounded-hl-md text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg'

  return (
    // Two controls, left-aligned with a gap. The trio used `justify-between`,
    // which would have stranded the remaining pair at opposite rail edges.
    <div className="mb-2 flex items-center gap-1 px-1">
      <Link href={settingsNav.href} aria-label="Settings" title="Settings" className={btn}>
        <Settings className="size-hl-icon-md" />
      </Link>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={`Theme: ${currentTheme}`}
        title={`Theme: ${currentTheme}`}
        className={btn}
      >
        <ThemeIcon className="size-hl-icon-md" />
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

  // Drop destinations this member cannot use, then drop any group that empties
  // out — an "INTELLIGENCE" heading over nothing is worse than no heading. The
  // rail renders unfiltered until the org context resolves, which is the right
  // direction here: this is presentation, and briefly showing Ask to someone who
  // turns out to lack `ai.use` costs a 403 they were never going to hit, whereas
  // briefly hiding it from someone who has it looks like the nav is broken.
  const ctx = useOrgContext()
  const permissions = ctx.data?.permissions
  // Entitlements travel with the same context object, so locking costs no extra
  // request. `undefined` until the context resolves — and on failure it STAYS
  // undefined, which is what makes the lock disappear rather than appear when
  // `/org/context` 503s. Marking a paying customer's features as unavailable
  // because a request failed is the same false accusation the gate hooks refuse
  // to make; the rail must not make it either.
  const entitlements = ctx.data?.entitlements
  const visibleGroups = React.useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => !item.perm || !permissions || hasPerm(permissions, item.perm))
            // PERMISSION HIDES · ENTITLEMENT LOCKS. See `nav-config.ts`.
            .map((item) => ({
              item,
              locked: Boolean(
                item.entitlement && entitlements && entitlements[item.entitlement]?.enabled === false,
              ),
            })),
        }))
        .filter((group) => group.items.length > 0),
    [permissions, entitlements],
  )

  React.useEffect(() => {
    // Auto-collapse below 1280 (Design Bible §4.1).
    if (belowXl) setNavCollapsed(true)
  }, [belowXl, setNavCollapsed])

  const collapsed = navCollapsed

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'hl-rail flex h-full shrink-0 flex-col border-r border-hl-border-subtle transition-[width] duration-[var(--hl-dur-base)]',
        collapsed ? 'w-[var(--hl-nav-w-collapsed)]' : 'w-[var(--hl-nav-w)]',
      )}
    >
      {/* Brand zone: matches the 52px top-bar height and carries the header
          divider so the rule reads continuously across rail + header. */}
      <div
        className={cn(
          'flex h-[var(--hl-topbar-h)] shrink-0 items-center border-b border-hl-border-subtle px-2',
          collapsed && 'justify-center px-0',
        )}
      >
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Grouped navigation (WORKSPACE · INTELLIGENCE). */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pt-3">
        {visibleGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {collapsed ? null : (
              <span className="mb-1.5 px-3 hl-label text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)]">
                {group.label}
              </span>
            )}
            {group.items.map(({ item, locked }) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} locked={locked} />
            ))}
          </div>
        ))}
      </div>

      {/* RC-1 bottom rail: controls + account (dropdown preserved) + collapse. */}
      <div className="flex flex-col border-t border-hl-border-subtle px-2 pb-2 pt-2">
        {collapsed ? null : <RailControls />}
        <AccountMenu {...account} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleNav}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mt-1 flex h-hl-control-md items-center gap-3 rounded-hl-md px-3 text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeft className="size-hl-icon-sm" />
          ) : (
            <>
              <PanelLeftClose className="size-hl-icon-sm" />
              <span className="hl-ui">Collapse</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}
