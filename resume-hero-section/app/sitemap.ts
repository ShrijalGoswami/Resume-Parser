import type { MetadataRoute } from 'next'

import { PUBLIC_ROUTES, absoluteUrl } from '@/lib/seo/site'
import { POLICY_UPDATED } from '@/lib/legal'

/**
 * `/sitemap.xml`, generated from `PUBLIC_ROUTES`.
 *
 * The route list is not repeated here. A sitemap that is maintained separately
 * from the pages it describes is a sitemap that will one day advertise a 404
 * and omit a real page, and neither failure shows up in a build.
 *
 * `lastModified` FOR THE POLICY PAGES COMES FROM `POLICY_UPDATED`, the same
 * constant the pages print at the top of themselves. Using the build date
 * instead — the obvious shortcut — would tell every crawler that the Terms
 * changed on every deploy, which is precisely the claim `lastModified` exists
 * to make and precisely the one that must not be made falsely. A policy that
 * appears to change weekly is a policy nobody can rely on.
 *
 * Everything else uses the build date, which for a marketing page is honest
 * enough: its content genuinely ships with the deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date()

  const policyDates: Record<string, string | undefined> = {
    '/terms': POLICY_UPDATED.terms,
    '/privacy': POLICY_UPDATED.privacy,
    '/refunds': POLICY_UPDATED.refunds,
  }

  return PUBLIC_ROUTES.map((route) => {
    const declared = policyDates[route.path]
    const parsed = declared ? new Date(declared) : null
    return {
      url: absoluteUrl(route.path),
      lastModified: parsed && !Number.isNaN(parsed.valueOf()) ? parsed : built,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }
  })
}
