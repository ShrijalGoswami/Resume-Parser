import { Home, Briefcase, Users, Sparkles, Settings, type LucideIcon } from 'lucide-react'

/**
 * Primary navigation (UX Spec §2, Design Bible §5.1). Order is fixed:
 * Home · Roles · Talent · Ask, then Settings pinned separately.
 *
 * During coexistence the legacy app holds `/`, so V3 Home lives at `/home`; the
 * href returns to `/` at cutover. Roles/Talent/Ask/Settings are built later.
 */
export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

export const primaryNav: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home, isActive: (p) => p.startsWith('/home') },
  { label: 'Roles', href: '/roles', icon: Briefcase, isActive: (p) => p.startsWith('/roles') },
  { label: 'Talent', href: '/talent', icon: Users, isActive: (p) => p.startsWith('/talent') },
  { label: 'Ask', href: '/ask', icon: Sparkles, isActive: (p) => p.startsWith('/ask') },
]

export const settingsNav: NavItem = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
  isActive: (p) => p.startsWith('/settings'),
}
