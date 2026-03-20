/**
 * API Usage Metering System
 *
 * Tracks actual token usage and cost per AI API call.
 * Fire-and-forget logging — never blocks API responses.
 * Budget enforcement with 30s in-memory cache.
 */

import { getSupabase } from '@/lib/supabase-client';

// ─── Pricing Table ──────────────────────────────────────────────
// Updated: March 2026 — check Anthropic/OpenAI pricing pages
// Prices are per 1M tokens (or per unit as noted)

interface TokenPricing {
  type: 'token';
  inputPer1M: number;
  outputPer1M: number;
}

interface AudioPricing {
  type: 'audio';
  perMinute: number;
}

interface CharPricing {
  type: 'char';
  per1MChars: number;
}

type ModelPricing = TokenPricing | AudioPricing | CharPricing;

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  'claude-sonnet-4-20250514': { type: 'token', inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-sonnet-4': { type: 'token', inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-haiku-4-5-20251001': { type: 'token', inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-haiku-4.5': { type: 'token', inputPer1M: 0.80, outputPer1M: 4.00 },
  // OpenAI
  'whisper-1': { type: 'audio', perMinute: 0.006 },
  'tts-1': { type: 'char', per1MChars: 15.00 },
};

// ─── Cost Calculation ───────────────────────────────────────────

/**
 * Calculate cost in USD from token/audio/char usage.
 *
 * For token models: inputTokens = input tokens, outputTokens = output tokens
 * For audio (Whisper): inputTokens = duration in seconds
 * For TTS: inputTokens = character count
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Unknown model — log warning, return conservative estimate
    console.warn(`[API_USAGE] Unknown model pricing: ${model}. Using Sonnet pricing as fallback.`);
    return (inputTokens / 1_000_000) * 3.00 + (outputTokens / 1_000_000) * 15.00;
  }

  switch (pricing.type) {
    case 'token':
      return (inputTokens / 1_000_000) * pricing.inputPer1M +
             (outputTokens / 1_000_000) * pricing.outputPer1M;
    case 'audio':
      // inputTokens = seconds of audio
      return (inputTokens / 60) * pricing.perMinute;
    case 'char':
      // inputTokens = character count
      return (inputTokens / 1_000_000) * pricing.per1MChars;
  }
}

// ─── Usage Logging ──────────────────────────────────────────────

interface LogUsageParams {
  schoolId: string;
  classroomId?: string | null;
  teacherId?: string | null;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Log an AI API call's token usage and cost.
 *
 * FIRE-AND-FORGET: This function returns immediately.
 * The DB insert happens asynchronously. If it fails, we log to console
 * but never throw or block the calling route.
 */
export function logApiUsage({
  schoolId,
  classroomId,
  teacherId,
  endpoint,
  model,
  inputTokens,
  outputTokens,
}: LogUsageParams): void {
  if (!schoolId) {
    console.warn('[API_USAGE] Missing schoolId — skipping log');
    return;
  }

  const costUsd = calculateCost(model, inputTokens, outputTokens);

  getSupabase()
    .from('montree_api_usage')
    .insert({
      school_id: schoolId,
      classroom_id: classroomId || null,
      teacher_id: teacherId || null,
      endpoint,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[API_USAGE] Failed to log usage:', error.message);
      }
    });
}

// ─── Budget Enforcement ─────────────────────────────────────────

interface BudgetStatus {
  spent: number;
  budget: number;
  percentage: number;
  action: 'warn' | 'soft_limit' | 'hard_limit';
  requestCount: number;
  blocked: boolean;
  warningLevel: 'none' | 'yellow' | 'orange' | 'red';
}

const DEFAULT_BUDGET: BudgetStatus = {
  spent: 0,
  budget: 50,
  percentage: 0,
  action: 'warn',
  requestCount: 0,
  blocked: false,
  warningLevel: 'none',
};

// In-memory cache: schoolId → { data, timestamp }
const budgetCache = new Map<string, { data: BudgetStatus; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Check a school's AI budget status.
 *
 * Uses 30s in-memory cache to avoid hitting DB on every AI call.
 * Returns budget status including whether the school is blocked.
 */
export async function checkAiBudget(schoolId: string): Promise<BudgetStatus> {
  if (!schoolId) return DEFAULT_BUDGET;

  // Check cache
  const cached = budgetCache.get(schoolId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { data, error } = await getSupabase()
      .rpc('get_school_ai_usage', { p_school_id: schoolId });

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('[API_USAGE] Budget check failed:', error?.message || 'unexpected response type');
      // Fail open — don't block AI on DB errors
      return DEFAULT_BUDGET;
    }

    const percentage = Number(data.percentage) || 0;
    const action = (data.action || 'warn') as BudgetStatus['action'];

    const result: BudgetStatus = {
      spent: Number(data.spent) || 0,
      budget: Number(data.budget) || 50,
      percentage,
      action,
      requestCount: Number(data.request_count) || 0,
      blocked: action === 'hard_limit' && percentage >= 100,
      warningLevel: percentage >= 100 ? 'red'
        : percentage >= 80 ? 'orange'
        : percentage >= 60 ? 'yellow'
        : 'none',
    };

    budgetCache.set(schoolId, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('[API_USAGE] Budget check error:', err instanceof Error ? err.message : err);
    return DEFAULT_BUDGET;
  }
}

/**
 * Clear budget cache for a school (call after budget update).
 */
export function clearBudgetCache(schoolId?: string): void {
  if (schoolId) {
    budgetCache.delete(schoolId);
  } else {
    budgetCache.clear();
  }
}
