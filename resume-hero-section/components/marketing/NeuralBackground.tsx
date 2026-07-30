'use client'

import * as React from 'react'

/**
 * NeuralBackground — ONE continuous, continuously-animating knowledge-graph
 * field spanning the whole marketing page. Mounted once, in the marketing
 * layout.
 *
 * WHY IT SITS ON TOP RATHER THAN BEHIND
 * Every marketing section paints an opaque background (`bg-mkt-canvas`,
 * `bg-mkt-dark-bg`, `bg-mkt-ink`, `bg-mkt-inverse-surface`). A layer placed
 * behind the page would be covered by all of them. So the field is a fixed,
 * viewport-sized overlay painting above section backgrounds and below the nav,
 * rendered twice in exact register with opposite blend modes:
 *
 *   · `multiply` — darkens. Shows on light sections, a no-op on near-black.
 *   · `screen`   — lightens. Shows on dark sections, a no-op on white.
 *
 * A section boundary is therefore just a cross-fade between the two copies:
 * no seam, no restart, one canvas under the entire page.
 *
 * WHY THE MOTION IS DRIVEN BY rAF AND NOT CSS
 * Each node drifts independently around its own origin, and every connection
 * has to track the two nodes it joins. CSS cannot express that: transforming a
 * <circle> moves the circle but leaves the <line> endpoints where they were, so
 * edges visibly detach. The previous revision worked around this by drifting
 * whole clusters as rigid units — geometrically correct, but nothing moved
 * relative to anything else, which is precisely why the field read as frozen.
 *
 * So one rAF loop computes every position from summed sine waves and writes
 * SVG geometry directly. It never touches React state (no re-render), and it
 * allocates nothing per frame — all per-node parameters live in preallocated
 * Float32Arrays and all element handles in preallocated arrays.
 *
 * The second blended copy is a single <use> referencing the first graph, so the
 * loop updates ONE set of elements and both copies follow. That halves the
 * per-frame attribute writes (~620 instead of ~1240).
 *
 * OTHER NOTES
 * · Determinism — layout comes from a seeded PRNG so server and client render
 *   identical markup. `Math.random()` at build time would be a hydration
 *   mismatch. (The travelling spark picks its edge at runtime, after mount,
 *   where randomness is safe.)
 * · Reduced motion — the loop is never started, and the field renders complete
 *   but perfectly still at its base positions.
 * · Pointer and scroll ADD to the autonomous motion: they translate the whole
 *   layer via CSS custom properties, independently of per-node drift, so the
 *   network keeps living when the mouse stops.
 * · `pointer-events: none` throughout — the field covers the page and must
 *   never intercept a click.
 *
 * Styles live in `app/globals.css` under `.hl-neural`.
 */

export interface NeuralBackgroundProps {
  /** Node count for the graph. Rendered once, mirrored into the second copy. */
  nodeCount?: number
  /** Peak opacity of a connecting line. */
  lineOpacity?: number
  /** Peak opacity of a node. */
  nodeOpacity?: number
  /** Multiplies every drift/pulse rate. 1 = the tuned default. */
  animationSpeed?: number
  /** Accent colour. Defaults to the marketing accent token. */
  accentColor?: string
  /** Pointer parallax. Adds to the autonomous motion; never replaces it. */
  parallax?: boolean
  /** Maximum pointer displacement in px. */
  parallaxStrength?: number
  /** Vertical drift as a fraction of scroll offset. 0 disables. */
  scrollResponse?: number
  /**
   * How much the field calms across the middle of the screen, where the copy
   * lives. 1 = uniform. Varies presence, never leaves a hole.
   */
  centreCalm?: number
  /** Change to reshuffle the layout deterministically. */
  seed?: number
  className?: string
}

/* ---------------------------------------------------------------- geometry */

/** mulberry32 — small, fast, deterministic. Same output on server and client. */
function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* A 16:10 field. `slice` scaling covers any viewport aspect. */
const VIEW_W = 1600
const VIEW_H = 1000
const COLS = 6
const ROWS = 4

const TAU = Math.PI * 2

