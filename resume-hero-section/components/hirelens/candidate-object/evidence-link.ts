import type { ResumeData } from '@/types/batch'

/**
 * Relating a claim to the parsed résumé — and being precise about what that
 * relationship is.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS IS NOT A CITATION, AND THE DISTINCTION IS THE WHOLE POINT.
 *
 * The candidate-analysis backend does not emit span-level references. No
 * strength, risk or score carries a pointer to the passage it was derived
 * from, and none of that information exists anywhere in the stored analysis.
 * Any UI that drew a line from a claim to a résumé line and called it a source
 * would be inventing provenance — the reader would have no way to detect the
 * lie, and the product's entire argument is that its conclusions can be
 * checked.
 *
 * What this module does instead is a LOOKUP, performed in the browser, over
 * the résumé the parser already produced: given a claim, find the lines that
 * share its distinctive wording. That is a search result, not an attribution.
 * It is useful because a recruiter reading "Familiarity with containerization
 * using Docker" wants to see the line that mentions Docker, and it is honest
 * because the UI says out loud how the relationship was formed.
 *
 * The failure case matters as much as the success case: when nothing matches,
 * the caller says so. A claim with no visible support in the parsed record is
 * exactly what a person defending a hiring decision needs to know about.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The returned shape deliberately mirrors `CopilotEvidence` ({ category,
 * detail }) so the product has ONE evidence vocabulary rather than a second
 * one invented here.
 */

/** Where a supporting line was found. Mirrors the Copilot evidence category. */
export type EvidenceCategory =
  | 'experience'
  | 'project'
  | 'skill'
  | 'certification'
  | 'education'

export interface ClaimSupport {
  category: EvidenceCategory
  /** The résumé line, verbatim — never paraphrased. */
  detail: string
  /** Optional context (which role or project the line sits under). */
  context?: string
  /** The distinctive words the claim and the line share, for transparency. */
  terms: string[]
}

/**
 * Words too common to make a match meaningful. Kept deliberately small and
 * generic: a domain stopword list would quietly suppress real matches, and a
 * missed match is a worse failure here than a weak one the reader can dismiss.
 */
const STOPWORDS = new Set([
  'with', 'from', 'that', 'this', 'they', 'their', 'them', 'have', 'has', 'had',
  'been', 'being', 'were', 'was', 'are', 'and', 'the', 'for', 'not', 'but',
  'some', 'more', 'most', 'less', 'than', 'then', 'when', 'while', 'into',
  'over', 'under', 'about', 'across', 'using', 'used', 'use', 'work', 'working',
  'experience', 'experienced', 'strong', 'good', 'great', 'limited', 'lack',
  'lacks', 'clear', 'evidence', 'candidate', 'candidates', 'role', 'roles',
  'skills', 'skill', 'ability', 'able', 'knowledge', 'familiarity', 'familiar',
  'demonstrated', 'demonstrates', 'including', 'include', 'includes', 'also',
  'multiple', 'various', 'several', 'well', 'very', 'such', 'both', 'each',
  'other', 'others', 'within', 'through', 'their', 'there', 'these', 'those',
])

/** Distinctive words of a phrase: 4+ characters, not a stopword, lowercased. */
function terms(text: string): Set<string> {
  const out = new Set<string>()
  for (const raw of text.toLowerCase().split(/[^a-z0-9+#.]+/)) {
    const word = raw.replace(/^[.]+|[.]+$/g, '')
    if (word.length < 4) continue
    if (STOPWORDS.has(word)) continue
    out.add(word)
  }
  return out
}

function shared(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = []
  for (const word of a) if (b.has(word)) out.push(word)
  return out
}

/** A skill counts as present only as a whole word/phrase, so "Go" cannot match "Google". */
function mentionsSkill(claim: string, skill: string): boolean {
  const needle = skill.trim()
  if (needle.length < 2) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(claim)
}

interface RecordLine {
  category: EvidenceCategory
  detail: string
  context?: string
}

/** Flatten the parsed résumé into the lines a claim could be checked against. */
function recordLines(resume: ResumeData): RecordLine[] {
  const lines: RecordLine[] = []
  for (const role of resume.experience ?? []) {
    const context = [role.role, role.company].filter(Boolean).join(' · ') || undefined
    for (const bullet of role.description ?? []) {
      if (bullet?.trim()) lines.push({ category: 'experience', detail: bullet, context })
    }
  }
  for (const project of resume.projects ?? []) {
    for (const bullet of project.description ?? []) {
      if (bullet?.trim()) {
        lines.push({ category: 'project', detail: bullet, context: project.title || undefined })
      }
    }
  }
  for (const cert of resume.certifications ?? []) {
    if (cert?.trim()) lines.push({ category: 'certification', detail: cert })
  }
  for (const entry of resume.education ?? []) {
    const detail = [entry.degree, entry.institution].filter(Boolean).join(' — ')
    if (detail.trim()) lines.push({ category: 'education', detail })
  }
  return lines
}

/**
 * Find résumé lines whose wording overlaps a claim.
 *
 * Two ways in, both conservative:
 *   1. A skill named in the claim that the parser also extracted as a skill.
 *      This is the strongest link available and the easiest for a reader to
 *      confirm, so it is offered first.
 *   2. A line sharing at least two distinctive words with the claim. One
 *      shared word is noise ("systems", "data"); two is worth a look.
 *
 * Returns at most `limit` supports, best overlap first. An empty array means
 * nothing in the parsed résumé echoes this claim — which the UI must state
 * rather than hide.
 */
export function findClaimSupport(
  claim: string,
  resume: ResumeData | null,
  opts?: { limit?: number },
): ClaimSupport[] {
  if (!resume || !claim.trim()) return []
  const limit = opts?.limit ?? 2
  const claimTerms = terms(claim)
  const out: ClaimSupport[] = []

  // 1. Skills the claim names and the résumé lists.
  for (const skill of resume.skills ?? []) {
    if (out.length >= limit) break
    if (skill?.trim() && mentionsSkill(claim, skill)) {
      out.push({ category: 'skill', detail: skill, terms: [skill.toLowerCase()] })
    }
  }

  // 2. Lines that share distinctive wording.
  const scored = recordLines(resume)
    .map((line) => ({ line, hits: shared(claimTerms, terms(line.detail)) }))
    .filter((entry) => entry.hits.length >= 2)
    .sort((a, b) => b.hits.length - a.hits.length)

  for (const entry of scored) {
    if (out.length >= limit) break
    out.push({
      category: entry.line.category,
      detail: entry.line.detail,
      context: entry.line.context,
      terms: entry.hits,
    })
  }

  return out
}
