/**
 * Site identity — the one place a URL, a name or a locale is written down.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS AT ALL
 *
 * Canonicals, Open Graph, the sitemap, robots.txt, llms.txt, security.txt and
 * every JSON-LD `@id` all need to agree on what this site is called and where it
 * lives. Written once each, they drift — and the failure is silent: a canonical
 * pointing at a hostname the sitemap does not list splits authority between two
 * URLs that are the same page, and nothing in the build complains.
 *
 * So every one of those surfaces reads from here.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE ROUTE LIST IS THE SITEMAP AND THE ROBOTS POLICY. `PUBLIC_ROUTES` below is
 * consumed by `app/sitemap.ts`, and `app/robots.ts` derives its disallow list
 * from what is NOT in it. Adding a public page in one place adds it everywhere;
 * forgetting to is the ordinary way a page becomes undiscoverable.
 */

/**
 * The canonical origin, no trailing slash.
 *
 * Overridable so a preview deployment can declare its own origin rather than
 * claiming to be production — two hosts serving identical HTML with the same
 * canonical is how a preview URL ends up outranking the real one.
 *
 * `hirelens.app` is the default because it is the domain the product already
 * publishes addresses at (`support@`, `sales@` — see `lib/legal.ts`). It is an
 * assumption in exactly one place, which is the point.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hirelens.app'
).replace(/\/$/, '')

export const SITE_NAME = 'HireLens'
export const SITE_LOCALE = 'en_US'

/** `https://hirelens.app/pricing` from `/pricing`. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * A public page, and what the sitemap should say about it.
 *
 * `changeFrequency` and `priority` are hints, not promises, and they are set
 * from how often each page ACTUALLY changes: pricing moves when a plan moves,
 * policies move when counsel says so, and the homepage moves with the product.
 * Inventing a daily frequency for a page that changes twice a year teaches a
 * crawler to ignore the field.
 */
export interface PublicRoute {
  path: string
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
  /** Shown in `llms.txt` so an agent knows what it will find there. */
  summary: string
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: '/',
    changeFrequency: 'monthly',
    priority: 1,
    summary: 'What HireLens does, how a role runs through it, and how it treats evidence.',
  },
  {
    path: '/pricing',
    changeFrequency: 'monthly',
    priority: 0.9,
    summary:
      'Every plan, every limit and every capability, generated from the same catalog the product enforces.',
  },
  {
    path: '/contact',
    changeFrequency: 'yearly',
    priority: 0.5,
    summary: 'How to reach support, sales, and privacy. Company details.',
  },
  {
    path: '/terms',
    changeFrequency: 'yearly',
    priority: 0.3,
    summary: 'Terms of Service.',
  },
  {
    path: '/privacy',
    changeFrequency: 'yearly',
    priority: 0.3,
    summary:
      'What personal data is held, where it lives, who processes it, and the rights of candidates who never signed up.',
  },
  {
    path: '/refunds',
    changeFrequency: 'yearly',
    priority: 0.3,
    summary: 'Refund and cancellation policy.',
  },
]

/**
 * Paths crawlers should not index.
 *
 * NOT a security boundary — `robots.txt` is a request, and the product routes
 * below are already behind authentication. This exists so an index is not
 * filled with sign-in forms and API responses that would tell a reader nothing
 * about HireLens.
 */
export const DISALLOWED_PATHS = [
  '/api/',
  '/auth/',      // sign-in, sign-up, callback, password reset
  '/today',      // the product itself begins here
  '/jobs',
  '/candidates',
  '/decisions',
  '/reports',
  '/ask',
  '/interviews',
  '/ai-audit',
  '/notifications',
  '/settings',
]
