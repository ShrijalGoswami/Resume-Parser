import { BatchAnalysisResponse } from '../types/batch';
import { authHeaders, API_BASE_URL } from './auth-headers';
import { apiErrorFrom } from '@/lib/api-error';

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
            // `/batch-analysis` is where the résumé quota is enforced, so this
            // is the one client whose 402 body matters most — it carries
            // `used`, `limit` and `required_plan`, which is everything the wall
            // needs to say "2 of 2 used · upgrade to Plus for 25 a month".
            //
            // It used to `reject(new Error(detail))`, discarding the status and
            // the entire payload, so an exhausted customer got a bare sentence
            // in a red line and no way forward. The nine other clients were
            // converted in Phase 1; this XHR path was missed because it does
            // not go through the shared `fetch` helper.
            let body: unknown = null;
            try {
              body = JSON.parse(xhr.responseText);
            } catch {
              /* non-JSON error body — apiErrorFrom falls back to the status */
            }
            reject(apiErrorFrom(xhr.status, body));
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
