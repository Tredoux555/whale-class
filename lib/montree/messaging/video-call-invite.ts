// lib/montree/messaging/video-call-invite.ts
//
// 🚨 Session 119 — video-call invite message convention.
//
// CONVENTION: a thread message whose body STARTS WITH
//   [[VCALL:<appointmentId>]]            → video call (default)
//   [[VCALL:<appointmentId>:audio]]      → voice-only call (Session 121)
// is treated as a call invite card. The renderer strips the marker and
// shows a rich card with a prominent "Join now" button. When the :audio
// suffix is present, the Join href appends ?audio=1 so the receiving
// side mounts AgoraVideoCall in voice-only mode.
//
// Adding new modes (e.g. :recording) should follow the same suffix
// pattern. Parsers must remain forgiving of unknown suffixes — newer
// senders should not break older clients.
//
// Why a body prefix and not a JSONB metadata column?
//   - Avoids a new migration (montree_thread_messages has no JSONB col)
//   - Existing send/receive paths are unmodified — invites are just
//     special-shaped messages
//   - Old clients (parents on older builds) still see the human-readable
//     body after the marker — degrades gracefully to plain text
//
// Why include appointmentId?
//   - The Join button needs to fire /agora-token with the right id
//   - Allows the parent to find the appointment even if they came in
//     via the chat surface rather than the calendar
//
// Strip rule (client-side): if body.startsWith('[[VCALL:'), parse out
// the id and render the rest of the body as the card's subtitle.

import { createThreadWithParticipants } from './thread-resolver';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParticipantRole } from './types';

const VCALL_PREFIX = '[[VCALL:';
const VCALL_SUFFIX = ']]';

export interface ParsedInvite {
  appointmentId: string;
  /** Human-readable body that follows the marker. */
  caption: string;
  /** 🚨 Session 121 — voice-only flag parsed from `:audio` suffix on the marker. */
  audioOnly: boolean;
}

/** Try to parse a message body as a video-call invite. Returns null when
 *  the body isn't an invite (most messages aren't). */
export function parseVideoCallInvite(body: string): ParsedInvite | null {
  if (!body.startsWith(VCALL_PREFIX)) return null;
  const closeIdx = body.indexOf(VCALL_SUFFIX);
  if (closeIdx < 0) return null;
  // The inside of [[VCALL:...]] is either `<id>` or `<id>:audio` (and
  // future modes follow the same colon-separated suffix pattern).
  const inner = body.slice(VCALL_PREFIX.length, closeIdx).trim();
  if (!inner) return null;
  const [rawId, ...suffixes] = inner.split(':');
  const id = rawId.trim();
  // Validate UUID-ish — we don't need full strictness, just a sanity check.
  if (!/^[0-9a-f-]{30,}$/i.test(id)) return null;
  const audioOnly = suffixes.map(s => s.trim().toLowerCase()).includes('audio');
  const caption = body.slice(closeIdx + VCALL_SUFFIX.length).trim();
  return { appointmentId: id, caption, audioOnly };
}

/** Build the canonical invite-message body. Pass a friendly caption like
 *  "Tredoux is calling you — Join below" or
 *  "Monthly review · Mon 21 May · 3pm".
 *  Pass `audioOnly: true` to mark this as a voice call — receivers append
 *  ?audio=1 to the Join href so AgoraVideoCall mounts without the camera. */
export function buildVideoCallInviteBody(
  appointmentId: string,
  caption: string,
  audioOnly: boolean = false,
): string {
  // Strip any [[VCALL:...]] markers the caller accidentally included.
  const safeCaption = caption.replace(/\[\[VCALL:[^\]]*\]\]/g, '').trim();
  const suffix = audioOnly ? ':audio' : '';
  return `${VCALL_PREFIX}${appointmentId}${suffix}${VCALL_SUFFIX}${safeCaption ? ` ${safeCaption}` : ''}`;
}

// ─── post helper ─────────────────────────────────────────────────────

