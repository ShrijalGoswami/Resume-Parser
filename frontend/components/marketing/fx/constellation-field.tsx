'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * The constellation scene contents. Mounted by `<ConstellationBackground />`,
 * which owns the <Canvas>, the reduced-motion gate and the frameloop.
 *
 * PALETTE. Terracotta and soft olive, taken from the marketing tokens rather
 * than re-picked here so the field can never drift away from the page:
 *   #B85C38  --mkt-primary-container  (the CTA fill)
 *   #C48B71  --mkt-dark-primary       (the on-dark accent)
 *   #8FA678  --hl-success (dark)      (the olive)
 * Blending is NORMAL, not additive. Additive blending is what turns a node
 * field into neon; on a #121417 ground normal blending keeps the nodes reading
 * as pigment rather than as light.
 *
 * TOPOLOGY. Links are computed ONCE, from the resting positions, and then
 * follow the nodes as they drift. The obvious implementation — re-testing
 * every pair each frame against a distance threshold — makes links blink in
 * and out at the threshold boundary, which reads as noise. A fixed graph that
 * breathes is both calmer and O(1) per frame instead of O(n²).
 *
 * DETERMINISM. Node placement runs off a seeded PRNG, not Math.random, so the
 * composition is identical on every load and every machine. It can be
 * art-directed by changing the seed, and it can be diffed in a screenshot test.
 */

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

const SEED = 0x5f3a19

const NODE_COUNT = 150

/** Half-extents of the slab the nodes occupy, in world units. */
const SPREAD_X = 11
const SPREAD_Y = 6.5
/** Depth range. Negative is away from the camera, which sits at z = 9. */
const DEPTH_NEAR = -1
const DEPTH_FAR = -12

/** Two nodes may link if they are closer than this. */
const LINK_RADIUS = 2.2
/** …and each node keeps at most this many, nearest first.
 *  Two, not three. At three, every dense cluster closes into triangles and the
 *  field stops reading as a constellation and starts reading as a wireframe
 *  mesh — a solid that happens to be see-through, rather than points in space. */
const MAX_LINKS_PER_NODE = 2

/** Drift is a slow Lissajous wander around each node's resting position. */
const DRIFT_AMPLITUDE = 0.42
const DRIFT_SPEED = 0.085

/** Spring constants for the pointer parallax. Critically damped-ish:
 *  damping ≈ 2·√stiffness gives no overshoot; slightly under that gives the
 *  single soft settle that reads as physical rather than mechanical. */
const SPRING_STIFFNESS = 26
const SPRING_DAMPING = 8.5

/** How far the pointer may push the field. Deliberately small — parallax here
 *  is a depth cue, not a ride. */
const PARALLAX_ROTATION = 0.13 // radians at full deflection
const PARALLAX_TRANSLATION = 0.55 // world units at full deflection

const TERRACOTTA = new THREE.Color('#b85c38')
const CLAY = new THREE.Color('#c48b71')
const OLIVE = new THREE.Color('#8fa678')

/* ------------------------------------------------------------------ */
/* Deterministic PRNG (mulberry32)                                     */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* Node sprite                                                         */
/* ------------------------------------------------------------------ */

/**
 * A soft round dot, drawn once into a canvas and used as the point sprite.
 *
 * This started life as a custom ShaderMaterial with per-point size and a
 * `smoothstep` disc. It was replaced for two reasons, both of which cost real
 * debugging time and are worth recording:
 *
 *   1. It did not draw. A stock PointsMaterial on the same geometry rendered
 *      immediately, so the failure was in the material, not the scene graph.
 *   2. More importantly, it was WRONG even where it worked. three converts
 *      colours to linear space on assignment, and its standard materials emit
 *      the sRGB conversion chunk on the way out. A raw ShaderMaterial does not
 *      get that chunk unless you include it by hand — so linear values were
 *      being written straight into an sRGB framebuffer and the whole palette
 *      rendered darker than the tokens it was supposed to match.
 *
 * PointsMaterial goes through three's own pipeline, so the terracotta on screen
 * is the terracotta in globals.css. Per-node size variation is traded for
 * per-node brightness variation, which reads much the same at 2-5px and needs
 * no shader at all.
 */
function makeNodeSprite() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  )
  // A short solid core with a long shoulder. A linear ramp reads as a blur;
  // this reads as a dot that has an edge.
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.92)')
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** World-space diameter of a node. With `sizeAttenuation`, this scales with
 *  distance, so near nodes are larger than far ones for free. */
const NODE_SIZE = 0.115

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

type FieldProps = {
  /** Pointer position in NDC (-1…1). Owned by the wrapper so a canvas with
   *  `pointer-events: none` can still track the cursor. */
  pointer: React.RefObject<{ x: number; y: number }>
}

