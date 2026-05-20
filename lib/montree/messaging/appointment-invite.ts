// lib/montree/messaging/appointment-invite.ts
//
// 🚨 Session 120 — appointment-invite message convention.
//
// CONVENTION: a thread message whose body STARTS WITH
//   [[APPT:<appointmentId>:<status>]]
// is treated as an appointment-invite card. The renderer strips the
// marker and shows a rich card with date/time/duration plus inline
// Accept/Decline buttons (parent) or Cancel/Reschedule (staff).
//
// STATUS values inside the marker reflect the appointment state at the
// moment the message was posted:
//   - 'invite'    → freshly created, awaiting parent response
//   - 'confirmed' → parent accepted (auto-posted by accept route)
//   - 'declined'  → parent declined (auto-posted by decline route)
//   - 'cancelled' → host cancelled
//
// Why a body prefix and not JSONB? Same reasoning as [[VCALL:]] in
// video-call-invite.ts (Session 119):
//   - Avoids a new migration on montree_thread_messages
//   - Old clients still see human-readable body after the marker
//   - Single source of truth: the appointment row's current status is
//     fetched lazily by the card renderer when needed
//
// Why include status in the marker?
//   - The renderer can pick the right card variant + colour without
//     fetching the appointment immediately (lazy hydration still
//     refreshes when the card mounts, but the first paint is correct)
//
// COMPATIBILITY: parseVideoCallInvite() and parseAppointmentInvite() are
// disjoint — the markers cannot overlap. Renderers should try parsing
// as APPT first (since APPT cards may contain video info too), then
// fall back to VCALL.

import { createThreadWithParticipants } from './thread-resolver';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParticipantRole } from './types';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
} from '@/lib/montree/messaging-crypto';

const APPT_PREFIX = '[[APPT:';
const APPT_SUFFIX = ']]';

export type ApptInviteStatus = 'invite' | 'confirmed' | 'declined' | 'cancelled';

export interface ParsedApptInvite {
  appointmentId: string;
  status: ApptInviteStatus;
  /** Human-readable body that follows the marker. */
  caption: string;
}

/** Try to parse a message body as an appointment-invite. Returns null when
 *  the body isn't an invite (most messages aren't). */
export function parseAppointmentInvite(body: string): ParsedApptInvite | null {
  if (!body.startsWith(APPT_PREFIX)) return null;
  const closeIdx = body.indexOf(APPT_SUFFIX);
  if (closeIdx < 0) return null;
  const inner = body.slice(APPT_PREFIX.length, closeIdx);
  // Expect format: <uuid>:<status>
  const colonIdx = inner.indexOf(':');
  if (colonIdx < 0) return null;
  const id = inner.slice(0, colonIdx).trim();
  const status = inner.slice(colonIdx + 1).trim() as ApptInviteStatus;
  if (!id || !status) return null;
  // Validate canonical UUID format (same as UUID_RE used in API routes).
  // Defense in depth — the marker is server-built, but tight parsing here
  // means a malformed body never produces a fake card.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  if (!['invite', 'confirmed', 'declined', 'cancelled'].includes(status)) return null;
  const caption = body.slice(closeIdx + APPT_SUFFIX.length).trim();
  return { appointmentId: id, status, caption };
}

/** Build the canonical appointment-invite message body. Pass a friendly
 *  caption like "Monthly review · Mon 21 May · 3pm" or
 *  "Tredoux confirmed your meeting for Tuesday 3pm". */
export function buildAppointmentInviteBody(
  appointmentId: string,
  status: ApptInviteStatus,
  caption: string
): string {
  // Strip any stray [[APPT:...]] markers the caller accidentally included.
  const safeCaption = caption.replace(/\[\[APPT:[^\]]*\]\]/g, '').trim();
  return `${APPT_PREFIX}${appointmentId}:${status}${APPT_SUFFIX}${safeCaption ? ` ${safeCaption}` : ''}`;
}

// ─── post helper ─────────────────────────────────────────────────────

