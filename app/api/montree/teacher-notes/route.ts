import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// GET /api/montree/teacher-notes?classroom_id=UUID&limit=50&offset=0
// Returns recent notes for the classroom (all teachers)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const classroomId = request.nextUrl.searchParams.get('classroom_id');
    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

    const supabase = getSupabase();

    // Verify classroom belongs to school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    if (classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch notes — only the current teacher's own notes (private per teacher)
    const { data: notes, error: notesError } = await supabase
      .from('montree_teacher_notes')
      .select('id, teacher_id, child_id, content, transcription, created_at, montree_teachers(name), montree_children(name)')
      .eq('classroom_id', classroomId)
      .eq('teacher_id', auth.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notesError) {
      console.error('Failed to fetch teacher notes:', notesError.message);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Flatten teacher name and child name from joins
    const formatted = (notes || []).map((n: Record<string, unknown>) => {
      const teacher = n.montree_teachers as { name: string } | null;
      const child = n.montree_children as { name: string } | null;
      return {
        id: n.id,
        teacher_id: n.teacher_id,
        child_id: n.child_id || null,
        child_name: child?.name || null,
        teacher_name: teacher?.name || 'Unknown',
        content: n.content,
        transcription: n.transcription,
        created_at: n.created_at,
      };
    });

    return NextResponse.json(
      { notes: formatted },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Teacher notes GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/montree/teacher-notes
// Create a new teacher note
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { classroom_id, content, transcription, child_id } = body as {
      classroom_id?: string;
      content?: string;
      transcription?: string;
      child_id?: string | null;
    };

    if (!classroom_id || typeof classroom_id !== 'string') {
      return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Note too long (max 5000 characters)' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroom_id)
      .maybeSingle();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    if (classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from('montree_teacher_notes')
      .insert({
        classroom_id: classroom_id,
        teacher_id: auth.userId,
        school_id: auth.schoolId,
        content: content.trim(),
        transcription: transcription?.trim() || null,
        child_id: child_id || null,
      })
      .select('id, content, transcription, child_id, created_at');

    if (insertError) {
      console.error('Failed to create teacher note:', insertError.message);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    const note = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Teacher notes POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/montree/teacher-notes
// Update a note's content (only by the teacher who created it)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { note_id, content } = body as {
      note_id?: string;
      content?: string;
    };

    if (!note_id || typeof note_id !== 'string') {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Note too long (max 5000 characters)' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the note belongs to this teacher
    const { data: note, error: noteError } = await supabase
      .from('montree_teacher_notes')
      .select('id, teacher_id, school_id')
      .eq('id', note_id)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.school_id !== auth.schoolId || note.teacher_id !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from('montree_teacher_notes')
      .update({ content: content.trim() })
      .eq('id', note_id)
      .select('id, content, created_at')
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update teacher note:', updateError.message);
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }

    if (!updatedNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Teacher notes PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/montree/teacher-notes
// Delete a note (only by the teacher who created it)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const noteId = request.nextUrl.searchParams.get('note_id');
    if (!noteId) {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the note belongs to this teacher
    const { data: note, error: noteError } = await supabase
      .from('montree_teacher_notes')
      .select('id, teacher_id, school_id')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.school_id !== auth.schoolId || note.teacher_id !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('montree_teacher_notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      console.error('Failed to delete teacher note:', deleteError.message);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Teacher notes DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
