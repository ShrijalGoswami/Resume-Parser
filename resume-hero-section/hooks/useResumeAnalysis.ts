import { useState } from 'react';
import { analyzeAts } from '../services/api';
import { ResumeAnalysisResponse } from '../types/api';

export function useResumeAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    resume_data: ResumeAnalysisResponse;
    analysis: { ats_score: number; ats_tips: string[] };
  } | null>(null);

  const analyze = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeAts(file);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { analyze, isLoading, error, data };
}
