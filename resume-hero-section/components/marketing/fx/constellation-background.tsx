'use client'

import { Canvas } from '@react-three/fiber'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

/**
 * Interactive 3D constellation background.
 *
 * Drop it as the first child of any full-bleed dark section:
 *
 *   <section className="relative isolate overflow-hidden bg-mkt-dark-bg">
 *     <ConstellationBackground />
 *     <div className="relative z-10"> … </div>
 *   </section>
 *
 * SCOPED, NOT GLOBAL. It renders inside its section rather than as one fixed
 * overlay for the whole page. The marketing page alternates dark and light
 * bands; a fixed canvas is invisible behind every light band but still costs a
 * full GPU frame, so a page-wide mount pays for pixels nobody can see. Mount it
 * once per dark section instead.
 *
 * FOUR THINGS SWITCH IT OFF, and the section is designed to look finished
 * without it in every one of them:
 *   1. `prefers-reduced-motion: reduce`  — nothing mounts at all.
 *   2. no WebGL context                  — nothing mounts.
 *   3. section scrolled out of view      — frameloop parks.
 *   4. document hidden                   — frameloop parks.
 * (3) and (4) matter because a background animation is the one thing on a page
 * that will happily render forever in a tab nobody is looking at.
 */

// The scene pulls in three.js. Splitting it out keeps ~150KB off the initial
// marketing bundle and off the critical path for the headline, which is the
// thing the page is actually for. `ssr: false` because there is no canvas to
// render into on the server.
const ConstellationField = dynamic(
  () => import('./constellation-field').then((m) => m.ConstellationField),
  { ssr: false },
)

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

type Props = {
  /** 0–1. The field is meant to sit under content, so it defaults low. */
  intensity?: number
  className?: string
}

export function ConstellationBackground({
  intensity = 1,
  className = '',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })

  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(true)

  // --- capability + preference gate ---------------------------------------
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const evaluate = () => setEnabled(!motionQuery.matches && hasWebGL())
    evaluate()

    // Honour a mid-session change of the OS setting rather than only reading
    // it once at mount.
    motionQuery.addEventListener('change', evaluate)
    return () => motionQuery.removeEventListener('change', evaluate)
  }, [])

  // --- pointer tracking ----------------------------------------------------
  // Tracked on the window, not on the canvas: the canvas sits behind the
  // content with `pointer-events: none`, so it receives no events of its own.
  // Coordinates are normalised against the HOST rect rather than the viewport
  // so the parallax centre is the section, not the page.
  useEffect(() => {
    if (!enabled) return
    const host = hostRef.current
    if (!host) return

    // Fine pointers only. On touch there is no hover position to track, and
    // reading `touchmove` would make the field lurch on every scroll.
    if (!window.matchMedia('(pointer: fine)').matches) return

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    }

    // Passive: this listener must never be able to delay a scroll.
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  // --- render only while visible ------------------------------------------
  useEffect(() => {
    if (!enabled) return
    const host = hostRef.current
    if (!host) return

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(host)

    const onVisibility = () =>
      setActive(document.visibilityState === 'visible' && !document.hidden)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`.trim()}
      style={{ opacity: intensity }}
    >
      <Canvas
        // Camera sits back far enough that the -12 depth plane still reads as
        // separate from the -1 plane under a 45° field of view.
        camera={{ position: [0, 0, 9], fov: 45, near: 0.1, far: 40 }}
        // Capped at 1.5 rather than the device value. At 3× on a phone this
        // field is four times the fragment work for a difference nobody can
        // see on a soft-edged 2px dot.
        dpr={[1, 1.5]}
        frameloop={active ? 'always' : 'never'}
        // `alpha` lets the section's own background token show through, so the
        // ground colour has exactly one definition — the CSS one.
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <ConstellationField pointer={pointer} />
      </Canvas>
    </div>
  )
}
