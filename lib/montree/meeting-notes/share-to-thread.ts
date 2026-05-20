// lib/montree/meeting-notes/share-to-thread.ts
//
// Shared helper for the Session 114 finisher — when a meeting note's
// `parent_visible` flag flips true, post the summary into the existing
// Session 97 messaging system so the parent actually sees it.
//
// CALLED FROM:
//   - app/api/montree/dashboard/conversations/[id]/route.ts (teacher author)
//   - app/api/montree/admin/meeting-notes/[id]/route.ts    (principal author)
//
// CONTRACT:
//   - Only fires when meeting.child_id IS NOT NULL (no child = no parent
//     to post to).
//   - Gated on the `parent_messaging` feature flag for the meeting's school.
//   - Idempotent: skips if meeting.shared_to_thread_id is already set.
//   - Creates a new dedicated thread per meeting (one thread per meeting
//     note) rather than appending to long-running parent_teacher threads.
//     The thread subject names the meeting so it's clear what it's about.
//   - Sets ai_drafted=false on the message — this is the teacher's /
//     principal's words being shared, not Tracy's draft.
//   - Returns the thread_id on success; null + reason otherwise.
//
// SCHOOL-SCOPING CONTRACT: every Supabase query in here filters by
// meeting.school_id. The author_id is the teacher_id or principal_id from
// the meeting row itself, and the meeting row's authorship was verified
// upstream (the caller is the only one who can flip parent_visible on
// their own row — see [id] PATCH routes).

import type { SupabaseClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';
import type { ThreadType, ParticipantRole } from '@/lib/montree/messaging/types';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
} from '@/lib/montree/messaging-crypto';

export type ShareSkipReason =
  | 'no_child'
  | 'feature_disabled'
  | 'already_shared'
  | 'no_parents'
  | 'author_not_found'
  | 'thread_create_failed'
  | 'message_insert_failed';

export interface ShareResult {
  threadId: string | null;
  reason?: ShareSkipReason;
  error?: string;
}

interface ShareInput {
  supabase: SupabaseClient;
  meeting: {
    id: string;
    school_id: string;
    classroom_id: string | null;
    child_id: string | null;
    child_name: string | null;
    meeting_date: string | null;
    summary: string;
    shared_to_thread_id: string | null;
    locale: string | null;
  };
  authorRole: 'teacher' | 'principal';
  authorId: string;
}

/**
 * Post the meeting summary into a parent thread. Idempotent + best-effort.
 * Caller persists the returned threadId on the meeting row so re-toggles
 * don't double-post.
 */
export async function shareMeetingNoteToThread(input: ShareInput): Promise<ShareResult> {
  const { supabase, meeting, authorRole, authorId } = input;

  // ── Idempotency: skip if already posted ─────────────────────────────
  if (meeting.shared_to_thread_id) {
    return { threadId: meeting.shared_to_thread_id, reason: 'already_shared' };
  }

  // ── Gate 1: child must be linked ────────────────────────────────────
  if (!meeting.child_id) {
    return { threadId: null, reason: 'no_child' };
  }

  // ── Gate 2: feature flag ────────────────────────────────────────────
  const messagingEnabled = await isFeatureEnabled(
    supabase,
    meeting.school_id,
    'parent_messaging'
  );
  if (!messagingEnabled) {
    return { threadId: null, reason: 'feature_disabled' };
  }

  // ── Fetch parents linked to this child ──────────────────────────────
  // The parent_children junction is the source of truth for "who is this
  // child's parent." We post to every parent linked so co-parents both see
  // the summary.
  const { data: parentLinks, error: linksErr } = await supabase
    .from('montree_parent_children')
    .select('parent_id')
    .eq('child_id', meeting.child_id);
  if (linksErr) {
    console.error('[share-to-thread] parent link query failed', linksErr);
    return { threadId: null, reason: 'no_parents', error: linksErr.message };
  }
  const parentIds = Array.from(
    new Set((parentLinks || []).map((p: { parent_id: string }) => p.parent_id))
  );
  if (parentIds.length === 0) {
    return { threadId: null, reason: 'no_parents' };
  }

  // ── Look up the author's display name for sender_name ───────────────
  // Teachers live in montree_teachers; principals in montree_school_admins.
  let authorName = 'Teacher';
  if (authorRole === 'teacher') {
    const { data: teacher } = await supabase
      .from('montree_teachers')
      .select('name')
      .eq('id', authorId)
      .eq('school_id', meeting.school_id) // belt-and-braces school scope
      .maybeSingle();
    if (!teacher) {
      return { threadId: null, reason: 'author_not_found' };
    }
    authorName = teacher.name || 'Teacher';
  } else {
    const { data: principal } = await supabase
      .from('montree_school_admins')
      .select('name')
      .eq('id', authorId)
      .eq('school_id', meeting.school_id)
      .maybeSingle();
    if (!principal) {
      return { threadId: null, reason: 'author_not_found' };
    }
    authorName = principal.name || 'Principal';
  }

  // ── Build the thread ────────────────────────────────────────────────
  // Subject names the meeting so the parent can see what the new thread is
  // for. "Meeting summary — Amy, 17 May 2026" is clearer than appending to
  // a generic thread.
  const childLabel = meeting.child_name || 'your child';
  const dateLabel = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  const subject = `Meeting summary — ${childLabel}, ${dateLabel}`;

  // Thread type drives which auto-observer rule fires inside
  // createThreadWithParticipants. parent_teacher AND parent_principal both
  // auto-add the principal as observer (Session 97 transparency rule).
  const threadType: ThreadType =
    authorRole === 'teacher' ? 'parent_teacher' : 'parent_principal';

  const created = await createThreadWithParticipants(supabase, {
    schoolId: meeting.school_id,
    classroomId: meeting.classroom_id,
    childId: meeting.child_id,
    threadType,
    subject,
    createdBy: { role: authorRole as ParticipantRole, id: authorId },
    participants: parentIds.map((pid) => ({
      role: 'parent' as ParticipantRole,
      id: pid,
      isPrimary: false,
      isObserver: false,
      canReply: true,
    })),
  });
  if (!created) {
    return { threadId: null, reason: 'thread_create_failed' };
  }

  // ── Post the message ────────────────────────────────────────────────
  // 🚨 Session 121 — encrypt the shared summary when encryption_v1 is on.
  // The summary is being posted INTO the thread system (which is its own
  // encryption domain), so we encrypt independently from the meeting-note
  // row's encryption state. The meeting note's own encryption is handled
  // at the route layer in §B.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, meeting.school_id);
  const enc = writeEncryptedField(meeting.summary, encEnabled);
  const { error: msgErr } = await supabase.from('montree_thread_messages').insert({
    thread_id: created.id,
    sender_role: authorRole,
    sender_id: authorId,
    sender_name: authorName,
    body: enc.value,
    encryption_version: enc.version,
    body_locale: meeting.locale || null,
    ai_drafted: false,
    ai_draft_source: null,
    approved_by_id: null,
  });
  if (msgErr) {
    console.error('[share-to-thread] message insert failed', msgErr);
    // The thread itself was created — return the id so callers can stamp
    // shared_to_thread_id and avoid creating a second thread on retry. The
    // parent will see an empty thread, which is a recoverable state (author
    // can re-toggle or post manually).
    return {
      threadId: created.id,
      reason: 'message_insert_failed',
      error: msgErr.message,
    };
  }

  return { threadId: created.id };
}
