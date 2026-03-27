// app/api/montree/weekly-admin-docs/notes/route.ts
// GET: Fetch all notes for a classroom + week
// POST: Batch upsert notes (teacher saves all children's notes at once)

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

// ─── GET: Fetch notes for a classroom + week ─────────────────

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id') || auth.classroomId;
  const weekStart = searchParams.get('week_start');

  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
  }
  if (!weekStart) {
    return NextResponse.json({ error: 'week_start required (YYYY-MM-DD, must be Monday)' }, { status: 400 });
  }

  // Validate weekStart is a Monday
  const parsed = new Date(`${weekStart}T00:00:00Z`);
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
  }

  // Validate not too far in future (allow +1 week for plan preparation)
  const now = new Date();
  const todayBeijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const currentMonday = getBeijingMonday(todayBeijing);
  const nextMonday = getNextMonday(currentMonday);
  if (weekStart > nextMonday) {
    return NextResponse.json({ error: 'week_start cannot be more than 1 week in the future' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify classroom belongs to teacher's school
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('school_id')
    .eq('id', classroomId)
    .maybeSingle();

  if (!classroom || classroom.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { data: notes, error } = await supabase
    .from('montree_weekly_admin_notes')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('weekly-admin-docs/notes GET error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }

  return NextResponse.json({ success: true, notes: notes || [] });
}

// ─── POST: Batch upsert notes ────────────────────────────────

interface NoteInput {
  child_id: string;
  doc_type: 'summary' | 'plan';
  area?: string | null;
  english_text?: string | null;
  chinese_text?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const classroomId: string = body.classroom_id || auth.classroomId;
    const weekStart: string = body.week_start;
    const notes: NoteInput[] = body.notes;

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    }
    if (!Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json({ error: 'notes array required' }, { status: 400 });
    }

    // Validate weekStart is a Monday
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
    }

    // Validate not too far in future (allow +1 week for plan preparation)
    const now = new Date();
    const todayBeijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentMonday = getBeijingMonday(todayBeijing);
    const nextMonday = getNextMonday(currentMonday);
    if (weekStart > nextMonday) {
      return NextResponse.json({ error: 'week_start cannot be more than 1 week in the future' }, { status: 400 });
    }

    // Validate doc_type and area values
    const validDocTypes = ['summary', 'plan'];
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'notes'];

    for (const note of notes) {
      if (!validDocTypes.includes(note.doc_type)) {
        return NextResponse.json({ error: `Invalid doc_type: ${note.doc_type}` }, { status: 400 });
      }
      if (note.area && !validAreas.includes(note.area)) {
        return NextResponse.json({ error: `Invalid area: ${note.area}` }, { status: 400 });
      }
      // area='notes' is only valid for plan doc_type (additional teacher notes column)
      if (note.area === 'notes' && note.doc_type !== 'plan') {
        return NextResponse.json({ error: 'area="notes" is only valid for doc_type="plan"' }, { status: 400 });
      }
    }

    const supabase = getSupabase();

    // Verify classroom belongs to teacher's school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Batch upsert using ON CONFLICT on the unique index
    const upsertRows = notes.map((note) => ({
      classroom_id: classroomId,
      child_id: note.child_id,
      week_start: weekStart,
      doc_type: note.doc_type,
      area: note.area || null,
      english_text: note.english_text || null,
      chinese_text: note.chinese_text || null,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    }));

    // Supabase JS can't handle COALESCE in onConflict, so we do individual
    // select→update/insert with proper area filtering to match the unique index.
    let failCount = 0;
    for (const row of upsertRows) {
      // Build query matching the unique index: (child_id, week_start, doc_type, COALESCE(area, '__summary__'))
      let query = supabase
        .from('montree_weekly_admin_notes')
        .select('id')
        .eq('child_id', row.child_id)
        .eq('week_start', row.week_start)
        .eq('doc_type', row.doc_type);

      // Handle NULL area correctly — PostgreSQL NULL != NULL, use .is() for null
      if (row.area === null) {
        query = query.is('area', null);
      } else {
        query = query.eq('area', row.area);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabase
          .from('montree_weekly_admin_notes')
          .update({
            english_text: row.english_text,
            chinese_text: row.chinese_text,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
          })
          .eq('id', existing.id);
        if (updateErr) {
          console.error('weekly-admin-docs/notes update error:', updateErr.message);
          failCount++;
        }
      } else {
        const { error: insertErr } = await supabase
          .from('montree_weekly_admin_notes')
          .insert(row);
        if (insertErr) {
          console.error('weekly-admin-docs/notes insert error:', insertErr.message);
          failCount++;
        }
      }
    }

    if (failCount > 0) {
      return NextResponse.json({ error: `Failed to save ${failCount} notes` }, { status: 500 });
    }

    return NextResponse.json({ success: true, saved: upsertRows.length });
  } catch (err) {
    console.error('weekly-admin-docs/notes POST exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Get YYYY-MM-DD of the Monday of the week containing the given date (Beijing time). */
function getBeijingMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Go back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Get YYYY-MM-DD of the Monday after the given Monday string. */
function getNextMonday(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
