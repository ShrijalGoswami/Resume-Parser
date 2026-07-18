import { ResumeAnalysisResponse, CombinedMatchResponse } from '../types/api';
import { BatchAnalysisResponse, CandidateResult } from '../types/batch';
import { CopilotResponse, ChatMessage, SuggestionGroup } from '../types/copilot';

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

/**
 * Recruiter Workspace: analyze one job description against many resumes.
 * Returns ranked candidates plus dashboard analytics.
 */
export async function analyzeBatch(
  jobDescription: string,
  files: File[]
): Promise<BatchAnalysisResponse> {
  const formData = new FormData();
  formData.append('job_description', jobDescription);
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/api/v1/batch-analysis`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to run batch analysis');
  }

  return response.json();
}

/**
 * Export a single batch candidate as a recruiter match PDF, reusing the
 * existing export-match-report endpoint by mapping the candidate onto the
 * match-report payload shape.
 */
export async function exportCandidateReport(candidate: CandidateResult): Promise<void> {
  const payload = {
    match_analysis: {
      job_match_score: candidate.overall_score,
      match_category: candidate.match_category,
      matching_skills: candidate.matching_skills,
      missing_skills: candidate.missing_skills,
      experience_relevance: candidate.experience_relevance,
      relevant_projects: candidate.relevant_projects,
      less_relevant_projects: [],
      candidate_strengths: candidate.strengths,
      areas_for_improvement: candidate.weaknesses,
      hiring_recommendation: candidate.recommendation,
      recommendation_explanation: candidate.recommendation_explanation,
    },
    resume_data: {
      name: candidate.name || 'Candidate',
      email: candidate.email || '',
      phone: candidate.phone || '',
    },
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/export-match-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to export candidate report');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Candidate_Report_${payload.resume_data.name.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * AI Recruiter Copilot: ask a grounded question about a candidate. The full
 * candidate object (already analyzed by the batch pipeline) and job description
 * are sent so the backend rebuilds context cheaply without re-parsing.
 */
export async function sendCopilotMessage(
  candidate: CandidateResult,
  jobDescription: string,
  history: ChatMessage[],
  message: string
): Promise<CopilotResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate,
      job_description: jobDescription,
      history,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Copilot request failed');
  }

  return response.json();
}

/** Fetch configurable copilot quick-action suggestions. */
export async function fetchCopilotSuggestions(): Promise<SuggestionGroup[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/copilot/suggestions`);
  if (!response.ok) throw new Error('Failed to load suggestions');
  const data = await response.json();
  return data.groups as SuggestionGroup[];
}
