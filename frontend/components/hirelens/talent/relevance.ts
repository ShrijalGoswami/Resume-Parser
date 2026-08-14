import type { SearchResultItem } from '@/types/search'

/**
 * Reading similarity honestly, without touching search.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE BACKEND HAS NO RELEVANCE THRESHOLD, AND THIS DOES NOT ADD ONE.
 *
 * Vector search always returns a nearest neighbour. Ask it something
 * meaningless and it still answers: the audit recorded gibberish coming back
 * with candidates at a similarity of 0.0153. That is not a bug in the maths —
 * cosine similarity is doing exactly what it was asked — it is a missing
 * contract, and the place to fix it is the search service, which decides what
 * is worth returning at all.
 *
 * So nothing here filters, reorders, or re-scores. Every result the server
 * sends is rendered, in the order it sent them. What this module does is let
 * the screen SAY what the numbers mean, so a recruiter can tell an answer from
 * an artefact without reading a cosine value and guessing.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Below this, a result is called weak in words beside its number.
 *
 * Chosen from measured behaviour on the canonical set rather than taste:
 * gibberish returned ~0.015 and a real description of a candidate in the pool
 * returns an order of magnitude higher. A floor of 0.25 sits far above the
 * noise and comfortably below any genuine hit, so it flags the artefact case
 * without ever calling a real match weak. It is a LABEL, not a filter.
 */
export const WEAK_SIMILARITY = 0.25

/**
 * True when nothing in the result set clears the floor — the state that
 * matters, because that is the shape "the query matched nothing, but search
 * answered anyway" takes on screen.
 */
export function allResultsWeak(results: SearchResultItem[]): boolean {
  if (results.length === 0) return false
  return results.every((result) => result.similarity < WEAK_SIMILARITY)
}

/** The best similarity in the set, as a percentage, for the caution copy. */
export function topSimilarityPct(results: SearchResultItem[]): number {
  return Math.round(Math.max(...results.map((r) => r.similarity)) * 100)
}
