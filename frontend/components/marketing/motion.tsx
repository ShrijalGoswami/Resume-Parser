'use client'

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'

/**
 * Scroll-motion primitives for the marketing homepage.
 *
 * Deliberately dependency-free: the public site ships no animation library, so
 * these are a thin IntersectionObserver over the CSS classes declared in
 * `globals.css` (`.mkt-reveal` / `.is-visible`). That keeps the marketing
 * bundle at roughly the weight of the frames themselves while still letting
 * every section arrive rather than appear.
 *
 * Everything reveals once and stays revealed — a section that re-animates on
 * every scroll-back reads as a demo, not as a product.
 */

/** Shared observer options. The 12% margin means an element commits just after
 *  its top edge clears the fold, which is where the reveal reads as motivated
 *  rather than as a delayed paint. */
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.12,
  rootMargin: '0px 0px -8% 0px',
}

/**
 * If the observer has not reported anything by this deadline, the content is
 * revealed regardless. Long enough that a normal scroll-in still animates from
 * its resting state; short enough that a reader never sees a blank band.
 */
const REVEAL_FAILSAFE_MS = 1500

/**
 * Tracks whether the element has entered the viewport at least once.
 *
 * SAFETY CONTRACT: this hook may only ever *delay* content, never withhold it.
 * The reveal styles start at `opacity: 0`, so anything that stops this hook
 * from reporting leaves that content permanently invisible — which is exactly
 * what happened on 28 Jul 2026, when the whole marketing page rendered blank.
 *
 * The cause was that Chrome does not deliver IntersectionObserver callbacks to
 * a document whose `visibilityState` is `hidden` — not even the initial one.
 * A page opened in a background tab, restored from a backgrounded window, or
 * loaded while the window is occluded therefore never received a single
 * callback, and every `Reveal` on the page stayed at zero opacity forever.
 *
 * Four independent paths now guarantee the reveal happens. Any one of them is
 * sufficient; the observer is merely the one that makes it look intentional:
 *
 *   1. no IntersectionObserver at all      → reveal on the next frame
 *   2. document hidden at mount            → reveal immediately, no animation
 *      to miss, and re-arming on visibility is not something to gamble on
 *   3. the observer fires                  → the normal, animated path
 *   4. nothing has fired by the deadline   → reveal anyway
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let done = false
    const reveal = () => {
      if (done) return
      done = true
      setInView(true)
    }
    // Deferred by a timer rather than by requestAnimationFrame. rAF does not
    // run in a hidden document, which is precisely the condition these
    // fallbacks exist to survive — an rAF fallback here would be dead code in
    // the only case that needs it.
    const revealSoon = () => window.setTimeout(reveal, 0)

    // The backstop is armed FIRST, before any branch that might return early,
    // so that no code path below can leave the content with nothing to fall
    // back on. This ordering is the whole safety property; do not move it.
    const failsafe = window.setTimeout(reveal, REVEAL_FAILSAFE_MS)

    const cleanup = (extra?: number) => () => {
      window.clearTimeout(failsafe)
      if (extra) window.clearTimeout(extra)
    }

    // Cases the observer cannot serve: it does not exist, or the document is
    // hidden and Chrome will not deliver callbacks to it. Reveal outright —
    // there is no scroll animation to miss on a page nobody is looking at.
    const cannotObserve =
      typeof IntersectionObserver === 'undefined' ||
      (typeof document !== 'undefined' && document.visibilityState === 'hidden')

    if (cannotObserve) {
      return cleanup(revealSoon())
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        reveal()
        observer.disconnect()
      }
    }, OBSERVER_OPTIONS)
    observer.observe(node)

    return () => {
      window.clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [])

  return { ref, inView }
}

type RevealProps = {
  children: ReactNode
  /** Stagger offset in ms. Siblings pass 0 / 60 / 120 … to arrive in sequence. */
  delay?: number
  className?: string
  as?: ElementType
}

/**
 * Fades and lifts its children into place once scrolled into view.
 *
 * The delay is handed to CSS as a custom property rather than being applied
 * with a timer, so a staggered group stays in step even if the observer fires
 * for its members on different frames.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  // `as` is a caller-chosen tag (div / li / section / article). Widening it
  // here keeps the ref and style props assignable without threading a generic
  // through every call site.
  const Tag = as as 'div'

  return (
    <Tag
      ref={ref}
      className={`mkt-reveal ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{ '--mkt-reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}

type CounterProps = {
  /** Final value. Counting starts when the number scrolls into view. */
  to: number
  /** Rendered before/after the number (e.g. '%', '×', '−'). */
  prefix?: string
  suffix?: string
  /** Decimal places. Whole numbers by default. */
  decimals?: number
  durationMs?: number
  className?: string
}

/**
 * A number that counts up to its value on first view.
 *
 * Uses `tabular-nums` and reserves its final width via `ch` sizing so the
 * surrounding layout never reflows while the digits change — a counter that
 * nudges its neighbours is worse than no counter.
 *
 * Honours `prefers-reduced-motion` by rendering the final value outright.
 */
export function Counter({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1400,
  className = '',
}: CounterProps) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return

    // Reduced motion collapses the ramp to zero rather than skipping it: the
    // value still lands via the same frame callback, so nothing sets state
    // synchronously inside the effect body.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0 : durationMs

    // The ramp below is driven by requestAnimationFrame, which does not run
    // while the document is hidden — the counter would sit at 0 and read as
    // real data. Land on the true value instead; there is no animation worth
    // watching on a page nobody is looking at.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      const t = window.setTimeout(() => setValue(to), 0)
      return () => window.clearTimeout(t)
    }

    let frame = 0
    let start: number | null = null

    const tick = (now: number) => {
      start ??= now
      const t = duration > 0 ? Math.min((now - start) / duration, 1) : 1
      // Ease-out cubic: fast commitment, quiet landing.
      setValue(to * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
      else setValue(to)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, to, durationMs])

  const rendered = value.toFixed(decimals)

  return (
    <span
      ref={ref}
      className={`tabular-nums ${className}`.trim()}
      // Width of the final string, so the digits never shift their neighbours.
      style={{ minWidth: `${to.toFixed(decimals).length}ch`, display: 'inline-block' }}
    >
      {prefix}
      {rendered}
      {suffix}
    </span>
  )
}
