import { getSupabase, getCurrentWeekStart } from '@/lib/story-db';

// ============================================================================
// STORY EPHEMERAL MODE — rolling window of the most-recent messages
//
// When enabled, every new message write trims the chat down to a small
// rolling window: the newest N rows survive (default 3), every older
// story_message_history row is hard-deleted AND its media object is removed
// from the story-uploads bucket, and prior-week secret_stories rows are
// pruned. A seizure, subpoena, or live snapshot of the database therefore
// finds at most the last N messages — there is no deep back-history to hand
// over.
//
// This is data minimisation: the strongest real-world protection, because you
// cannot be compelled to produce, and an attacker cannot read, data that no
// longer exists.
//
// Each row counts as one message regardless of kind — a text note and a photo
// (with or without a caption) each occupy one of the N slots. Once a 4th
// message arrives, the oldest of the previous three is cleaned out.
//
// 🚨 HONEST LIMITS:
//   • Provider-side backups / Supabase point-in-time-recovery retain
//     overwritten rows for their retention window. To be truly gone, tighten
//     Supabase backup retention separately (dashboard setting, not code).
//   • The window is lossy by design: once a message rolls past slot N it is
//     gone whether or not the other person read it.
//   • It shrinks the exposure window to "the last N messages"; a real-time
//     tap on the live DB still sees each message during its short life.
//
// Activation: set env STORY_EPHEMERAL=true. Unset/anything-else = OFF (safe
// default) so deploying the code does not silently start destroying history —
// you flip it on consciously.
//
// Window size: defaults to 3. Override with env STORY_KEEP_RECENT (an integer
// ≥ 1) to change how many recent messages survive without touching code.
// ============================================================================

type Supa = ReturnType<typeof getSupabase>;

// How many recent messages to keep. Default 3; override via STORY_KEEP_RECENT.
// Anything non-numeric or < 1 falls back to the default so a typo can never
// collapse the window to 0 (which would wipe even the current message).
const DEFAULT_KEEP_RECENT = 3;

export function getStoryKeepCount(): number {
  const raw = process.env.STORY_KEEP_RECENT;
  if (!raw) return DEFAULT_KEEP_RECENT;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_KEEP_RECENT;
}

export function isEphemeralEnabled(): boolean {
  return process.env.STORY_EPHEMERAL === 'true';
}

// Reverse a stored media_url (a /api/montree/media/proxy/... URL, or a raw
// path) back to its story-uploads storage path: `story-media/<week>/<file>`.
function storagePathFromMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/story-media\/[^?"']+/);
  return m ? m[0] : null;
}

// Keep ONLY the newest N story_message_history rows (default 3); hard-delete
// every older row and its story-uploads media object. Also prune prior-week
// secret_stories rows. No-op unless STORY_EPHEMERAL=true. Never throws —
// a purge failure must never break the message send that triggered it.
export async function purgeOldStoryMessages(supabase: Supa): Promise<void> {
  if (!isEphemeralEnabled()) return;
  try {
    const keep = getStoryKeepCount();

    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, media_url')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[ephemeral] could not list messages to purge', error);
      return;
    }
    if (!rows || rows.length <= keep) return; // nothing past the keep window

    const stale = rows.slice(keep); // everything older than the newest `keep`

    // 1) Remove the underlying media objects (so photos/videos don't linger
    //    in storage after their DB rows are gone).
    const paths = stale
      .map((r: { media_url?: string | null }) => storagePathFromMediaUrl(r.media_url))
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      for (let i = 0; i < paths.length; i += 100) {
        const { error: rmErr } = await supabase.storage
          .from('story-uploads')
          .remove(paths.slice(i, i + 100));
        if (rmErr) console.error('[ephemeral] media object removal failed', rmErr);
      }
    }

    // 2) Hard-delete the stale rows.
    const ids = stale.map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { error: delErr } = await supabase
        .from('story_message_history')
        .delete()
        .in('id', ids.slice(i, i + 100));
      if (delErr) console.error('[ephemeral] stale row deletion failed', delErr);
    }

    // 3) Prune prior-week secret_stories rows (keep only the current week's
    //    overwrite-in-place note). Never touches the current week.
    const wk = getCurrentWeekStart();
    const { error: ssErr } = await supabase
      .from('secret_stories')
      .delete()
      .lt('week_start_date', wk);
    if (ssErr) console.error('[ephemeral] prior-week secret_stories prune failed', ssErr);
  } catch (e) {
    console.error('[ephemeral] purge failed', e);
  }
}
