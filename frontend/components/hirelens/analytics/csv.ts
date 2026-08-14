/**
 * CSV cell serialization for the analytics export.
 *
 * Two concerns, in order:
 *
 *  1. FORMULA / CSV INJECTION (OWASP). A spreadsheet evaluates a cell whose
 *     first character is `= + - @` — or a leading TAB / CR — as a formula, so an
 *     exported value like `=cmd|'/c calc'!A1` runs when the recipient opens the
 *     file. Exported cells here include résumé-derived skill names, which are
 *     attacker-influenced. Neutralize by prefixing a single apostrophe, which
 *     forces the spreadsheet to import the cell as literal text. Leading
 *     whitespace before a formula character is handled too.
 *
 *  2. CSV QUOTING. Wrap in double quotes and double any embedded quote so
 *     commas, quotes and newlines inside a value cannot break the row/column
 *     structure. (Unchanged from the original export.)
 *
 * Kept in its own module — with no React imports — so the security-relevant
 * logic is unit-testable in isolation.
 */

// First char is a formula trigger, OR leading whitespace then a formula char.
const FORMULA_LEAD = /^([=+\-@\t\r]|\s+[=+\-@])/

/** Prefix a single apostrophe when the cell would be read as a formula. */
export function neutralizeCsvCell(cell: string): string {
  return FORMULA_LEAD.test(cell) ? `'${cell}` : cell
}

/** Neutralize formula injection, then CSV-quote. Returns the full quoted cell. */
export function escapeCsvCell(cell: string): string {
  return `"${neutralizeCsvCell(cell).replace(/"/g, '""')}"`
}
