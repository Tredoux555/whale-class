// /api/montree/reports/weekly-wrap/approve/route.ts
// POST: Approve a teacher report and optionally push recommendations to shelf
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { writeProgressBatchChunked } from '@/lib/montree/progress/write-progress';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { report_id, child_id, update_shelf, recommendations } = body as {
      report_id: string;
      child_id: string;
      update_shelf?: boolean;
      recommendations?: Array<{ area: string; work: string; reasoning: string }>;
    };

    if (!report_id || !child_id) {
      return NextResponse.json({ error: 'report_id and child_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Mark teacher report as approved
    const { error: approveErr } = await supabase
      .from('montree_weekly_reports')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id)
      .eq('school_id', auth.schoolId);

    if (approveErr) {
      console.error('Approve error:', approveErr);
      return NextResponse.json({ error: 'Failed to approve report' }, { status: 500 });
    }

    // Optionally push recommendations to shelf
    //
    // THE DOOR (rule 2) + RULE 4. This was an UNCONDITIONAL upsert to 'presented':
    // approving a wrap-up that recommended a work the child had already mastered
    // silently demoted them to 'presented'. writeProgress's rank gate makes that
    // impossible (allowDowngrade is not passed, so a higher rung is left alone and
    // comes back as skipped_rank), stamps classroom/school/work_key, and journals
    // the change. Source 'teacher_recommendation' — a teacher approving a
    // recommendation, which is neither an import nor automated evidence.
    let shelfUpdated = 0;
    if (update_shelf && recommendations && recommendations.length > 0) {
      const results = await writeProgressBatchChunked(
        supabase,
        recommendations.map((rec) => ({
          childId: child_id,
          workName: rec.work,
          area: rec.area,
          status: 'presented',
          source: 'teacher_recommendation',
          schoolId: auth.schoolId,
        })),
        { actor: auth.userId || null },
      );
      for (const result of results) {
        if (result.outcome === 'written') shelfUpdated++;
        else if (result.outcome === 'queued') {
          console.log('[WeeklyWrapApprove] Queued for review (unresolved work):', result.workName);
        } else if (result.error) {
          console.error('Shelf update error for', result.workName, result.error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      approved: true,
      shelf_updated: shelfUpdated,
    });
  } catch (error) {
    console.error('Approve route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
