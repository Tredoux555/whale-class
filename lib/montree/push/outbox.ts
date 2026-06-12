// lib/montree/push/outbox.ts
// Durable retry queue for transiently-failed push sends (migration 255).
// Mirrors the montree_webhook_inbox pattern (lib/montree/webhook-inbox.ts):
// a table + a small worker, so a restart or deploy can no longer silently
// drop a notification that only failed because of a network blip / 5xx / 429.
//
// Lifecycle:
//   - The live batch in sender.ts hits a TRANSIENT failure
//       → enqueuePushRetries() persists one row per device (attempt #1 was
//         the live try; first durable retry is due 1 minute later).
//   - drainPushOutbox() claims due rows and retries with exponential
//     backoff (1m → 2m → 4m → 8m...), capped at MAX_ATTEMPTS (5), after
//     which the row is finalized as status='dead' with last_error set.
//   - Dead TOKENS (APNs 410 / FCM UNREGISTERED) are never enqueued by the
//     sender; if a token dies while its row is queued, the drain retires the
//     token and finalizes the row instead of retrying.
//
// Scheduling: there is NO cron infrastructure in this repo yet, so the drain
// runs opportunistically at the START of every sendPushToOwners() batch —
// the next push of any kind flushes the backlog. When a cron route exists it
// can simply call drainPushOutbox() directly; nothing here needs to change.
//
// Graceful degradation: if migration 255 hasn't been run (42P01) both
// functions log ONCE and no-op — the queue must never break the send path.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { sendToDeviceToken, type PushPayload } from './sender';

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000; // 1m, then 2m, 4m, 8m...
const DRAIN_BATCH = 20; // keep the opportunistic drain cheap per call

let warnedTableMissing = false;
let draining = false; // at most one drain at a time per process

/** What the sender hands us about each device whose send needs a retry. */
export interface RetryableSend {
  tokenRowId: string;
  token: string;
  platform: 'ios' | 'android';
  ownerType: 'teacher' | 'principal' | 'parent';
  ownerId: string;
}

/** Shape of montree_push_outbox.payload — everything needed to replay. */
interface OutboxPayload {
  platform: 'ios' | 'android';
  token: string;
  tokenRowId: string;
  push: PushPayload;
}

function warnTableMissingOnce(): void {
  if (warnedTableMissing) return;
  warnedTableMissing = true;
  console.warn(
    '[push-outbox] montree_push_outbox missing — run migrations/255_push_outbox_and_prefs.sql. ' +
      'Transiently-failed pushes are NOT durably retried until then.'
  );
}

/**
 * Persist transiently-failed sends so they survive restarts/deploys.
 * Never throws — the queue is best-effort decoration on the send path.
 */
export async function enqueuePushRetries(
  supabase: SupabaseClient,
  sends: RetryableSend[],
  payload: PushPayload
): Promise<void> {
  if (!sends.length) return;
  try {
    const nextAttemptAt = new Date(Date.now() + BASE_BACKOFF_MS).toISOString();
    const { error } = await supabase.from('montree_push_outbox').insert(
      sends.map((s) => ({
        owner_type: s.ownerType,
        owner_id: s.ownerId,
        payload: {
          platform: s.platform,
          token: s.token,
          tokenRowId: s.tokenRowId,
          push: payload,
        } as OutboxPayload,
        attempts: 1, // the live attempt that just failed
        next_attempt_at: nextAttemptAt,
        status: 'pending',
      }))
    );
    if (error) {
      if ((error as { code?: string }).code === '42P01') warnTableMissingOnce();
      else console.error('[push-outbox] enqueue failed:', error.message);
    } else {
      console.log(`[push-outbox] queued ${sends.length} send(s) for durable retry`);
    }
  } catch (e) {
    console.error('[push-outbox] unexpected error during enqueue:', e);
  }
}

/** Best-effort terminal status update. Never throws. */
async function finalizeRow(
  supabase: SupabaseClient,
  id: string,
  status: 'sent' | 'dead',
  lastError: string | null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('montree_push_outbox')
      .update({ status, last_error: lastError })
      .eq('id', id);
    if (error) console.error(`[push-outbox] finalize '${status}' failed:`, error.message);
  } catch (e) {
    console.error('[push-outbox] unexpected error finalizing row:', e);
  }
}

/**
 * Retry every due row (status='pending', next_attempt_at <= now), oldest
 * first, up to DRAIN_BATCH per call. Never throws.
 *
 * Claiming: each row is "claimed" by conditionally bumping attempts +
 * pushing next_attempt_at into the future (matched on the attempts value we
 * read). If another process claimed it first, the conditional update matches
 * zero rows and we skip — at-least-once delivery without double-fires in the
 * common case.
 */
export async function drainPushOutbox(supabase: SupabaseClient): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const { data, error } = await supabase
      .from('montree_push_outbox')
      .select('id, attempts, payload')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(DRAIN_BATCH);
    if (error) {
      if ((error as { code?: string }).code === '42P01') warnTableMissingOnce();
      else console.error('[push-outbox] due-row query failed:', error.message);
      return;
    }
    const rows = (data || []) as Array<{ id: string; attempts: number; payload: OutboxPayload }>;
    if (!rows.length) return;

    for (const row of rows) {
      const attempt = (row.attempts || 0) + 1;
      // Backoff for the attempt AFTER this one (only used if this one also
      // fails transiently): 1m base doubling per attempt, exponent capped.
      const backoffMs = BASE_BACKOFF_MS * 2 ** Math.min(attempt - 1, 6);
      const { data: claimed, error: claimError } = await supabase
        .from('montree_push_outbox')
        .update({
          attempts: attempt,
          next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq('id', row.id)
        .eq('status', 'pending')
        .eq('attempts', row.attempts)
        .select('id');
      if (claimError || !claimed?.length) continue; // someone else got it

      const p = row.payload;
      if (!p?.token || !p?.platform || !p?.push) {
        await finalizeRow(supabase, row.id, 'dead', 'malformed outbox payload');
        continue;
      }

      const outcome = await sendToDeviceToken(p.platform, p.token, p.push);
      if (outcome === 'sent') {
        await finalizeRow(supabase, row.id, 'sent', null);
      } else if (outcome === 'dead') {
        // Token retired while queued — finalize AND retire it, same as the
        // live path. Never re-enqueue a dead token.
        await finalizeRow(supabase, row.id, 'dead', 'device token retired (unregistered)');
        if (p.tokenRowId) {
          await supabase
            .from('montree_device_tokens')
            .update({ failed_at: new Date().toISOString() })
            .eq('id', p.tokenRowId);
        }
      } else if (outcome === 'failed') {
        await finalizeRow(supabase, row.id, 'dead', 'permanent send failure');
      } else if (attempt >= MAX_ATTEMPTS) {
        await finalizeRow(supabase, row.id, 'dead', `gave up after ${attempt} attempts`);
      }
      // outcome === 'retry' below the cap: leave it pending — the claim
      // already wrote the backed-off next_attempt_at.
    }
  } catch (e) {
    console.error('[push-outbox] unexpected error during drain:', e);
  } finally {
    draining = false;
  }
}
