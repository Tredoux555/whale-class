// lib/montree/hooks/useClassroomWorks.ts
//
// Lazy-loads every work in a classroom (all areas, flat) for cross-area
// search. Extracted from WorkWheelPicker's globalWorks pattern so the new
// Photo Audit "This is…" sheet can reuse the same source of truth.
//
// Fires ONE fetch on first use per hook instance, then caches in state.

'use client';

import { useState, useEffect, useRef } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';

export interface ClassroomWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_key: string;
  area_name: string;
  area_color: string;
  sequence?: number;
  status?: string;
}

interface UseClassroomWorksResult {
  works: ClassroomWork[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Load all works for a classroom (across all areas). Fires once when
 * `enabled` is true. Pass `enabled=false` to defer until a user action
 * (e.g. first keystroke in a search box).
 */
export function useClassroomWorks(
  classroomId: string | null | undefined,
  enabled: boolean = true
): UseClassroomWorksResult {
  const [works, setWorks] = useState<ClassroomWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled || !classroomId || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch(`/api/montree/curriculum?classroom_id=${classroomId}`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => {
        const flat: ClassroomWork[] = (data.curriculum || []).map((w: any) => {
          const areaKey: string = w.area?.area_key || 'other';
          const areaName: string =
            w.area?.name || AREA_CONFIG[areaKey]?.name || areaKey;
          const areaColor: string =
            w.area?.color || AREA_CONFIG[areaKey]?.color || '#888';
          return {
            id: w.id,
            name: w.name,
            name_chinese: w.name_chinese,
            area_key: areaKey,
            area_name: areaName,
            area_color: areaColor,
            sequence: w.sequence,
            status: w.status,
          };
        });
        setWorks(flat);
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        console.error('[useClassroomWorks] load failed:', err);
        setError(err?.message || 'Failed to load classroom works');
        loadedRef.current = false;
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [classroomId, enabled, reloadToken]);

  return {
    works,
    loading,
    error,
    reload: () => {
      loadedRef.current = false;
      setReloadToken(t => t + 1);
    },
  };
}
