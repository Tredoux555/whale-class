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

    // Get weekly reports for this child
    const { data: reports, error } = await supabase
      .from('montree_weekly_reports')
      .select('id, week_number, year, parent_summary, created_at')
      .eq('child_id', childId)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Reports query error:', error);
      return NextResponse.json({
        error: 'Failed to load reports',
        debug: error?.message,
        code: error?.code
      }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error('Get reports error:', error);
    return NextResponse.json({
      error: 'Failed to load reports',
      debug: error?.message || String(error),
      code: error?.code
    }, { status: 500 });
  }
}
