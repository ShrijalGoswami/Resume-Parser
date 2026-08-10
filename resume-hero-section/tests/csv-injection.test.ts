import { describe, it, expect } from 'vitest'
import { neutralizeCsvCell, escapeCsvCell } from '@/components/hirelens/analytics/csv'

/**
 * CSV / spreadsheet-formula injection (OWASP) on the analytics export.
 *
 * Dangerous cells (first char `= + - @`, or a leading tab/CR/whitespace before
 * one) must be prefixed with a single apostrophe so a spreadsheet imports them
 * as literal text instead of evaluating a formula. Ordinary cells are untouched
 * apart from CSV quoting.
 */
describe('neutralizeCsvCell — formula neutralization', () => {
  it('prefixes =SUM(...)', () => {
    expect(neutralizeCsvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)")
  })
  it('prefixes +123', () => {
    expect(neutralizeCsvCell('+123')).toBe("'+123")
  })
  it('prefixes -123', () => {
    expect(neutralizeCsvCell('-123')).toBe("'-123")
  })
  it('prefixes @cmd', () => {
    expect(neutralizeCsvCell('@cmd')).toBe("'@cmd")
  })
  it('prefixes a leading-tab formula', () => {
    expect(neutralizeCsvCell('\t=1+1')).toBe("'\t=1+1")
  })
  it('prefixes leading-whitespace formula', () => {
    expect(neutralizeCsvCell('  =1+1')).toBe("'  =1+1")
  })
  it('leaves normal text unchanged', () => {
    expect(neutralizeCsvCell('normal text')).toBe('normal text')
  })
  it('leaves text-with-quotes unchanged (before quoting)', () => {
    expect(neutralizeCsvCell('she said "hi"')).toBe('she said "hi"')
  })
  it('leaves multiline text unchanged (before quoting)', () => {
    expect(neutralizeCsvCell('line1\nline2')).toBe('line1\nline2')
  })
  it('does not prefix a mid-string operator', () => {
    expect(neutralizeCsvCell('React=fun')).toBe('React=fun')
  })
})

describe('escapeCsvCell — neutralize then CSV-quote', () => {
  it('=SUM(...) → quoted, apostrophe-prefixed', () => {
    expect(escapeCsvCell('=SUM(A1:A9)')).toBe('"\'=SUM(A1:A9)"')
  })
  it('+123', () => {
    expect(escapeCsvCell('+123')).toBe('"\'+123"')
  })
  it('-123', () => {
    expect(escapeCsvCell('-123')).toBe('"\'-123"')
  })
  it('@cmd', () => {
    expect(escapeCsvCell('@cmd')).toBe('"\'@cmd"')
  })
  it('normal text → just quoted', () => {
    expect(escapeCsvCell('normal text')).toBe('"normal text"')
  })
  it('quoted text → doubles the embedded quotes', () => {
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""')
  })
  it('multiline text → quoted, newline preserved', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
  })
  it('empty cell → empty quoted', () => {
    expect(escapeCsvCell('')).toBe('""')
  })
  it('injection payload via a résumé "skill" name is neutralized', () => {
    const payload = '=cmd|\'/c calc\'!A1'
    expect(escapeCsvCell(payload).startsWith('"\'=')).toBe(true)
  })
})
