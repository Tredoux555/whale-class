// app/api/montree/dashboard/conversations/[id]/route.ts
//
// Single meeting-note GET / PATCH / DELETE. All filtered by teacher_id +
// school_id — a teacher can only touch their own notes.
//
// PATCH supports editing the teacher's free `notes` field, the
// child link / name, and the parent_visible toggle. The summary +
// transcript are immutable once saved (they're the AI output — editing
// them would put the teacher's words in Sonnet's mouth, and break the
// "what was said" trust contract).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { shareMeetingNoteToThread } from '@/lib/montree/meeting-notes/share-to-thread';
import {
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTES_LEN = 4_000;
const MAX_CHILD_NAME_LEN = 100;

// 🚨 Session 121 — encryption_version is part of the canonical SELECT for
// every read of a meeting-note row. The post-read decrypt step depends on it.
const SELECT_COLS =
  'id, teacher_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, transcript, notes, encryption_version, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at';

// 🚨 Decrypt summary + transcript + notes off a meeting-note row. All three
// share the row's encryption_version. Returns a row with plaintext fields.
function decryptMeetingNote<T extends {
  summary?: string | null;
  transcript?: string | null;
  notes?: string | null;
  encryption_version?: number | null;
}>(row: T): T {
  const v = row.encryption_version ?? null;
  return {
    ...row,
    summary: row.summary ? readEncryptedField(row.summary, v) : row.summary,
    transcript: row.transcript ? readEncryptedField(row.transcript, v) : row.transcript,
    notes: row.notes ? readEncryptedField(row.notes, v) : row.notes,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_meeting_notes')
    .select(SELECT_COLS)
    .eq('id', id)
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (error) {
    console.error('[meeting-notes/[id] GET] error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ meeting: decryptMeetingNote(data) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  let body: {
    notes?: string | null;
    child_id?: string | null;
    child_name?: string | null;
    meeting_date?: string | null;
    parent_visible?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // 🚨 Session 121 — when PATCHing notes, mirror the row's existing
  // encryption_version. We must read the row FIRST to know whether it's
  // encrypted, then encrypt new notes with the same version (or leave
  // plaintext if the row is legacy). Half-encrypting the row would
  // leave summary/transcript out of sync with notes. We resolve later
  // after the row read.
  let pendingNotesPlaintext: string | null | undefined = undefined;
  if (body.notes !== undefined) {
    pendingNotesPlaintext = body.notes === null ? null : body.notes.slice(0, MAX_NOTES_LEN);
  }
  if (body.child_name !== undefined) {
    updates.child_name =
      body.child_name === null
        ? null
        : body.child_name.slice(0, MAX_CHILD_NAME_LEN).trim() || null;
  }
  if (body.meeting_date !== undefined) {
    updates.meeting_date = body.meeting_date ? body.meeting_date.slice(0, 10) : null;
  }
  if (typeof body.parent_visible === 'boolean') {
    updates.parent_visible = body.parent_visible;
  }

  const supabase = getSupabase();

  // If a new child_id is supplied, verify school membership.
  if (body.child_id !== undefined) {
    if (body.child_id === null) {
      updates.child_id = null;
    } else if (UUID_RE.test(body.child_id)) {
      const { data: child, error: childErr } = await supabase
        .from('montree_children')
        .select('id')
        .eq('id', body.child_id)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (childErr || !child) {
        return NextResponse.json(
          { error: 'Child not found in this school.' },
          { status: 403 }
        );
      }
      updates.child_id = child.id;
    } else {
      return NextResponse.json({ error: 'Invalid child_id.' }, { status: 400 });
    }
  }

  // 🚨 Session 121 — resolve notes encryption against the existing row's
  // version. Read the row's encryption_version first; encrypt new notes
  // with the same version if non-null (1), else write plaintext. Skipping
  // notes update? Don't add it to `updates`.
  if (pendingNotesPlaintext !== undefined) {
    if (pendingNotesPlaintext === null) {
      updates.notes = null;
    } else {
      const { data: existing } = await supabase
        .from('montree_meeting_notes')
        .select('encryption_version')
        .eq('id', id)
        .eq('teacher_id', auth.userId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      const existingVersion =
        ((existing as { encryption_version?: number | null } | null)?.encryption_version) ?? null;
      if (existingVersion === 1) {
        // Encrypt to match the row's version.
        const enc = writeEncryptedField(pendingNotesPlaintext, true);
        // Defensive: writeEncryptedField may fall back to plaintext if the
        // key is misconfigured — log loudly if that happens.
        if (enc.version !== 1) {
          console.error(
            '[meeting-notes PATCH] row is version=1 but encrypt fell back to plaintext — key misconfigured?'
          );
        }
        updates.notes = enc.value;
      } else {
        updates.notes = pendingNotesPlaintext;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No editable fields supplied.' },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from('montree_meeting_notes')
    .update(updates)
    .eq('id', id)
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) {
    console.error('[meeting-notes/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 🚨 Session 114 finisher — when parent_visible flips true, post the
  // summary into a dedicated parent_teacher thread. Idempotent via
  // shared_to_thread_id check inside the helper + stamping after the share.
  //
  // 🚨 Session 121 — decrypt summary BEFORE passing to shareMeetingNoteToThread.
  // The helper expects plaintext (it re-encrypts independently for the message
  // domain). Passing ciphertext would double-encrypt.
  let shareResult: { threadId: string | null; reason?: string; error?: string } | null = null;
  if (
    body.parent_visible === true &&
    updated.parent_visible === true &&
    !updated.shared_to_thread_id
  ) {
    const plaintextSummary = readEncryptedField(updated.summary, updated.encryption_version);
    shareResult = await shareMeetingNoteToThread({
      supabase,
      meeting: {
        id: updated.id,
        school_id: updated.school_id,
        classroom_id: updated.classroom_id,
        child_id: updated.child_id,
        child_name: updated.child_name,
        meeting_date: updated.meeting_date,
        summary: plaintextSummary,
        shared_to_thread_id: updated.shared_to_thread_id,
        locale: updated.locale,
      },
      authorRole: 'teacher',
      authorId: auth.userId,
    });
    if (shareResult.threadId) {
      const { data: restamped } = await supabase
        .from('montree_meeting_notes')
        .update({ shared_to_thread_id: shareResult.threadId })
        .eq('id', id)
        .eq('teacher_id', auth.userId)
        .eq('school_id', auth.schoolId)
        .select(SELECT_COLS)
        .maybeSingle();
      if (restamped) {
        return NextResponse.json({ meeting: decryptMeetingNote(restamped), share: shareResult });
      }
    }
  }

  return NextResponse.json({
    meeting: decryptMeetingNote(updated),
    ...(shareResult ? { share: shareResult } : {}),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_meeting_notes')
    .delete()
    .eq('id', id)
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[meeting-notes/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
