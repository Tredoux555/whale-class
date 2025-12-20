// lib/hooks/useActivityGuidance.ts
// Hook for fetching AI-generated activity guidance

import { useState, useCallback } from 'react';

interface PresentationStep {
  step: number;
  action: string;
  keyPoint: string;
}

interface ActivityGuidance {
  presentationSteps: PresentationStep[];
  levelFocus: string;
  commonMistakes: string[];
  extensions: string[];
  readinessIndicators: string[];
  parentExplanation: string;
}

interface GuidanceResponse {
  guidance: ActivityGuidance | null;
  work: {
    id: string;
    name: string;
    chineseName: string;
  };
  level: number;
  generatedAt: string;
  error?: string;
}

export function useActivityGuidance() {
  const [data, setData] = useState<GuidanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGuidance = useCallback(async (
    workId: string,
    childId?: string,
    currentLevel?: number
  ) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/whale/ai/activity-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, childId, currentLevel }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get guidance');
      }

      const result = await res.json();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, getGuidance, reset };
}


