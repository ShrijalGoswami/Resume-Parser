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
  /** Pixel size; defaults to the density-driven --hl-avatar. */
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
        backgroundColor: showImage ? undefined : `hsl(${hue} 42% 90%)`,
        color: `hsl(${hue} 45% 32%)`,
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
