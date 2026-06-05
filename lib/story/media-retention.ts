import { getSupabase } from '@/lib/story-db';

// ============================================================================
// STORY MEDIA RETENTION — 24-hour TTL for photos / videos / audio / files
//
// Media (image/video/audio/document) lives for a fixed window after upload —
// 24 hours by default — and is then HARD-DELETED: both the story_message_history
// row AND the underlying object in the story-uploads bucket are removed.
//
// This is deliberately INDEPENDENT of the message system:
//   • It only ever touches MEDIA rows (message_type in image/video/audio/
//     document). Text messages and the secret_stories weekly note are never
//     read, never deleted, never affected here.
//   • Deletion is driven purely by each media row's own `expires_at` timestamp
//     (set to upload-time + TTL by the upload route), NOT by how many messages
//     exist or by any rolling window.
//
// So "media stays 24h then disappears" and "messages" are two separate clocks.
//
// The TTL is enforced two ways, belt-and-braces:
//   1. A scheduled cron (POST /api/story/cron/expire-media) sweeps on a timer
//      so media goes away ~24h after upload even if nobody touches the app.
//   2. An opportunistic call on each new upload, so an active app self-cleans
//      between cron runs.
//
// Window: 24h by default. Override with env STORY_MEDIA_TTL_HOURS (integer ≥ 1).
// ============================================================================

type Supa = ReturnType<typeof getSupabase>;

const DEFAULT_TTL_HOURS = 24;

// Media message types subject to the TTL. 'text' is intentionally excluded —
// text messages are the separate message system and are never expired here.
const MEDIA_TYPES = ['image', 'video', 'audio', 'document'] as const;

export function getMediaTtlHours(): number {
  const raw = process.env.STORY_MEDIA_TTL_HOURS;
  if (!raw) return DEFAULT_TTL_HOURS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_TTL_HOURS;
}

// Compute the expiry instant for a freshly-uploaded media file: now + TTL.
export function computeMediaExpiry(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(d.getHours() + getMediaTtlHours());
  return d;
}

// Reverse a stored media_url (a /api/montree/media/proxy/... URL, or a raw
// path) back to its story-uploads storage path: `story-media/<week>/<file>`.
function storagePathFromMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/story-media\/[^?"']+/);
  return m ? m[0] : null;
}

export interface MediaPurgeResult {
  scanned: number;      // expired media rows found
  rowsDeleted: number;  // DB rows hard-deleted
  objectsRemoved: number; // storage objects removed
  dryRun: boolean;
  errors: string[];
}

// Hard-delete every MEDIA row whose `expires_at` is in the past, plus its
// story-uploads object. Media-only — text messages and secret_stories are
// untouched. Never throws (safe to call inline from the upload path); errors
// are collected into the result instead.
export async function deleteExpiredStoryMedia(
  supabase: Supa,
  opts: { dryRun?: boolean } = {}
): Promise<MediaPurgeResult> {
  const dryRun = !!opts.dryRun;
  const result: MediaPurgeResult = {
    scanned: 0, rowsDeleted: 0, objectsRemoved: 0, dryRun, errors: [],
  };

  try {
    const nowIso = new Date().toISOString();

    // Expired media only. `expires_at` must be set and in the past; rows with a
    // null expiry (legacy, pre-TTL) are left alone rather than nuked blindly.
    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, media_url')
      .in('message_type', MEDIA_TYPES as unknown as string[])
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)
      .order('expires_at', { ascending: true })
      .limit(5000);

    if (error) {
      result.errors.push(`list failed: ${error.message}`);
      return result;
    }
    if (!rows || rows.length === 0) return result;
    result.scanned = rows.length;

    if (dryRun) return result;

    // 1) Remove underlying storage objects (so files don't linger after the
    //    DB row is gone). Batched to stay within request limits.
    const paths = rows
      .map((r: { media_url?: string | null }) => storagePathFromMediaUrl(r.media_url))
      .filter((p): p is string => !!p);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: rmErr } = await supabase.storage.from('story-uploads').remove(batch);
      if (rmErr) result.errors.push(`object removal failed: ${rmErr.message}`);
      else result.objectsRemoved += batch.length;
    }

    // 2) Hard-delete the expired rows.
    const ids = rows.map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error: delErr } = await supabase
        .from('story_message_history')
        .delete()
        .in('id', batch);
      if (delErr) result.errors.push(`row deletion failed: ${delErr.message}`);
      else result.rowsDeleted += batch.length;
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  return result;
}
