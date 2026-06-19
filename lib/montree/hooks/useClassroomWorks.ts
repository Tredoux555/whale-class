// lib/montree/hooks/useClassroomWorks.ts
//
// Loads every work in a classroom (all areas, flat) for cross-area search in
// the Photo Audit "This is…" sheet.
//
// PERF (Jun 2026): the classroom curriculum is STATIC per classroom (~329
// works, changes only when a teacher adds a custom work). The sheet used to
// refetch the whole list on every photo open — a full ~500ms round-trip each
// time a teacher tagged a photo, which made the sheet feel laggy on the single
// surface teachers touch most. This now caches the works at MODULE scope
// (shared across every sheet open + every photo + every hook instance) with a
// short TTL and stale-while-revalidate:
//   • cache fresh (< TTL)  → served instantly, ZERO network
//   • cache stale (> TTL)  → served instantly, refreshed silently in background
//   • no cache             → one blocking fetch (prefetch on page load avoids
//                            even this — see prefetchClassroomWorks)
//   • reload()             → forced refresh (keeps current list visible, no
//                            spinner) so a just-added custom work appears
// Net: tagging 20 photos in a session = one fetch, every open instant.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';

export interface ClassroomWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id: string;
  area_key: string;
  area_name: string;
  area_name_zh?: string;
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

interface RawCurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
  sequence?: number;
  status?: string;
  area?: {
    id?: string;
    area_key?: string;
    name?: string;
    name_chinese?: string;
    color?: string;
  };
}

// ─── Module-level cache (shared across all hook instances) ───────────────────
const TTL_MS = 60_000; // serve cached works without a network call for 60s
const worksCache = new Map<string, { works: ClassroomWork[]; ts: number }>();
const inflight = new Map<string, Promise<ClassroomWork[]>>();

function mapCurriculum(data: { curriculum?: RawCurriculumWork[] }): ClassroomWork[] {
  return (data.curriculum || []).map((w) => {
    const areaKey: string = w.area?.area_key || 'other';
    const areaName: string = w.area?.name || AREA_CONFIG[areaKey]?.name || areaKey;
    const areaNameZh: string | undefined = w.area?.name_chinese || AREA_CONFIG[areaKey]?.nameZh;
    const areaColor: string = w.area?.color || AREA_CONFIG[areaKey]?.color || '#888';
    return {
      id: w.id,
      name: w.name,
      name_chinese: w.name_chinese,
      area_id: w.area_id || w.area?.id || '',
      area_key: areaKey,
      area_name: areaName,
      area_name_zh: areaNameZh,
      area_color: areaColor,
      sequence: w.sequence,
      status: w.status,
    };
  });
}

// Fetch + write cache, de-duping concurrent callers for the same classroom.
function fetchWorks(classroomId: string, signal?: AbortSignal): Promise<ClassroomWork[]> {
  const existing = inflight.get(classroomId);
  if (existing) return existing;
  const p = fetch(`/api/montree/curriculum?classroom_id=${classroomId}`, {
    signal,
    credentials: 'include',
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((data) => {
      const flat = mapCurriculum(data);
      worksCache.set(classroomId, { works: flat, ts: Date.now() });
      return flat;
    })
    .finally(() => {
      inflight.delete(classroomId);
    });
  inflight.set(classroomId, p);
  return p;
}

/**
 * Warm the module cache ahead of time (e.g. on photo-audit page mount) so the
 * first time a teacher opens the "This is…" sheet there's no spinner at all.
 * Fire-and-forget; no-op if already cached fresh or a fetch is already in flight.
 */
export function prefetchClassroomWorks(classroomId: string | null | undefined): void {
  if (!classroomId) return;
  const cached = worksCache.get(classroomId);
  if (cached && Date.now() - cached.ts < TTL_MS) return;
  if (inflight.has(classroomId)) return;
  fetchWorks(classroomId).catch(() => {});
}

/**
 * Load all works for a classroom (across all areas). Serves instantly from the
 * module cache when warm; otherwise fetches once. Pass `enabled=false` to defer
 * until a user action.
 */
export function useClassroomWorks(
  classroomId: string | null | undefined,
  enabled: boolean = true
): UseClassroomWorksResult {
  const [works, setWorks] = useState<ClassroomWork[]>(() => {
    if (!classroomId) return [];
    return worksCache.get(classroomId)?.works || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !classroomId) return;

    const cached = worksCache.get(classroomId);
    const isFresh = cached && Date.now() - cached.ts < TTL_MS;

    // Reflect whatever is cached immediately (instant, no spinner).
    if (cached) setWorks(cached.works);

    // Fresh cache → done, zero network.
    if (isFresh) {
      setLoading(false);
      return;
    }

    // Stale or missing → fetch. Only show the spinner when there's nothing to
    // show yet; a stale cache stays visible while it refreshes in the background.
    const controller = new AbortController();
    if (!cached) {
      setLoading(true);
      setError(null);
    }
    fetchWorks(classroomId, controller.signal)
      .then((fresh) => {
        setWorks(fresh);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('[useClassroomWorks] load failed:', err);
        if (!worksCache.has(classroomId)) {
          setError(err?.message || 'Failed to load classroom works');
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [classroomId, enabled]);

  // Forced refresh — used after a custom work is added so it's searchable.
  // Fetches fresh in the BACKGROUND and overwrites the cache on success, but
  // does NOT clear the existing cache first — so the current list stays on
  // screen and a rapid reopen for the next photo still hits a warm cache
  // (never the spinner path). fetchWorks always hits the network, so the
  // just-added work still arrives.
  const reload = useCallback(() => {
    if (!classroomId) return;
    fetchWorks(classroomId)
      .then((fresh) => setWorks(fresh))
      .catch(() => {});
  }, [classroomId]);

  return { works, loading, error, reload };
}
