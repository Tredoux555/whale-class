// hooks/useFeatures.ts
// Public hook for checking feature flags
// Usage: const { isEnabled, loading } = useFeatures();
//        if (isEnabled('voice_observations')) { ... }
'use client';

import { useFeaturesContext } from '@/lib/montree/features/context';
import type { FeatureKey } from '@/lib/montree/features/types';

interface UseFeaturesReturn {
  /** Check if a specific feature is enabled for the current school */
  isEnabled: (key: FeatureKey) => boolean;
  /** True while features are being fetched */
  loading: boolean;
  /** Force refetch (call after toggling a feature) */
  invalidate: () => void;
}

/**
 * Hook to check feature flags. Must be used inside FeaturesProvider.
 * Fail-closed: returns false for all features if fetch fails or context missing.
 */
export function useFeatures(): UseFeaturesReturn {
  const { isEnabled, loading, invalidate } = useFeaturesContext();
  return { isEnabled, loading, invalidate };
}
