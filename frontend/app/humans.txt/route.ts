import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { LEGAL_ENTITY_CONFIRMED } from '@/lib/legal'

/**
 * `GET /humans.txt`.
 *
 * The optional one. Kept deliberately short and factual: it names the stack,
 * not a team, because the team is not something this repository knows and
 * inventing credits would be the same class of fabrication the August truth
 * pass removed from the marketing copy.
 */
export const dynamic = 'force-static'

export function GET() {
  const lines = [
    `/* ${SITE_NAME.toUpperCase()} */`,
    '',
    '/* TECHNOLOGY */',
    'Frontend: Next.js, React, TypeScript, Tailwind CSS',
    'Backend: FastAPI, Python',
    'Data: PostgreSQL via Supabase',
    'Analysis: deterministic Python scoring with an LLM for reasoning',
    'Payments: Razorpay',
    '',
    '/* NOTES */',
    'Every score is deterministic. The language model explains; it does not rank.',
    'Every claim the analysis makes links to the passage of the résumé it came from.',
    ...(LEGAL_ENTITY_CONFIRMED ? [] : ['Legal documents are currently in draft.']),
    '',
    `Site: ${SITE_URL}`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