export function ConstellationField({ pointer }: FieldProps) {
  const groupRef = useRef<THREE.Group>(null)

  const built = useMemo(() => {
    const rand = mulberry32(SEED)

    const base = new Float32Array(NODE_COUNT * 3)
    const live = new Float32Array(NODE_COUNT * 3)
    const phase = new Float32Array(NODE_COUNT * 3)
    const amp = new Float32Array(NODE_COUNT * 3)
    const colors = new Float32Array(NODE_COUNT * 3)

    const scratch = new THREE.Color()

    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3

      // Bias placement toward the edges of the frame. A uniform scatter puts
      // the densest part of the field directly behind the headline, where it
      // competes with the text; `1 - (1-u)²` pushes mass outward.
      const ux = rand() * 2 - 1
      const uy = rand() * 2 - 1
      base[i3] = Math.sign(ux) * (1 - (1 - Math.abs(ux)) ** 2) * SPREAD_X
      base[i3 + 1] = Math.sign(uy) * (1 - (1 - Math.abs(uy)) ** 2) * SPREAD_Y
      base[i3 + 2] = DEPTH_NEAR + rand() * (DEPTH_FAR - DEPTH_NEAR)

      for (let axis = 0; axis < 3; axis++) {
        phase[i3 + axis] = rand() * Math.PI * 2
        // Z drifts less than X/Y: depth wobble is the component the eye reads
        // as instability rather than as life.
        amp[i3 + axis] =
          DRIFT_AMPLITUDE * (0.45 + rand() * 0.55) * (axis === 2 ? 0.4 : 1)
      }

      // Mostly warm, with olive as the minority voice. An even split reads as
      // two teams; roughly one in five reads as a single palette with depth.
      const t = rand()
      if (t < 0.18) scratch.copy(OLIVE)
      else scratch.copy(TERRACOTTA).lerp(CLAY, rand())
      // Depth and per-node variation are both baked into the colour, since
      // PointsMaterial has no per-vertex alpha and the nodes drift too little
      // for a static fade to go stale. Far nodes recede toward the ground
      // colour, which is what makes the slab read as deep rather than flat.
      const depth = THREE.MathUtils.smoothstep(
        base[i3 + 2],
        DEPTH_FAR,
        DEPTH_NEAR,
      )
      scratch.multiplyScalar((0.3 + depth * 0.75) * (0.6 + rand() * 0.6))
      colors[i3] = scratch.r
      colors[i3 + 1] = scratch.g
      colors[i3 + 2] = scratch.b

    }

    live.set(base)

    // --- link topology, computed once -------------------------------------
    const pairs: number[] = []
    const seen = new Set<number>()
    const radiusSq = LINK_RADIUS * LINK_RADIUS

    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3
      const near: Array<{ j: number; d: number }> = []

      for (let j = 0; j < NODE_COUNT; j++) {
        if (i === j) continue
        const j3 = j * 3
        const dx = base[i3] - base[j3]
        const dy = base[i3 + 1] - base[j3 + 1]
        const dz = base[i3 + 2] - base[j3 + 2]
        const dSq = dx * dx + dy * dy + dz * dz
        if (dSq < radiusSq) near.push({ j, d: dSq })
      }

      near.sort((a, b) => a.d - b.d)
      for (const { j } of near.slice(0, MAX_LINKS_PER_NODE)) {
        const key = i < j ? i * NODE_COUNT + j : j * NODE_COUNT + i
        if (seen.has(key)) continue
        seen.add(key)
        pairs.push(i, j)
      }
    }

    const linkCount = pairs.length / 2
    const linkIndex = new Uint16Array(pairs)
    const linkPositions = new Float32Array(linkCount * 2 * 3)
    const linkColors = new Float32Array(linkCount * 2 * 3)

    for (let k = 0; k < linkCount; k++) {
      for (let end = 0; end < 2; end++) {
        const node = linkIndex[k * 2 + end]
        const n3 = node * 3
        const v3 = (k * 2 + end) * 3

        // LineBasicMaterial has no per-vertex alpha, so depth fade is baked
        // into the colour instead. Against a near-black ground, scaling RGB
        // toward zero is visually indistinguishable from fading alpha.
        const depth = THREE.MathUtils.smoothstep(base[n3 + 2], DEPTH_FAR, -2)
        // Links carry the structure; nodes carry the light. Keep the lines
        // dim enough that the eye reads dots joined by threads rather than a
        // net with dots on it.
        const fade = 0.1 + depth * 0.3
        linkColors[v3] = colors[n3] * fade
        linkColors[v3 + 1] = colors[n3 + 1] * fade
        linkColors[v3 + 2] = colors[n3 + 2] * fade
      }
    }

    const nodeGeometry = new THREE.BufferGeometry()
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(live, 3))
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const linkGeometry = new THREE.BufferGeometry()
    linkGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(linkPositions, 3),
    )
    linkGeometry.setAttribute('color', new THREE.BufferAttribute(linkColors, 3))

    const nodeSprite = makeNodeSprite()
    const nodeMaterial = new THREE.PointsMaterial({
      size: NODE_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      map: nodeSprite,
      transparent: true,
      depthWrite: false,
      // NORMAL, not additive. Additive blending is what turns a node field
      // into neon; on a #121417 ground this keeps the nodes reading as pigment
      // rather than as light.
      blending: THREE.NormalBlending,
    })

    const linkMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    return {
      base,
      live,
      phase,
      amp,
      linkIndex,
      linkCount,
      linkPositions,
      nodeGeometry,
      linkGeometry,
      nodeMaterial,
      linkMaterial,
      nodeSprite,
      points: new THREE.Points(nodeGeometry, nodeMaterial),
      lines: new THREE.LineSegments(linkGeometry, linkMaterial),
    }
  }, [])

  // GPU resources are created by hand above, so they must be released by hand.
  // R3F only auto-disposes what it constructed from JSX.
  useEffect(() => {
    const {
      nodeGeometry,
      linkGeometry,
      nodeMaterial,
      linkMaterial,
      nodeSprite,
    } = built
    return () => {
      nodeGeometry.dispose()
      linkGeometry.dispose()
      nodeMaterial.dispose()
      linkMaterial.dispose()
      nodeSprite.dispose()
    }
  }, [built])

  // Spring state for the pointer parallax, kept in refs so the tick allocates
  // nothing. A GC pause in a 60fps loop is visible as a stutter.
  const springPos = useRef({ x: 0, y: 0 })
  const springVel = useRef({ x: 0, y: 0 })

  /* eslint-disable react-hooks/immutability -- The frame callback writes
     directly into the geometry's Float32Arrays and into the spring refs. That
     in-place mutation is the technique, not an oversight: these buffers are
     uploaded to the GPU each frame, and the declarative alternative would mean
     allocating 130 vectors and two typed arrays sixty times a second. The
     resulting garbage collection is visible as stutter, which is the one thing
     a background animation must never introduce. Nothing here is React state,
     nothing here is read during render, and the arrays are created once in the
     useMemo above and released in the useEffect below. */
  useFrame((state, rawDelta) => {
    // Clamp the timestep. Returning to a backgrounded tab delivers one huge
    // delta; fed to the spring integrator unclamped it goes unstable and the
    // field snaps across the screen.
    const dt = Math.min(rawDelta, 1 / 30)
    const t = state.clock.elapsedTime

    const { base, live, phase, amp, linkIndex, linkCount, linkPositions } = built

    // --- drift ------------------------------------------------------------
    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3
      live[i3] =
        base[i3] + Math.sin(t * DRIFT_SPEED + phase[i3]) * amp[i3]
      live[i3 + 1] =
        base[i3 + 1] +
        Math.cos(t * DRIFT_SPEED * 0.82 + phase[i3 + 1]) * amp[i3 + 1]
      live[i3 + 2] =
        base[i3 + 2] +
        Math.sin(t * DRIFT_SPEED * 0.61 + phase[i3 + 2]) * amp[i3 + 2]
    }
    built.nodeGeometry.attributes.position.needsUpdate = true

    // --- links follow their nodes ------------------------------------------
    for (let k = 0; k < linkCount; k++) {
      for (let end = 0; end < 2; end++) {
        const n3 = linkIndex[k * 2 + end] * 3
        const v3 = (k * 2 + end) * 3
        linkPositions[v3] = live[n3]
        linkPositions[v3 + 1] = live[n3 + 1]
        linkPositions[v3 + 2] = live[n3 + 2]
      }
    }
    built.linkGeometry.attributes.position.needsUpdate = true

    // --- pointer parallax, spring-integrated -------------------------------
    const target = pointer.current ?? { x: 0, y: 0 }
    const pos = springPos.current
    const vel = springVel.current

    for (const axis of ['x', 'y'] as const) {
      const displacement = target[axis] - pos[axis]
      vel[axis] +=
        (displacement * SPRING_STIFFNESS - vel[axis] * SPRING_DAMPING) * dt
      pos[axis] += vel[axis] * dt
    }

    const group = groupRef.current
    if (group) {
      // Rotation is what produces genuine parallax: near nodes sweep further
      // than far ones because they are further from the pivot. Translation
      // alone would move the whole field as a flat plane.
      group.rotation.y = pos.x * PARALLAX_ROTATION
      group.rotation.x = -pos.y * PARALLAX_ROTATION * 0.75
      group.position.x = pos.x * PARALLAX_TRANSLATION
      group.position.y = pos.y * PARALLAX_TRANSLATION * 0.7
    }
  })
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={groupRef}>
      <primitive object={built.lines} />
      <primitive object={built.points} />
    </group>
  )
}
