import * as React from 'react'
import { CalendarDays, Database, Hash, Mail, Plug, Users, Video, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Provider marks for the Integration Hub.
 *
 * WHY SOME BRANDS HAVE THEIR REAL LOGO AND OTHERS DO NOT
 * -----------------------------------------------------
 * The four brands below ship their official mark, copied from Simple Icons
 * (https://simpleicons.org), which releases the icon files under CC0-1.0. The
 * trademarks themselves remain their owners'; CC0 covers the drawing, not the
 * right to imply endorsement, which is why these appear only as connector
 * labels next to the provider's own name.
 *
 * **Slack, Microsoft Outlook, Microsoft Teams and Microsoft 365 are
 * deliberately NOT here.** Simple Icons removed them at the trademark holders'
 * request, so there is no CC0 source for them, and shipping a traced copy would
 * be using a mark we have no licence to. They use a neutral Lucide glyph
 * instead — which is the documented fallback, not an oversight. If the brand
 * marks are wanted, that is a legal question (Microsoft and Slack both publish
 * brand-permission programmes), not a code one.
 *
 * WHY MONOCHROME
 * --------------
 * Every mark renders in `currentColor` rather than its brand hex. Two reasons,
 * and the second is the one that matters: a grid of ten saturated logos becomes
 * the loudest thing on a settings page, and — because half this set would be
 * Lucide glyphs anyway — colour would split the grid into "real logos" and
 * "generic icons". Monochrome makes ten marks from two sources read as one
 * deliberate set. Silhouettes stay recognisable at this size; that is what a
 * logo is for.
 *
 * WHY THE TWO SOURCES ARE DIFFERENT SIZES
 * ---------------------------------------
 * Monochrome fixed the colour mismatch but not the WEIGHT one. A solid brand
 * mark at 20px carries far more ink than a 20px 1.75-stroke outline, and in a
 * two-column grid that difference lands side by side in the same row — Gmail's
 * filled logo against Outlook's hairline envelope, both labelled "Email". Every
 * measurement matched (identical tiles, identical 20px boxes, names on the same
 * x) and it still read as two different icon sets.
 *
 * So the two sources meet in the middle: solid marks drop to 18px
 * (`--hl-icon-xs`) and stroked marks gain weight (1.75 → 2). Different measured
 * sizes, one apparent weight — optical balance over mathematical consistency.
 */

/** Official marks, Simple Icons v16 (CC0-1.0). 24×24 viewBox, single path. */
const BRAND_PATHS: Record<string, string> = {
  gmail:
    'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
  google_calendar:
    'M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z',
  google_meet:
    'M5.53 2.13 0 7.75h5.53zm.398 0v5.62h7.608v3.65l5.47-4.45c-.014-1.22.031-2.25-.025-3.46-.148-1.09-1.287-1.47-2.236-1.36zM23.1 4.32c-.802.295-1.358.995-2.047 1.49-2.506 2.05-4.982 4.12-7.468 6.19 3.025 2.59 6.04 5.18 9.065 7.76 1.218.671 1.428-.814 1.328-1.64v-13a.828.828 0 0 0-.877-.825zM.038 8.15v7.7h5.53v-7.7zm13.577 8.1H6.008v5.62c3.864-.006 7.737.011 11.58-.009 1.02-.07 1.618-1.12 1.468-2.07v-2.51l-5.47-4.68v3.65zm-13.577 0c.02 1.44-.041 2.88.033 4.31.162.948 1.158 1.43 2.047 1.31h3.464v-5.62z',
  /* NO ZOOM ENTRY, DELIBERATELY. Simple Icons' Zoom mark is the *wordmark* —
     the letters z-o-o-m drawn as paths. At 18px monochrome it collapses into an
     illegible grey smudge, which is worse than no logo: it reads as a rendering
     fault rather than a brand. Zoom falls through to a Lucide camera below. */
}

/** Neutral glyphs for the brands with no CC0 mark, plus the two generic ones. */
const LUCIDE_MARKS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  outlook: Mail,
  microsoft_calendar: CalendarDays,
  slack: Hash, // a Slack channel is a #; the closest honest shorthand
  teams: Users,
  zoom: Video, // see the note in BRAND_PATHS — the official mark is a wordmark
  generic_ats: Database,
  webhook: Webhook,
}

export interface ProviderIconProps {
  /** Registry key — `gmail`, `slack`, `generic_ats`, … */
  provider: string
  className?: string
}

/**
 * The 20px mark alone. Decorative: the provider's name is always rendered
 * beside it, so the icon is `aria-hidden` and adds nothing for a screen reader.
 */
export function ProviderIcon({ provider, className }: ProviderIconProps) {
  const brand = BRAND_PATHS[provider]
  if (brand) {
    // 18px: solid art, optically matched to the 20px strokes beside it.
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('size-hl-icon-xs shrink-0', className)}
        fill="currentColor"
        aria-hidden
        focusable="false"
      >
        <path d={brand} />
      </svg>
    )
  }
  const Glyph = LUCIDE_MARKS[provider] ?? Plug
  return <Glyph className={cn('size-hl-icon-sm shrink-0', className)} strokeWidth={2} />
}

/**
 * The mark in its tile. A fixed 36px square keeps every provider name starting
 * on the same x-position no matter how wide its glyph draws — the alignment the
 * grid lives or dies on.
 */
export function ProviderMark({ provider, className }: ProviderIconProps) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-hl-sm',
        'border border-hl-border-subtle bg-hl-subtle text-hl-fg-secondary',
        'transition-colors duration-150 group-hover/provider:text-hl-fg',
        className,
      )}
    >
      <ProviderIcon provider={provider} />
    </span>
  )
}
