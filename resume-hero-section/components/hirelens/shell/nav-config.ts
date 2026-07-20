import { Home, Briefcase, Users, Sparkles, Settings, type LucideIcon } from 'lucide-react'

/**
 * Primary navigation (UX Spec §2, Design Bible §5.1). Order is fixed:
 * Home · Roles · Talent · Ask, then Settings pinned separately.
 *
 * During coexistence the V3 screens are built in later phases; Home resolves to
 * `/` only after cutover (the legacy app holds `/` until then).
 */
export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

export const primaryNav: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, isActive: (p) => p === '/' },
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
