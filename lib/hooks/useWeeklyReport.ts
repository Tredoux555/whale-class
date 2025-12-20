// lib/hooks/useWeeklyReport.ts
// Hook for fetching weekly progress report

import { useState, useEffect, useCallback } from 'react';

interface WeeklyReport {
  childName: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    worksCompleted: number;
    videosWatched: number;
    totalWatchMinutes: number;
    activeDays: number;
  };
  completionsByDay: Record<string, number>;
  completionsByArea: Record<string, { count: number; color: string; icon: string }>;
  completedWorks: {
    name: string;
    area: string;
    areaIcon: string;
    completedAt: string;
  }[];
}

export function useWeeklyReport(childId: string | null) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!childId) {
      setReport(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/whale/parent/weekly-report/${childId}`);
      if (!res.ok) throw new Error('Failed to fetch report');
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}


