'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AnchorLink } from './anchor-link'

const NAV = [
  { label: 'Platform', id: 'platform' },
  { label: 'Methodology', id: 'methodology' },
  { label: 'Insights', id: 'insights' },
  { label: 'Pricing', id: 'pricing' },
]

/**
 * Marketing nav — a sticky table-of-contents for the long-form narrative.
 * Transparent over the dark hero (light text), then resolves to paper with
 * dark text on scroll. Anchor links smooth-scroll and highlight the active
 * section. Sign-in / Request access route to the shared V4 auth surfaces.
 */
export function MarketingNav() {
  const [scrolled, setScrolled] = React.useState(false)
  const [active, setActive] = React.useState('')

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const toTop = (event: React.MouseEvent) => {
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    history.replaceState(null, '', window.location.pathname)
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        scrolled
          ? 'border-mkt-border-subtle bg-mkt-paper/85 text-mkt-fg backdrop-blur'
          : 'border-transparent text-mkt-ink-fg',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" onClick={toTop} className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight">
          HireLens
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <AnchorLink
              key={n.id}
              to={n.id}
              className={cn(
                'font-hl-mono text-[11px] uppercase tracking-widest transition-opacity',
                active === n.id ? 'opacity-100' : 'opacity-55 hover:opacity-100',
              )}
            >
              {n.label}
            </AnchorLink>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="hidden font-hl-mono text-[11px] uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-mkt-iris px-3.5 py-2 font-hl-mono text-[11px] uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Request access
          </Link>
        </div>
      </nav>
    </header>
  )
}
