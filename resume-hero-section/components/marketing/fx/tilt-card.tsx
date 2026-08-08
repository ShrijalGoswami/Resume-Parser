'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Pointer-reactive wrapper for UI cards: a subtle physical tilt, plus a
 * terracotta glow that tracks the cursor around the card's border.
 *
 *   <TiltCard><HeroDecisionCard /></TiltCard>
 *
 * Fully self-contained — the mask and gradient live in inline styles rather
 * than globals.css, so this drops into any layout without a stylesheet edit.
 *
 * DESIGN NOTES
 *
 * The glow is on the BORDER, not behind the card. A drop glow under a card is
 * the bloom effect this design system removed (`--hl-shadow-glow: none`); a
 * 1px rim that brightens where the cursor is reads as the edge catching light,
 * which is a material property rather than an emission.
 *
 * MAX_TILT is 5°, not the 12–15° these effects usually ship with. This card
 * contains a name, two scores and two lines of evidence that a reader is meant
 * to actually read. Past about 6° the perspective divide makes the far edge's
 * text visibly narrower than the near edge's, and the card stops being
 * legible product and starts being a prop.
 *
 * TURNED OFF FOR: `prefers-reduced-motion: reduce`, and any pointer that is
 * not fine. On touch there is no hover state to express, and a tilt driven by
 * touchmove fights the scroll.
 */

/** Maximum rotation at the corners, in degrees. */
const MAX_TILT = 5
/** Perspective distance. Larger = flatter, less distortion of the type. */
const PERSPECTIVE = 1100
/** Radius of the border glow, in px. */
const GLOW_RADIUS = 220

/**
 * Exponential smoothing toward the pointer, per frame at 60fps.
 * Low enough that a flick across the card arrives as a glide, high enough that
 * the card never feels like it is lagging behind the cursor.
 */
const SMOOTHING = 0.12

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** Scale applied on hover. 1 disables it. */
  hoverScale?: number
  /** Must match the child's radius, or the glow rim will not sit on the edge. */
  radius?: string
}

export function TiltCard({
  children,
  className = '',
  hoverScale = 1.012,
  radius = '8px',
}: TiltCardProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  // The entire interaction — listeners, spring state and the rAF loop — lives
  // inside one effect. Everything it touches is DOM or effect-local, so there
  // is no React state to keep in step, and `tick` can reference itself for the
  // next frame without the forward-declaration dance that pulling it out into
  // a useCallback would require.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Fine pointers only, and never under reduced motion. On touch there is no
    // hover state to express, and a tilt driven by touchmove fights the scroll.
    if (
      !window.matchMedia('(pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    // Where the pointer is, and where the card currently is — both in
    // normalised -1…1 card space. `on` is hover strength, smoothed the same
    // way so the rim fades in rather than switching on.
    const target = { x: 0, y: 0, on: 0 }
    const current = { x: 0, y: 0, on: 0 }

    let frameId = 0
    let running = false

    function tick() {
      const inner = innerRef.current
      const glow = glowRef.current
      if (!inner || !glow) {
        running = false
        return
      }

      current.x += (target.x - current.x) * SMOOTHING
      current.y += (target.y - current.y) * SMOOTHING
      current.on += (target.on - current.on) * SMOOTHING

      const scale = 1 + (hoverScale - 1) * current.on
      inner.style.transform =
        `perspective(${PERSPECTIVE}px) ` +
        `rotateX(${(-current.y * MAX_TILT).toFixed(3)}deg) ` +
        `rotateY(${(current.x * MAX_TILT).toFixed(3)}deg) ` +
        `scale(${scale.toFixed(4)})`

      // The gradient centre is set in percentages of the card, so it stays
      // correct at any card size without re-reading the rect every frame.
      glow.style.setProperty('--tilt-gx', `${((current.x + 1) / 2) * 100}%`)
      glow.style.setProperty('--tilt-gy', `${((-current.y + 1) / 2) * 100}%`)
      glow.style.opacity = String(current.on)

      // Park the loop once the card has settled back to rest, rather than
      // running rAF forever on a page the visitor has scrolled past.
      const settled =
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001 &&
        Math.abs(target.on - current.on) < 0.001

      if (settled && target.on === 0) {
        running = false
        inner.style.willChange = ''
        return
      }
      frameId = requestAnimationFrame(tick)
    }

    function start() {
      if (running) return
      running = true
      if (innerRef.current) innerRef.current.style.willChange = 'transform'
      frameId = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      target.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      start()
    }

    const onEnter = () => {
      target.on = 1
      start()
    }

    const onLeave = () => {
      // Return to flat as well as unlit. Leaving the rotation where the cursor
      // exited leaves the card permanently crooked.
      target.on = 0
      target.x = 0
      target.y = 0
      start()
    }

    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)

    return () => {
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frameId)
      running = false
    }
  }, [hoverScale])

  return (
    <div ref={hostRef} className={className} style={{ borderRadius: radius }}>
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          borderRadius: radius,
          // No transition here: the rAF loop owns the transform, and a CSS
          // transition on top of a per-frame write would fight it and lag.
          transformStyle: 'preserve-3d',
        }}
      >
        {children}

        {/* The rim. `padding: 1px` plus an xor mask leaves only the 1px frame
            of the gradient painted, so the fill never washes over the card's
            content — this is a lit edge, not a backlight. */}
        <div
          ref={glowRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            padding: '1px',
            opacity: 0,
            pointerEvents: 'none',
            background: `radial-gradient(${GLOW_RADIUS}px circle at var(--tilt-gx, 50%) var(--tilt-gy, 50%), rgba(200, 109, 73, 0.85), rgba(184, 92, 56, 0.18) 45%, transparent 70%)`,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
          }}
        />
      </div>
    </div>
  )
}
