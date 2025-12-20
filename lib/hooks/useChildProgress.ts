// lib/hooks/useChildProgress.ts
// React hook for child progress tracking

import { useState, useEffect, useCallback } from 'react';

interface AreaProgress {
  area_id: string;
  area_name: string;
  area_color: string;
  area_icon: string;
  total_works: number;
  completed_works: number;
  in_progress_works: number;
  completion_percentage: number;
}

interface WorkCompletion {
  work_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  current_level: number;
  max_level: number;
  level_completions: Record<number, { completed_at: string }>;
  started_at: string | null;
  completed_at: string | null;
  curriculum_roadmap: {
    id: string;
    name: string;
    area_id: string;
    category_id: string;
    levels: any[];
  };
}

interface ChildProgress {
  child: {
    id: string;
    name: string;
    date_of_birth: string;
  };
  currentPosition: any;
  areaProgress: AreaProgress[];
  completedWorks: WorkCompletion[];
  stats: {
    totalCompleted: number;
    totalInProgress: number;
    totalWorks: number;
    overallPercentage: number;
  };
}

export function useChildProgress(childId: string | null) {
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!childId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/whale/curriculum/progress/${childId}`);
      if (!res.ok) throw new Error('Failed to fetch progress');
      const data = await res.json();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const startWork = async (workId: string) => {
    if (!childId) return;
    
    await fetch(`/api/whale/curriculum/progress/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId, action: 'start' }),
    });
    
    await fetchProgress();
  };

  const completeLevel = async (workId: string, level: number) => {
    if (!childId) return;
    
    await fetch(`/api/whale/curriculum/progress/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId, action: 'complete_level', level }),
    });
    
    await fetchProgress();
  };

  const completeWork = async (workId: string) => {
    if (!childId) return;
    
    await fetch(`/api/whale/curriculum/progress/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId, action: 'complete_work' }),
    });
    
    await fetchProgress();
  };

  const resetWork = async (workId: string) => {
    if (!childId) return;
    
    await fetch(`/api/whale/curriculum/progress/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId, action: 'reset' }),
    });
    
    await fetchProgress();
  };

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress,
    startWork,
    completeLevel,
    completeWork,
    resetWork,
  };
}


