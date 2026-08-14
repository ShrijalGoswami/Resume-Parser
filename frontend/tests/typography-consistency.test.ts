import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * One typographic system, not three.
 *
 * The audit that produced this test found the same character written three
 * different ways in shipped copy: the straight ASCII apostrophe `'` (63
 * occurrences), the HTML entity `&rsquo;` (39), and the literal curly `’`
 * (132). All three render in the same sentence positions, so error titles a
 * recruiter reads back to back — "Couldn't load analytics" and
 * "Couldn’t load roles" — were set in visibly different punctuation.
 *
 * The chosen form is the literal character: `’ ‘ “ ”`. Entities are a second
 * spelling of the same glyph that only works in JSX text (inside a string
 * attribute `&rsquo;` renders as the six literal characters), and the ASCII
 * apostrophe is a different glyph.
 *
 * WHAT THIS DOES NOT POLICE. Comments and single-quoted strings are exempt:
 * neither is shipped, and in a single-quoted string a `'` is a delimiter.
 * Identifiers are exempt too — `metric="resumes"` is an entitlement key
 * matched against the backend catalog, and `resume.pdf` is a filename.
 */

const ROOT = resolve(__dirname, '..')
const DIRS = ['app', 'components', 'lib']
const SKIP = new Set(['node_modules', '.next', 'storybook-static', 'coverage'])

function sourceFiles(): string[] {
  const out: string[] = []
  for (const d of DIRS) {
    const walk = (dir: string) => {
      let entries: string[]
      try {
        entries = readdirSync(dir)
      } catch {
        return
      }
      for (const name of entries) {
        if (SKIP.has(name)) continue
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(tsx|ts)$/.test(name)) out.push(p)
      }
    }
    walk(join(ROOT, d))
  }
  return out
}

/**
 * Offsets inside comments or single-quoted strings — the two places this rule
 * deliberately does not apply.
 */
function maskExempt(src: string): Uint8Array {
  const masked = new Uint8Array(src.length)
  let i = 0
  let state: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tpl' = 'code'
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; masked[i] = masked[i + 1] = 1; i += 2; continue }
      if (c === '/' && n === '*') { state = 'block'; masked[i] = masked[i + 1] = 1; i += 2; continue }
      if (c === "'") { state = 'sq'; masked[i] = 1; i++; continue }
      if (c === '"') { state = 'dq'; i++; continue }
      if (c === '`') { state = 'tpl'; i++; continue }
      i++
      continue
    }
    if (state === 'line') { masked[i] = 1; if (c === '\n') state = 'code'; i++; continue }
    if (state === 'block') {
      masked[i] = 1
      if (c === '*' && n === '/') { masked[i + 1] = 1; state = 'code'; i += 2; continue }
      i++
      continue
    }
    if (state === 'sq') {
      masked[i] = 1
      if (c === '\\') { masked[i + 1] = 1; i += 2; continue }
      if (c === "'") state = 'code'
      i++
      continue
    }
    // dq / tpl
    if (c === '\\') { i += 2; continue }
    if ((state === 'dq' && c === '"') || (state === 'tpl' && c === '`')) state = 'code'
    i++
  }
  return masked
}

/**
 * The one file whose punctuation is a CONTRACT, not a style choice.
 *
 * `entitlements/catalog.ts` mirrors `backend/app/enterprise/catalog.py` field
 * for field, and both `entitlements-catalog.test.ts` and the backend's
 * `test_catalog_snapshot_parity.py` compare `label` and `blurb` by exact
 * string. The backend is frozen (production bugs only), so curling an
 * apostrophe on this side alone turns a typography pass into a failing parity
 * gate. Normalize both together, deliberately, or not at all.
 */
const PARITY_BOUND = 'components/hirelens/lib/entitlements/catalog.ts'

const FILES = sourceFiles().filter(
  (f) => relative(ROOT, f).replace(/\\/g, '/') !== PARITY_BOUND,
)
const lineAt = (src: string, idx: number) => src.slice(0, idx).split('\n').length
const snippet = (src: string, idx: number) => {
  const s = src.lastIndexOf('\n', idx) + 1
  const e = src.indexOf('\n', idx)
  return src.slice(s, e === -1 ? undefined : e).trim().slice(0, 90)
}

