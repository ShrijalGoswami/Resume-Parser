import { describe, it, expect } from 'vitest'
import { buildResumeUploadPlan } from '../components/hirelens/workspace/resume-upload'
import type { CandidateResult } from '@/types/batch'
import type { Candidate } from '@/types/campaign'

// Minimal shapes — buildResumeUploadPlan only reads candidate_id/file_hash (batch)
// and id/metadata.pipeline_candidate_id (persisted). Files are opaque references.
const bc = (candidate_id: string, file_hash: string | null): CandidateResult =>
  ({ candidate_id, file_hash } as unknown as CandidateResult)
const cand = (id: string, pipelineId: string | undefined): Candidate =>
  ({ id, metadata: pipelineId ? { pipeline_candidate_id: pipelineId } : {} } as unknown as Candidate)
const fileRef = (label: string) => ({ __label: label } as unknown as File)

describe('buildResumeUploadPlan — content-hash mapping (never filename)', () => {
  it('maps by hash even when filenames collide (resume.pdf × 2)', () => {
    // Two DIFFERENT résumés both named resume.pdf → distinct hashes.
    const fileA = fileRef('A')
    const fileB = fileRef('B')
    const fileByHash = new Map<string, File>([
      ['hashA', fileA],
      ['hashB', fileB],
    ])
    const batch = [bc('p1', 'hashA'), bc('p2', 'hashB')]
    const persisted = [cand('db1', 'p1'), cand('db2', 'p2')]

    const plan = buildResumeUploadPlan(batch, persisted, fileByHash)

    // Correct file goes to the correct candidate — NOT swapped by shared filename.
    expect(plan).toEqual([
      { candidateId: 'db1', file: fileA },
      { candidateId: 'db2', file: fileB },
    ])
  })

  it('omits a candidate whose file hash is not present (upload gate stays closed)', () => {
    const fileByHash = new Map<string, File>([['hashA', fileRef('A')]])
    const batch = [bc('p1', 'hashA'), bc('p2', 'hashB')] // hashB never uploaded
    const persisted = [cand('db1', 'p1'), cand('db2', 'p2')]

    const plan = buildResumeUploadPlan(batch, persisted, fileByHash)

    expect(plan.map((p) => p.candidateId)).toEqual(['db1'])
  })

  it('omits candidates lacking a pipeline correlation id, and batch rows with no hash', () => {
    const fileByHash = new Map<string, File>([['hashA', fileRef('A')]])
    const batch = [bc('p1', null), bc('p2', 'hashA')] // p1 has no hash
    const persisted = [cand('db1', 'p1'), cand('db2', undefined), cand('db3', 'p2')]

    const plan = buildResumeUploadPlan(batch, persisted, fileByHash)

    // db1's batch row has no hash; db2 has no pipeline id; only db3 resolves.
    expect(plan).toEqual([{ candidateId: 'db3', file: fileByHash.get('hashA') }])
  })
})
