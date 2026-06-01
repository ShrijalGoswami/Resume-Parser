import { useState } from 'react';
import { analyzeMatch } from '../services/api';
import { CombinedMatchResponse } from '../types/api';

export function useMatchAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CombinedMatchResponse | null>(null);

  const analyze = async (file: File, jobDescription: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeMatch(file, jobDescription);
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
