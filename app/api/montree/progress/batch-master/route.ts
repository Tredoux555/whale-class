// /api/montree/progress/batch-master/route.ts
// Batch-mark multiple works as mastered for a child
// Used by auto-mastery: when teacher sets focus at work #N, works 1..N-1 are mastered

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { writeProgressBatch } from '@/lib/montree/progress/write-progress';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { child_id, works } = body;

    // works: Array<{ work_name: string; area: string }>
    if (!child_id || !Array.isArray(works) || works.length === 0) {
      return NextResponse.json({ error: 'child_id and works[] required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Cap at 100 to prevent abuse
    if (works.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 works per batch' }, { status: 400 });
    }

    // Verify child exists
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // ── THE WRITE — one call, one pre-read, one upsert ──────────────────────
    // The "already mastered → skip" rule and the mastered_at preservation this
    // route used to hand-roll fall out of the primitive's rank gate for free:
    // 'mastered' can never out-rank 'mastered', and the first mastery date is
    // never rewritten. Auto-mastery is an inference from where the teacher set
    // the focus work, NOT a teacher correction — so it must never downgrade.
    const results = await writeProgressBatch(
      supabase,
      works.map((w: { work_name: string; area: string }) => ({
        childId: child_id,
        workName: w.work_name,
        area: w.area,
        status: 'mastered',
        source: 'auto_mastery',
        classroomId: child.classroom_id || null,
        allowDowngrade: false,
      })),
      { actor: auth.userId || null },
    );

    if (results.some(r => r.outcome === 'failed')) {
      console.error('[batch-master] Write failed:', results.find(r => r.outcome === 'failed')?.error);
      return NextResponse.json({ error: 'Failed to batch update' }, { status: 500 });
    }

    const upserted = results.filter(r => r.outcome === 'written').length;
    const skipped = results.filter(r => r.outcome === 'skipped_rank' || r.outcome === 'skipped_noop').length;

    return NextResponse.json({
      success: true,
      upserted,
      skipped,
      total: works.length,
    });

  } catch (error) {
    console.error('[batch-master] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
