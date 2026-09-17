// lib/montree/photo-identification/meter.ts
//
// 💰 The photo-identification pipeline was the one AI surface that never wrote
// to montree_api_usage — so its Haiku×2-3 + Sonnet spend per photo was
// invisible in the AI budget and the P&L. That is a large part of why it was
// retired on 2026-09-17.
//
// The pipeline is OFF by default now (see flag.ts). If anyone ever flips
// PHOTO_RECOGNITION_ENABLED back on, every call it makes is metered from the
// first request — never invisible again.

import { logApiUsage } from '@/lib/montree/api-usage';

interface MeteredInput {
  schoolId?: string | null;
  classroomId?: string | null;
}

interface MeteredMessage {
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  } | null;
}

/**
 * Fire-and-forget meter for one Anthropic call in the identification pipeline.
 *
 * Cache reads/writes are counted as input tokens — the pricing table has no
 * cache tier, and under-counting is exactly the failure this fixes. Without a
 * schoolId nothing can be attributed, so logApiUsage warns and skips; the
 * caller is never blocked either way.
 */
export function meterPhotoIdUsage(
  input: MeteredInput,
  endpoint: string,
  msg: MeteredMessage,
): void {
  try {
    const u = msg?.usage || {};
    const inputTokens =
      (u.input_tokens || 0) +
      (u.cache_read_input_tokens || 0) +
      (u.cache_creation_input_tokens || 0);
    logApiUsage({
      schoolId: input.schoolId || '',
      classroomId: input.classroomId || null,
      endpoint,
      model: msg?.model || 'claude-haiku-4.5',
      inputTokens,
      outputTokens: u.output_tokens || 0,
    });
  } catch (err) {
    // Metering must never break identification.
    console.error('[PhotoId] usage metering failed (non-fatal):', err);
  }
}
