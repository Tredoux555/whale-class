// lib/montree/features/context.tsx
// React Context for feature flags — wraps dashboard layout
// Pattern: mirrors i18n context (I18nProvider + useI18n)
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
  const [features, setFeatures] = useState<MontreeFeature[]>(() => {
    // Initialize from cache synchronously to avoid flash
    if (schoolId) {
      return getCachedFeaturesSync(schoolId) || [];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

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

  return (
    <FeaturesContext.Provider value={{ features, loading, isEnabled, invalidate }}>
      {children}
    </FeaturesContext.Provider>
  );
}

/** Use feature flags from context. Must be inside FeaturesProvider. */
export function useFeaturesContext() {
  return useContext(FeaturesContext);
}
