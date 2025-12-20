// lib/hooks/useAvailableWorks.ts
// Hook for fetching works available to assign

import { useState, useEffect, useCallback } from 'react';

interface Work {
  id: string;
  name: string;
  description: string;
  area_id: string;
  category_id: string;
  age_range: string;
  levels: any[];
}

interface Area {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  area_id: string;
}

export function useAvailableWorks(areaFilter?: string, categoryFilter?: string) {
  const [works, setWorks] = useState<Work[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch areas
      const areasRes = await fetch('/api/whale/curriculum/areas');
      const areasData = await areasRes.json();
      setAreas(areasData.areas || []);

      // Fetch categories
      const catsRes = await fetch('/api/whale/curriculum/categories');
      const catsData = await catsRes.json();
      setCategories(catsData.categories || []);

      // Fetch works with optional filters
      let url = '/api/whale/curriculum/works?';
      if (areaFilter) url += `area=${areaFilter}&`;
      if (categoryFilter) url += `category=${categoryFilter}&`;

      const worksRes = await fetch(url);
      const worksData = await worksRes.json();
      setWorks(worksData.works || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [areaFilter, categoryFilter]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  return { works, areas, categories, loading, error, refetch: fetchWorks };
}


