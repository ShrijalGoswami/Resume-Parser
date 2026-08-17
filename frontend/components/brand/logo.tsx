import { cn } from '@/lib/utils'

/**
 * The HireLens logo — the single source of truth for the brand mark.
 *
 * THE MARK is a vector recreation of `public/newlogo.png`, which is the design
 * of record. Its geometry was measured off that file rather than redrawn by
 * eye: the reference's own bounding box gives an aspect of 0.755 (hence the
 * 48×64 viewBox), bars ~0.25 of the mark's width, a ~0.07 vertical offset
 * between them, and an aperture centred at (0.482W, 0.50H). Every number below
 * comes from that measurement pass.
 *
 * HOW IT IS BUILT. Two vertically-offset slab bars and a sloping crossbar are
 * painted into a MASK, which unions them; the aperture ring and the catchlight
 * are then painted black to knock them back out. A mask is used rather than
 * path winding because hand-authored béziers do not reliably share a winding
 * direction, and `fill-rule` then XORs the overlaps instead of uniting them.
 *
 * THE KNOCKOUTS ARE TRANSPARENT, NOT WHITE. That single decision is what lets
 * one asset serve both grounds: on the marketing canvas the aperture reads
 * light, on the product's ink it reads dark, exactly as the reference sheet's
 * two versions do. A white-filled ring would punch a hole in every dark
 * surface it landed on.
 *
 * WHY THE MARK SCALES IN `em`. The wordmark is set at three different sizes
 * across the app (32px marketing display, `hl-body-lg` on auth, and whatever a
 * future surface uses). Sizing in `em` means the mark tracks its neighbouring
 * type with no arithmetic at the call site.
 *
 * COLOUR comes from the design system, never from the reference PNG — the
 * reference's blue/violet gradient belongs to no HireLens token. `brand` uses
 * the terracotta→copper pair; `mono` collapses to `currentColor` so the mark
 * inherits whatever ink surrounds it, which is the correct tone on the
 * marketing site (whose palette is deliberately monochromatic) and in any
 * single-colour context.
 */
type LogoTone = 'brand' | 'mono'

/** Mark artboard. Matches the reference's measured 0.755 aspect. */
export const LOGO_VIEWBOX = { w: 48, h: 64 } as const

/**
 * The H body: left bar, upper crossbar, and their 180° rotations. The mark has
 * rotational rather than mirror symmetry — that is what makes the two bars sit
 * at different heights and gives the reference its forward lean.
 */
export const LOGO_BODY_PATHS = [
  'M6 0.9 L11 0.9 C12.7 0.9 13.6 2 13.6 3.8 L13.6 55.6 C13.6 58.1 12.1 59.5 10 59.5 L7.2 59.5 C4.3 59.5 2.2 57.4 1.6 52 C1.2 46 1.1 39 1.1 32 C1.1 25 1.2 15 1.7 9.4 C2.1 4 3.4 0.9 6 0.9 Z',
  'M8 5.4 C15.2 8 22.2 10.9 28.7 14 C31.2 16.6 32 19.4 31.8 22.4 C31.5 27 28.2 31.6 23.6 31.6 L8 31.6 Z',
  'M42 63.1 L37 63.1 C35.3 63.1 34.4 62 34.4 60.2 L34.4 8.4 C34.4 5.9 35.9 4.5 38 4.5 L40.8 4.5 C43.7 4.5 45.8 6.6 46.4 12 C46.8 18 46.9 25 46.9 32 C46.9 39 46.8 49 46.3 54.6 C45.9 60 44.6 63.1 42 63.1 Z',
  'M40 58.6 C32.8 56 25.8 53.1 19.3 50 C16.8 47.4 16 44.6 16.2 41.6 C16.5 37 19.8 32.4 24.4 32.4 L40 32.4 Z',
] as const

/** The aperture: outer ring is cut away, the pupil is added back, then bitten. */
export const LOGO_APERTURE = {
  cx: 23.14,
  cy: 32,
  rOuter: 11.86,
  rPupil: 7.1,
  catchlight: { cx: 26.32, cy: 27.46, r: 3.55 },
} as const

/**
 * Brand gradient stops, light and dark.
 *
 * `--hl-accent-solid` / `--hl-accent-secondary` in the dark product theme, and
 * `--mkt-accent` on the marketing site, are the same terracotta; the second
 * stop is the copper the design bible reserves as the marker colour. Literals
 * are used rather than `var()` because these tokens are declared on `.hl`
 * (globals.css) and so do not resolve on the marketing scope or inside the
 * favicon, where the mark still has to paint.
 */
export const LOGO_GRADIENT = {
  light: { from: '#B85C38', to: '#C48B71' },
  dark: { from: '#C86D49', to: '#D8AC98' },
} as const

export interface LogoMarkProps {
  className?: string
  tone?: LogoTone
  /**
   * Accessible name. Omit it — the default — whenever the mark sits beside the
   * wordmark or inside an already-labelled link, which is nearly always;
   * otherwise a screen reader announces the brand twice.
   */
  title?: string
}

/**
 * A stable id rather than `useId`.
 *
 * `useId` would force this into a client component for the sake of a string,
 * and every instance renders an identical `<defs>`, so a repeated id resolves
 * to an identical paint. The cost of the duplicate is nil; the cost of making
 * the brand mark client-only is a needless hydration boundary on every page.
 */
const MASK_ID = 'hl-logo-mask'
const GRAD_ID = 'hl-logo-grad'

export function LogoMark({ className, tone = 'brand', title }: LogoMarkProps) {
  const { w, h } = LOGO_VIEWBOX
  const a = LOGO_APERTURE
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-[1em] w-[0.75em] shrink-0', className)}
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {tone === 'brand' ? (
          <linearGradient id={GRAD_ID} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={LOGO_GRADIENT.light.from} />
            <stop offset="1" stopColor={LOGO_GRADIENT.light.to} />
          </linearGradient>
        ) : null}
        <mask id={MASK_ID}>
          {LOGO_BODY_PATHS.map((d) => (
            <path key={d} fill="#fff" d={d} />
          ))}
          <circle fill="#000" cx={a.cx} cy={a.cy} r={a.rOuter} />
          <circle fill="#fff" cx={a.cx} cy={a.cy} r={a.rPupil} />
          <circle
            fill="#000"
            cx={a.catchlight.cx}
            cy={a.catchlight.cy}
            r={a.catchlight.r}
          />
        </mask>
      </defs>
      <rect
        width={w}
        height={h}
        fill={tone === 'brand' ? `url(#${GRAD_ID})` : 'currentColor'}
        mask={`url(#${MASK_ID})`}
      />
    </svg>
  )
}

export interface LogoProps extends LogoMarkProps {
  /** `full` is mark + wordmark; `mark` is the symbol alone. */
  variant?: 'full' | 'mark'
  /** Applied to the wordmark only, so each surface keeps its own type scale. */
  wordmarkClassName?: string
}

/**
 * Mark plus wordmark.
 *
 * The wordmark is real text, not outlined paths: it inherits the surface's own
 * font and colour, stays selectable and translatable, adds no bytes, and
 * cannot drift out of sync with the type system the way a flattened SVG would.
 */
export function Logo({
  variant = 'full',
  tone = 'brand',
  className,
  wordmarkClassName,
  title,
}: LogoProps) {
  if (variant === 'mark') {
    return <LogoMark className={className} tone={tone} title={title} />
  }

  return (
    <span className={cn('inline-flex items-center gap-[0.34em]', className)}>
      <LogoMark tone={tone} title={title} />
      <span className={wordmarkClassName}>HireLens</span>
    </span>
  )
}
