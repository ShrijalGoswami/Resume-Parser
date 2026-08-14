'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react'

/**
 * GSAP scroll reveals for the marketing page.
 *
 * THE SAFETY CONTRACT (inherited from components/marketing/motion.tsx, and
 * non-negotiable): a reveal may only ever DELAY content, never withhold it.
 *
 * On 28 Jul 2026 the entire marketing page rendered blank because Chrome does
 * not deliver IntersectionObserver callbacks to a document whose
 * visibilityState is `hidden` — a page opened in a background tab never got a
 * single callback, and every element sat at opacity 0 forever. ScrollTrigger
 * is exposed to the same class of failure, so three rules apply here:
 *
 *   1. Nothing is hidden in CSS. The resting state in the stylesheet is
 *      VISIBLE, so a page where this bundle fails to load, fails to parse, or
 *      throws is a page that simply does not animate.
 *   2. The hidden state is set by GSAP, in the same context that animates it
 *      out — so it cannot outlive the code that clears it.
 *   3. A failsafe timer force-completes any tween that has not started by
 *      REVEAL_FAILSAFE_MS, whatever the reason.
 *
 * Under `prefers-reduced-motion: reduce` no hidden state is set at all — the
 * content is simply there, which is both the accessible behaviour and the
 * safest one.
 *
 * NOTE ON <MaskReveal>: SplitText rewrites the DOM inside its target. Use it
 * on static copy only. If React re-renders the children the split markup and
 * the virtual DOM will disagree.
 */

const REVEAL_FAILSAFE_MS = 1500

/** Registration is idempotent, but it must not run during SSR. */
let registered = false
function ensurePlugins() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger, SplitText)
  registered = true
}

/** Shared trigger config: fire once, just after the element clears the fold. */
const TRIGGER = {
  start: 'top 88%',
  once: true,
}

/**
 * Arms the failsafe for a timeline and returns the cleanup.
 *
 * Deliberately a plain `setTimeout` rather than `requestAnimationFrame`: rAF
 * does not run in a hidden document, which is precisely the condition this
 * exists to survive. An rAF-based failsafe would be dead code in the only case
 * that needs it.
 */
function armFailsafe(tl: gsap.core.Timeline) {
  const id = window.setTimeout(() => {
    if (tl.progress() === 0 && !tl.isActive()) tl.progress(1)
  }, REVEAL_FAILSAFE_MS)
  return () => window.clearTimeout(id)
}

/* ------------------------------------------------------------------ */
/* MaskReveal — headings rise line by line out of a mask               */
/* ------------------------------------------------------------------ */

type MaskRevealProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Seconds before the first line moves. */
  delay?: number
  /** Seconds between consecutive lines. */
  stagger?: number
  /** Animate on scroll (default), or immediately on mount for above-the-fold. */
  trigger?: 'scroll' | 'mount'
}

export function MaskReveal({
  children,
  as = 'div',
  className = '',
  delay = 0,
  stagger = 0.09,
  trigger = 'scroll',
}: MaskRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  // `as` is a caller-chosen tag (h1 / h2 / ol / section). Narrowing it to a
  // single concrete element keeps `ref` and `className` assignable without
  // threading a generic through every call site — same approach as motion.tsx.
  const Tag = as as 'div'

  useLayoutEffect(() => {
    ensurePlugins()
    const el = ref.current
    if (!el) return

    let disarm: (() => void) | undefined

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia()

      // Reduced motion gets no branch at all: with nothing registered, the
      // element keeps its natural, visible CSS state.
      media.add('(prefers-reduced-motion: no-preference)', () => {
        // `mask: 'lines'` wraps each line in an overflow-hidden element, which
        // is what makes this a mask reveal rather than a fade — the line is
        // clipped by its own box as it travels, so it appears to rise out of
        // the baseline instead of materialising in place.
        //
        // `autoSplit` re-splits when the line boxes actually change (font
        // load, resize, zoom). Without it, a heading split at one width keeps
        // masks sized for the old line boxes, and a later reflow leaves text
        // clipped — which on a masked reveal means permanently invisible
        // words, the exact failure this file exists to prevent.
        const split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          // The animation is built inside onSplit and RETURNED, so GSAP
          // reverts it before each re-split instead of stacking a new
          // timeline (and a new ScrollTrigger) on every resize.
          onSplit: (self) => {
            const tl = gsap.timeline({
              delay,
              scrollTrigger:
                trigger === 'scroll' ? { trigger: el, ...TRIGGER } : undefined,
            })

            tl.from(self.lines, {
              yPercent: 118,
              duration: 0.95,
              stagger,
              // Strongly front-loaded: the line commits immediately and
              // settles quietly, which is the difference between "premium"
              // and "slow".
              ease: 'expo.out',
            })

            disarm?.()
            disarm = armFailsafe(tl)
            return tl
          },
        })

        return () => {
          disarm?.()
          // Without this the DOM keeps SplitText's injected wrappers and React
          // and the document disagree about the tree.
          split.revert()
        }
      })
    }, ref)

    return () => {
      disarm?.()
      ctx.revert()
    }
  }, [delay, stagger, trigger])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/* BlurReveal — soft blur-to-focus fade                                */
