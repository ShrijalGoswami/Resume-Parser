import {
  Sun,
  Briefcase,
  Users,
  Gavel,
  BarChart3,
  ClipboardList,
  MessageSquareText,
  BookText,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { PERMS, type PermissionKey } from '../settings/permissions'

/**
 * Primary navigation — Phase 9.1.
 *
 * Five destinations, ungrouped, in the order the recruiter's day runs:
 *   Today · Jobs · Candidates · Reports · Decisions
 *
 * The two labelled groups (WORKSPACE / INTELLIGENCE) are gone. At five items a
 * group label costs more than it clarifies: it asks the reader to hold a
 * taxonomy in mind to find five things, and the taxonomy was the product's own
 * ("Intelligence"), not the recruiter's.
 *
 * WHAT LEFT THE RAIL, AND WHY IT IS STILL REACHABLE
 *
 * Interviews, Ask and AI Audit moved to `secondaryNav` below. They are still
 * real destinations and the command palette still lists them — removing a row
 * from the rail is a statement about priority, not about access. Learning was
 * deleted outright: it had no backend, so it was a dead end rather than a
 * low-priority destination.
 */
export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
  /** Go-to key-hint revealed on hover (keyboard-forward rail). Chord: `g` then key. */
  shortcut?: string
  /**
   * Permission required for the destination to hold anything. Omitted means
   * every member can reach it — Today, Jobs, Candidates and Decisions all read
   * data gated by `campaign.view` / `candidate.view`, which every role has.
   *
   * Only Ask and Reports carry one, because those two surfaces are *entirely*
   * one permission: every Ask request is `ai.use`, and Reports is a single
   * `usage.view` endpoint. Listing a destination that can only render a gate
   * state is a promise the rail cannot keep. The route still gates itself — a
   * hidden rail entry is not access control, and deep links exist.
   */
  perm?: PermissionKey
  /**
   * Catalog feature the destination requires. SHOWS THE ITEM LOCKED — it does
   * NOT hide it, and that is the exact opposite of `perm` above.
   *
   * The two rules diverge because the remedies do. A hidden item is right for a
   * permission: no amount of money gets a viewer into Ask, so listing it is a
   * promise the rail cannot keep. It is wrong for a plan: a hidden feature
   * sells nothing and teaches nothing, and the customer never discovers the
   * product does the thing they need. Locked-and-visible is how they find out.
   *
   * The destination still gates itself with the same feature key, so a deep
   * link lands on the lock rather than a broken screen.
   */
  entitlement?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * The rail, in day order. `navGroups` keeps its shape (one group) so `LeftNav`
 * needs no structural change; the empty label is what suppresses the heading.
 */
export const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      {
        label: 'Today',
        href: '/today',
        // Was "Inbox", pointing at `/home`, reached by a `/dashboard` redirect —
        // three names for one screen. The label, the route and the redirect
        // target now agree. "Today" also frees the word Inbox, which promises a
        // queue you process to zero; this screen is a briefing.
        icon: Sun,
        isActive: (p) => p.startsWith('/today'),
        shortcut: 'G T',
      },
      {
        label: 'Jobs',
        href: '/jobs',
        icon: Briefcase,
        isActive: (p) => p.startsWith('/jobs'),
        shortcut: 'G J',
      },
      {
        label: 'Candidates',
        href: '/candidates',
        // Was "Talent". Search is not a separate place — it is how you use the
        // pool — so the destination is named for what it holds.
        icon: Users,
        isActive: (p) => p.startsWith('/candidates'),
        shortcut: 'G C',
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        isActive: (p) => p.startsWith('/reports'),
        perm: PERMS.USAGE_VIEW,
        // Server counterpart: `/analytics/overview` carries
        // `require_entitlement("advanced_analytics")`. The endpoint keeps its
        // name; only the screen was renamed.
        entitlement: 'advanced_analytics',
        shortcut: 'G R',
      },
      {
        label: 'Decisions',
        href: '/decisions',
        // HIRING OUTCOMES — offers, hires, rejections — read from the candidate
        // pipeline. NOT the AI-recommendation record, which is `secondaryNav`'s
        // "AI Audit" and used to be called the Decision Ledger. Two records,
        // two names, no shared vocabulary.
        icon: Gavel,
        isActive: (p) => p.startsWith('/decisions'),
        shortcut: 'G D',
      },
    ],
  },
]

/**
 * Reachable, deliberately not on the rail.
 *
 * The command palette lists these alongside the rail items, so none of them
 * became undiscoverable when the rail shrank to five. Each is here for its own
 * reason:
 *
 *   Interviews  a per-candidate action wearing a destination's clothes. The
 *               endpoint is already candidate-scoped, so the generator moves
 *               onto the candidate record in a later phase and this entry
 *               disappears rather than being relocated again.
 *   Ask         intelligence belongs in the work, not in a room you visit. ⌘K
 *               already routes a typed question here WITH page context; the
 *               standing destination is the one entry point that cannot carry
 *               any, which is why it reads as bolted on.
 *   AI Audit    the immutable record of AI recommendations that reached a call.
 *               Real, rarely visited, and no longer permitted to occupy the
 *               word "Decisions".
 */
export const secondaryNav: NavItem[] = [
  {
    label: 'Interviews',
    href: '/interviews',
    icon: ClipboardList,
    isActive: (p) => p.startsWith('/interviews'),
  },
  {
    label: 'Ask',
    href: '/ask',
    // MessageSquareText, not Sparkles (V2 §8/§23). The palette names
    // destinations; a sparkle names a technology.
    icon: MessageSquareText,
    isActive: (p) => p.startsWith('/ask'),
    perm: PERMS.AI_USE,
    // Server counterpart: the whole copilot router is behind
    // `require_entitlement("ai_copilot")` (main.py).
    entitlement: 'ai_copilot',
  },
  {
    label: 'AI Audit',
    href: '/ai-audit',
    icon: BookText,
    isActive: (p) => p.startsWith('/ai-audit'),
  },
]

export const settingsNav: NavItem = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
  isActive: (p) => p.startsWith('/settings'),
}

/**
 * Flattened destinations — the command palette's "Jump to" source. Derived from
 * `navGroups` + `secondaryNav` so the rail and the palette can never drift, and
 * so shrinking the rail cannot silently strand a surface.
 */
export const primaryNav: NavItem[] = [...navGroups.flatMap((group) => group.items), ...secondaryNav]

/** Rail items only — what `LeftNav` renders. */
export const railNav: NavItem[] = navGroups.flatMap((group) => group.items)
