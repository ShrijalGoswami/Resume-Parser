import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  describeRejection,
  partitionFiles,
} from '../components/hirelens/workspace/add-candidates-dialog'

/**
 * What the upload dialog does with files it will not take.
 *
 * It used to drop them silently. `addFiles` filtered the selection to PDF/Word
 * under 10MB inline, kept the survivors and said nothing — so a recruiter
 * selecting twelve files from an email export saw eight appear, with no error,
 * no count and no explanation. The likeliest reading of that is that the app is
 * broken; the second likeliest is that they miscounted. Either way four
 * candidates never entered the pipeline and nobody found out.
 *
 * The dialog gets quota truncation exactly right — "Truncation is never
 * silent", says the comment — and was truncating the file list silently three
 * functions above it.
 */

/** A File stand-in: only `name` and `size` are read. */
const file = (name: string, sizeMb = 1) =>
  ({ name, size: Math.round(sizeMb * 1024 * 1024) }) as File

describe('partitionFiles', () => {
  it('accepts the formats the analyser can actually read', () => {
    const { accepted, rejected } = partitionFiles([
      file('a.pdf'),
      file('b.docx'),
      file('c.doc'),
      file('D.PDF'),
    ])
    expect(accepted).toHaveLength(4)
    expect(rejected).toEqual([])
  })

  it('names what it rejected instead of discarding it quietly', () => {
    const { accepted, rejected } = partitionFiles([
      file('good.pdf'),
      file('photo.png'),
      file('notes.txt'),
    ])
    expect(accepted.map((f) => f.name)).toEqual(['good.pdf'])
    expect(rejected.map((f) => f.name)).toEqual(['photo.png', 'notes.txt'])
    expect(rejected.every((f) => f.reason === 'type')).toBe(true)
  })

  it('separates too-big from wrong-type, because the remedies differ', () => {
    // "Unsupported" on a 14MB PDF sends the recruiter looking for a converter
    // when what they need is to split or compress the scan.
    const { accepted, rejected } = partitionFiles([file('scan.pdf', 14.2)])
    expect(accepted).toEqual([])
    expect(rejected[0]).toMatchObject({ reason: 'size', name: 'scan.pdf' })
  })

  it('keeps a file exactly on the limit', () => {
    // Off-by-one at the boundary rejects a file the server would have taken.
    expect(partitionFiles([file('edge.pdf', 10)]).accepted).toHaveLength(1)
    expect(partitionFiles([file('over.pdf', 10.1)]).rejected).toHaveLength(1)
  })

  it('handles an empty selection without inventing a rejection', () => {
    expect(partitionFiles([])).toEqual({ accepted: [], rejected: [] })
  })
})

describe('describeRejection', () => {
  it('says which file and why, never just a count', () => {
    // "2 files skipped" still leaves the recruiter to work out which two.
    expect(describeRejection({ name: 'photo.png', reason: 'type', sizeMb: '0.4' })).toBe(
      'photo.png (not a PDF or Word file)',
    )
    expect(describeRejection({ name: 'scan.pdf', reason: 'size', sizeMb: '14.2' })).toBe(
      'scan.pdf (14.2MB, limit 10MB)',
    )
  })
})

describe('the drop zone accepts a drop', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'components/hirelens/workspace/add-candidates-dialog.tsx'),
    'utf-8',
  )

  it('handles drop events', () => {
    // The target is a full-width dashed rectangle with an upload glyph — the
    // universal drag-and-drop affordance — and nothing handled a drop. Dragging
    // résumés onto it did nothing, and worse: with no handler the browser takes
    // the default action and NAVIGATES AWAY to open the PDF, destroying the
    // dialog and any files already staged.
    expect(source).toMatch(/onDrop=/)
  })

  it('preventDefaults the drag events a drop depends on', () => {
    // Without preventDefault on BOTH dragEnter and dragOver, the drop never
    // fires and the browser navigates instead.
    expect(source).toMatch(/onDragOver=\{\(event\) => event\.preventDefault\(\)\}/)
    expect(source).toMatch(/onDragEnter/)
  })
})
