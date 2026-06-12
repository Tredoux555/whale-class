// lib/montree/webhook-deadletter.ts
// Helper to capture failed webhook events into the dead-letter table.
//
// Call this from the Stripe webhook handler's catch block. Idempotent via
// the UNIQUE(stripe_event_id) constraint — duplicates are silently swallowed.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface DLQCaptureInput {
  source?: 'stripe' | 'other';
  stripe_event_id: string;
  event_type: string;
  payload: unknown;
  error: unknown;
}

export async function captureToDeadLetter(
  supabase: SupabaseClient,
  input: DLQCaptureInput
): Promise<void> {
  try {
    const errMsg = input.error instanceof Error ? input.error.message : String(input.error);
    const errStack = input.error instanceof Error ? input.error.stack || null : null;

    const { error } = await supabase
      .from('montree_webhook_deadletter')
      .insert({
        source: input.source || 'stripe',
        stripe_event_id: input.stripe_event_id,
        event_type: input.event_type,
        payload: input.payload,
        error_message: errMsg.slice(0, 4000),
        error_stack: errStack ? errStack.slice(0, 8000) : null,
      });

    // 23505 = duplicate event ID. Stripe re-fired the same event; we already
    // captured it once. No-op.
    if (error && (error as { code?: string }).code !== '23505') {
      // Log but don't throw — we don't want a DLQ failure to compound the
      // original webhook failure.
      console.error('[DLQ] capture failed (non-fatal)', error);
    }
  } catch (err) {
    console.error('[DLQ] unexpected error during capture (non-fatal)', err);
  }
}
