import { buildLlmsTxt } from '@/lib/seo/llms-txt'

/**
 * `GET /llms.txt`.
 *
 * A route rather than a file in `public/` so it is generated from the live
 * catalog and pricing modules at build time. A static copy would be a second
 * place the product describes itself, and it would be the copy that goes stale
 * — which is the failure mode this whole file exists to avoid.
 *
 * `force-static` so it costs nothing to serve: the content only changes when
 * the catalog or the prices change, and both of those require a deploy.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
