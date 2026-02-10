// /api/montree/parent/reports/route.ts
// Get weekly reports for a parent's child
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
  }

  try {
    // SECURITY: Authenticate parent via session cookie
    const session = await verifyParentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Get weekly reports for this child
    // Accept: status='sent' (new way) OR generated_at is set (old way - indicates report was sent)
    const { data: reports, error } = await supabase
      .from('montree_weekly_reports')
      .select('id, status, created_at, week_start, week_end, week_number, report_year, parent_summary, content, generated_at, sent_at')
      .eq('child_id', childId)
      .or('status.eq.sent,generated_at.not.is.null')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Reports query error:', error);
      return NextResponse.json({
        error: 'Failed to load reports'
      }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: unknown) {
    console.error('Get reports error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
