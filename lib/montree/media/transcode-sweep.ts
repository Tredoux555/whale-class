// lib/montree/media/transcode-sweep.ts
//
// 🚨 WHY THIS EXISTS
// The transcode was fire-and-forget from /api/montree/media/upload, with
// /api/montree/cron/video-transcode as the "safety net" — except nothing ever
// called the cron. Railway redeploys this app many times a day, and a redeploy
// SIGKILLs the in-flight ffmpeg, so the row sat on 'pending'/'processing'
// forever and the teacher's clip never became playable. Nobody noticed because
// getVideoPlaybackUrl() falls back to storage_path and the card LOOKS fine
// until you press play.
//
// This module is the queue drain, and instrumentation.ts runs it inside the web
// process every 5 minutes. No external cron, no extra service, no new secret.
//
// 🚨 IT DOES NOT CLAIM. The claim lives inside transcodeVideoMedia()
// (claimMediaForTranscode in transcode.ts) because EVERY caller needs it —
// the upload route's fire-and-forget most of all. One claim path, taken once
// per row; this sweep just decides which rows to offer it.
//
// 🚨 EVERY NEW COLUMN IS OPTIONAL. migrations/355 adds transcode_started_at,
// transcode_attempts and transcode_error. Until it is run, the claim works on
// status alone — it just cannot reclaim a row a redeploy stranded.

import { getSupabase } from '@/lib/supabase-client';
import { hasTranscodeClaimColumns, transcodeVideoMedia } from '@/lib/montree/media/transcode';

/** A 'processing' row older than this was killed mid-flight — take it back. */
export const STALE_CLAIM_MS = 15 * 60 * 1000;
/** A file ffmpeg cannot decode will not start decoding on the 40th try. */
export const MAX_ATTEMPTS = 3;

const SCAN_LIMIT = 50;

export interface SweepResult {
  scanned: number;
  attempted: number;
  transcoded: number;
  failed: number;
  reclaimed: number;
  skipped?: string;
}

interface QueueRow {
  id: string;
  storage_path: string | null;
  playback_path: string | null;
  transcode_status: string | null;
  transcode_attempts?: number | null;
}

/**
 * Put rows a redeploy stranded back in the queue. Without migration 355 there
 * is no timestamp to judge staleness by, so this is a no-op and a killed row
 * stays 'processing' until someone resets it in SQL — which is exactly the
 * situation 355 exists to end.
 */
async function reclaimStale(withColumns: boolean): Promise<number> {
  if (!withColumns) return 0;
  const cutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  const { data, error } = await getSupabase()
    .from('montree_media')
    .update({ transcode_status: 'pending' })
    .eq('media_type', 'video')
    .eq('transcode_status', 'processing')
    .or(`transcode_started_at.is.null,transcode_started_at.lt.${cutoff}`)
    .select('id');
  if (error) {
    console.error('[transcode-sweep] reclaim failed:', error.message);
    return 0;
  }
  return (data || []).length;
}

/**
 * Drain up to `limit` videos. Sequential on purpose: ffmpeg is already
 * CPU-bound and this runs inside the web process, so parallelising would
 * starve request traffic.
 *
 * NEVER THROWS — it is called from a setInterval with nobody to catch.
 */
export async function runTranscodeSweep(limit = 5): Promise<SweepResult> {
  const counts: SweepResult = { scanned: 0, attempted: 0, transcoded: 0, failed: 0, reclaimed: 0 };
  try {
    const supabase = getSupabase();
    const withColumns = await hasTranscodeClaimColumns();
    counts.reclaimed = await reclaimStale(withColumns);

    // Everything not finished: never started (null status, no playback copy),
    // queued, or a bounded-retry failure. 'processing' is left alone here —
    // reclaimStale() above is the only thing allowed to move it.
    const cols = withColumns
      ? 'id, storage_path, playback_path, transcode_status, transcode_attempts'
      : 'id, storage_path, playback_path, transcode_status';
    let scan = supabase
      .from('montree_media')
      .select(cols)
      .eq('media_type', 'video')
      .is('archived_at', null)
      .or('and(playback_path.is.null,transcode_status.is.null),transcode_status.eq.pending,transcode_status.eq.failed')
      .order('created_at', { ascending: true })
      .limit(SCAN_LIMIT);
    if (withColumns) scan = scan.lt('transcode_attempts', MAX_ATTEMPTS);

    const { data, error } = await scan;
    if (error) {
      // Pre-354 database: no playback_path/transcode_status at all. Nothing to do.
      if (error.code === '42703' || error.code === 'PGRST204' || error.code === '42P01') {
        return { ...counts, skipped: 'columns_missing' };
      }
      console.error('[transcode-sweep] scan failed:', error.message);
      return { ...counts, skipped: 'scan_failed' };
    }

    const rows = (data || []) as unknown as QueueRow[];
    counts.scanned = rows.length;

    for (const row of rows) {
      if (counts.attempted >= limit) break;
      if (!row.storage_path) continue;
      const result = await transcodeVideoMedia(row.id);
      // Lost the claim to another instance (or to the upload's own
      // fire-and-forget) — costs one wasted SELECT, no encode, and does not
      // count against this pass's budget.
      if (result.skipped === 'claimed_elsewhere') continue;
      counts.attempted++;
      if (result.ok && !result.skipped) counts.transcoded++;
      else if (!result.ok) counts.failed++;
    }

    if (counts.attempted || counts.reclaimed) {
      console.log('[transcode-sweep]', counts);
    }
    return counts;
  } catch (err) {
    console.error('[transcode-sweep] run failed:', err instanceof Error ? err.message : err);
    return { ...counts, skipped: 'exception' };
  }
}