describe('apostrophes are one character, everywhere', () => {
  it('uses no straight ASCII apostrophe in shipped copy', () => {
    const found: string[] = []
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8')
      const masked = maskExempt(src)
      for (let i = 1; i < src.length - 1; i++) {
        if (masked[i] || src[i] !== "'") continue
        // Contraction / possessive position: letter ' lowercase.
        if (/[A-Za-z]/.test(src[i - 1]) && /[a-z]/.test(src[i + 1])) {
          found.push(`${relative(ROOT, f)}:${lineAt(src, i)}  ${snippet(src, i)}`)
        }
      }
    }
    expect(found, `use ’ (U+2019):\n${found.join('\n')}`).toEqual([])
  })

  it('uses no HTML entity where the literal character belongs', () => {
    // `&rsquo;` only decodes in JSX text; in a string attribute it ships as
    // six visible characters. One representation avoids the whole question.
    const found: string[] = []
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8')
      const masked = maskExempt(src)
      for (const m of src.matchAll(/&(rsquo|lsquo|ldquo|rdquo|apos|#39|#8217);/g)) {
        if (!masked[m.index!]) {
          found.push(`${relative(ROOT, f)}:${lineAt(src, m.index!)}  ${m[0]}`)
        }
      }
    }
    expect(found, `use the literal ’ ‘ “ ”:\n${found.join('\n')}`).toEqual([])
  })
})

describe('no homoglyphs of Latin letters', () => {
  it('contains no Cyrillic or Greek look-alikes, and no variant "e"', () => {
    // Cyrillic е/а/о/р/с and Greek ο are pixel-identical to Latin letters in
    // most faces; a single one makes a string unsearchable and undiffable.
    const CONFUSABLE: Record<number, string> = {
      0x0435: 'CYRILLIC е', 0x0430: 'CYRILLIC а', 0x043e: 'CYRILLIC о',
      0x0440: 'CYRILLIC р', 0x0441: 'CYRILLIC с', 0x0455: 'CYRILLIC ѕ',
      0x03bf: 'GREEK ο', 0x03b1: 'GREEK α',
      0xff45: 'FULLWIDTH ｅ', 0x0117: 'ė', 0x00eb: 'ë', 0x00e8: 'è',
      0x00ea: 'ê', 0x0113: 'ē', 0x011b: 'ě',
    }
    const found: string[] = []
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8')
      for (let i = 0; i < src.length; i++) {
        const cp = src.codePointAt(i)!
        if (CONFUSABLE[cp]) {
          found.push(`${relative(ROOT, f)}:${lineAt(src, i)}  ${CONFUSABLE[cp]}  ${snippet(src, i)}`)
        }
      }
    }
    expect(found, found.join('\n')).toEqual([])
  })

  it('writes é as the precomposed character, never e + combining acute', () => {
    // "résumé" spelled with U+0065 U+0301 renders identically to U+00E9 and
    // compares unequal — the exact bug class the audit was asked to find.
    const found: string[] = []
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/[A-Za-z][̀-ͯ]/g)) {
        found.push(`${relative(ROOT, f)}:${lineAt(src, m.index!)}  decomposed ${JSON.stringify(m[0])}`)
      }
    }
    expect(found, found.join('\n')).toEqual([])
  })
})

describe('the résumé spelling is consistent in shipped copy', () => {
  it('never renders the word with a bare "e" in prose', () => {
    // THREE DELIBERATE EXEMPTIONS, each a case where the ASCII spelling is the
    // correct one and changing it would break something real:
    //
    //   · `metric="resumes"` — an entitlement key matched against the backend
    //     catalog, and `resume.pdf` — an example filename in a pricing FAQ.
    //     Neither is prose. Filtered out below by the space/extension checks.
    //   · `label:` in the entitlements catalog ("Resume Parser", "Full Resume
    //     Analysis") — plan-matrix feature NAMES. `test_catalog_snapshot_
    //     parity.py` compares this field against `app/enterprise/catalog.py`,
    //     and the backend is frozen, so renaming one side breaks parity.
    //   · `app/(legacy)/` — the frozen v1.0 surface, whose product name is
    //     literally "Resume Intelligence Platform". A proper noun.
    const COPY_PROPS =
      /(?:title|description|placeholder|aria-label|blurb|answer|question|note|headline)\s*[=:]\s*(["'`])((?:(?!\1).)*)\1/g
    const found: string[] = []
    for (const f of FILES) {
      const rel = relative(ROOT, f).replace(/\\/g, '/')
      if (rel.startsWith('app/(legacy)/')) continue
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(COPY_PROPS)) {
        // A sentence, not an identifier or a filename.
        if (!/ /.test(m[2]) || /\.pdf|\.docx/i.test(m[2])) continue
        if (/\b[Rr]esum[ée]?s?\b/.test(m[2]) && !/résumé/i.test(m[2])) {
          found.push(`${rel}:${lineAt(src, m.index!)}  ${m[2].slice(0, 80)}`)
        }
      }
    }
    expect(found, `write "résumé":\n${found.join('\n')}`).toEqual([])
  })
})
