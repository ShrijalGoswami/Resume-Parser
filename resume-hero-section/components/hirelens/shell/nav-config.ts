import {
  Inbox,
  Briefcase,
  Users,
  BarChart3,
  BookText,
  GraduationCap,
  Settings,
  type LucideIcon,
} from 'lucide-react'

/**
 * Primary navigation (Stitch RC-1 "Instrument Rail" · UX Spec §2 · Design Bible
 * §5.1). Two labeled groups, order fixed:
 *   WORKSPACE     Inbox · Roles · Talent · Analytics
 *   INTELLIGENCE  Ledger · Learning
 * Settings is pinned separately at the rail foot. Ask is not a rail item — it is
 * a global capability reached via ⌘K and contextual AI surfaces.
 *
 * Routes that are not built yet (Analytics, Ledger, Learning, and the canonical
 * Inbox) follow the existing coexistence pattern: the rail item ships now and
 * the route lands in its own milestone. Inbox points at the current `/home`
 * landing as a transitional placeholder; the href moves to `/inbox` when the
 * Inbox surface is built.
 */
export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
  /** Go-to key-hint revealed on hover (keyboard-forward rail). Chord: `g` then key. */
  shortcut?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Inbox',
        href: '/home',
        icon: Inbox,
        isActive: (p) => p.startsWith('/home') || p.startsWith('/inbox'),
        shortcut: 'G I',
      },
      {
        label: 'Roles',
        href: '/roles',
        icon: Briefcase,
        isActive: (p) => p.startsWith('/roles'),
        shortcut: 'G R',
      },
      {
        label: 'Talent',
        href: '/talent',
        icon: Users,
        isActive: (p) => p.startsWith('/talent'),
        shortcut: 'G T',
      },
      {
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        isActive: (p) => p.startsWith('/analytics'),
        shortcut: 'G A',
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Ledger',
        href: '/ledger',
        icon: BookText,
        isActive: (p) => p.startsWith('/ledger'),
        shortcut: 'G L',
      },
      {
        label: 'Learning',
        href: '/learning',
        icon: GraduationCap,
        isActive: (p) => p.startsWith('/learning'),
        shortcut: 'G E',
      },
    ],
  },
]

export const settingsNav: NavItem = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
  isActive: (p) => p.startsWith('/settings'),
}

/**
 * Flattened primary items — the command palette's "Jump to" source. Derived from
 * `navGroups` so the rail and the palette can never drift.
 */
export const primaryNav: NavItem[] = navGroups.flatMap((group) => group.items)
