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
  { label: 'Product', href: '/#product' },
  // A real route now, not an anchor. The homepage keeps a pricing band, but the
  // full comparison is its own page — an in-page anchor from another route
  // would scroll to nothing.
  { label: 'Pricing', href: '/pricing' },
  { label: 'Customers', href: '/#customers' },
  { label: 'Security', href: '/#security' },
]

export function MarketingNav() {
  const [onInk, setOnInk] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

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
    /* `<header>` is the banner landmark. Without it the site had `main`,
       `nav` and `footer` but nothing identifying the masthead, so assistive
       tech and document-structure extractors saw navigation floating at the
       top of the page with no region owning it. */
    <header>
    <nav
      /* `mkt-fixed-vw` instead of `w-full`: a fixed box measures against the
         viewport, not the zoomed `.mkt` ancestor, so `w-full` would render
         15% narrow. See the scale compensations in globals.css. */
      className={`mkt-fixed-vw fixed top-0 z-50 backdrop-blur-[32px] transition-colors duration-500 ${
        onInk
          ? 'border-b border-mkt-dark-outline-variant/10 bg-mkt-dark-bg/80'
          : 'border-b border-mkt-border-subtle bg-mkt-canvas/80'
      }`}
    >
      {/* Authored at py-4 / 80px. `--mkt-scale` renders it at ~68px — between
          Vercel's 64 and Linear's 73. Height is NOT hardcoded here: the global
          scale owns it, so this stays at the design's authored value. */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 md:px-20">
        {/* Brand */}
        <Link
          href="/"
          className={`font-mkt-display text-[32px] leading-[40px] tracking-tighter transition-colors duration-500 ${
            onInk ? 'text-mkt-dark-fg' : 'text-mkt-fg'
          }`}
        >
          HireLens
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            // `Link`, not `<a>`: Pricing is a route now, and a full page load
            // between two marketing pages would drop the fonts and the
            // background field for a beat.
            <Link
              key={link.label}
              href={link.href}
              // `py-1` is hit area only: 12px uppercase type renders 16px tall,
              // under the 24px WCAG 2.5.8 minimum, and this bar is reachable on
              // tablets. The negative margin keeps the bar's height unchanged.
              className={`-my-1 py-1 mkt-data font-medium uppercase tracking-widest transition-all duration-500 ${label}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/auth/login"
            // `py-1` is hit area only — see the note on the nav links above.
            className={`-my-1 py-1 mkt-data font-medium uppercase tracking-widest transition-colors duration-500 ${
              onInk
                ? 'text-mkt-dark-fg-variant hover:text-mkt-dark-fg'
                : 'text-mkt-fg-secondary hover:text-mkt-fg'
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-mkt-primary-container px-6 py-3 mkt-data font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-mkt-inverse-primary"
          >
            Request Access
          </Link>
        </div>

        {/* MOBILE.
            This was a single "Access" button routing to /auth/signup, on the
            reasoning that the Stitch frames never specced an open mobile menu.
            The frames were desktop comps, and their silence was not a decision
            to have no mobile navigation — the effect was that below 768px
            Pricing, Customers and Security were unreachable, and an EXISTING
            CUSTOMER had no way to sign in at all: the only control on screen
            sent them to signup. Recruiters live on phones between interviews.

            A disclosure, not a route change: same links, same labels, same
            palette swap as the bar above it. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mkt-mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={`-mr-2 flex size-11 items-center justify-center transition-colors duration-500 md:hidden ${
            onInk ? 'text-mkt-dark-fg' : 'text-mkt-fg'
          }`}
        >
          {/* Two 1px rules that cross into an X. Cheaper than an icon font the
              nav does not otherwise load, and it animates for free. */}
          <span className="relative block h-4 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 block h-px w-5 bg-current transition-transform duration-300 ${
                menuOpen ? 'top-1/2 rotate-45' : 'top-1'
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-5 bg-current transition-transform duration-300 ${
                menuOpen ? 'top-1/2 -rotate-45' : 'top-[11px]'
              }`}
            />
          </span>
        </button>
      </div>

      {/* The panel. Inside <nav> so it inherits the backdrop blur and the
          ink/canvas swap, and so the whole thing remains one landmark. */}
      {menuOpen ? (
        <div
          id="mkt-mobile-menu"
          className={`border-t md:hidden ${
            onInk ? 'border-mkt-dark-outline-variant/10' : 'border-mkt-border-subtle'
          }`}
        >
          <div className="flex flex-col px-6 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`py-3 mkt-data font-medium uppercase tracking-widest transition-colors ${label}`}
              >
                {link.label}
              </Link>
            ))}

            <div
              className={`mt-2 flex flex-col gap-3 border-t pt-4 ${
                onInk ? 'border-mkt-dark-outline-variant/10' : 'border-mkt-border-subtle'
              }`}
            >
              {/* Sign in comes FIRST on mobile. An existing customer opening
                  the site on a phone is the likeliest visitor to need it, and
                  it was the one action the old bar made impossible. */}
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className={`py-2 mkt-data font-medium uppercase tracking-widest transition-colors ${
                  onInk
                    ? 'text-mkt-dark-fg-variant hover:text-mkt-dark-fg'
                    : 'text-mkt-fg-secondary hover:text-mkt-fg'
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMenuOpen(false)}
                className="bg-mkt-primary-container px-6 py-3 text-center mkt-data font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-mkt-inverse-primary"
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
    </header>
  )
}
