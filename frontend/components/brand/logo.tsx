import { cn } from '@/lib/utils'

/**
 * The HireLens logo — the single source of truth for the brand mark.
 *
 * THE MARK: "Aperture". A disc carrying a triangular aperture, cut into three
 * blades by kerfs that are rotated 18° against the aperture's own vertices.
 * That rotation is the whole design: aligned, the three blades read as a pie
 * chart; offset, they read as an iris closing on a subject. A lens is an
 * aperture, and the triangle it opens onto is a prism — which is the shape the
 * design system already uses for AI (`--hl-prism-*`, Design Bible §3.3). One
 * undifferentiated input enters; an ordered spectrum leaves. That is the
 * product, not a decoration of it.
 *
 * The three blades are exactly congruent under 120° rotation — the geometry
 * was computed rather than drawn, so the mark stays true at any scale.
 *
 * WHY THE MARK SCALES IN `em`, NOT `px`. The wordmark is set in three
 * different type scales across the app (32px marketing display, `hl-body-lg`
 * on auth, whatever a future surface uses). Sizing the mark in `em` means it
 * tracks whatever type it sits beside without any caller doing arithmetic, and
 * a surface that changes its type size cannot leave the mark behind. `0.9em`
 * rather than `1em` because the glyph is a full circle while the wordmark's
 * cap height is roughly 0.7em — matched at 1em the mark visually overpowers
 * the word it belongs to.
 *
 * TONE. `prism` reads the live design-system tokens, so the mark re-hues with
 * the product's light and dark themes for free. The hex fallbacks are not
 * decoration: `--hl-prism-*` are declared on `.hl` (globals.css) and are
 * therefore ABSENT on the marketing scope and anywhere else outside the
 * product shell, where the fallback is the only colour the mark would get.
 * `mono` collapses to `currentColor` with three opacity steps, which keeps the
 * blade structure legible in one ink — that is the correct tone on the
 * marketing site, whose palette is deliberately monochromatic terracotta.
 */
type LogoTone = 'prism' | 'mono'

/**
 * Blade path data on a 32×32 grid. Computed geometry — do not hand-edit; see
 * the note above.
 *
 * Exported because the Open Graph card cannot use this component: it renders
 * through Satori, which resolves neither Tailwind classes nor CSS custom
 * properties. It draws its own `<svg>` from these same paths, so the mark still
 * has exactly one definition.
 */
export const LOGO_BLADE_PATHS = [
  'M17.36 3.07A13 13 0 0 1 27.88 21.29L22.35 16.74L14.61 9.77Z',
  'M4.12 21.29A13 13 0 0 1 14.64 3.07L13.46 10.14L11.3 20.33Z',
  'M26.52 23.64A13 13 0 0 1 5.48 23.64L12.19 21.13L22.1 17.91Z',
] as const

/** Prism stops, with the fallbacks the marketing scope actually resolves to. */
const PRISM_FILL = [
  'var(--hl-prism-from, #6D5EF8)',
  'var(--hl-prism-mid, #4F7CFF)',
  'var(--hl-prism-to, #66D9FF)',
] as const

/** Opacity ramp for `mono`, so three blades stay readable in a single ink. */
const MONO_OPACITY = [1, 0.72, 0.5] as const

export interface LogoMarkProps {
  className?: string
  tone?: LogoTone
  /**
   * Accessible name. Omit it — the default — when the mark sits beside the
   * wordmark or inside an already-labelled link, which is almost always. A
   * decorative mark next to the word "HireLens" would otherwise make a screen
   * reader announce the brand twice.
   */
  title?: string
}

export function LogoMark({ className, tone = 'prism', title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-[0.9em] shrink-0', className)}
      // `focusable="false"` is for IE/Edge legacy, which put SVGs in the tab
      // order; harmless everywhere else and cheaper than finding out.
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {LOGO_BLADE_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill={tone === 'prism' ? PRISM_FILL[i] : 'currentColor'}
          opacity={tone === 'mono' ? MONO_OPACITY[i] : undefined}
        />
      ))}
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
 * The wordmark is real text rather than outlined paths, deliberately: it
 * inherits the surface's own font and colour, stays selectable and
 * translatable, costs no extra bytes, and cannot drift out of sync with the
 * type system the way a flattened SVG would. The gap is in `em` for the same
 * reason the mark is.
 */
export function Logo({
  variant = 'full',
  tone = 'prism',
  className,
  wordmarkClassName,
  title,
}: LogoProps) {
  if (variant === 'mark') {
    return <LogoMark className={className} tone={tone} title={title} />
  }

  return (
    <span className={cn('inline-flex items-center gap-[0.32em]', className)}>
      <LogoMark tone={tone} title={title} />
      <span className={wordmarkClassName}>HireLens</span>
    </span>
  )
}
