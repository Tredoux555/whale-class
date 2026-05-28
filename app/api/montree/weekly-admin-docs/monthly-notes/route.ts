// app/api/montree/weekly-admin-docs/monthly-notes/route.ts
//
// GET: Fetch saved monthly summary notes for a classroom + month.
// POST: Upsert monthly summary notes (batch — one row per child).
//
// Storage: montree_weekly_admin_notes with doc_type='monthly', area=NULL,
// week_start = 1st of month. Migration 238 makes that valid (relaxes the
// Monday constraint for monthly rows).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

function parseMonthStart(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== 1) return null;
  return s;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs')) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id') || auth.classroomId;
  const monthStart = parseMonthStart(searchParams.get('month_start'));

  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
  }
  if (!monthStart) {
    return NextResponse.json(
      { error: 'month_start required (YYYY-MM-01)' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('school_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (!classroom || classroom.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const notesRes = await supabase
    .from('montree_weekly_admin_notes')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('week_start', monthStart)
    .eq('doc_type', 'monthly');

  if (notesRes.error) {
    // 23514 = check_constraint_violation — fires only when migration 238 hasn't run.
    // Surface a friendly diagnostic so the operator knows what to do.
    console.error('monthly-notes GET error:', notesRes.error.message);
    const msg = notesRes.error.message || '';
    if (msg.includes('doc_type_check') || msg.includes('week_start_monday')) {
      return NextResponse.json({
        error: 'Migration 238 has not been run yet',
        migration_pending: true,
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }

  return NextResponse.json({ notes: notesRes.data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs')) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  let body: { classroom_id?: string; month_start?: string; notes?: Array<{ child_id: string; english_text: string | null }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const classroomId = body.classroom_id || auth.classroomId;
  const monthStart = parseMonthStart(body.month_start || null);
  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
  }
  if (!monthStart) {
    return NextResponse.json({ error: 'month_start required (YYYY-MM-01)' }, { status: 400 });
  }
  if (!Array.isArray(body.notes)) {
    return NextResponse.json({ error: 'notes[] required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('school_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (!classroom || classroom.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Cross-pollination: every child_id must belong to this classroom.
  const childIds = Array.from(new Set(body.notes.map(n => n.child_id).filter(Boolean)));
  if (childIds.length === 0) {
    return NextResponse.json({ success: true, saved: 0 });
  }
  const { data: childRows } = await supabase
    .from('montree_children')
    .select('id')
    .eq('classroom_id', classroomId)
    .in('id', childIds);
  const validChildIds = new Set((childRows || []).map((c: { id: string }) => c.id));

  const rows = body.notes
    .filter(n => n.child_id && validChildIds.has(n.child_id))
    .map(n => ({
      classroom_id: classroomId,
      child_id: n.child_id,
      week_start: monthStart,
      doc_type: 'monthly' as const,
      area: null as null,
      english_text: n.english_text ?? null,
      chinese_text: null as null,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ success: true, saved: 0 });
  }

  // Mirror the canonical pattern from notes/route.ts: Supabase JS can't
  // express the COALESCE on the unique index, so we do select→update/insert
  // per row. Each row is also a small payload so the loop stays fast.
  let saved = 0;
  let failCount = 0;
  for (const row of rows) {
    const { data: existing, error: selErr } = await supabase
      .from('montree_weekly_admin_notes')
      .select('id')
      .eq('child_id', row.child_id)
      .eq('week_start', row.week_start)
      .eq('doc_type', row.doc_type)
      .is('area', null)
      .maybeSingle();
    if (selErr) {
      const msg = selErr.message || '';
      if (msg.includes('doc_type_check') || msg.includes('week_start_monday')) {
        return NextResponse.json({
          error: 'Migration 238 has not been run yet',
          migration_pending: true,
        }, { status: 503 });
      }
      console.error('monthly-notes select error:', selErr.message);
      failCount++;
      continue;
    }
    if (existing) {
      const { error: upErr } = await supabase
        .from('montree_weekly_admin_notes')
        .update({
          english_text: row.english_text,
          updated_by: row.updated_by,
          updated_at: row.updated_at,
        })
        .eq('id', existing.id);
      if (upErr) {
        console.error('monthly-notes update error:', upErr.message);
        failCount++;
        continue;
      }
    } else {
      const { error: insErr } = await supabase
        .from('montree_weekly_admin_notes')
        .insert(row);
      if (insErr) {
        const msg = insErr.message || '';
        if (msg.includes('doc_type_check') || msg.includes('week_start_monday')) {
          return NextResponse.json({
            error: 'Migration 238 has not been run yet',
            migration_pending: true,
          }, { status: 503 });
        }
        console.error('monthly-notes insert error:', insErr.message);
        failCount++;
        continue;
      }
    }
    saved++;
  }

  if (failCount > 0 && saved === 0) {
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
  return NextResponse.json({ success: true, saved, failures: failCount });
}
