import {
  Inbox,
  Briefcase,
  Users,
  Sparkles,
  BookText,
  GraduationCap,
  Settings,
  BarChart3,
  FileText,
  Bot,
  Library,
  TrendingUp,
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
 * surfaces (both, by design). The former "Analytics" item was removed because it
 * pointed at an unbuilt route (404); it will be re-added when the Executive
 * Overview surface ships. Inbox points at the current `/home` landing as a
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
  // ── Classic (legacy) — MIGRATION BRIDGE, temporary ──────────────────────────
  // These legacy features have NO fully-complete V4 replacement yet (or only a
  // partial one), so they stay visibly reachable here rather than being hidden —
  // "no feature inaccessible before its replacement is production-ready." Each is
  // removed from this group only when its replacement reaches parity + a redirect
  // goes live (see the Migration Matrix). Absent because they already redirect
  // to a live V4 replacement: Search → Talent, Campaigns → Roles, Integrations →
  // Settings ▸ Integrations, Admin → Settings ▸ Members, Dashboard → Inbox.
  {
    label: 'Classic',
    items: [
      {
        label: 'Insights',
        href: '/insights',
        icon: BarChart3,
        isActive: (p) => p.startsWith('/insights'),
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: FileText,
        isActive: (p) => p.startsWith('/reports'),
      },
      {
        label: 'Agent',
        href: '/agent',
        icon: Bot,
        isActive: (p) => p.startsWith('/agent'),
      },
      {
        label: 'Knowledge',
        href: '/knowledge',
        icon: Library,
        isActive: (p) => p.startsWith('/knowledge'),
      },
      {
        label: 'Predictions',
        href: '/predictions',
        icon: TrendingUp,
        isActive: (p) => p.startsWith('/predictions'),
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
