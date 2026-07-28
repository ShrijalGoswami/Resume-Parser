import {
  Inbox,
  Briefcase,
  Users,
  ClipboardList,
  Sparkles,
  BookText,
  GraduationCap,
  Settings,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

/**
 * Primary navigation (Stitch RC-1 "Instrument Rail" · UX Spec §2 · Design Bible
 * §5.1). Two labeled groups, order fixed:
 *   WORKSPACE     Inbox · Roles · Talent
 *   INTELLIGENCE  Ask · Ledger · Learning
 * Settings is pinned separately at the rail foot.
 *
 * Ask has a visible rail entry AND stays reachable via ⌘K + contextual AI
 * surfaces (both, by design). Analytics is back in INTELLIGENCE now that the
 * Executive Overview surface ships at `/analytics` (it had been removed while
 * the route 404'd). Inbox points at the current `/home` landing as a
 * transitional placeholder; the href moves to `/inbox` when that surface is built.
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
        label: 'Interviews',
        href: '/interviews',
        icon: ClipboardList,
        isActive: (p) => p.startsWith('/interviews'),
        shortcut: 'G V',
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Ask',
        href: '/ask',
        icon: Sparkles,
        isActive: (p) => p.startsWith('/ask'),
        shortcut: 'G K',
      },
      {
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        isActive: (p) => p.startsWith('/analytics'),
        shortcut: 'G A',
      },
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
  // The "Classic" group is gone. It was a migration bridge holding Insights,
  // Reports, Agent, Knowledge and Predictions visible while V4 replacements were
  // built — "no feature inaccessible before its replacement is production-ready."
  // Intelligence (Ask · Analytics · Ledger · Learning) is now the single source of
  // truth for those capabilities, so the bridge and its five legacy pages were
  // removed rather than left as a second, diverging way to reach the same work.
  //
  // The other legacy routes were retired earlier by redirecting to their V4
  // replacements, which is why they never appeared here: Search → Talent,
  // Campaigns → Roles, Integrations → Settings ▸ Integrations, Admin →
  // Settings ▸ Members, Dashboard → Inbox.
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
