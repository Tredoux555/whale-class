import { getSupabase, getCurrentWeekStart } from '@/lib/story-db';

// ============================================================================
// STORY EPHEMERAL MODE — rolling window of the most-recent TEXT messages
//
// When enabled, every new write trims the chat down to a small rolling window:
// the newest N TEXT messages survive (default 3) and every older text
// story_message_history row is hard-deleted; prior-week secret_stories rows
// are pruned too. A seizure, subpoena, or live snapshot of the database
// therefore finds at most the last N text messages — no deep back-history.
//
// MEDIA IS SEPARATE. Photos / videos / audio / files are NOT part of this
// rolling window — they live on their own 24h TTL and are deleted by
// lib/story/media-retention.ts, regardless of how many messages exist. This
// keeps the two systems independent: "media stays 24h" and "messages" are two
// different clocks.
//
// This is data minimisation: the strongest real-world protection, because you
// cannot be compelled to produce, and an attacker cannot read, data that no
// longer exists.
//
// Only text messages occupy the N slots; media rows are ignored here (they
// expire on their own 24h timer). Once a 4th text message arrives, the oldest
// of the previous three is cleaned out.
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

// Keep ONLY the newest N TEXT story_message_history rows (default 3);
// hard-delete every older TEXT row. Media rows are ignored (they expire on
// their own 24h TTL — see lib/story/media-retention.ts). Also prune prior-week
// secret_stories rows. No-op unless STORY_EPHEMERAL=true. Never throws — a
// purge failure must never break the message send that triggered it.
export async function purgeOldStoryMessages(supabase: Supa): Promise<void> {
  if (!isEphemeralEnabled()) return;
  try {
    const keep = getStoryKeepCount();

    // TEXT messages only — media is governed separately by its 24h TTL.
    const { data: rows, error } = await supabase
      .from('story_message_history')
      .select('id')
      .eq('message_type', 'text')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[ephemeral] could not list messages to purge', error);
      return;
    }
    if (!rows || rows.length <= keep) return; // nothing past the keep window

    const stale = rows.slice(keep); // text rows older than the newest `keep`

    // Hard-delete the stale text rows.
    const ids = stale.map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { error: delErr } = await supabase
        .from('story_message_history')
        .delete()
        .in('id', ids.slice(i, i + 100));
      if (delErr) console.error('[ephemeral] stale row deletion failed', delErr);
    }

    // Prune prior-week secret_stories rows (keep only the current week's
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
