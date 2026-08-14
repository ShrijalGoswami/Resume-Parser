import * as React from 'react'

/**
 * Renders a JSON-LD block.
 *
 * A server component with no client cost: the script is part of the HTML a
 * fetcher receives, which is the entire point — structured data that requires
 * JavaScript to appear is structured data most crawlers never see.
 *
 * `<` IS ESCAPED, and that is not optional. A JSON string containing `</script`
 * ends the block early and the remainder lands in the document as markup.
 * Nothing here interpolates user input today — every value comes from a
 * constant in `catalog.ts`, `pricing.ts` or `legal.ts` — but the escape costs
 * one `replace` and removes the need for whoever adds the first dynamic field
 * to remember this.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      // Deliberate: this is the only way to emit a raw JSON body inside a
      // script tag from React, and the content is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
