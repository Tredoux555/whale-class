// /api/montree/reports/unreported/route.ts
// GET unreported progress for a child (since last report)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Step 1: Fetch child info + last report date in parallel (independent)
    const [{ data: child, error: childError }, { data: lastReport }] = await Promise.all([
      supabase.from('montree_children').select('name').eq('id', childId).single(),
      supabase.from('montree_weekly_reports').select('generated_at').eq('child_id', childId)
        .order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const lastReportDate = lastReport?.generated_at || null;

    // Step 2: Fetch progress + photos in parallel (both depend on lastReportDate but are independent of each other)
    let progressQuery = supabase.from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId).neq('status', 'not_started');
    let photoQuery = supabase.from('montree_media')
      .select('id, storage_path, caption, captured_at, thumbnail_path')
      .eq('child_id', childId);

    if (lastReportDate) {
      progressQuery = progressQuery.gt('updated_at', lastReportDate);
      photoQuery = photoQuery.gt('captured_at', lastReportDate);
    }

    const [{ data: progress }, { data: photosData }] = await Promise.all([
      progressQuery,
      photoQuery,
    ]);

    // Build photo URLs from storage paths
    const photos = (photosData || []).map(p => ({
      id: p.id,
      url: getProxyUrl(p.storage_path),
      caption: p.caption,
      thumbnail_url: p.thumbnail_path ? getProxyUrl(p.thumbnail_path) : null,
      captured_at: p.captured_at,
    }));

    // Map to simple format
    const works = (progress || []).map(p => ({
      name: p.work_name,
      area: p.area,
      status: p.status === 'completed' ? 'mastered' : p.status, // Normalize
    }));

    const response = NextResponse.json({
      success: true,
      child_name: child?.name || 'Student',
      works,
      photos: photos || [],
      last_report_date: lastReportDate,
    });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('Unreported fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