interface PostInviteArgs {
  /** Service-role supabase client (server-side). */
  supabase: SupabaseClient;
  /** School where the appointment lives. */
  schoolId: string;
  /** Classroom anchor for the thread (optional but preferred). */
  classroomId?: string | null;
  /** Child anchor for the thread (optional). */
  childId?: string | null;
  /** The appointment id the invite points at. */
  appointmentId: string;
  /** Initial status of the invite card. */
  status: ApptInviteStatus;
  /** The caller posting the invite. Can be teacher / principal / parent. */
  caller: { role: 'teacher' | 'principal' | 'parent'; id: string; name: string };
  /** The OTHER participant. For staff-posted cards this is the parent_id.
   *  For parent-posted accept/decline messages this is the host's id. */
  counterpartRole: 'parent' | 'teacher' | 'principal';
  counterpartId: string;
  /** Friendly caption (the human-readable bit after the marker). */
  caption: string;
  /** Optional explicit thread_id — when provided, post into THIS thread
   *  instead of resolving the parent_teacher pair. Used when an appointment
   *  is set from inside a chat thread (so the card lives where the conversation
   *  started, even if it's a parent_principal or internal thread). */
  threadId?: string | null;
}

/**
 * Find OR create the appropriate thread between caller and counterpart,
 * then insert an appointment-invite message into it. Returns thread_id +
 * message_id on success, null on failure.
 *
 * Re-uses the parent_teacher thread between caller + counterpart when one
 * exists (mirroring postVideoCallInvite). Creates a fresh one when none
 * exists. Principal-observer transparency is preserved automatically
 * (Session 97) because createThreadWithParticipants auto-adds the principal
 * as observer for parent_teacher threads.
 */
export async function postAppointmentInvite(args: PostInviteArgs): Promise<{
  threadId: string;
  messageId: string;
} | null> {
  const {
    supabase, schoolId, classroomId, childId,
    appointmentId, status, caller, counterpartRole, counterpartId, caption,
    threadId: explicitThreadId,
  } = args;

  let targetThreadId: string | null = explicitThreadId ?? null;

  // Only resolve a thread if one wasn't explicitly passed.
  if (!targetThreadId) {
    // Step 1: find an existing thread shared by caller + counterpart.
    // We look for parent_teacher AND parent_principal threads.
    const { data: myParticipantRows } = await supabase
      .from('montree_message_thread_participants')
      .select('thread_id')
      .eq('participant_role', caller.role)
      .eq('participant_id', caller.id)
      .is('left_at', null);
    const myThreadIds = ((myParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id);

    if (myThreadIds.length > 0) {
      const { data: otherParticipantRows } = await supabase
        .from('montree_message_thread_participants')
        .select('thread_id')
        .eq('participant_role', counterpartRole)
        .eq('participant_id', counterpartId)
        .in('thread_id', myThreadIds)
        .is('left_at', null);
      const sharedIds = ((otherParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id);
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
  }

  // Step 2: spin up a fresh thread when none exists.
  // Thread type defaults to parent_teacher unless the caller is principal
  // (parent_principal) or the counterpart is a non-parent (internal).
  if (!targetThreadId) {
    let threadType: 'parent_teacher' | 'parent_principal' | 'internal' = 'parent_teacher';
    if (caller.role === 'principal' && counterpartRole === 'parent') {
      threadType = 'parent_principal';
    } else if (caller.role === 'parent' && counterpartRole === 'principal') {
      threadType = 'parent_principal';
    } else if (counterpartRole !== 'parent' && caller.role !== 'parent') {
      threadType = 'internal';
    }

    const created = await createThreadWithParticipants(supabase, {
      schoolId,
      classroomId: classroomId ?? null,
      childId: childId ?? null,
      threadType,
      subject: null,
      createdBy: { role: caller.role as ParticipantRole, id: caller.id },
      participants: [
        { role: caller.role as ParticipantRole, id: caller.id, canReply: true, isPrimary: true },
        { role: counterpartRole as ParticipantRole, id: counterpartId, canReply: true, isPrimary: false },
      ],
    });
    if (!created) return null;
    targetThreadId = created.id;
  }

  // Step 3: insert the invite message.
  // 🚨 Session 121 — encrypt the body if encryption_v1 is enabled.
  // The [[APPT:]] marker IS encrypted along with the body; renderer
  // sees plaintext after decryptField at read time.
  const plaintextBody = buildAppointmentInviteBody(appointmentId, status, caption);
  const encEnabled = await isEncryptionEnabledForSchool(supabase, schoolId);
  const enc = writeEncryptedField(plaintextBody, encEnabled);
  const { data: msgRow, error: insertErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: targetThreadId,
      sender_role: caller.role,
      sender_id: caller.id,
      sender_name: caller.name,
      body: enc.value,
      encryption_version: enc.version,
      ai_drafted: false,
    })
    .select('id')
    .maybeSingle();

  if (insertErr || !msgRow) {
    console.error('[postAppointmentInvite] insert failed', insertErr);
    return null;
  }

  return { threadId: targetThreadId, messageId: (msgRow as { id: string }).id };
}
