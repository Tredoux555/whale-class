// lib/hooks/useParentDashboard.ts
// Hook for fetching parent dashboard data

import { useState, useEffect, useCallback } from 'react';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  avatar_url: string | null;
  age: number | null;
}

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
  status: string;
  current_level: number;
  max_level: number;
  started_at: string | null;
  completed_at: string | null;
  curriculum_roadmap: {
    id: string;
    name: string;
    area_id: string;
    category_id: string;
    levels: any[];
    parent_description: string | null;
    why_it_matters: string | null;
    home_connection: string | null;
    curriculum_areas: { name: string; color: string; icon: string };
    curriculum_categories: { name: string };
  };
}

interface Milestone {
  type: string;
  title: string;
  date?: string;
  area?: string;
}

interface DashboardData {
  child: Child;
  areaProgress: AreaProgress[];
  recentCompletions: WorkCompletion[];
  inProgressWorks: WorkCompletion[];
  stats: {
    totalCompleted: number;
    totalInProgress: number;
    weeklyCompletions: number;
    currentStreak: number;
    totalWatchTimeMinutes: number;
    completedVideos: number;
  };
  milestones: Milestone[];
}

export function useParentDashboard(childId: string | null) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!childId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/whale/parent/dashboard/${childId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}


