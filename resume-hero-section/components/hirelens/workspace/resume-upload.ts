/**
 * Résumé binary storage wiring (A3). After the add-candidates flow persists a
 * batch, the ORIGINAL résumé files (held in the browser) are uploaded to the
 * private bucket so the download gate can open. Candidates are mapped to their
 * file by CONTENT HASH — never filename, because `resume.pdf` / `CV.pdf`
 * collisions would misattach one candidate's résumé (PII) to another.
 *
 * Chain: persisted candidate.metadata.pipeline_candidate_id → batch candidate
 * (file_hash) → the original File whose SHA-256 matches. This module is pure and
 * unit-tested; the WebCrypto hashing is isolated in `sha256Hex`/`hashFiles`.
 */
import type { CandidateResult } from '@/types/batch'
import type { Candidate } from '@/types/campaign'

/** SHA-256 hex (lowercase) of raw bytes — matches the backend's `file_hash`
 * (`hashlib.sha256(data).hexdigest()`). */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash each File once → content-hash → File. Identical content collapses to one
 * entry, which is correct: the batch already deduped by hash. */
export async function hashFiles(files: File[]): Promise<Map<string, File>> {
  const byHash = new Map<string, File>()
  for (const f of files) {
    byHash.set(await sha256Hex(await f.arrayBuffer()), f)
  }
  return byHash
}

export interface ResumeUploadItem {
  candidateId: string
  file: File
}

/**
 * Build the résumé-upload plan by content hash. Pure — takes an already-computed
 * hash→File map so it is fully unit-testable without WebCrypto. Candidates whose
 * file cannot be resolved (no hash, unmatched, failed pipeline) are simply
 * omitted — their download gate stays closed (honest, never a 404).
 */
export function buildResumeUploadPlan(
  batchCandidates: CandidateResult[],
  persisted: Candidate[],
  fileByHash: Map<string, File>,
): ResumeUploadItem[] {
  // pipeline candidate id → original File (resolved via content hash).
  const fileByPipelineId = new Map<string, File>()
  for (const bc of batchCandidates) {
    if (!bc.file_hash) continue
    const file = fileByHash.get(bc.file_hash)
    if (file) fileByPipelineId.set(bc.candidate_id, file)
  }

  const plan: ResumeUploadItem[] = []
  for (const c of persisted) {
    const pid = c.metadata?.['pipeline_candidate_id']
    if (typeof pid !== 'string') continue
    const file = fileByPipelineId.get(pid)
    if (file) plan.push({ candidateId: c.id, file })
  }
  return plan
}

/**
 * Run `fn` over items with bounded concurrency. Best-effort: a rejected item is
 * swallowed (its résumé simply isn't stored) so one failure never aborts the rest
 * or the ingestion. Returns the count that succeeded.
 */
export async function runPooled<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<number> {
  let index = 0
  let ok = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (index < items.length) {
      const item = items[index++]
      try {
        await fn(item)
        ok++
      } catch {
        /* best-effort: leave resume_path null; the recruiter can retry later */
      }
    }
  })
  await Promise.all(workers)
  return ok
}