interface Built {
  n: number
  bx: Float32Array
  by: Float32Array
  /** Drift amplitude per axis, 4–12 units. */
  ax: Float32Array
  ay: Float32Array
  /** Angular frequency per axis (rad/s) — a 15–30s cycle. */
  fx: Float32Array
  fy: Float32Array
  px: Float32Array
  py: Float32Array
  br: Float32Array
  bo: Float32Array
  /** Pulse (size) — 4–8s. */
  pf: Float32Array
  pp: Float32Array
  /** Glow (opacity) — 8–12s. */
  gf: Float32Array
  gp: Float32Array
  key: Uint8Array
  m: number
  ea: Uint16Array
  eb: Uint16Array
  eo: Float32Array
  ef: Float32Array
  ep: Float32Array
  ew: Float32Array
}

function build(
  seed: number,
  nodeCount: number,
  lineOpacity: number,
  nodeOpacity: number,
  centreCalm: number,
): Built {
  const rng = makeRng(seed)
  const cells = COLS * ROWS
  const perCell = Math.max(3, Math.round(nodeCount / cells))
  const n = cells * perCell

  const bx = new Float32Array(n)
  const by = new Float32Array(n)
  const ax = new Float32Array(n)
  const ay = new Float32Array(n)
  const fx = new Float32Array(n)
  const fy = new Float32Array(n)
  const px = new Float32Array(n)
  const py = new Float32Array(n)
  const br = new Float32Array(n)
  const bo = new Float32Array(n)
  const pf = new Float32Array(n)
  const pp = new Float32Array(n)
  const gf = new Float32Array(n)
  const gp = new Float32Array(n)
  const key = new Uint8Array(n)

  const ea: number[] = []
  const eb: number[] = []
  const eo: number[] = []
  const ef: number[] = []
  const ep: number[] = []
  const ew: number[] = []

  let i = 0
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cellW = VIEW_W / COLS
      const cellH = VIEW_H / ROWS
      const cx = cellW * (col + 0.5) + (rng() - 0.5) * cellW * 0.7
      const cy = cellH * (row + 0.5) + (rng() - 0.5) * cellH * 0.7
      const spread = cellW * (0.2 + rng() * 0.26)
      const first = i

      // Calm the middle third, where the copy sits. Presence drops; density
      // does not, so there is still no empty region.
      const calm =
        centreCalm +
        (1 - centreCalm) * Math.min(1, (Math.abs(cx - VIEW_W / 2) / (VIEW_W / 2)) * 1.5)

      for (let k = 0; k < perCell; k++, i++) {
        // Two samples averaged ≈ a soft bell: dense core, sparse edges.
        bx[i] = cx + (rng() + rng() - 1) * spread
        by[i] = cy + (rng() + rng() - 1) * spread
        const isKey = rng() > 0.78
        key[i] = isKey ? 1 : 0
        br[i] = isKey ? 3.4 + rng() * 2.2 : 1.6 + rng() * 1.4
        bo[i] = (isKey ? nodeOpacity : nodeOpacity * 0.62) * calm

        // Per-node amplitude, rate and phase. Nothing shares all three, so no
        // two nodes ever travel together and the field has no visible period.
        ax[i] = 4 + rng() * 8
        ay[i] = 4 + rng() * 8
        fx[i] = TAU / (15 + rng() * 15)
        fy[i] = TAU / (15 + rng() * 15)
        px[i] = rng() * TAU
        py[i] = rng() * TAU
        pf[i] = TAU / (4 + rng() * 4)
        pp[i] = rng() * TAU
        gf[i] = TAU / (8 + rng() * 4)
        gp[i] = rng() * TAU
      }

      // Nearest-neighbour edges inside the cell. Endpoints are recomputed every
      // frame, so an edge can never detach however far its nodes drift.
      const seen = new Set<number>()
      for (let a = first; a < i; a++) {
        let best = -1
        let bestD = Infinity
        let second = -1
        let secondD = Infinity
        for (let b = first; b < i; b++) {
          if (b === a) continue
          const d = (bx[b] - bx[a]) ** 2 + (by[b] - by[a]) ** 2
          if (d < bestD) {
            secondD = bestD
            second = best
            bestD = d
            best = b
          } else if (d < secondD) {
            secondD = d
            second = b
          }
        }
        const take = rng() > 0.5 && second >= 0 ? [best, second] : [best]
        for (const b of take) {
          if (b < 0) continue
          const lo = Math.min(a, b)
          const hi = Math.max(a, b)
          const k = lo * 4096 + hi
          if (seen.has(k)) continue
          seen.add(k)
          const glow = rng() > 0.85
          ea.push(lo)
          eb.push(hi)
          eo.push(lineOpacity * (glow ? 1.8 : 1) * calm)
          ef.push(TAU / (9 + rng() * 9))
          ep.push(rng() * TAU)
          ew.push(glow ? 1.5 : 1)
        }
      }
    }
  }

  return {
    n,
    bx, by, ax, ay, fx, fy, px, py, br, bo, pf, pp, gf, gp, key,
    m: ea.length,
    ea: Uint16Array.from(ea),
    eb: Uint16Array.from(eb),
    eo: Float32Array.from(eo),
    ef: Float32Array.from(ef),
    ep: Float32Array.from(ep),
    ew: Float32Array.from(ew),
  }
}

