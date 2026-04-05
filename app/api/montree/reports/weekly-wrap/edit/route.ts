// /api/montree/reports/weekly-wrap/edit/route.ts
// PATCH: Edit parent report content (narrative text, photo removals/reorder)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { report_id, narrative, photos } = body as {
      report_id: string;
      narrative?: string;           // Updated narrative text
      photos?: Array<{              // Updated photos array (after removal/reorder)
        id: string;
        url: string;
        work_name?: string;
        caption?: string;
        captured_at?: string;
      }>;
    };

    if (!report_id) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get existing report
    const { data: existing } = await supabase
      .from('montree_weekly_reports')
      .select('id, content, school_id')
      .eq('id', report_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const content = existing.content as Record<string, unknown>;

    // Update narrative if provided
    if (narrative !== undefined) {
      const narrativeObj = (content.narrative || {}) as Record<string, unknown>;
      narrativeObj.summary = narrative;
      narrativeObj.edited_at = new Date().toISOString();
      narrativeObj.edited_by = 'teacher';
      content.narrative = narrativeObj;
    }

    // Update photos if provided (supports removal and reorder)
    if (photos !== undefined) {
      content.photos = photos;
    }

    // Save
    const { error: updateErr } = await supabase
      .from('montree_weekly_reports')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id)
      .eq('school_id', auth.schoolId);

    if (updateErr) {
      console.error('Edit report error:', updateErr);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
