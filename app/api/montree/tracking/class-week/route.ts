// app/api/montree/tracking/class-week/route.ts
//
// PATCH /api/montree/tracking/class-week  { classroom_id, letter } → { ok }
// GET   /api/montree/tracking/class-week?classroom_id=  → { classroom_id, letter, set_at }
//
// "Which Dark Phonics book is this class on this week." One row per class
// (montree_class_dark_phonics_week, migration 344). It is the fallback the
// weekly summary narrates for a child nobody observed (the "Amir" scenario),
// so it must be settable in one tap and must never be a guess: only a LIVE
// letter from TRACKER_LETTERS is accepted.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIVE_LETTERS = TRACKER_LETTERS.filter((l) => l.status === 'live').map((l) => l.letter);

export async function GET(request: NextRequest) {
  const gate = await guard(request, request.nextUrl.searchParams.get('classroom_id'));
  if (gate instanceof NextResponse) return gate;
  const { supabase, classroomId } = gate;

  const { data, error } = await supabase
    .from('montree_class_dark_phonics_week')
    .select('class_id, letter, set_at')
    .eq('class_id', classroomId)
    .maybeSingle();
  if (error && error.code === '42P01') {
    return NextResponse.json({ classroom_id: classroomId, letter: null, migration_pending: true });
  }
  const row = data as { letter?: string; set_at?: string } | null;
  return NextResponse.json({
    classroom_id: classroomId,
    letter: row?.letter ?? null,
    set_at: row?.set_at ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  let body: { classroom_id?: string; letter?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const gate = await guard(request, body.classroom_id ?? null);
  if (gate instanceof NextResponse) return gate;
  const { supabase, classroomId, userId } = gate;

  const letter = String(body.letter || '').trim().toLowerCase();
  if (!LIVE_LETTERS.includes(letter)) {
    return NextResponse.json(
      { ok: false, error: `letter must be one of ${LIVE_LETTERS.join(', ')}` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('montree_class_dark_phonics_week')
    .upsert(
      { class_id: classroomId, letter, set_at: new Date().toISOString(), set_by: userId ?? null },
      { onConflict: 'class_id' },
    );
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { ok: false, error: 'Migration 344 not yet run', migration_pending: true },
        { status: 503 },
      );
    }
    console.error('[tracking/class-week] upsert failed:', error.message || error);
    return NextResponse.json({ ok: false, error: 'Could not set letter' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, classroom_id: classroomId, letter });
}

async function guard(request: NextRequest, requestedClassroomId: string | null) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const classroomId = requestedClassroomId || auth.classroomId || null;
  if (!classroomId || !UUID_RE.test(classroomId)) {
    return NextResponse.json({ ok: false, error: 'classroom_id required (UUID)' }, { status: 400 });
  }
  const supabase = getSupabase();
  if (auth.classroomId !== classroomId) {
    const { data } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();
    const row = data as { school_id: string } | null;
    if (!row || row.school_id !== auth.schoolId) {
      return NextResponse.json({ ok: false, error: 'Classroom not in your school' }, { status: 403 });
    }
  }
  return { supabase, classroomId, userId: auth.userId };
}
