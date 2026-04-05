// lib/montree/features/cache.ts
// Module-level feature cache with in-flight deduplication
// Pattern: sessionStorage-backed Map cache with 5-min TTL

import type { MontreeFeature } from './types';

const CACHE_TTL_MS = 30 * 1000; // 30 seconds — short TTL so feature toggles take effect quickly
const STORAGE_KEY_PREFIX = 'montree_features_';

interface CacheEntry {
  features: MontreeFeature[];
  fetchedAt: number;
}

// Module-level cache (survives re-renders, cleared on page reload)
const memoryCache = new Map<string, CacheEntry>();

// In-flight request deduplication — prevents concurrent fetches for same school
const inFlightRequests = new Map<string, Promise<MontreeFeature[]>>();

function getStorageKey(schoolId: string): string {
  return `${STORAGE_KEY_PREFIX}${schoolId}`;
}

/** Try to read from sessionStorage (survives soft navigations) */
function readFromStorage(schoolId: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(getStorageKey(schoolId));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(getStorageKey(schoolId));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/** Write to both memory cache and sessionStorage */
function writeToCache(schoolId: string, features: MontreeFeature[]): void {
  const entry: CacheEntry = { features, fetchedAt: Date.now() };
  memoryCache.set(schoolId, entry);
  try {
    sessionStorage.setItem(getStorageKey(schoolId), JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — memory cache still works
  }
}

/** Get cached features synchronously (memory → sessionStorage → null) */
export function getCachedFeaturesSync(schoolId: string): MontreeFeature[] | null {
  // Check memory cache first (fastest)
  const memEntry = memoryCache.get(schoolId);
  if (memEntry && Date.now() - memEntry.fetchedAt < CACHE_TTL_MS) {
    return memEntry.features;
  }

  // Check sessionStorage (survives soft navigations)
  const storageEntry = readFromStorage(schoolId);
  if (storageEntry) {
    // Promote to memory cache
    memoryCache.set(schoolId, storageEntry);
    return storageEntry.features;
  }

  return null;
}

/** Fetch features from API with in-flight dedup */
export async function fetchFeatures(schoolId: string): Promise<MontreeFeature[]> {
  // Check cache first
  const cached = getCachedFeaturesSync(schoolId);
  if (cached) return cached;

  // Deduplicate concurrent requests for the same school
  const existing = inFlightRequests.get(schoolId);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(`/api/montree/features?school_id=${schoolId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Features fetch: ${res.status}`);
      const data = await res.json();
      const features: MontreeFeature[] = data.features || [];
      writeToCache(schoolId, features);
      return features;
    } catch (err) {
      console.error('[features] Fetch error:', err);
      // Fail closed — return empty array (all features disabled)
      return [];
    } finally {
      inFlightRequests.delete(schoolId);
    }
  })();

  inFlightRequests.set(schoolId, request);
  return request;
}

/** Invalidate cache for a school (call after toggling a feature) */
export function invalidateFeatures(schoolId: string): void {
  memoryCache.delete(schoolId);
  try {
    sessionStorage.removeItem(getStorageKey(schoolId));
  } catch {
    // ignore
  }
}

/** Clear entire features cache (all schools) */
export function clearFeaturesCache(): void {
  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
