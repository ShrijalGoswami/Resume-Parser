import * as React from 'react'

/** Storybook mock for next/link — renders a plain anchor. */
type NextLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string }
}

const NextLink = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, children, ...props }, ref) => {
    const resolved = typeof href === 'string' ? href : (href?.pathname ?? '#')
    return (
      <a ref={ref} href={resolved} {...props}>
        {children}
      </a>
    )
  },
)
NextLink.displayName = 'NextLinkMock'

export default NextLink
