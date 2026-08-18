import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

/**
 * Footer — Stitch frame 5 (`hirelens_marketing_the_conclusion_frame_5`).
 *
 * The composed homepage ends on frame 5, so it takes frame 5's footer: the
 * italic Newsreader wordmark stacked over the copyright on the left, and a
 * four-link nav on the right. 48px side padding, 64px vertical, max-w-[1280px].
 */

/**
 * REAL ROUTES, NOT ANCHORS.
 *
 * All four of these used to be `#terms`, `#privacy`, `#security` and `#contact`
 * — fragment links to sections that existed on no page at all, except
 * `#security`, which existed only on the homepage and therefore resolved to
 * nothing from `/pricing`. So every link in the footer of every public page was
 * dead, including the two a customer is most likely to want before paying.
 *
 * Security keeps its anchor because it genuinely is a homepage section, but it
 * is now absolute (`/#security`) so it works from `/pricing` and the policy
 * pages rather than silently doing nothing.
 */
const FOOTER_LINKS = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Refunds', href: '/refunds' },
  { label: 'Security', href: '/#security' },
  { label: 'Contact', href: '/contact' },
]

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-mkt-subtle bg-mkt-canvas">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between px-12 py-16 md:flex-row">
        <div className="mb-8 md:mb-0">
          {/* `inline-flex` replaces `block` so the mark and wordmark share a
              baseline row; the link keeps its own width rather than stretching
              the column. Italic stays on the wordmark alone — the mark is
              geometry and must not be skewed with the type. */}
          <Link
            href="/"
            className="mb-2 inline-flex font-mkt-display text-xl text-mkt-fg"
          >
            <Logo tone="mono" wordmarkClassName="italic" />
          </Link>
          {/* The year is derived, not typed. It read "© 2024" throughout 2026 —
              a small thing that quietly tells a visitor the site is unmaintained,
              on the one page whose job is to establish that it is not. */}
          <p className="mkt-body-sm tracking-wide text-mkt-fg-secondary">
            © {new Date().getFullYear()} Hirevo Inc. Precision in Recruitment.
          </p>
        </div>
        {/* `flex-wrap` and a smaller gap: five real routes no longer fit one
            line on a narrow viewport, and the row was overflowing rather than
            wrapping. */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end md:gap-x-8">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              // `py-1.5` is hit area only. At 12px type these links were 16px
              // tall — well under the 24px WCAG 2.5.8 minimum and awkward to tap
              // on a phone. The negative margin keeps the footer's visual rhythm
              // identical while the touch target grows to 28px.
              className="-my-1.5 py-1.5 mkt-body-sm tracking-wide text-mkt-fg-tertiary transition-colors hover:text-mkt-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
