// lib/montree/webhook-inbox.ts
// Audit fix H5 (AUDIT-whale.md, Jun 2026): inbox-first webhook persistence.
//
// The billing webhook acks Stripe with a 200 BEFORE processing (deliberate
// perf choice from Perf Tier 3.5). The gap: if the process dies while the
// fire-and-forget handler is still running, the event is gone — Stripe won't
// retry (it got the 200) and the dead-letter queue only captures handler
// ERRORS, not process death. Fix: persist the verified event to
// montree_webhook_inbox (migration 253) FIRST, then ack, then process,
// updating the row's status as the handler progresses. A row stuck in
// 'received'/'processing' is the durable evidence of an event lost to a
// restart — queryable and manually replayable instead of silently gone.

import type { SupabaseClient } from '@supabase/supabase-js';

export type InboxRecordResult =
  // Persisted (or re-armed after a Stripe retry) — safe to ack + process.
  | { outcome: 'recorded' }
  // Same event already fully processed — ack 200, skip reprocessing.
  | { outcome: 'already_processed' }
  // Inbox table missing (migration 253 not run) — caller falls back to the
  // legacy process-without-inbox behaviour. Logged loudly.
  | { outcome: 'table_missing' }
  // Could not persist (DB down etc.) — caller should return 5xx so Stripe
  // retries later instead of us acking an event we may lose.
  | { outcome: 'persist_failed' };

interface InboxEventInput {
  stripeEventId: string;
  eventType: string;
  /** The FULL verified Stripe event object, so the row is replayable. */
  payload: unknown;
}

/**
 * Persist a verified webhook event before acking Stripe.
 * Idempotent via UNIQUE(stripe_event_id).
 */
export async function recordInboxEvent(
  supabase: SupabaseClient,
  input: InboxEventInput
): Promise<InboxRecordResult> {
  try {
    const { error } = await supabase.from('montree_webhook_inbox').insert({
      source: 'stripe',
      stripe_event_id: input.stripeEventId,
      event_type: input.eventType,
      payload: input.payload,
      status: 'received',
    });

    if (!error) return { outcome: 'recorded' };

    const code = (error as { code?: string }).code;

    if (code === '42P01') {
      console.error(
        '[webhook-inbox] montree_webhook_inbox missing — run migrations/253_webhook_inbox.sql. ' +
          'Falling back to process-without-inbox (pre-H5 behaviour).'
      );
      return { outcome: 'table_missing' };
    }

    if (code === '23505') {
      // Stripe re-delivered an event we already have. If it fully processed,
      // skip; otherwise re-arm it for another attempt (handlers downstream
      // are idempotent via source_ref keys, so reprocessing is safe).
      const { data: existing, error: readError } = await supabase
        .from('montree_webhook_inbox')
        .select('id, status, attempts')
        .eq('stripe_event_id', input.stripeEventId)
        .maybeSingle();

      if (readError || !existing) {
        console.error(
          '[webhook-inbox] duplicate event but re-read failed:',
          readError?.message || 'row not found'
        );
        // We KNOW the event is persisted (the unique violation proves it) —
        // safest is to process again; idempotency keys absorb the replay.
        return { outcome: 'recorded' };
      }

      if (existing.status === 'processed') {
        console.log(
          `[webhook-inbox] ${input.stripeEventId} already processed — skipping replay`
        );
        return { outcome: 'already_processed' };
      }

      const { error: rearmError } = await supabase
        .from('montree_webhook_inbox')
        .update({
          status: 'received',
          attempts: ((existing.attempts as number) || 0) + 1,
        })
        .eq('id', existing.id);
      if (rearmError) {
        console.error('[webhook-inbox] re-arm update failed:', rearmError.message);
      }
      console.warn(
        `[webhook-inbox] ${input.stripeEventId} re-delivered while ${existing.status} — reprocessing (attempt ${((existing.attempts as number) || 0) + 1})`
      );
      return { outcome: 'recorded' };
    }

    console.error('[webhook-inbox] persist failed:', error.message, code || '');
    return { outcome: 'persist_failed' };
  } catch (e) {
    console.error('[webhook-inbox] unexpected error during persist:', e);
    return { outcome: 'persist_failed' };
  }
}

/**
 * Best-effort status transition as the fire-and-forget handler progresses.
 * Never throws — a status-update failure must not break event processing.
 */
export async function markInboxStatus(
  supabase: SupabaseClient,
  stripeEventId: string,
  status: 'processing' | 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const update: Record<string, unknown> = { status };
    if (status === 'processed') update.processed_at = new Date().toISOString();
    if (errorMessage) update.last_error = errorMessage.slice(0, 4000);

    const { error } = await supabase
      .from('montree_webhook_inbox')
      .update(update)
      .eq('stripe_event_id', stripeEventId);

    if (error && (error as { code?: string }).code !== '42P01') {
      console.error(
        `[webhook-inbox] mark '${status}' failed for ${stripeEventId}:`,
        error.message
      );
    }
  } catch (e) {
    console.error(`[webhook-inbox] unexpected error marking '${status}':`, e);
  }
}
