import Link from 'next/link'

/**
 * Footer — Stitch frame 5 (`hirelens_marketing_the_conclusion_frame_5`).
 *
 * The composed homepage ends on frame 5, so it takes frame 5's footer: the
 * italic Newsreader wordmark stacked over the copyright on the left, and a
 * four-link nav on the right. 48px side padding, 64px vertical, max-w-[1280px].
 */

const FOOTER_LINKS = [
  { label: 'Terms', href: '#terms' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Security', href: '#security' },
  { label: 'Contact', href: '#contact' },
]

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-mkt-subtle bg-mkt-canvas">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between px-12 py-16 md:flex-row">
        <div className="mb-8 md:mb-0">
          <Link
            href="/"
            className="mb-2 block font-mkt-display text-xl italic text-mkt-fg"
          >
            HireLens
          </Link>
          <p className="mkt-body-sm tracking-wide text-mkt-fg-secondary">
            © 2024 HireLens Inc. Precision in Recruitment.
          </p>
        </div>
        <nav className="flex gap-8">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              // `py-1.5` is hit area only. At 12px type these links were 16px
              // tall — well under the 24px WCAG 2.5.8 minimum and awkward to tap
              // on a phone. The negative margin keeps the footer's visual rhythm
              // identical while the touch target grows to 28px.
              className="-my-1.5 py-1.5 mkt-body-sm tracking-wide text-mkt-fg-tertiary transition-colors hover:text-mkt-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
