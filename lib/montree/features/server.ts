// lib/montree/features/server.ts
// Server-side feature flag check for API route gating
// Usage in API routes:
//   const supabase = getSupabase();
//   if (!await isFeatureEnabled(supabase, schoolId, 'voice_observations')) {
//     return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
//   }

import type { FeatureKey } from './types';

/**
 * Check if a feature is enabled for a school (server-side).
 * Priority: school_override > definition_default.
 * Fail-closed: returns false on any error.
 */
export async function isFeatureEnabled(
  supabase: any,
  schoolId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  try {
    // Check school-level override first
    const { data: schoolOverride } = await supabase
      .from('montree_school_features')
      .select('enabled')
      .eq('school_id', schoolId)
      .eq('feature_key', featureKey)
      .maybeSingle();

    if (schoolOverride) return schoolOverride.enabled;

    // Fall back to definition default
    const { data: def } = await supabase
      .from('montree_feature_definitions')
      .select('default_enabled')
      .eq('feature_key', featureKey)
      .maybeSingle();

    return def?.default_enabled ?? false;
  } catch (err) {
    console.error(`[features] isFeatureEnabled error for ${featureKey}:`, err);
    // Fail closed — feature disabled on error
    return false;
  }
}
