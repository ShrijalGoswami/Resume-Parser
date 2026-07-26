import { BatchAnalysisResponse } from '../types/batch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Stateless batch analysis — one job description against many resumes.
 *
 * Uses XHR rather than fetch so real upload progress (0–100% of bytes sent) can
 * be reported through `onUploadProgress`; the upload queue shows it. The
 * /batch-analysis endpoint is public (stateless AI), so no auth header is sent.
 *
 * This is the only surviving client in this module. The V1 single-resume flow
 * (`analyzeAts`, `analyzeMatch`, `exportAtsReport`, `exportMatchReport`,
 * `exportCandidateReport`) and the stateless copilot (`sendCopilotMessage`) were
 * removed with the `/results` and `/recruiter` pages that were their only
 * callers; everything authenticated lives in the per-domain `services/*-api.ts`
 * clients, and conversational copilot in `services/copilot-api.ts`.
 */
export function analyzeBatchWithProgress(
  jobDescription: string,
  files: File[],
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<BatchAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('job_description', jobDescription);
    files.forEach((f) => formData.append('files', f));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/v1/batch-analysis`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from analysis service'));
        }
      } else {
        let detail = 'Failed to analyze resume';
        try {
          detail = JSON.parse(xhr.responseText).detail || detail;
        } catch {
          /* keep default */
        }
        reject(new Error(detail));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during analysis'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener('abort', () => xhr.abort());
    }
    xhr.send(formData);
  });
}