/* ------------------------------------------------------------------ render */

export function NeuralBackground({
  nodeCount = 96,
  lineOpacity = 0.11,
  nodeOpacity = 0.3,
  animationSpeed = 1,
  accentColor = '#5b5bd6',
  parallax = true,
  parallaxStrength = 6,
  scrollResponse = 0.035,
  centreCalm = 0.55,
  seed = 7,
  className,
}: NeuralBackgroundProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const rawId = React.useId()
  const gid = `nb-graph-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  const d = React.useMemo(
    () => build(seed, nodeCount, lineOpacity, nodeOpacity, centreCalm),
    [seed, nodeCount, lineOpacity, nodeOpacity, centreCalm],
  )

  // Element handles, filled by callback refs. Preallocated once per build so
  // the animation loop never allocates.
  const circles = React.useRef<(SVGCircleElement | null)[]>([])
  const segs = React.useRef<(SVGLineElement | null)[]>([])
  const sparkRef = React.useRef<SVGCircleElement>(null)
  if (circles.current.length !== d.n) circles.current = new Array(d.n).fill(null)
  if (segs.current.length !== d.m) segs.current = new Array(d.m).fill(null)

  /* ---- the animation loop -------------------------------------------- */
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const posX = new Float32Array(d.n)
    const posY = new Float32Array(d.n)
    const cs = circles.current
    const ls = segs.current
    const spark = sparkRef.current
    const rate = Math.max(0.05, animationSpeed)

    let raf = 0
    let t0 = 0
    // Travelling glow state — one at a time, long gaps between.
    let sparkEdge = -1
    let sparkAt = 0
    let sparkNext = 6

    const frame = (now: number) => {
      if (!t0) t0 = now
      const t = ((now - t0) * 0.001) * rate

      for (let i = 0; i < d.n; i++) {
        const x = d.bx[i] + d.ax[i] * Math.sin(t * d.fx[i] + d.px[i])
        const y = d.by[i] + d.ay[i] * Math.sin(t * d.fy[i] + d.py[i])
        posX[i] = x
        posY[i] = y
        const c = cs[i]
        if (!c) continue
        c.setAttribute('cx', (Math.round(x * 10) / 10) as unknown as string)
        c.setAttribute('cy', (Math.round(y * 10) / 10) as unknown as string)
        // ±5% size. Any more and it reads as a blink rather than a pulse.
        const r = d.br[i] * (1 + 0.05 * Math.sin(t * d.pf[i] + d.pp[i]))
        c.setAttribute('r', (Math.round(r * 100) / 100) as unknown as string)
        // Glow never reaches zero — nodes fade, they never blink out.
        const o = d.bo[i] * (0.72 + 0.28 * Math.sin(t * d.gf[i] + d.gp[i]))
        c.setAttribute('opacity', (Math.round(o * 1000) / 1000) as unknown as string)
      }

      for (let j = 0; j < d.m; j++) {
        const l = ls[j]
        if (!l) continue
        const a = d.ea[j]
        const b = d.eb[j]
        l.setAttribute('x1', (Math.round(posX[a] * 10) / 10) as unknown as string)
        l.setAttribute('y1', (Math.round(posY[a] * 10) / 10) as unknown as string)
        l.setAttribute('x2', (Math.round(posX[b] * 10) / 10) as unknown as string)
        l.setAttribute('y2', (Math.round(posY[b] * 10) / 10) as unknown as string)
        const o = d.eo[j] * (0.4 + 0.6 * Math.sin(t * d.ef[j] + d.ep[j]) * 0.5 + 0.3)
        l.setAttribute('stroke-opacity', (Math.round(o * 1000) / 1000) as unknown as string)
      }

      // A single soft glow travelling one connection, then a long pause.
      if (spark) {
        if (sparkEdge < 0 && t >= sparkNext) {
          sparkEdge = (Math.random() * d.m) | 0
          sparkAt = t
        }
        if (sparkEdge >= 0) {
          const p = (t - sparkAt) / 2.4
          if (p >= 1) {
            sparkEdge = -1
            sparkNext = t + 7 + Math.random() * 13
            spark.setAttribute('opacity', '0')
          } else {
            const a = d.ea[sparkEdge]
            const b = d.eb[sparkEdge]
            const x = posX[a] + (posX[b] - posX[a]) * p
            const y = posY[a] + (posY[b] - posY[a]) * p
            spark.setAttribute('cx', (Math.round(x * 10) / 10) as unknown as string)
            spark.setAttribute('cy', (Math.round(y * 10) / 10) as unknown as string)
            // Ease in and out so it never appears or vanishes abruptly.
            const o = Math.sin(p * Math.PI) * 0.55
            spark.setAttribute('opacity', (Math.round(o * 1000) / 1000) as unknown as string)
          }
        }
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [d, animationSpeed])

  /* ---- pointer + scroll, layered ON TOP of the autonomous motion ------ */
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let mx = 0
    let my = 0
    let sy = 0
    const flush = () => {
      frame = 0
      root.style.setProperty('--nb-mx', `${mx.toFixed(2)}px`)
      root.style.setProperty('--nb-my', `${my.toFixed(2)}px`)
      root.style.setProperty('--nb-scroll', `${sy.toFixed(2)}px`)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(flush)
    }
    const onMove = (e: PointerEvent) => {
      mx = ((e.clientX / window.innerWidth) * 2 - 1) * parallaxStrength
      my = ((e.clientY / window.innerHeight) * 2 - 1) * parallaxStrength
      schedule()
    }
    const onScroll = () => {
      sy = -window.scrollY * scrollResponse
      schedule()
    }

    if (parallax) window.addEventListener('pointermove', onMove, { passive: true })
    if (scrollResponse) {
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
    }
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [parallax, parallaxStrength, scrollResponse])

  /* ---- markup ---------------------------------------------------------- */
  // The graph is authored ONCE inside <defs>; both blended copies are <use>
  // references to it, so the loop updates one set of elements and both follow.
  const graph = (
    <g id={gid}>
      {Array.from({ length: d.m }, (_, j) => (
        <line
          key={j}
          ref={(el) => {
            segs.current[j] = el
          }}
          className="hl-neural__line"
          x1={d.bx[d.ea[j]]}
          y1={d.by[d.ea[j]]}
          x2={d.bx[d.eb[j]]}
          y2={d.by[d.eb[j]]}
          strokeWidth={d.ew[j]}
          strokeOpacity={d.eo[j]}
        />
      ))}
      {Array.from({ length: d.n }, (_, i) => (
        <circle
          key={i}
          ref={(el) => {
            circles.current[i] = el
          }}
          className="hl-neural__node"
          cx={d.bx[i]}
          cy={d.by[i]}
          r={d.br[i]}
          opacity={d.bo[i]}
          // Inline rather than via a class: inline styles are cloned into the
          // <use> shadow tree, class-based rules are less reliably applied there.
          style={d.key[i] ? { filter: 'drop-shadow(0 0 3px currentColor)' } : undefined}
        />
      ))}
      <circle
        ref={sparkRef}
        className="hl-neural__spark"
        r={2.6}
        cx={-50}
        cy={-50}
        opacity={0}
        style={{ filter: 'drop-shadow(0 0 5px currentColor)' }}
      />
    </g>
  )

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`hl-neural${className ? ` ${className}` : ''}`}
      style={{ color: accentColor } as React.CSSProperties}
    >
      <div className="hl-neural__layer">
        {/* Visible on light sections, a no-op on near-black. */}
        <svg
          className="hl-neural__svg hl-neural__svg--multiply"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
          aria-hidden="true"
        >
          <defs>{graph}</defs>
          <use href={`#${gid}`} />
        </svg>
        {/* Visible on dark sections, a no-op on white. Same elements, mirrored. */}
        <svg
          className="hl-neural__svg hl-neural__svg--screen"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
          aria-hidden="true"
        >
          <use href={`#${gid}`} />
        </svg>
      </div>
    </div>
  )
}

export default NeuralBackground
