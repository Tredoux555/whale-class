import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Get authenticated parent's ID from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parentId = session.user.id;

    // Verify that the authenticated parent owns this child
    const { data: parentChild, error: verifyError } = await supabase
      .from('montree_parent_children')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .single();

    if (verifyError || !parentChild) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get weekly reports for this child (published ones OR status='sent')
    const { data: reports, error } = await supabase
      .from('montree_weekly_reports')
      .select('id, week_number, report_year, parent_summary, created_at, is_published, status, week_start, week_end, content')
      .eq('child_id', childId)
      .or('is_published.eq.true,status.eq.sent')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Reports query error:', error);
      return NextResponse.json({
        error: 'Failed to load reports'
      }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error('Get reports error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
