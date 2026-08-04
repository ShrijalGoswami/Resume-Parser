'use client'

import * as React from 'react'

/**
 * Move focus to an element when it appears.
 *
 * The auth flows swap whole screens in place — form becomes "check your inbox",
 * form becomes "password updated", form becomes "this link expired" — without
 * navigating. Nothing about that is a page load, so focus stays wherever it was:
 * usually on a submit button that no longer exists, at which point the browser
 * drops focus to `<body>` and a screen-reader user is returned to the top of the
 * document with no idea the screen changed under them.
 *
 * Focusing the new heading states what happened and leaves the reader at the
 * start of the new content, which is what a real navigation would have done.
 * The element must be focusable: give it `tabIndex={-1}`, which makes it a
 * programmatic focus target without adding a stop to the tab order.
 *
 * `preventScroll` because these screens are short and already in view; scrolling
 * on focus would jump a mobile viewport for no reason.
 */
export function useFocusOnMount<T extends HTMLElement>(active = true) {
  const ref = React.useRef<T | null>(null)
  React.useEffect(() => {
    if (active) ref.current?.focus({ preventScroll: true })
  }, [active])
  return ref
}
