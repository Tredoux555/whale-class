// lib/montree/features/context.tsx
// React Context for feature flags — wraps dashboard layout
// Pattern: mirrors i18n context (I18nProvider + useI18n)
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { MontreeFeature, FeatureKey } from './types';
import { fetchFeatures, getCachedFeaturesSync, invalidateFeatures as invalidateFeaturesCache } from './cache';

interface FeaturesContextValue {
  features: MontreeFeature[];
  loading: boolean;
  isEnabled: (key: FeatureKey) => boolean;
  invalidate: () => void;
}

const FeaturesContext = createContext<FeaturesContextValue>({
  features: [],
  loading: true,
  isEnabled: () => false,
  invalidate: () => {},
});

interface FeaturesProviderProps {
  schoolId: string | null;
  children: ReactNode;
}

export function FeaturesProvider({ schoolId, children }: FeaturesProviderProps) {
  const [cachedInit] = useState<MontreeFeature[] | null>(() => {
    if (schoolId) return getCachedFeaturesSync(schoolId);
    return null;
  });
  const [features, setFeatures] = useState<MontreeFeature[]>(cachedInit || []);
  // If we hit the sync cache, don't block UI on loading state — serve cached
  // features immediately and revalidate in the background (SWR pattern).
  const [loading, setLoading] = useState(!cachedInit);

  // Fetch features when schoolId is available
  const loadFeatures = useCallback(async () => {
    if (!schoolId) {
      setFeatures([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchFeatures(schoolId);
      setFeatures(data);
    } catch {
      // Fail closed — empty features = all disabled
      setFeatures([]);
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    // Intentional: load features on mount and when schoolId changes via loadFeatures
    // dep. The set-state-in-effect rule flags this as a cascade risk, but the
    // pattern is legitimate client-side fetch-on-mount. Network IO must live in
    // effects; refactoring to render-phase fetch would require Suspense + a Data
    // API rewrite for the entire features layer. Pragma here is the right call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFeatures();
  }, [loadFeatures]);

  // Refetch on window focus (stale-while-revalidate pattern)
  useEffect(() => {
    const handleFocus = () => {
      if (schoolId) {
        // Invalidate cache so next fetch gets fresh data
        invalidateFeaturesCache(schoolId);
        loadFeatures();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [schoolId, loadFeatures]);

  // Check if a specific feature is enabled
  const isEnabled = useCallback(
    (key: FeatureKey): boolean => {
      const feature = features.find(f => f.feature_key === key);
      return feature?.enabled ?? false;
    },
    [features]
  );

  // Invalidate and refetch (call after toggling a feature)
  const invalidate = useCallback(() => {
    if (schoolId) {
      invalidateFeaturesCache(schoolId);
      loadFeatures();
    }
  }, [schoolId, loadFeatures]);

  // 🚨 PERF: memoize the context value so the dashboard's 4+ useFeatures() consumers
  // (DashboardHeader, sections, photo-audit tabs, focus shelf, etc.) only re-render
  // when features/loading/isEnabled actually change. Without this, every parent
  // render rebuilds the value object, cascading re-renders through every consumer
  // on every parent state change. Mirror of i18n context's useMemo pattern.
  // (Session 76 fixed i18n context but missed this; surfaced in Session 111 lag audit.)
  const value = useMemo(
    () => ({ features, loading, isEnabled, invalidate }),
    [features, loading, isEnabled, invalidate]
  );

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  );
}

/** Use feature flags from context. Must be inside FeaturesProvider. */
export function useFeaturesContext() {
  return useContext(FeaturesContext);
}
