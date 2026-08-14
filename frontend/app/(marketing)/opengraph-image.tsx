/**
 * One card, six routes.
 *
 * Next only attaches a file-convention `opengraph-image` to a page that has not
 * declared its own `openGraph.images`, and every public page here declares an
 * `openGraph` block to set its own `url`. Declaring the block loses the
 * inherited image, so each route re-exports the single implementation in
 * `lib/seo/og-image.tsx` rather than owning a copy of it.
 */
export { default, alt, size, contentType } from '@/lib/seo/og-image'
