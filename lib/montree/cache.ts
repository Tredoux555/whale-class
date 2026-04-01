// lib/montree/cache.ts
// Zero-dependency in-memory SWR cache for Montree API calls.
// Makes the app feel instant — shows cached data immediately, refreshes in background.
//
// Usage:
//   import { useMontreeData, invalidateCache } from '@/lib/montree/cache';
//
//   const { data, loading, error, refetch } = useMontreeData<Child[]>(
//     `/api/montree/children?classroom_id=${id}`,
//     { staleTime: 30_000 }
//   );
//
//   // After a mutation:
//   invalidateCache('/api/montree/children');

import { useState, useEffect, useRef, useCallback } from 'react';

// --- Cache Store ---

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const subscribers = new Map<string, Set<() => void>>();

/** Default stale time: 30 seconds */
const DEFAULT_STALE_TIME = 30_000;

/** Max cache entries before LRU eviction */
const MAX_CACHE_SIZE = 100;

function evictOldest() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  cache.forEach((entry, key) => {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  });
  if (oldestKey) cache.delete(oldestKey);
}

// --- Public API ---

interface UseMontreeDataOptions {
  /** How long cached data is considered fresh (ms). Default: 30s */
  staleTime?: number;
  /** Skip fetching (e.g. when a dependency isn't ready yet) */
  enabled?: boolean;
  /** Don't refetch on window focus */
  disableRefocusRefetch?: boolean;
}

interface UseMontreeDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * React hook for fetching Montree API data with SWR caching.
 *
 * - Shows cached data instantly (no flash of loading state on revisit)
 * - Background refresh if data is stale
 * - Deduplicates concurrent requests to the same URL
 * - Refetches on window focus (after 30s stale)
 * - LRU eviction at 100 entries
 */
export function useMontreeData<T = unknown>(
  url: string | null,
  options: UseMontreeDataOptions = {}
): UseMontreeDataResult<T> {
  const {
    staleTime = DEFAULT_STALE_TIME,
    enabled = true,
    disableRefocusRefetch = false,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    const cached = cache.get(url);
    return cached ? (cached.data as T) : null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!url || !enabled) return false;
    return !cache.has(url);
  });
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchData = useCallback(async (showLoading = false) => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;

    // Deduplicate in-flight requests
    const existing = inflight.get(currentUrl);
    if (existing) {
      try {
        const result = await existing;
        if (mountedRef.current && urlRef.current === currentUrl) {
          setData(result as T);
          setLoading(false);
          setError(null);
        }
      } catch {}
      return;
    }

    if (showLoading && mountedRef.current) setLoading(true);

    const promise = fetch(currentUrl, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        // Store in cache
        cache.set(currentUrl, { data: json, timestamp: Date.now() });
        evictOldest();
        // Notify all subscribers of this URL
        subscribers.get(currentUrl)?.forEach(cb => cb());
        return json;
      });

    inflight.set(currentUrl, promise);

    try {
      const result = await promise;
      if (mountedRef.current && urlRef.current === currentUrl) {
        setData(result as T);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current && urlRef.current === currentUrl) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
        setLoading(false);
      }
    } finally {
      inflight.delete(currentUrl);
    }
  }, []);

  // Subscribe to cache updates from other components
  useEffect(() => {
    if (!url) return;
    const cb = () => {
      const cached = cache.get(url);
      if (cached && mountedRef.current) {
        setData(cached.data as T);
      }
    };
    if (!subscribers.has(url)) subscribers.set(url, new Set());
    subscribers.get(url)!.add(cb);
    return () => { subscribers.get(url)?.delete(cb); };
  }, [url]);

  // Initial fetch + stale check
  useEffect(() => {
    mountedRef.current = true;
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    const cached = cache.get(url);
    if (cached) {
      setData(cached.data as T);
      const isStale = Date.now() - cached.timestamp > staleTime;
      if (isStale) {
        // Background refresh — no loading spinner
        fetchData(false);
      } else {
        setLoading(false);
      }
    } else {
      // No cache — show loading, fetch
      fetchData(true);
    }

    return () => { mountedRef.current = false; };
  }, [url, enabled, staleTime, fetchData]);

  // Refetch on window focus (if stale)
  useEffect(() => {
    if (!url || !enabled || disableRefocusRefetch) return;
    const handleFocus = () => {
      const cached = cache.get(url);
      if (!cached || Date.now() - cached.timestamp > staleTime) {
        fetchData(false);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [url, enabled, staleTime, disableRefocusRefetch, fetchData]);

  const refetch = useCallback(() => {
    if (urlRef.current) {
      cache.delete(urlRef.current);
      fetchData(true);
    }
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Invalidate cache entries matching a URL prefix.
 * Call after mutations to ensure fresh data.
 *
 * Examples:
 *   invalidateCache('/api/montree/children');  // All children queries
 *   invalidateCache('/api/montree/progress');  // All progress queries
 */
export function invalidateCache(urlPrefix: string): void {
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.startsWith(urlPrefix)) keysToDelete.push(key);
  });
  keysToDelete.forEach(k => cache.delete(k));
  // Notify subscribers to refetch
  keysToDelete.forEach(k => {
    subscribers.get(k)?.forEach(cb => cb());
  });
}

/**
 * Set cache data directly (useful after a mutation returns updated data).
 */
export function setCacheData(url: string, data: unknown): void {
  cache.set(url, { data, timestamp: Date.now() });
  subscribers.get(url)?.forEach(cb => cb());
}

/**
 * Prefetch a URL into cache (call on hover/focus for instant navigation).
 */
export function prefetchUrl(url: string): void {
  if (cache.has(url)) return; // Already cached
  if (inflight.has(url)) return; // Already fetching
  const promise = fetch(url, { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) return; // Don't cache error responses
      return res.json();
    })
    .then(data => {
      if (data) {
        cache.set(url, { data, timestamp: Date.now() });
        evictOldest();
      }
    })
    .catch((err) => console.warn('[Cache] Prefetch failed:', err))
    .finally(() => inflight.delete(url));
  inflight.set(url, promise);
}

// --- Image Compression ---

/**
 * Compress an image file client-side using Canvas API.
 * Reduces a 5MB phone photo to ~100-200KB.
 * Zero dependencies — uses native browser APIs.
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    try {
    // Skip if already small
    if (file.size < 200_000) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          // Only use compressed if actually smaller
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original on error
    };

    img.src = url;
    } catch { resolve(file); } // Fallback to original if anything throws
  });
}
