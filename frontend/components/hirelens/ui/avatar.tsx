'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic hue from a stable seed (Design Bible §4.8). */
function getHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  src?: string
  /** Pixel size; defaults to the token --hl-avatar. */
  size?: number
  /** Stable seed for the fallback color (defaults to name). */
  seed?: string
}

export function Avatar({ name, src, size, seed, className, style, ...props }: AvatarProps) {
  const [errored, setErrored] = React.useState(false)
  const hue = getHue(seed ?? name)
  const dimension = size ? `${size}px` : 'var(--hl-avatar)'
  const showImage = Boolean(src) && !errored

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{
        width: dimension,
        height: dimension,
        // The hue stays deterministic (Design Bible §4.8); saturation and
        // lightness come from theme tokens, because the literal 90%-light
        // pastel plate was designed for the light canvas and read as a bright
        // chip — the loudest thing on screen — on V2's charcoal. The dark
        // scope overrides the four knobs in globals.css; light keeps the
        // original values via the fallbacks here.
        backgroundColor: showImage
          ? undefined
          : `hsl(${hue} var(--hl-avatar-plate-s, 42%) var(--hl-avatar-plate-l, 90%))`,
        color: `hsl(${hue} var(--hl-avatar-ink-s, 45%) var(--hl-avatar-ink-l, 32%))`,
        ...style,
      }}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars are user-provided, arbitrary-origin, and small
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="hl-caption font-semibold leading-none" aria-hidden>
          {getInitials(name)}
        </span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  )
}
