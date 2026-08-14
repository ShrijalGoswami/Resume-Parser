'use client'

import type { CSSProperties } from 'react'

/**
 * Editorial backdrops — the landing page's visual background system.
 *
 * One component, eight environments. Every variant is built from the same
 * material vocabulary — ink, paper, glass, warm light — so the page reads as
 * one world rather than eight unrelated images. Everything is procedural
 * (gradients + inline SVG): no photography, no external assets, nothing that
 * can drift from the `--mkt-*` palette.
 *
 * Composition rules every variant obeys:
 *   - the central text-safe area stays quiet (detail layers are masked out of
 *     the middle with a radial mask);
 *   - visual interest lives at the edges;
 *   - opacity ceilings are low — the backdrop supports the interface, it
 *     never competes with it;
 *   - no readable text, no faces, no UI, no cool hues.
 *
 * Stacking: light sections set `relative isolate` and the backdrop paints at
 * `-z-10` — above the section's own background, below in-flow content. Dark
 * sections already layer overlays at z-0 under `z-10` content; there the
 * backdrop is just another overlay.
 *
 * The hero is deliberately absent from this file: its ambient film is
 * approved and untouched. These environments continue its atmosphere; they
 * do not replace it.
 */

export type BackdropVariant =
  | 'pile' /*     overhead sheets converging toward one clear focal area   */
  | 'paper' /*    warm ivory field with a faint copper bloom               */
  | 'desk' /*     end-of-day desk: lamp glow, long shadows, quiet fatigue  */
  | 'signal' /*   one warm beam finding a bright sliver in the dark        */
  | 'stages' /*   scattered → ordered → one focal mark, left to right      */
  | 'evidence' /* margin rules, annotation ticks, one highlighted passage  */
  | 'daylight' /* soft window light across a calm workspace                */
  | 'horizon' /*  charcoal with warm light on the horizon — the close      */

/* ------------------------------------------------------------------------ */
/* Shared material                                                           */
/* ------------------------------------------------------------------------ */

/** Film grain. A single tiled feTurbulence keeps every environment on the
 *  same "stock"; without it the gradient fields read as vector, not editorial. */
