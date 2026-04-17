// lib/montree/reports/resolve-model.ts
// Three-tier AI model resolver for weekly reports.
//
// Tiers:
//   free    — no AI calls, callers must use template fallback (model: null)
//   haiku   — claude-haiku-4-5 for teacher reports + parent narratives (~$0.10/class/week)
//   sonnet  — claude-sonnet-4-6 for premium output (~$1.70/class/week)
//
// Resolution order (highest wins):
//   1. ai_tier_sonnet feature flag on school
//   2. ai_tier_haiku feature flag on school
//   3. free (no AI)
//
// Fail-closed: any error returns 'free' tier.

import { HAIKU_MODEL, AI_MODEL } from '@/lib/ai/anthropic';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export type ReportTier = 'free' | 'haiku' | 'sonnet';

export interface ResolvedReportModel {
  tier: ReportTier;
  /** Anthropic model string, or null if tier === 'free' (callers must skip AI) */
  model: string | null;
}

/**
 * Resolve which Anthropic model (if any) to use for this school's weekly reports.
 * Sonnet takes precedence over Haiku if both flags are somehow enabled.
 */
export async function resolveReportModel(
  supabase: any,
  schoolId: string
): Promise<ResolvedReportModel> {
  try {
    // Sonnet wins if enabled
    const sonnet = await isFeatureEnabled(supabase, schoolId, 'ai_tier_sonnet');
    if (sonnet) {
      return { tier: 'sonnet', model: AI_MODEL };
    }

    const haiku = await isFeatureEnabled(supabase, schoolId, 'ai_tier_haiku');
    if (haiku) {
      return { tier: 'haiku', model: HAIKU_MODEL };
    }

    return { tier: 'free', model: null };
  } catch (err) {
    console.error('[resolveReportModel] error:', err);
    return { tier: 'free', model: null };
  }
}
