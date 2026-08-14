'use client'

import { useEffect, useRef } from 'react'

/**
 * Frame 1 hero shader — a verbatim port of the WebGL background Stitch embeds
 * in `hirelens_marketing_hero_frame_1` (STITCH_SHADER ANIMATION_46).
 *
 * It is a very slow "breath" of the HireLens prism hues over Deep Ink, held at
 * roughly 4–8% so it reads as atmosphere behind the type rather than as a
 * gradient. The fragment source is unchanged from the frame.
 *
 * Degrades to nothing (transparent canvas over the section's own ink
 * background) when WebGL is unavailable or reduced motion is requested.
 */

const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 uv = v_texCoord;

    // Slow, breathing noise movement
    float x = uv.x * 2.0 + u_time * 0.05;
    float y = uv.y * 2.0 + u_time * 0.03;

    // HireLens Prism Spectral Colors (extremely subtle/desaturated)
    vec3 iris = vec3(0.427, 0.369, 0.973); // #6D5EF8
    vec3 sky = vec3(0.85, 0.92, 0.98);
    vec3 mint = vec3(0.92, 0.98, 0.95);

    // Flowing bands
    float n = sin(x + sin(y)) * 0.5 + 0.5;
    float n2 = cos(y - sin(x)) * 0.5 + 0.5;

    vec3 color = mix(sky, mint, n);
    color = mix(color, iris, n2 * 0.2);

    // Deep Ink background blend (#0A0C18 base)
    vec3 ink = vec3(0.039, 0.047, 0.094);

    // Keep it as a 4-8% "breath" behind the type
    float mask = smoothstep(0.2, 0.8, uv.y) * smoothstep(0.8, 0.2, uv.y);
    color = mix(ink, color, 0.06 * mask);

    gl_FragColor = vec4(color, 1.0);
}`

export function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return

    const syncSize = () => {
      const w = canvas.clientWidth || 1280
      const h = canvas.clientHeight || 720
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    syncSize()

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null
    observer?.observe(canvas)

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uResolution = gl.getUniformLocation(program, 'u_resolution')

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let frame = 0
    let running = false
    const render = (t: number) => {
      if (!observer) syncSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uTime) gl.uniform1f(uTime, reducedMotion ? 0 : t * 0.001)
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (running && !reducedMotion) frame = requestAnimationFrame(render)
    }

    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(render)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    // The hero is a full viewport tall and the rest of the page is long, so
    // the canvas spends most of the scroll off-screen. Suspending the loop
    // there keeps a marketing page from holding the GPU at 60fps for nothing.
    const visibility =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? start() : stop()),
          )
        : null

    if (visibility) {
      visibility.observe(canvas)
    } else {
      start()
    }
    render(0) // paint once immediately, even before the observer fires

    return () => {
      stop()
      observer?.disconnect()
      visibility?.disconnect()
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full opacity-40 mix-blend-screen">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
