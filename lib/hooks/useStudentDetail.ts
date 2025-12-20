// lib/hooks/useStudentDetail.ts
// Hook for fetching detailed student progress

import { useState, useEffect, useCallback } from 'react';

interface AreaProgress {
  id: string;
  name: string;
  color: string;
  icon: string;
  sequence: number;
  totalWorks: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

interface WorkCompletion {
  work_id: string;
  status: string;
  current_level: number;
  max_level: number;
  started_at: string | null;
  completed_at: string | null;
  workName: string;
  areaName: string;
  areaColor: string;
  areaIcon: string;
}

interface StudentDetail {
  student: {
    id: string;
    name: string;
    date_of_birth: string;
    avatar_url: string | null;
    age: number | null;
  };
  areaProgress: AreaProgress[];
  recentCompletions: WorkCompletion[];
  inProgressWorks: WorkCompletion[];
  stats: {
    totalCompleted: number;
    totalInProgress: number;
    totalWorks: number;
    overallPercentage: number;
  };
}

export function useStudentDetail(studentId: string | null) {
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!studentId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/whale/teacher/student/${studentId}`);
      if (!res.ok) throw new Error('Failed to fetch student details');
      
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}


