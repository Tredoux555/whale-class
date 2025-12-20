// lib/hooks/useParentChildren.ts
// Hook for fetching parent's children

import { useState, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  avatar_url: string | null;
  age: number | null;
  created_at: string;
}

export function useParentChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/whale/parent/children');
        if (!res.ok) throw new Error('Failed to fetch children');
        const data = await res.json();
        setChildren(data.children || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchChildren();
  }, []);

  return { children, loading, error };
}


