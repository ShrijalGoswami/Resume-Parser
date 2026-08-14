'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A silent, looping product demonstration.
 *
 * Presented as product, not as media: no controls, no chrome, no fake browser
 * or macOS window, no spinner, and no continuous motion of its own. The only
 * thing moving is the recording.
 *
 * WHY AUTOPLAY IS DRIVEN BY JS RATHER THAN THE `autoplay` ATTRIBUTE
 *
 * `prefers-reduced-motion` cannot stop an autoplaying video from CSS, so the
 * preference has to be read in JavaScript either way. The obvious shape —
 * render an <img> for reduced motion and a <video autoplay> otherwise — means
 * the server cannot know which to emit, so the first paint is either empty or
 * wrong and then swaps.
 *
 * Instead the <video> is always rendered, always with its `poster`, and never
 * with `autoplay`. The server emits the poster frame, so the first frame is on
 * screen in the first paint with no spinner and no swap; JavaScript then
 * decides whether to start it. If scripting fails, the visitor is left looking
 * at the first frame of the demo, which is the correct degraded state.
 *
 * PLAYBACK IS TIED TO VISIBILITY. A looping video decodes forever otherwise —
 * on a laptop that is a fan spinning up for a section nobody is looking at.
 */

type ProductVideoProps = {
  /** Optimised H.264. Required — the universal fallback. */
  src: string
  /** VP9/WebM, offered first when present. Typically ~40% smaller. */
  webm?: string
  /** First frame. Carries the first paint, so it must match frame 0 exactly. */
  poster: string
  /** Intrinsic size. Reserves the box so the video cannot shift the layout. */
  width: number
  height: number
  /** What the demo shows, for anyone who cannot see it. */
  label: string
  /**
   * True for above-the-fold video: fetched eagerly and started as soon as it
   * can play. False (the default) defers the download until the element is
   * near the viewport — below-the-fold demos should cost nothing on load.
   */
  priority?: boolean
  /**
   * `intrinsic` sizes the box from width/height (a card, a figure).
   * `cover` fills its positioned parent and crops — for full-bleed backgrounds,
   * where the parent's box is the viewport and the framing is whatever fits.
   */
  fit?: 'intrinsic' | 'cover'
  className?: string
}

/** How early a non-priority video starts downloading, ahead of the viewport. */
const LAZY_MARGIN = '200px'

/** Fraction visible before playback starts. Low: a demo half in view is still
 *  being watched, and waiting for more reads as a stall. */
const PLAY_THRESHOLD = 0.15

export function ProductVideo({
  src,
  webm,
  poster,
  width,
  height,
  label,
  priority = false,
  fit = 'intrinsic',
  className = '',
}: ProductVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)

  // Priority video carries its sources in the server-rendered HTML so the
  // download starts with the document. Lazy video gets them once it is near.
  const [sourcesLive, setSourcesLive] = useState(priority)

  // --- lazy: attach sources when the element approaches the viewport --------
  useEffect(() => {
    if (sourcesLive) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSourcesLive(true) // No observer? Just load it. Never withhold content.
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSourcesLive(true)
          observer.disconnect()
        }
      },
      { rootMargin: LAZY_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [sourcesLive])

  // --- play while visible, pause while not ---------------------------------
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Tracked separately so a visibility change cannot start a video that
    // reduced motion has ruled out, and vice versa.
    let onScreen = false

    const sync = () => {
      // Reduced motion: never play. The poster stays on screen, which is the
      // whole demo's first frame rather than a placeholder.
      if (motionQuery.matches) {
        el.pause()
        return
      }
      if (onScreen && document.visibilityState === 'visible') {
        // play() rejects when the browser declines autoplay (a policy this
        // muted + playsInline video should satisfy, but not universally).
        // Swallow it: the poster remains, which is a fine still.
        void el.play().catch(() => {})
      } else {
        el.pause()
      }
    }

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              onScreen = entry.isIntersecting
              sync()
            },
            { threshold: PLAY_THRESHOLD },
          )
        : null

    if (observer) {
      observer.observe(el)
    } else {
      // Without an observer, assume on screen rather than never playing.
      onScreen = true
      sync()
    }

    document.addEventListener('visibilitychange', sync)
    motionQuery.addEventListener('change', sync)
    // `canplay` covers the case where the element became visible before it had
    // enough data to start.
    el.addEventListener('canplay', sync)

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      motionQuery.removeEventListener('change', sync)
      el.removeEventListener('canplay', sync)
    }
  }, [sourcesLive])

  return (
    <video
      ref={ref}
      poster={poster}
      width={width}
      height={height}
      // `aspect-ratio` from the intrinsic size, so the box is reserved before
      // any bytes arrive and the video can never shift the layout (CLS). A
      // cover video is absolutely positioned inside a box that already has a
      // size, so it needs no reservation.
      style={fit === 'intrinsic' ? { aspectRatio: `${width} / ${height}` } : undefined}
      className={`block ${
        fit === 'cover' ? 'h-full w-full object-cover' : 'h-auto w-full'
      } ${className}`.trim()}
      // No `autoplay`: see the note at the top of this file.
      muted
      loop
      playsInline
      // `preload="none"` on lazy video is what actually makes it lazy —
      // without it the browser may fetch metadata (or more) regardless.
      preload={priority ? 'auto' : 'none'}
      disablePictureInPicture
      aria-label={label}
      // Silent, decorative-adjacent media with no controls: keep it out of the
      // tab order so keyboard users are not stopped on an inert element.
      tabIndex={-1}
    >
      {sourcesLive && webm ? <source src={webm} type="video/webm" /> : null}
      {sourcesLive ? <source src={src} type="video/mp4" /> : null}
    </video>
  )
}
