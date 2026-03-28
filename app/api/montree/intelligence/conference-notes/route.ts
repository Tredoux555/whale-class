// GET /api/montree/intelligence/conference-notes — List conference notes for a child
// POST /api/montree/intelligence/conference-notes — Create a new conference note
// PATCH /api/montree/intelligence/conference-notes — Update note text / share / retract
//
// Data sources:
//   montree_conference_notes — Notes with draft/shared/retracted status
//   montree_conference_note_versions — Edit history per note
//   montree_children — Child name lookup
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const childId = req.nextUrl.searchParams.get('child_id');

  try {
    // Get children in this classroom first (for classroom scoping)
    const { data: classroomChildren, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', auth.classroomId);

    if (childrenErr) {
      console.error('[ConferenceNotes] Children query error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    const classroomChildIds = (classroomChildren || []).map((c: { id: string }) => c.id);
    if (classroomChildIds.length === 0) {
      return NextResponse.json({ notes: [], total: 0 });
    }

    // If child_id provided, get notes for that child; otherwise get all notes for classroom
    let query = supabase
      .from('montree_conference_notes')
      .select('id, child_id, note_text, status, created_by, shared_at, retracted_at, created_at, updated_at')
      .eq('school_id', auth.schoolId)
      .in('child_id', classroomChildIds)
      .order('updated_at', { ascending: false });

    if (childId) {
      query = query.eq('child_id', childId);
    }

    const { data: notes, error: notesErr } = await query.limit(100);

    if (notesErr) {
      console.error('[ConferenceNotes] Notes query error:', notesErr);
      return NextResponse.json({ error: 'Failed to load conference notes' }, { status: 500 });
    }

    if (!notes || notes.length === 0) {
      return NextResponse.json({ notes: [], total: 0 });
    }

    // Fetch child names for enrichment
    const childIds = [...new Set(notes.map(n => n.child_id))];
    const { data: children } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);

    const childNameMap = new Map(
      (children || []).map((c: { id: string; name: string }) => [c.id, c.name])
    );

    // Fetch teacher names for created_by
    const teacherIds = [...new Set(notes.map(n => n.created_by))];
    const { data: teachers } = await supabase
      .from('montree_teachers')
      .select('id, name')
      .in('id', teacherIds);

    const teacherNameMap = new Map(
      (teachers || []).map((t: { id: string; name: string }) => [t.id, t.name])
    );

    const enriched = notes.map(n => ({
      ...n,
      child_name: childNameMap.get(n.child_id) || 'Unknown',
      created_by_name: teacherNameMap.get(n.created_by) || 'Unknown',
    }));

    return NextResponse.json({
      notes: enriched,
      total: enriched.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[ConferenceNotes] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { child_id, note_text } = body;

    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    if (!note_text || typeof note_text !== 'string' || note_text.trim().length === 0) {
      return NextResponse.json({ error: 'note_text is required' }, { status: 400 });
    }
    if (note_text.length > 5000) {
      return NextResponse.json({ error: 'note_text too long (max 5000 chars)' }, { status: 400 });
    }

    // Verify child belongs to this school AND classroom
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', child_id)
      .eq('school_id', auth.schoolId)
      .eq('classroom_id', auth.classroomId)
      .maybeSingle();

    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found in your classroom' }, { status: 404 });
    }

    // Create the note
    const { data: note, error: insertErr } = await supabase
      .from('montree_conference_notes')
      .insert({
        child_id,
        school_id: auth.schoolId,
        created_by: auth.userId,
        note_text: note_text.trim(),
        status: 'draft',
      })
      .select('id, child_id, note_text, status, created_by, created_at, updated_at')
      .single();

    if (insertErr) {
      console.error('[ConferenceNotes] Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note });
  } catch (err) {
    console.error('[ConferenceNotes] POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { note_id, action, note_text } = body;

    if (!note_id || typeof note_id !== 'string') {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    // Fetch the existing note with school_id verification
    const { data: existing, error: fetchErr } = await supabase
      .from('montree_conference_notes')
      .select('id, child_id, status, created_by, school_id')
      .eq('id', note_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify child belongs to this classroom (prevent cross-classroom access)
    const { data: childInClassroom } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', existing.child_id)
      .eq('classroom_id', auth.classroomId)
      .maybeSingle();

    if (!childInClassroom) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'edit') {
      if (!note_text || typeof note_text !== 'string' || note_text.trim().length === 0) {
        return NextResponse.json({ error: 'note_text is required for edit' }, { status: 400 });
      }
      if (note_text.length > 5000) {
        return NextResponse.json({ error: 'note_text too long (max 5000 chars)' }, { status: 400 });
      }
      if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'Can only edit draft notes' }, { status: 400 });
      }

      // Save OLD version before updating (preserve previous text for history)
      const { data: oldNote } = await supabase
        .from('montree_conference_notes')
        .select('note_text')
        .eq('id', note_id)
        .maybeSingle();

      const { error: versionErr } = await supabase
        .from('montree_conference_note_versions')
        .insert({
          note_id,
          note_text: oldNote?.note_text ?? note_text.trim(),
          edited_by: auth.userId,
        });

      if (versionErr) {
        console.error('[ConferenceNotes] Version insert error:', versionErr);
      }

      // Update the note text
      const { error: updateErr } = await supabase
        .from('montree_conference_notes')
        .update({ note_text: note_text.trim() })
        .eq('id', note_id);

      if (updateErr) {
        console.error('[ConferenceNotes] Edit update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'edit' });

    } else if (action === 'share') {
      if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'Can only share draft notes' }, { status: 400 });
      }

      const { error: shareErr } = await supabase
        .from('montree_conference_notes')
        .update({
          status: 'shared',
          shared_at: new Date().toISOString(),
          shared_by: auth.userId,
        })
        .eq('id', note_id);

      if (shareErr) {
        console.error('[ConferenceNotes] Share update error:', shareErr);
        return NextResponse.json({ error: 'Failed to share note' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'share' });

    } else if (action === 'retract') {
      if (existing.status !== 'shared') {
        return NextResponse.json({ error: 'Can only retract shared notes' }, { status: 400 });
      }

      const { error: retractErr } = await supabase
        .from('montree_conference_notes')
        .update({
          status: 'retracted',
          retracted_at: new Date().toISOString(),
          retracted_by: auth.userId,
        })
        .eq('id', note_id);

      if (retractErr) {
        console.error('[ConferenceNotes] Retract update error:', retractErr);
        return NextResponse.json({ error: 'Failed to retract note' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'retract' });

    } else if (action === 'unretract') {
      if (existing.status !== 'retracted') {
        return NextResponse.json({ error: 'Can only unretract retracted notes' }, { status: 400 });
      }

      const { error: unretractErr } = await supabase
        .from('montree_conference_notes')
        .update({
          status: 'draft',
          retracted_at: null,
          retracted_by: null,
        })
        .eq('id', note_id);

      if (unretractErr) {
        console.error('[ConferenceNotes] Unretract error:', unretractErr);
        return NextResponse.json({ error: 'Failed to unretract note' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'unretract' });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use: edit, share, retract, unretract' }, { status: 400 });
    }
  } catch (err) {
    console.error('[ConferenceNotes] PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const noteId = req.nextUrl.searchParams.get('note_id');

  if (!noteId || typeof noteId !== 'string') {
    return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
  }

  try {
    // Verify note belongs to this school and is a draft
    const { data: existing, error: fetchErr } = await supabase
      .from('montree_conference_notes')
      .select('id, child_id, status, school_id')
      .eq('id', noteId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify child belongs to this classroom (prevent cross-classroom access)
    const { data: childInClassroom } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', existing.child_id)
      .eq('classroom_id', auth.classroomId)
      .maybeSingle();

    if (!childInClassroom) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Can only delete draft notes' }, { status: 400 });
    }

    // Delete versions first (FK cascade should handle this, but explicit is safer)
    await supabase
      .from('montree_conference_note_versions')
      .delete()
      .eq('note_id', noteId);

    // Delete the note
    const { error: deleteErr } = await supabase
      .from('montree_conference_notes')
      .delete()
      .eq('id', noteId);

    if (deleteErr) {
      console.error('[ConferenceNotes] Delete error:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ConferenceNotes] DELETE unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
