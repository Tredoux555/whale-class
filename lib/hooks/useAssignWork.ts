// lib/hooks/useAssignWork.ts
// Hook for assigning works to students

import { useState, useCallback } from 'react';

interface AssignResult {
  success: boolean;
  assigned: number;
  studentIds: string[];
}

export function useAssignWork() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignResult | null>(null);

  const assignWork = useCallback(async (workId: string, studentIds: string[]) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/whale/teacher/assign-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, studentIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign work');
      }

      const data = await res.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { assignWork, loading, error, result, reset };
}


