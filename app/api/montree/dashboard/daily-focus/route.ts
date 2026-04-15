// app/api/montree/dashboard/daily-focus/route.ts
// GET    — today's focus list for the teacher's classroom (with confirmation status)
// POST   — add one or more children to today's focus list
//          body: { child_ids: string[] } OR { child_id: string }
// DELETE — remove a child from today's focus list
//          body: { child_id: string }
// PATCH  — manually mark a child as confirmed (teacher override)
//          body: { child_id: string }
//
// focus_date is computed server-side from the current UTC date. Each classroom
// has exactly one focus list per day.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

type ChildRow = { id: string; name: string; photo_url: string | null };
type FocusRow = {
  id: string;
  child_id: string;
  focus_date: string;
  selected_at: string;
  confirmed_at: string | null;
  confirmed_via: string | null;
  confirmed_media_id: string | null;
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadFocusList(classroomId: string, focusDate: string) {
  const supabase = getSupabase();

  const { data: rawFocus } = await supabase
    .from('montree_daily_focus')
    .select('id, child_id, focus_date, selected_at, confirmed_at, confirmed_via, confirmed_media_id')
    .eq('classroom_id', classroomId)
    .eq('focus_date', focusDate)
    .order('selected_at', { ascending: true });

  const focus = (rawFocus || []) as FocusRow[];
  if (focus.length === 0) return { focus: [], children: [], confirmedCount: 0 };

  const childIds = focus.map(f => f.child_id);
  const { data: rawChildren } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .in('id', childIds);

  const children = (rawChildren || []) as ChildRow[];
  const childMap = new Map(children.map(c => [c.id, c]));

  const enriched = focus.map(f => {
    const c = childMap.get(f.child_id);
    return {
      id: f.id,
      child_id: f.child_id,
      name: c?.name || 'Unknown',
      photo_url: c?.photo_url || null,
      focus_date: f.focus_date,
      selected_at: f.selected_at,
      confirmed_at: f.confirmed_at,
      confirmed_via: f.confirmed_via,
      confirmed: Boolean(f.confirmed_at),
    };
  });

  const confirmedCount = enriched.filter(c => c.confirmed).length;

  return { focus, children: enriched, confirmedCount };
}

// ─── GET ───
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const focusDate = request.nextUrl.searchParams.get('date') || todayISODate();
  const { children, confirmedCount } = await loadFocusList(auth.classroomId, focusDate);

  return NextResponse.json({
    focus_date: focusDate,
    children,
    total: children.length,
    confirmed_count: confirmedCount,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// ─── POST: add child(ren) ───
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  let body: { child_id?: string; child_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids: string[] = Array.isArray(body.child_ids)
    ? body.child_ids
    : body.child_id
      ? [body.child_id]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'child_id or child_ids required' }, { status: 400 });
  }

  // Verify every child belongs to the teacher's school.
  for (const cid of ids) {
    const access = await verifyChildBelongsToSchool(cid, auth.schoolId);
    if (!access.allowed || access.classroomId !== auth.classroomId) {
      return NextResponse.json({ error: `Access denied for child ${cid}` }, { status: 403 });
    }
  }

  const focusDate = todayISODate();
  const supabase = getSupabase();

  const rows = ids.map(cid => ({
    classroom_id: auth.classroomId,
    child_id: cid,
    focus_date: focusDate,
  }));

  // Upsert so repeat POSTs are idempotent (ignore duplicates via ON CONFLICT DO NOTHING).
  const { error } = await supabase
    .from('montree_daily_focus')
    .upsert(rows, { onConflict: 'classroom_id,focus_date,child_id', ignoreDuplicates: true });

  if (error) {
    console.error('[DailyFocus] POST error:', error.message);
    return NextResponse.json({ error: 'Failed to add to focus list' }, { status: 500 });
  }

  const { children, confirmedCount } = await loadFocusList(auth.classroomId, focusDate);
  return NextResponse.json({
    focus_date: focusDate,
    children,
    total: children.length,
    confirmed_count: confirmedCount,
  });
}

// ─── DELETE: remove child ───
export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  let body: { child_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.child_id) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  const focusDate = todayISODate();
  const supabase = getSupabase();

  const { error } = await supabase
    .from('montree_daily_focus')
    .delete()
    .eq('classroom_id', auth.classroomId)
    .eq('focus_date', focusDate)
    .eq('child_id', body.child_id);

  if (error) {
    console.error('[DailyFocus] DELETE error:', error.message);
    return NextResponse.json({ error: 'Failed to remove from focus list' }, { status: 500 });
  }

  const { children, confirmedCount } = await loadFocusList(auth.classroomId, focusDate);
  return NextResponse.json({
    focus_date: focusDate,
    children,
    total: children.length,
    confirmed_count: confirmedCount,
  });
}

// ─── PATCH: manual confirm ───
export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  let body: { child_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.child_id) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  const focusDate = todayISODate();
  const supabase = getSupabase();

  const { error } = await supabase
    .from('montree_daily_focus')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_via: 'manual',
    })
    .eq('classroom_id', auth.classroomId)
    .eq('focus_date', focusDate)
    .eq('child_id', body.child_id)
    .is('confirmed_at', null); // only if not already confirmed

  if (error) {
    console.error('[DailyFocus] PATCH error:', error.message);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }

  const { children, confirmedCount } = await loadFocusList(auth.classroomId, focusDate);
  return NextResponse.json({
    focus_date: focusDate,
    children,
    total: children.length,
    confirmed_count: confirmedCount,
  });
}
