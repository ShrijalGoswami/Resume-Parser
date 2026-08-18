import type { MetadataRoute } from 'next'

import { DISALLOWED_PATHS, SITE_URL, absoluteUrl } from '@/lib/seo/site'

/**
 * `/robots.txt`, generated.
 *
 * ALL CRAWLERS ARE ALLOWED, including the AI ones. That is a deliberate
 * position rather than an absence of one: Hirevo wants to be understood by
 * the systems people now ask "what should I use to screen résumés?", and a
 * blanket `Disallow` for GPTBot or ClaudeBot buys nothing here — there is no
 * proprietary corpus on the public site, only a description of a product we
 * want described accurately.
 *
 * The disallow list is the product itself, not a secret. Those routes sit
 * behind authentication and would render a sign-in form to a crawler; indexing
 * them fills a search index with login pages that tell a reader nothing. It is
 * a courtesy to the crawler, not a control — `robots.txt` is a request and
 * anything that actually matters is enforced server-side.
 *
 * `/llms.txt` is pointed at explicitly. It is not a standard a crawler is
 * required to look for, so saying where it is costs one line and is the only
 * way an agent that does not guess will find it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
