'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Top navigation for the composed marketing page.
 *
 * COMPOSITION NOTE — the one place the five frames cannot all be satisfied at
 * once. Each Stitch frame ships its own nav matched to its own background:
 * frame 1's is Deep Ink (it sits on the dark hero), while frames 2–5 are all
 * light (they sit on canvas). A single continuous page has one nav, so it
 * carries both palettes and swaps at the hero boundary — dark over frame 1,
 * light over frames 2–5. Pinning it to either palette alone would contradict
 * four frames or one.
 *
 * Structure, labels, metrics and spacing are frame 1's throughout and are not
 * re-derived per frame: fixed, 24px vertical padding, 1440px max width, 24/80px
 * side margins, Newsreader wordmark at headline-lg (48/56, tracking-tighter),
 * JetBrains Mono labels at data-label (12/16, weight 500) uppercase.
 */

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Customers', href: '#customers' },
  { label: 'Security', href: '#security' },
]

export function MarketingNav() {
  const [onInk, setOnInk] = useState(true)

  useEffect(() => {
    // The nav takes its palette from whatever section is currently beneath it,
    // rather than simply flipping once past the hero. The page alternates ink
    // and canvas bands (hero, the Stakes, the regret climax, the closing), and
    // a translucent light bar over an ink band renders as a muddy grey — which
    // matches no frame. Every frame shows its nav on its own background, so
    // tracking the band underneath is what reproduces that across the scroll.
    //
    // Deliberately a scroll/resize listener rather than an IntersectionObserver:
    // IO only reports on *change*, so a first callback that lands before layout
    // has settled latches a wrong value and never corrects itself.
    const isDark = (el: Element) => {
      const bg = getComputedStyle(el).backgroundColor
      const m = bg.match(/[\d.]+/g)
      if (!m || m.length < 3) return false
      if (m.length > 3 && Number(m[3]) === 0) return false // transparent
      const [r, g, b] = m.map(Number)
      return 0.299 * r + 0.587 * g + 0.114 * b < 128
    }

    const update = () => {
      // Sample just below the nav's own height so the band the bar overlaps is
      // the one that decides its palette.
      const probe = window.scrollY + 48
      const bands = document.querySelectorAll('main section')
      for (const band of bands) {
        const el = band as HTMLElement
        const top = el.offsetTop
        if (probe >= top && probe < top + el.offsetHeight) {
          setOnInk(isDark(el))
          return
        }
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const label = onInk
    ? 'text-mkt-dark-fg-variant hover:text-mkt-dark-primary'
    : 'text-mkt-fg-secondary hover:text-mkt-accent'

  return (
    <nav
      className={`fixed top-0 z-50 w-full backdrop-blur-[32px] transition-colors duration-500 ${
        onInk
          ? 'border-b border-mkt-dark-outline-variant/10 bg-mkt-dark-bg/80'
          : 'border-b border-mkt-border-subtle bg-mkt-canvas/80'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 md:px-20">
        {/* Brand */}
        <Link
          href="/"
          className={`font-mkt-display text-[32px] leading-[40px] tracking-tighter transition-colors duration-500 md:text-[48px] md:leading-[56px] ${
            onInk ? 'text-mkt-dark-fg' : 'text-mkt-fg'
          }`}
        >
          HireLens
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest transition-all duration-500 ${label}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/auth/login"
            className={`font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest transition-colors duration-500 ${
              onInk
                ? 'text-mkt-dark-fg-variant hover:text-mkt-dark-fg'
                : 'text-mkt-fg-secondary hover:text-mkt-fg'
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-mkt-primary-container px-6 py-3 font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-mkt-inverse-primary"
          >
            Request Access
          </Link>
        </div>

        {/* Mobile: a single access affordance — the frames never spec an open
            mobile menu, so we route rather than render a dead toggle. */}
        <Link
          href="/auth/signup"
          className="bg-mkt-primary-container px-4 py-2 font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-white md:hidden"
        >
          Access
        </Link>
      </div>
    </nav>
  )
}
