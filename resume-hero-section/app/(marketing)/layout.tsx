import type { Metadata } from 'next'
import { fontVariables } from '@/components/hirelens/theme/fonts'

/**
 * Marketing route group — the public, standalone landing experience. Isolated
 * from the authenticated `.hl` product: it mounts NO app shell, NO providers,
 * NO auth gating, and its own dark/editorial `mkt-*` palette (never the product's
 * Optical Clarity tokens). Coexistence path is /welcome; it becomes / at cutover
 * with a routing change only — links are hash anchors or shared root-relative
 * routes, never hardcoded to /welcome.
 */
export const metadata: Metadata = {
  title: 'HireLens — Bring every hire into focus',
  description:
    'HireLens reads the whole pile, brings the few who matter into focus, and tells you what you’d regret — so your best judgment reaches every candidate, not just the top of the stack.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fontVariables} min-h-dvh bg-mkt-paper font-[family-name:var(--font-inter)] text-mkt-fg antialiased`}
    >
      {children}
    </div>
  )
}
