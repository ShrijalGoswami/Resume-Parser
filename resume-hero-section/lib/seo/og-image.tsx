import { ImageResponse } from 'next/og'

import { SITE_NAME } from '@/lib/seo/site'
import { SERVICE_DESCRIPTION } from '@/lib/legal'

/**
 * The sitewide Open Graph card, generated at request time.
 *
 * GENERATED RATHER THAN DESIGNED, on purpose. A hand-made PNG is a second place
 * the product describes itself, and it is the copy nobody updates — this one
 * reads `SERVICE_DESCRIPTION` from `lib/legal.ts`, the same sentence the Terms
 * and the structured data use. If that sentence changes, the card changes.
 *
 * It also makes no claim. No customer logos, no metrics, no "trusted by": just
 * the name, what the product is, and the wordmark's colours. That is the whole
 * point of a card for a product with no reference customers yet — and it is the
 * rule `tests/marketing-claims.test.ts` enforces everywhere else.
 *
 * Deliberately plain typography: `next/og` renders in Satori, which does not
 * load the marketing font stack without shipping the woff2 into the edge
 * bundle. Matching the site's Newsreader display face would cost ~200KB per
 * render for a 1200×630 image most people see at thumbnail size.
 */
export const alt = `${SITE_NAME} — hiring intelligence`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // The product's ink, from globals.css.
          background: '#0A0C18',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div
            style={{
              fontSize: 60,
              color: '#EEF0FA',
              letterSpacing: '-0.03em',
              fontWeight: 500,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#A5AAC4',
              lineHeight: 1.4,
              maxWidth: '900px',
            }}
          >
            {SERVICE_DESCRIPTION}
          </div>
        </div>

        {/* The prism hairline the product uses as its signature mark. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              height: '4px',
              width: '240px',
              background: 'linear-gradient(90deg, #5B5BD6 0%, #7C6BF0 50%, #4FB8E8 100%)',
            }}
          />
          <div style={{ fontSize: 24, color: '#6E7391' }}>
            Every claim opens to its evidence
          </div>
        </div>
      </div>
    ),
    size,
  )
}