const GRAIN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`

/** Keeps detail out of the reading column: transparent middle, full strength
 *  at the edges. Applied to detail layers only, never to the tonal ground. */
const EDGE_MASK: CSSProperties = {
  maskImage:
    'radial-gradient(ellipse 52% 58% at 50% 46%, transparent 30%, black 78%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 52% 58% at 50% 46%, transparent 30%, black 78%)',
}

/** Deterministic pseudo-random — module-scope so SSR and client agree.
 *  Integer ops only: `Math.sin` differs in the last bits between Node and
 *  Chrome, which was enough to hydration-mismatch every generated <rect>. */
function seeded(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) >>> 0
  t = ((t ^ (t >>> 13)) * 1274126177) >>> 0
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296
}

function Grain({ dark }: { dark: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: GRAIN,
        opacity: dark ? 0.05 : 0.035,
        mixBlendMode: dark ? 'overlay' : 'multiply',
      }}
    />
  )
}

/* ------------------------------------------------------------------------ */
/* PILE — an overwhelming volume of paper, converging                        */
/* ------------------------------------------------------------------------ */

/** Sheets scatter loosely on the left and settle into near-alignment on the
 *  right — volume becoming order, read left to right like the page itself.
 *  56 outlines, no fills heavier than 4%, nothing readable. */
const PILE_SHEETS = Array.from({ length: 56 }, (_, i) => {
  const t = i / 55 // 0 = chaos edge, 1 = settled edge
  return {
    x: 2 + t * 88 + (seeded(i, 1) - 0.5) * 14 * (1 - t * 0.8),
    y: 6 + seeded(i, 2) * 82,
    rotate: (seeded(i, 3) - 0.5) * 26 * (1 - t * 0.85),
    w: 44 + seeded(i, 4) * 22,
    opacity: 0.16 + t * 0.3,
  }
})

function PileLayer() {
  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={EDGE_MASK}
      >
        {PILE_SHEETS.map((s, i) => (
          <rect
            key={i}
            x={(s.x / 100) * 1600}
            y={(s.y / 100) * 900}
            width={s.w}
            height={s.w * 1.35}
            rx={3}
            transform={`rotate(${s.rotate} ${(s.x / 100) * 1600} ${(s.y / 100) * 900})`}
            fill="var(--mkt-fg)"
            fillOpacity={0.018}
            stroke="var(--mkt-fg)"
            strokeOpacity={s.opacity * 0.28}
            strokeWidth={1}
          />
        ))}
      </svg>
      {/* Terracotta illumination where the pile resolves — the focal area. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(560px 420px at 88% 30%, rgba(184, 92, 56, 0.07), transparent 70%)',
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* SIGNAL — a beam finding the one sliver that matters                       */
/* ------------------------------------------------------------------------ */

/** The subdued majority: dim strokes in shadow, none of them lit. */
const SIGNAL_STROKES = Array.from({ length: 26 }, (_, i) => ({
  x: 4 + seeded(i, 5) * 92,
  y: 8 + seeded(i, 6) * 84,
  w: 60 + seeded(i, 7) * 90,
  rotate: (seeded(i, 8) - 0.5) * 10,
}))

function SignalLayer() {
  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={EDGE_MASK}
      >
        {SIGNAL_STROKES.map((s, i) => (
          <rect
            key={i}
            x={(s.x / 100) * 1600}
            y={(s.y / 100) * 900}
            width={s.w}
            height={2}
            transform={`rotate(${s.rotate} ${(s.x / 100) * 1600} ${(s.y / 100) * 900})`}
            fill="#ffffff"
            fillOpacity={0.05}
          />
        ))}
        {/* The sliver the beam lands on — the only bright thing here. */}
        <rect x={1245} y={608} width={96} height={3} fill="#C48B71" fillOpacity={0.85} />
        <rect x={1245} y={618} width={64} height={2} fill="#C48B71" fillOpacity={0.4} />
      </svg>
      {/* The beam: one narrow diagonal of warm light, blurred into haze. */}
      <div
        className="absolute"
        style={{
          left: '52%',
          top: '-30%',
          width: '18%',
          height: '160%',
          transform: 'rotate(24deg)',
          transformOrigin: 'top center',
          background:
            'linear-gradient(to bottom, rgba(196, 139, 113, 0.14), rgba(184, 92, 56, 0.05) 60%, transparent)',
          filter: 'blur(28px)',
        }}
      />
      {/* Where it lands, the floor warms faintly. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(420px 260px at 80% 70%, rgba(196, 139, 113, 0.10), transparent 70%)',
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* STAGES — scatter, order, decision                                         */
/* ------------------------------------------------------------------------ */

const STAGE_SCATTER = Array.from({ length: 20 }, (_, i) => ({
  x: 2 + seeded(i, 9) * 20,
  y: 10 + seeded(i, 10) * 80,
  r: 1.6 + seeded(i, 11) * 1.6,
}))

function StagesLayer() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={EDGE_MASK}
    >
      {/* Left edge: scatter. */}
      {STAGE_SCATTER.map((d, i) => (
        <circle
          key={i}
          cx={(d.x / 100) * 1600}
          cy={(d.y / 100) * 900}
          r={d.r}
          fill="var(--mkt-fg)"
          fillOpacity={0.14}
        />
      ))}
      {/* Right of center: the same marks, in rows. */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle
          key={`o${i}`}
          cx={1600 * 0.68 + (i % 3) * 26}
          cy={900 * 0.3 + Math.floor(i / 3) * 26}
          r={1.8}
          fill="var(--mkt-fg)"
          fillOpacity={0.18}
        />
      ))}
      {/* Far right: one mark, ringed — the decision. */}
      <circle cx={1600 * 0.93} cy={900 * 0.38} r={3} fill="#B85C38" fillOpacity={0.65} />
      <circle
        cx={1600 * 0.93}
        cy={900 * 0.38}
        r={11}
        fill="none"
        stroke="#B85C38"
        strokeOpacity={0.3}
        strokeWidth={1}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------------ */
/* EVIDENCE — the close-read: margin rules, ticks, one highlight             */
/* ------------------------------------------------------------------------ */

function EvidenceLayer() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={EDGE_MASK}
    >
      {/* A margin rule down each edge, like a proofed galley. */}
      <line x1={72} y1={80} x2={72} y2={820} stroke="#C48B71" strokeOpacity={0.22} strokeWidth={1} />
      <line x1={1528} y1={80} x2={1528} y2={820} stroke="var(--mkt-fg)" strokeOpacity={0.09} strokeWidth={1} />
      {/* Annotation ticks along the left margin. */}
      {[150, 260, 430, 610, 730].map((y, i) => (
        <line
          key={y}
          x1={58}
          y1={y}
          x2={86}
          y2={y}
          stroke={i === 2 ? '#B85C38' : 'var(--mkt-fg)'}
          strokeOpacity={i === 2 ? 0.4 : 0.14}
          strokeWidth={1}
        />
      ))}
      {/* Unreadable "set lines" in the right margin — texture of a document. */}
      {[210, 228, 246, 292, 310].map((y) => (
        <rect key={y} x={1400} y={y} width={116 - (y % 3) * 22} height={2} fill="var(--mkt-fg)" fillOpacity={0.08} />
      ))}
      {/* One passage marked as mattering: olive highlight under a set line. */}
      <rect x={1394} y={286} width={132} height={12} fill="#8FA678" fillOpacity={0.16} />
      {/* A corner bracket, bottom right — the mark of a reviewed page. */}
      <path d="M 1462 760 h 56 v 56" fill="none" stroke="#C48B71" strokeOpacity={0.3} strokeWidth={1} />
    </svg>
  )
}

/* ------------------------------------------------------------------------ */
/* Variant assembly                                                          */
/* ------------------------------------------------------------------------ */

const DARK_VARIANTS: ReadonlySet<BackdropVariant> = new Set(['desk', 'signal', 'horizon'])

/** Tonal grounds — the atmosphere each environment sits in. Detail layers go
 *  on top; the ground is allowed under text, the detail is not. */
const GROUNDS: Record<BackdropVariant, CSSProperties['background']> = {
  pile: [
    'radial-gradient(900px 600px at 8% 88%, rgba(26, 28, 31, 0.04), transparent 70%)',
    'linear-gradient(180deg, rgba(247, 239, 233, 0.55), rgba(250, 250, 249, 0) 45%)',
  ].join(', '),
  paper: [
    'radial-gradient(720px 480px at 90% 6%, rgba(196, 139, 113, 0.06), transparent 70%)',
    'linear-gradient(180deg, rgba(247, 239, 233, 0.5), rgba(250, 250, 249, 0) 55%)',
  ].join(', '),
  desk: [
    /* The lamp: one pool of warm light low in the frame, everything else
       falling off into the end of a long day. */
    'radial-gradient(640px 420px at 16% 82%, rgba(196, 139, 113, 0.13), transparent 68%)',
    'radial-gradient(900px 560px at 85% 10%, rgba(13, 16, 19, 0.85), transparent 75%)',
    'linear-gradient(180deg, #0D1013 0%, rgba(18, 20, 23, 0) 60%)',
  ].join(', '),
  signal: [
    'radial-gradient(1100px 700px at 20% 20%, rgba(13, 16, 19, 0.7), transparent 80%)',
    'linear-gradient(180deg, rgba(13, 16, 19, 0.55), rgba(18, 20, 23, 0) 50%)',
  ].join(', '),
  stages: [
    /* Radials, not a linear sweep: this section is width-capped, and a tint
       that runs to the container edge draws the container as a box. */
    'radial-gradient(640px 480px at 6% 50%, rgba(26, 28, 31, 0.03), transparent 70%)',
    'radial-gradient(560px 440px at 94% 42%, rgba(184, 92, 56, 0.045), transparent 70%)',
  ].join(', '),
  evidence: [
    'radial-gradient(680px 460px at 6% 10%, rgba(196, 139, 113, 0.05), transparent 70%)',
    'linear-gradient(180deg, rgba(245, 245, 243, 0.6), rgba(250, 250, 249, 0) 50%)',
  ].join(', '),
  daylight: [
    /* Morning through a tall window: one broad diagonal of warmth, and the
       faint shadow of a mullion crossing it. */
    'linear-gradient(112deg, rgba(247, 239, 233, 0.8) 0%, rgba(196, 139, 113, 0.07) 34%, rgba(250, 250, 249, 0) 62%)',
    'linear-gradient(112deg, transparent 40%, rgba(26, 28, 31, 0.028) 41%, rgba(26, 28, 31, 0.028) 43%, transparent 44%)',
    'radial-gradient(760px 520px at 94% 90%, rgba(143, 166, 120, 0.05), transparent 72%)',
  ].join(', '),
  horizon: [
    /* Full circle: the hero's weather, settled. Warm light along a low
       horizon line, haze above it, charcoal at the corners. */
    'radial-gradient(1100px 340px at 50% 102%, rgba(184, 92, 56, 0.18), transparent 72%)',
    'radial-gradient(1500px 500px at 50% 108%, rgba(196, 139, 113, 0.10), transparent 78%)',
    'radial-gradient(1000px 620px at 50% -20%, rgba(13, 16, 19, 0.8), transparent 80%)',
    'linear-gradient(180deg, #0D1013 0%, rgba(18, 20, 23, 0) 55%)',
  ].join(', '),
}

const DETAIL: Partial<Record<BackdropVariant, () => React.ReactNode>> = {
  pile: PileLayer,
  signal: SignalLayer,
  stages: StagesLayer,
  evidence: EvidenceLayer,
}

/**
 * The backdrop itself. Render as the first child of a section that sets
 * `relative isolate` (light sections) or alongside existing z-0 overlays
 * (dark sections, via `zBase`).
 */
export function EditorialBackdrop({
  variant,
  zBase = false,
}: {
  variant: BackdropVariant
  /** Dark sections stack content at z-10; set true to paint at z-0 there
   *  instead of -z-10 (which would hide behind the section background). */
  zBase?: boolean
}) {
  const dark = DARK_VARIANTS.has(variant)
  const Detail = DETAIL[variant]
  /* Light environments fade out at the top and bottom so the grain and tonal
     ground never draw a seam against the neighbouring section. Dark sections
     sit on their own ink and need no such apology. */
  const fade: CSSProperties = dark
    ? {}
    : {
        maskImage:
          'linear-gradient(to bottom, transparent, black 110px, black calc(100% - 110px), transparent)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 110px, black calc(100% - 110px), transparent)',
      }
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${zBase ? 'z-0' : '-z-10'}`}
      style={fade}
    >
      <div className="absolute inset-0" style={{ background: GROUNDS[variant] }} />
      {Detail && <Detail />}
      <Grain dark={dark} />
    </div>
  )
}
