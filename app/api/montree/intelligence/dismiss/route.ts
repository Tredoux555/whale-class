// POST /api/montree/intelligence/dismiss — Dismiss a stale work alert
//
// Body: { child_id: string, work_name: string }
// Upserts into montree_stale_work_dismissals (UNIQUE child_id + work_name)
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { child_id, work_name } = body;

    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    if (!work_name || typeof work_name !== 'string' || work_name.length > 255) {
      return NextResponse.json({ error: 'work_name is required (max 255 chars)' }, { status: 400 });
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

    // Upsert dismissal (UNIQUE on child_id + work_name handles duplicates)
    const { error: upsertErr } = await supabase
      .from('montree_stale_work_dismissals')
      .upsert({
        child_id,
        work_name,
        dismissed_by: auth.userId,
      }, {
        onConflict: 'child_id,work_name',
      });

    if (upsertErr) {
      console.error('[StaleWorks] Dismiss upsert error:', upsertErr);
      return NextResponse.json({ error: 'Failed to dismiss alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, child_id, work_name });
  } catch (err) {
    console.error('[StaleWorks] Dismiss unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
