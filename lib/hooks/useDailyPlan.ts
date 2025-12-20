// lib/hooks/useDailyPlan.ts
// Hook for fetching AI-generated daily plan

import { useState, useCallback } from 'react';

interface Activity {
  name: string;
  area: string;
  type: 'new' | 'continue' | 'review';
  description: string;
  materials: string[];
  presentationTips: string[];
  signsOfMastery: string[];
  duration: string;
}

interface ScheduleItem {
  time: string;
  activity: string;
  notes?: string;
}

interface DailyPlan {
  greeting: string;
  activities: Activity[];
  schedule: ScheduleItem[];
  parentNote: string;
}

interface DailyPlanResponse {
  plan: DailyPlan | null;
  childName: string;
  generatedAt: string;
  error?: string;
  rawResponse?: string;
}

export function useDailyPlan() {
  const [data, setData] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (childId: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/whale/ai/daily-plan/${childId}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate plan');
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

  return { data, loading, error, generatePlan };
}


