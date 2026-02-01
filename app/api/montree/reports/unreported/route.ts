// /api/montree/reports/unreported/route.ts
// GET unreported progress for a child (since last report)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child info
    const { data: child } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', childId)
      .single();

    // Get last report date for this child
    const { data: lastReport } = await supabase
      .from('montree_weekly_reports')
      .select('generated_at')
      .eq('child_id', childId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    const lastReportDate = lastReport?.generated_at || null;

    // Get all progress since last report (or all if no report yet)
    let query = supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .neq('status', 'not_started'); // Only include works with progress

    if (lastReportDate) {
      query = query.gt('updated_at', lastReportDate);
    }

    const { data: progress } = await query;

    // Get unreported photos
    let photoQuery = supabase
      .from('montree_child_photos')
      .select('id, url, caption, created_at')
      .eq('child_id', childId);

    if (lastReportDate) {
      photoQuery = photoQuery.gt('created_at', lastReportDate);
    }

    const { data: photos } = await photoQuery;

    // Map to simple format
    const works = (progress || []).map(p => ({
      name: p.work_name,
      area: p.area,
      status: p.status === 'completed' ? 'mastered' : p.status, // Normalize
    }));

    return NextResponse.json({
      success: true,
      child_name: child?.name || 'Student',
      works,
      photos: photos || [],
      last_report_date: lastReportDate,
    });

  } catch (error) {
    console.error('Unreported fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
