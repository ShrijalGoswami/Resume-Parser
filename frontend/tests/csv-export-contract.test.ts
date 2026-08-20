/**
 * Analytics CSV export contract.
 *
 * The CSV is deliberately NOT visually branded: it must stay strictly
 * machine-parseable, so the Hirevo identity lives in the FILENAME and nowhere
 * in the tabular content. This pins that decision from both directions —
 * the branded filename must stay, and no well-meaning "attribution row" may
 * ever creep in above the header (CSV has no standard metadata mechanism;
 * a preamble breaks naive parsers).
 *
 * Source-level assertions, because `toCsv` is intentionally private to the
 * screen: the contract is about what ships, not about exposing internals.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  join(__dirname, '../components/hirelens/analytics/analytics-screen.tsx'),
  'utf-8',
)

describe('analytics CSV export contract', () => {
  it('downloads under the Hirevo-branded filename', () => {
    expect(SOURCE).toContain("link.download = 'hirevo-analytics.csv'")
  })

  it('the header row is the first row — no preamble/attribution rows', () => {
    // The rows array must be INITIALIZED with the header, so nothing can sit
    // above it. An attribution row would appear here first and fail this.
    expect(SOURCE).toContain("[['Section', 'Metric', 'Value']]")
  })

  it('every cell still passes through the injection-safe escaper', () => {
    expect(SOURCE).toContain('row.map(escapeCsvCell)')
  })
})
