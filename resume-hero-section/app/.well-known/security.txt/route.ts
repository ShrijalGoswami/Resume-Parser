import { SITE_URL, absoluteUrl } from '@/lib/seo/site'
import { contactAddress } from '@/lib/legal'

/**
 * `GET /.well-known/security.txt` — RFC 9116.
 *
 * A ROUTE, NOT A STATIC FILE, because of one field. `Expires` is mandatory and
 * must be in the future; RFC 9116 recommends less than a year out. A checked-in
 * file has a hard-coded date that silently expires, and an expired security.txt
 * is treated as unmaintained — which is worse than not publishing one, because
 * it suggests the contact behind it is no longer watched. Generated, it is
 * always exactly one year ahead of the build.
 *
 * The contact address comes from `lib/legal.ts`, so there is one place the
 * product records how to reach it.
 *
 * NO `Encryption` KEY IS ADVERTISED. Publishing a PGP key nobody holds the
 * private half of, or has ever decrypted a report with, is a broken promise to
 * whoever encrypts a vulnerability report against it.
 */
export const dynamic = 'force-static'

export function GET() {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const security = contactAddress('support')

  const lines = [
    '# HireLens — security contact (RFC 9116)',
    '#',
    '# Reporting a vulnerability is welcome and will not be treated as a hostile',
    '# act. Please give us a reasonable window to fix before disclosing.',
    '',
    ...(security ? [`Contact: mailto:${security}`] : []),
    `Contact: ${absoluteUrl('/contact')}`,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: en',
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${absoluteUrl('/terms')}`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
