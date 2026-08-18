import { V4_PROTECTED } from '@/lib/auth-routing'

/**
 * Strip organization-identifying detail out of an analytics URL before it
 * leaves the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT WAS ACTUALLY BEING SENT
 *
 * `<Analytics />` reports a page view for every navigation, and the event it
 * builds carries the raw `url` — not the Next.js route pattern. So opening one
 * candidate sent, verbatim:
 *
 *     https://hirevo.in/roles/8f14e45f-…/candidates/c9b1a2d3-…
 *
 * Those are the real primary keys of a real campaign and a real candidate. They
 * are not names and not résumé text, but they are private organization data
 * handed to a third-party analytics provider, and they are durable: the same
 * candidate produces the same identifier on every view, which is what makes a
 * sequence of page views into a reconstructable picture of who a customer is
 * screening and how long they spent on each person.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY REDACT RATHER THAN DISABLE
 *
 * The useful signal in these events is the SHAPE of the journey — how many
 * people reach deep review, whether anyone finds the ledger. None of that needs
 * the identifier. Replacing each opaque segment with the route parameter it
 * fills keeps every answer analytics could honestly give while removing the
 * part that identifies a person.
 *
 * The placeholder is named after the segment before it (`roles/<uuid>` →
 * `roles/[roleId]`), which reproduces the names Next.js already uses for those
 * params. A generic `[id]` would have collapsed `/jobs/[roleId]` and
 * `/jobs/[roleId]/candidates/[candidateId]` into shapes that no longer say
 * which one was viewed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE QUERY STRING GOES TOO, ON PRIVATE ROUTES ONLY
 *
 * Redacting the path and forwarding `?q=…` would have been a half-measure that
 * read as a fix. Talent search puts its terms in the URL, and a recruiter
 * searching a person by name is more directly identifying than the UUID this
 * function exists to remove.
 *
 * Public marketing URLs keep their query intact — `utm_*` is the one place a
 * query string is the measurement rather than a leak, and nothing behind those
 * paths is organization data.
 *
 * `V4_PROTECTED` is imported rather than restated. It is the same list the
 * proxy guards on, so a new authenticated area is private here the moment it is
 * private there, instead of leaking until someone remembers this file.
 */

/** A canonical UUID — what every id in this product actually is. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Opaque identifiers that are not UUIDs.
 *
 * Numeric keys and long unbroken tokens (hashes, base62 ids, external provider
 * references) are covered so a future id format is redacted by default rather
 * than silently exempt. The 16-character floor is above every route word this
 * product uses, so no real path segment is mistaken for an id.
 */
const NUMERIC = /^\d+$/
const OPAQUE_TOKEN = /^[A-Za-z0-9_-]{16,}$/

function isIdentifier(segment: string): boolean {
  return UUID.test(segment) || NUMERIC.test(segment) || OPAQUE_TOKEN.test(segment)
}

/**
 * `roles` → `roleId`, `candidates` → `candidateId`.
 *
 * Falls back to `id` when an identifier is the first segment and so has no
 * collection name in front of it to be named after.
 */
function paramNameFor(previous: string | undefined): string {
  if (!previous) return 'id'
  const singular = previous.endsWith('s') ? previous.slice(0, -1) : previous
  return `${singular}Id`
}

/** True when the path is part of the authenticated product. */
export function isPrivatePath(pathname: string): boolean {
  return V4_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** `/jobs/<uuid>/candidates/<uuid>` → `/jobs/[roleId]/candidates/[candidateId]`. */
export function redactPathname(pathname: string): string {
  const segments = pathname.split('/')
  return segments
    .map((segment, i) =>
      segment && isIdentifier(segment) ? `[${paramNameFor(segments[i - 1])}]` : segment,
    )
    .join('/')
}

/**
 * Redact a full analytics URL. Returns the input unchanged if it will not parse
 * — an unparseable URL is not a reason to throw inside an analytics callback
 * and take a page render with it.
 */
export function redactAnalyticsUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl
  }

  url.pathname = redactPathname(url.pathname)

  // Search terms, filter values and anchors are dropped wholesale on the
  // product surface. There is no allowlist of "safe" params here on purpose:
  // an allowlist fails open, and the failure is a leak nobody sees.
  if (isPrivatePath(url.pathname)) {
    url.search = ''
    url.hash = ''
  }

  return url.toString()
}