interface PostInviteArgs {
  /** Service-role supabase client (server-side). */
  supabase: SupabaseClient;
  /** School where the appointment lives. */
  schoolId: string;
  /** Classroom anchor for the thread (optional but preferred). */
  classroomId?: string | null;
  /** Child anchor for the thread (optional — instant calls may skip). */
  childId?: string | null;
  /** The appointment id the invite points at — the Join button uses this. */
  appointmentId: string;
  /** The caller posting the invite (host: teacher / principal). */
  caller: { role: 'teacher' | 'principal'; id: string; name: string };
  /** The parent who's the OTHER side of the call. */
  parentId: string;
  /** Friendly caption (the human-readable bit after the marker). */
  caption: string;
  /** 🚨 Session 121 — when true, marker is built as [[VCALL:<id>:audio]] so
   *  both sides land in voice-only AgoraVideoCall. Defaults to false. */
  audioOnly?: boolean;
}

/**
 * Find OR create the parent_teacher thread between the caller and the
 * parent, then insert a video-call invite message into it. Returns the
 * thread_id and message_id on success, null on failure.
 *
 * Re-uses an existing parent_teacher thread when one exists between the
 * SAME caller and parent (any child anchor counts as "same thread" for
 * the WeChat-style flow). Creates a fresh one when none exists.
 *
 * Principal-observer transparency is preserved (Session 97) because
 * createThreadWithParticipants auto-adds the principal as observer for
 * parent_teacher threads.
 */
export async function postVideoCallInvite(args: PostInviteArgs): Promise<{
  threadId: string;
  messageId: string;
} | null> {
  const {
    supabase, schoolId, classroomId, childId,
    appointmentId, caller, parentId, caption,
    audioOnly,
  } = args;

  // Step 1: find an existing parent_teacher thread shared by caller + parent
  const { data: myParticipantRows } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', caller.role)
    .eq('participant_id', caller.id)
    .is('left_at', null);
  const myThreadIds = ((myParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id);

  let targetThreadId: string | null = null;
  if (myThreadIds.length > 0) {
    const { data: parentParticipantRows } = await supabase
      .from('montree_message_thread_participants')
      .select('thread_id')
      .eq('participant_role', 'parent')
      .eq('participant_id', parentId)
      .in('thread_id', myThreadIds)
      .is('left_at', null);
    const sharedIds = ((parentParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id);
    if (sharedIds.length > 0) {
      // Pick the most recently active shared thread.
      const { data: threadRows } = await supabase
        .from('montree_message_threads')
        .select('id, last_message_at')
        .in('id', sharedIds)
        .eq('school_id', schoolId)
        .is('archived_at', null)
        .order('last_message_at', { ascending: false })
        .limit(1);
      if (threadRows && threadRows.length > 0) {
        targetThreadId = (threadRows[0] as { id: string }).id;
      }
    }
  }

  // Step 2: spin up a fresh thread when none exists
  if (!targetThreadId) {
    const created = await createThreadWithParticipants(supabase, {
      schoolId,
      classroomId: classroomId ?? null,
      childId: childId ?? null,
      threadType: 'parent_teacher',
      subject: null,
      createdBy: { role: caller.role as ParticipantRole, id: caller.id },
      participants: [
        { role: caller.role as ParticipantRole, id: caller.id, canReply: true, isPrimary: true },
        { role: 'parent', id: parentId, canReply: true, isPrimary: false },
      ],
    });
    if (!created) return null;
    targetThreadId = created.id;
  }

  // Step 3: insert the invite message
  const body = buildVideoCallInviteBody(appointmentId, caption, !!audioOnly);
  const { data: msgRow, error: insertErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: targetThreadId,
      sender_role: caller.role,
      sender_id: caller.id,
      sender_name: caller.name,
      body,
      ai_drafted: false,
    })
    .select('id')
    .maybeSingle();

  if (insertErr || !msgRow) {
    console.error('[postVideoCallInvite] insert failed', insertErr);
    return null;
  }

  return { threadId: targetThreadId, messageId: (msgRow as { id: string }).id };
}
