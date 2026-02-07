// lib/hooks/useNextRecommendations.ts
// Hook for fetching recommended next works

import { useState, useEffect, useCallback } from 'react';

interface Level {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface RecommendedWork {
  id: string;
  name: string;
  description: string;
  area_id: string;
  age_range: string;
  materials: string[];
  levels: Level[];
  parent_description: string | null;
  why_it_matters: string | null;
  home_connection: string | null;
  curriculum_areas: {
    name: string;
    color: string;
    icon: string;
  };
  curriculum_categories: {
    name: string;
  };
}

export function useNextRecommendations(childId: string | null, areaId?: string | null, limit: number = 5) {
  const [works, setWorks] = useState<RecommendedWork[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!childId) {
      setWorks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (areaId) params.append('area', areaId);

      const res = await fetch(`/api/whale/curriculum/next-works/${childId}?${params}`);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await res.json();
      setWorks(data.works || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [childId, areaId, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { works, total, loading, error, refetch: fetchRecommendations };
}


