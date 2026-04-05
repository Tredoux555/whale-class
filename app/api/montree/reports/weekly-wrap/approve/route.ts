// /api/montree/reports/weekly-wrap/approve/route.ts
// POST: Approve a teacher report and optionally push recommendations to shelf
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

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
    let shelfUpdated = 0;
    if (update_shelf && recommendations && recommendations.length > 0) {
      for (const rec of recommendations) {
        // Upsert as "presented" status for recommended works
        const { error: progressErr } = await supabase
          .from('montree_child_progress')
          .upsert({
            child_id,
            work_name: rec.work,
            area: rec.area,
            status: 'presented',
            school_id: auth.schoolId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'child_id,work_name' })

        if (!progressErr) {
          shelfUpdated++;
        } else {
          console.error('Shelf update error for', rec.work, progressErr);
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
