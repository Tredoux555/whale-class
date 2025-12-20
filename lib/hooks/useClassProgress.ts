// lib/hooks/useClassProgress.ts
// Hook for fetching class-wide progress data

import { useState, useEffect, useCallback } from 'react';

interface AreaProgress {
  id: string;
  name: string;
  color: string;
  icon: string;
  totalWorks: number;
  classCompleted: number;
  avgPercentage: number;
}

interface RecentActivity {
  child_id: string;
  work_id: string;
  status: string;
  completed_at: string | null;
  started_at: string | null;
  studentName: string;
  workName: string;
  areaId: string;
}

interface StudentAttention {
  id: string;
  name: string;
}

interface ClassProgress {
  totalStudents: number;
  areaProgress: AreaProgress[];
  recentActivity: RecentActivity[];
  needsAttention: StudentAttention[];
}

export function useClassProgress() {
  const [data, setData] = useState<ClassProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/whale/teacher/class-progress');
      if (!res.ok) throw new Error('Failed to fetch class progress');
      
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { data, loading, error, refetch: fetchProgress };
}


