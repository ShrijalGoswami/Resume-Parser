import { ResumeAnalysisResponse, CombinedMatchResponse } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Executes the ATS Analysis workflow in a single stateless request:
 * the resume is uploaded, parsed and analyzed by POST /api/v1/ats-analysis.
 */
export async function analyzeAts(file: File): Promise<{
  resume_data: ResumeAnalysisResponse;
  analysis: { ats_score: number; ats_tips: string[] };
}> {
  const formData = new FormData();
  formData.append('file', file);

  const analysisRes = await fetch(`${API_BASE_URL}/api/v1/ats-analysis`, {
    method: 'POST',
    body: formData,
  });

  if (!analysisRes.ok) {
    const errorData = await analysisRes.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to analyze resume');
  }

  return analysisRes.json();
}

/**
 * Executes the Job Match workflow:
 * Sends both the resume file and job description to the match analysis endpoint.
 */
export async function analyzeMatch(
  file: File,
  jobDescription: string
): Promise<CombinedMatchResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_description', jobDescription);

  const response = await fetch(`${API_BASE_URL}/api/v1/match-analysis`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to run match analysis');
  }

  return response.json();
}

/**
 * Executes the ATS Export workflow:
 */
export async function exportAtsReport(data: any): Promise<void> {
  const payload = {
    analysis: data.analysis,
    resume_data: {
      name: data.resume_data.name || "Candidate",
      email: data.resume_data.email || "",
      phone: data.resume_data.phone || ""
    }
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/export-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to export ATS report');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ATS_Report_${payload.resume_data.name.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Executes the Match Export workflow:
 */
export async function exportMatchReport(data: any): Promise<void> {
  const payload = {
    match_analysis: data.match_analysis,
    resume_data: {
      name: data.resume_data.name || "Candidate",
      email: data.resume_data.email || "",
      phone: data.resume_data.phone || ""
    }
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/export-match-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to export Match report');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Match_Report_${payload.resume_data.name.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
