import { getSupabase, getCurrentWeekStart } from '@/lib/story-db';

// ============================================================================
// STORY EPHEMERAL MODE — "only the current message exists"
//
// When enabled, every new message write collapses the chat to a SINGLE row:
// the newest message survives, every older story_message_history row is
// hard-deleted AND its media object is removed from the story-uploads bucket,
// and prior-week secret_stories rows are pruned. The result is that a seizure,
// subpoena, or live snapshot of the database finds at most the one current
// message — there is no back-history to hand over.
//
// This is data minimisation: the strongest real-world protection, because you
// cannot be compelled to produce, and an attacker cannot read, data that no
// longer exists.
//
// 🚨 HONEST LIMITS:
//   • Provider-side backups / Supabase point-in-time-recovery retain
//     overwritten rows for their retention window. To be truly gone, tighten
//     Supabase backup retention separately (dashboard setting, not code).
//   • Ephemeral is lossy by design: if you write twice before the other person
//     reads, they never see the first message.
//   • It shrinks the exposure window to "since the last message"; a real-time
//     tap on the live DB still sees each message during its short life.
//
// Activation: set env STORY_EPHEMERAL=true. Unset/anything-else = OFF (safe
// default) so deploying the code does not silently start destroying history —
// you flip it on consciously.
// ============================================================================

type Supa = ReturnType<typeof getSupabase>;

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

// Keep ONLY the single newest story_message_history row; hard-delete every
// older row and its story-uploads media object. Also prune prior-week
// secret_stories rows. No-op unless STORY_EPHEMERAL=true. Never throws —
// a purge failure must never break the message send that triggered it.
export async function purgeOldStoryMessages(supabase: Supa): Promise<void> {
  if (!isEphemeralEnabled()) return;
  try {
    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id, media_url')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[ephemeral] could not list messages to purge', error);
      return;
    }
    if (!rows || rows.length <= 1) return; // nothing older than the newest

    const stale = rows.slice(1); // everything except the newest message

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
