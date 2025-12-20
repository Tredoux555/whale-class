// lib/hooks/useWeeklyPlan.ts
// Hook for fetching AI-generated weekly plan

import { useState, useCallback } from 'react';

interface DayActivity {
  name: string;
  area: string;
  type: 'new' | 'continue' | 'review';
  focusPoint: string;
}

interface DayPlan {
  day: string;
  theme?: string;
  activities: DayActivity[];
}

interface WeeklyPlan {
  weeklyGoals: string[];
  days: DayPlan[];
  materialsToPrep: string[];
  teacherNotes: string;
  parentCommunication: string;
}

interface WeeklyPlanResponse {
  plan: WeeklyPlan | null;
  childName: string;
  weekStarting: string;
  generatedAt: string;
  error?: string;
}

export function useWeeklyPlan() {
  const [data, setData] = useState<WeeklyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (childId: string, focusAreas?: string[]) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/whale/ai/weekly-plan/${childId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusAreas }),
      });

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


