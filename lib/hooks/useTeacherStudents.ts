// lib/hooks/useTeacherStudents.ts
// Hook for fetching teacher's students

import { useState, useEffect, useCallback } from 'react';

interface StudentStats {
  completed: number;
  inProgress: number;
}

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  avatar_url: string | null;
  age: number | null;
  stats: StudentStats;
  lastActivity: string | null;
}

export function useTeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/whale/teacher/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      
      const data = await res.json();
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, total, loading, error, refetch: fetchStudents };
}


