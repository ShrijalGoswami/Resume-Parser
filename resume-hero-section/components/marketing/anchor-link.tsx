'use client'

import * as React from 'react'

/**
 * Smooth-scroll anchor for the single-page marketing narrative. Scrolls to the
 * target section and updates the URL hash for shareability, without a hard jump.
 * Path-independent (hash only), so the /welcome → / cutover needs no changes.
 */
export function AnchorLink({
  to,
  className,
  children,
  ...props
}: { to: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(to)
    if (!el) return
    event.preventDefault()
    el.scrollIntoView({ behavior: 'smooth' })
    history.replaceState(null, '', `#${to}`)
  }
  return (
    <a href={`#${to}`} onClick={onClick} className={className} {...props}>
      {children}
    </a>
  )
}
