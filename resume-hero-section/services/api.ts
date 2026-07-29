import { BatchAnalysisResponse } from '../types/batch';
import { authHeaders, API_BASE_URL } from './auth-headers';

/**
 * Stateless batch analysis — one job description against many resumes.
 *
 * Uses XHR rather than fetch so real upload progress (0–100% of bytes sent) can
 * be reported through `onUploadProgress`; the upload queue shows it.
 *
 * AUTHENTICATED as of the RBAC sweep. `/batch-analysis` was genuinely public
 * while it was pure stateless AI, and this client was written to match. Adding
 * `dependencies=[RequireAiUse]` to the route broke that contract silently: the
 * request carried no token, so every candidate upload answered 401 — which is
 * the whole "Add candidates" flow, the product's main intake path. Nothing in
 * the type system or the test suite connects a decorator on a Python route to a
 * deliberately header-less XHR in TypeScript; it took reading the access log.
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
  // The header has to be resolved before the Promise executor, because reading
  // the Supabase session is async and `xhr.open` must precede
  // `setRequestHeader`. `authHeaders()` throws when signed out, which is the
  // behaviour we want here too — fail at the client rather than upload the
  // files and collect a 401.
  return authHeaders().then(
    (headers) =>
      new Promise<BatchAnalysisResponse>((resolve, reject) => {
        const formData = new FormData();
        formData.append('job_description', jobDescription);
        files.forEach((f) => formData.append('files', f));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/v1/batch-analysis`);
        // Content-Type is deliberately left to the browser so it can set the
        // multipart boundary.
        Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
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
      }),
  );
}