/* ------------------------------------------------------------------ */

type BlurRevealProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  /** Starting blur radius in px. Above ~14 it reads as a glitch, not a focus. */
  blur?: number
  /** Starting offset in px. */
  y?: number
  trigger?: 'scroll' | 'mount'
}

export function BlurReveal({
  children,
  as = 'div',
  className = '',
  delay = 0,
  blur = 9,
  y = 16,
  trigger = 'scroll',
}: BlurRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  // `as` is a caller-chosen tag (h1 / h2 / ol / section). Narrowing it to a
  // single concrete element keeps `ref` and `className` assignable without
  // threading a generic through every call site — same approach as motion.tsx.
  const Tag = as as 'div'

  useLayoutEffect(() => {
    ensurePlugins()
    const el = ref.current
    if (!el) return

    let disarm: (() => void) | undefined

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          delay,
          scrollTrigger: trigger === 'scroll' ? { trigger: el, ...TRIGGER } : undefined,
        })

        tl.from(el, {
          autoAlpha: 0,
          y,
          filter: `blur(${blur}px)`,
          duration: 0.9,
          ease: 'power3.out',
          // `filter` is not compositor-accelerated the way transform/opacity
          // are, so it is promoted for the duration and dropped afterwards —
          // leaving `will-change` on permanently costs memory per element.
          onStart: () => {
            el.style.willChange = 'filter, transform, opacity'
          },
          onComplete: () => {
            el.style.willChange = ''
            // Chrome keeps a compositing layer while any filter is set, even
            // a zero-radius one. Clearing it returns the element to normal
            // paint and restores subpixel text antialiasing.
            el.style.filter = ''
          },
        })

        disarm = armFailsafe(tl)
        return () => disarm?.()
      })
    }, ref)

    return () => {
      disarm?.()
      ctx.revert()
    }
  }, [delay, blur, y, trigger])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/* StaggerGroup — cards float up into place, in sequence               */
/* ------------------------------------------------------------------ */

type StaggerGroupProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Seconds between items. 0.06–0.1 reads as deliberate; past ~0.15 it drags. */
  stagger?: number
  delay?: number
  /** CSS selector for the items to animate, relative to this group. */
  itemSelector?: string
  trigger?: 'scroll' | 'mount'
}

/**
 * Staggered entry for card grids and UI mockups.
 *
 * Items are selected from the DOM rather than cloned with injected props, so
 * this wraps existing markup without changing it — the children do not need to
 * know they are being animated. Mark them with `data-stagger-item`, or pass a
 * selector.
 */
export function StaggerGroup({
  children,
  as = 'div',
  className = '',
  stagger = 0.075,
  delay = 0,
  itemSelector = '[data-stagger-item]',
  trigger = 'scroll',
}: StaggerGroupProps) {
  const ref = useRef<HTMLDivElement>(null)
  // `as` is a caller-chosen tag (h1 / h2 / ol / section). Narrowing it to a
  // single concrete element keeps `ref` and `className` assignable without
  // threading a generic through every call site — same approach as motion.tsx.
  const Tag = as as 'div'

  useLayoutEffect(() => {
    ensurePlugins()
    const el = ref.current
    if (!el) return

    let disarm: (() => void) | undefined

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(itemSelector, el)
      if (items.length === 0) return

      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          delay,
          scrollTrigger: trigger === 'scroll' ? { trigger: el, ...TRIGGER } : undefined,
        })

        tl.from(items, {
          autoAlpha: 0,
          y: 26,
          scale: 0.985,
          duration: 0.8,
          stagger,
          // A real spring rather than an eased curve. Overshoot is kept under
          // 2% — enough that the card feels like it has mass and settles,
          // nowhere near enough to bounce.
          ease: 'back.out(1.35)',
        })

        disarm = armFailsafe(tl)
        return () => disarm?.()
      })
    }, ref)

    return () => {
      disarm?.()
      ctx.revert()
    }
  }, [stagger, delay, itemSelector, trigger])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
