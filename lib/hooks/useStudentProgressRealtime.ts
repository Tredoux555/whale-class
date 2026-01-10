'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkStatusItem {
  workId: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  categoryName: string;
}

interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;
  currentWorkName: string;
  worksStatus: WorkStatusItem[];
}

interface OverallProgress {
  totalWorks: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

export interface ProgressSummaryResponse {
  childId: string;
  childName: string;
  lastUpdated: string;
  overallProgress: OverallProgress;
  areas: AreaProgressData[];
}

interface UseStudentProgressRealtimeReturn {
  progress: ProgressSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface ChildWorkCompletionRow {
  id: string;
  child_id: string;
  curriculum_work_id: string;
  work_id: string;
  status: string;
  current_level: number;
  started_at: string | null;
  completed_at: string | null;
  completion_date: string | null;
  notes: string | null;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useStudentProgressRealtime(
  studentId: string | null
): UseStudentProgressRealtimeReturn {
  const [progress, setProgress] = useState<ProgressSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProgress = useCallback(async (): Promise<void> => {
    if (!studentId) {
      setProgress(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/whale/student/${studentId}/progress-summary`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch progress: ${response.status}`
        );
      }

      const data: ProgressSummaryResponse = await response.json();

      if (mountedRef.current) {
        setProgress(data);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(new Error(errorMessage));
        console.error('[useStudentProgressRealtime] Fetch error:', errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [studentId]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    mountedRef.current = true;

    if (!studentId) {
      setProgress(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!supabaseRef.current) {
      try {
        supabaseRef.current = getSupabaseBrowserClient();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Supabase';
        setError(new Error(errorMessage));
        setLoading(false);
        return;
      }
    }

    const supabase = supabaseRef.current;

    const debouncedRefetch = debounce(() => {
      if (mountedRef.current) {
        fetchProgress();
      }
    }, 100);

    const handleRealtimeChange = (
      payload: RealtimePostgresChangesPayload<ChildWorkCompletionRow>
    ) => {
      console.debug('[useStudentProgressRealtime] Received change:', payload.eventType);
      debouncedRefetch();
    };

    const channelName = `student-progress-${studentId}-${Date.now()}`;

    channelRef.current = supabase
      .channel(channelName)
      .on<ChildWorkCompletionRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'child_work_completion',
          filter: `child_id=eq.${studentId}`,
        },
        handleRealtimeChange
      )
      .on<ChildWorkCompletionRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'child_work_completion',
          filter: `child_id=eq.${studentId}`,
        },
        handleRealtimeChange
      )
      .on<ChildWorkCompletionRow>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'child_work_completion',
          filter: `child_id=eq.${studentId}`,
        },
        handleRealtimeChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.debug(
            `[useStudentProgressRealtime] Subscribed to realtime updates for student ${studentId}`
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(
            `[useStudentProgressRealtime] Subscription error: ${status}`,
            err
          );
          if (mountedRef.current) {
            setError(new Error(`Realtime subscription failed: ${status}`));
          }
        }
      });

    fetchProgress();

    return () => {
      mountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current
          .removeChannel(channelRef.current)
          .then(() => {
            console.debug(
              `[useStudentProgressRealtime] Unsubscribed from realtime updates`
            );
          })
          .catch((err) => {
            console.error(
              '[useStudentProgressRealtime] Error unsubscribing:',
              err
            );
          });
        channelRef.current = null;
      }
    };
  }, [studentId, fetchProgress]);

  return {
    progress,
    loading,
    error,
    refetch,
  };
}

// ============================================================================
// MULTIPLE STUDENTS HOOK
// ============================================================================

export function useMultipleStudentsProgressRealtime(
  studentIds: string[]
): Map<string, UseStudentProgressRealtimeReturn> {
  const [results, setResults] = useState<Map<string, UseStudentProgressRealtimeReturn>>(
    new Map()
  );

  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef<boolean>(true);
  const progressMapRef = useRef<Map<string, ProgressSummaryResponse | null>>(new Map());
  const loadingMapRef = useRef<Map<string, boolean>>(new Map());
  const errorMapRef = useRef<Map<string, Error | null>>(new Map());

  useEffect(() => {
    mountedRef.current = true;

    if (studentIds.length === 0) {
      setResults(new Map());
      return;
    }

    if (!supabaseRef.current) {
      try {
        supabaseRef.current = getSupabaseBrowserClient();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Supabase';
        const errorMap = new Map<string, UseStudentProgressRealtimeReturn>();
        studentIds.forEach((id) => {
          errorMap.set(id, {
            progress: null,
            loading: false,
            error: new Error(errorMessage),
            refetch: async () => {},
          });
        });
        setResults(errorMap);
        return;
      }
    }

    const supabase = supabaseRef.current;

    const fetchAllProgress = async () => {
      const newResults = new Map<string, UseStudentProgressRealtimeReturn>();

      await Promise.all(
        studentIds.map(async (studentId) => {
          try {
            loadingMapRef.current.set(studentId, true);
            
            const response = await fetch(
              `/api/whale/student/${studentId}/progress-summary`
            );
            
            if (!response.ok) {
              throw new Error(`Failed to fetch: ${response.status}`);
            }
            
            const data: ProgressSummaryResponse = await response.json();
            progressMapRef.current.set(studentId, data);
            errorMapRef.current.set(studentId, null);
          } catch (err) {
            progressMapRef.current.set(studentId, null);
            errorMapRef.current.set(studentId, 
              err instanceof Error ? err : new Error('Unknown error')
            );
          } finally {
            loadingMapRef.current.set(studentId, false);
          }
        })
      );

      if (mountedRef.current) {
        studentIds.forEach((studentId) => {
          newResults.set(studentId, {
            progress: progressMapRef.current.get(studentId) || null,
            loading: loadingMapRef.current.get(studentId) || false,
            error: errorMapRef.current.get(studentId) || null,
            refetch: async () => {},
          });
        });
        setResults(newResults);
      }
    };

    const createDebouncedRefetch = (studentId: string) => {
      return debounce(async () => {
        if (!mountedRef.current) return;
        
        try {
          const response = await fetch(
            `/api/whale/student/${studentId}/progress-summary`
          );
          
          if (response.ok) {
            const data: ProgressSummaryResponse = await response.json();
            progressMapRef.current.set(studentId, data);
            errorMapRef.current.set(studentId, null);
            
            setResults((prev) => {
              const newMap = new Map(prev);
              newMap.set(studentId, {
                progress: data,
                loading: false,
                error: null,
                refetch: async () => {},
              });
              return newMap;
            });
          }
        } catch (err) {
          console.error(`Error refetching progress for ${studentId}:`, err);
        }
      }, 100);
    };

    const channelName = `multi-student-progress-${Date.now()}`;

    channelRef.current = supabase
      .channel(channelName)
      .on<ChildWorkCompletionRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'child_work_completion',
        },
        (payload) => {
          const record = payload.new as ChildWorkCompletionRow | undefined;
          const oldRecord = payload.old as ChildWorkCompletionRow | undefined;
          const childId = record?.child_id || oldRecord?.child_id;
          
          if (childId && studentIds.includes(childId)) {
            const debouncedRefetch = createDebouncedRefetch(childId);
            debouncedRefetch();
          }
        }
      )
      .subscribe();

    fetchAllProgress();

    return () => {
      mountedRef.current = false;
      
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studentIds.join(',')]);

  return results;
}

export default useStudentProgressRealtime;
