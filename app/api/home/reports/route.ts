// /api/home/reports/route.ts
// GET/POST weekly reports with parent-friendly descriptions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

// GET - Fetch reports
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('family_id');
    const childId = searchParams.get('child_id');
    const weekStart = searchParams.get('week_start');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    let query = supabase
      .from('home_weekly_reports')
      .select('*')
      .eq('family_id', familyId)
      .order('week_start', { ascending: false })
      .limit(limit);

    if (childId) query = query.eq('child_id', childId);
    if (weekStart) query = query.eq('week_start', weekStart);
    if (status && status !== 'all') {
      if (status === 'published') {
        query = query.eq('is_published', true);
      } else if (status === 'draft') {
        query = query.eq('is_published', false);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Reports fetch error:', error.message);
      return errorResponse('Failed to fetch reports', { message: error.message });
    }

    return NextResponse.json({ success: true, reports: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reports GET error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { child_id, family_id, week_start, week_end, report_type = 'weekly' } = body;

    if (!child_id || !family_id || !week_start) {
      return errorResponse('child_id, family_id, and week_start required', undefined, 400);
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('home_children')
      .select('id, name, family_id')
      .eq('id', child_id)
      .eq('family_id', family_id)
      .single();

    if (childError || !child) {
      return errorResponse('Child not found', { message: childError?.message }, 404);
    }

    // Get home curriculum for this family (66 curated works)
    const { data: curriculumWorks } = await supabase
      .from('home_curriculum')
      .select('work_name, area')
      .eq('family_id', family_id);

    // Build curriculum lookup
    const curriculumByName = new Map<string, { area: string }>();
    for (const cw of curriculumWorks || []) {
      const name = cw.work_name as string | undefined;
      if (name) curriculumByName.set(name.toLowerCase(), { area: cw.area });
    }

    // Get child's progress for this week
    const weekStartTime = `${week_start}T00:00:00`;
    const weekEndTime = week_end ? `${week_end}T23:59:59` : new Date().toISOString();

    const { data: allProgress } = await supabase
      .from('home_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', child_id);

    // Filter to this week
    const weekProgress = (allProgress || []).filter(p => {
      const activityDate = p.updated_at;
      if (!activityDate) return false;
      return activityDate >= weekStartTime && activityDate <= weekEndTime;
    });

    // Build works with details
    const worksWithDetails = (weekProgress || []).map((progress: { work_name?: string; area?: string; status?: number }) => {
      const curriculum = curriculumByName.get(progress.work_name?.toLowerCase() || '');

      return {
        name: progress.work_name,
        area: curriculum?.area || progress.area || 'other',
        status: progress.status,
        status_label: getStatusLabel(progress.status),
      };
    });

    // Get photos from home_media
    const { data: mediaItems } = await supabase
      .from('home_media')
      .select('id, file_path, thumbnail_path, caption, created_at, work_name')
      .eq('child_id', child_id)
      .eq('family_id', family_id)
      .gte('created_at', week_start)
      .lte('created_at', week_end || new Date().toISOString())
      .limit(10);

    // Build photo URLs
    const photos = (mediaItems || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home-media/${item.file_path}`,
      thumbnail_url: item.thumbnail_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home-media/${item.thumbnail_path}` : null,
      caption: item.caption,
      created_at: item.created_at,
      work_name: item.work_name,
    }));

    // Overall stats
    const { data: overallProgress } = await supabase
      .from('home_progress')
      .select('status')
      .eq('child_id', child_id);

    const stats = { presented: 0, practicing: 0, mastered: 0, total: overallProgress?.length || 0 };
    for (const p of overallProgress || []) {
      const s = p.status;
      if (s === 1 || s === 'presented') stats.presented++;
      else if (s === 2 || s === 'practicing') stats.practicing++;
      else if (s === 3 || s === 'mastered' || s === 'completed') stats.mastered++;
    }

    // Group by area
    const worksByArea: Record<string, Array<Record<string, unknown>>> = {};
    for (const work of worksWithDetails) {
      const areaName = work.area as string | undefined;
      if (!areaName) continue;
      if (!worksByArea[areaName]) worksByArea[areaName] = [];
      worksByArea[areaName].push(work);
    }

    const reportContent = {
      child: { name: child.name },
      week: { start: week_start, end: week_end },
      summary: {
        works_this_week: worksWithDetails.length,
        photos_this_week: photos?.length || 0,
        overall_progress: stats,
      },
      works_by_area: worksByArea,
      works: worksWithDetails,
      photos: photos || [],
      generated_at: new Date().toISOString(),
    };

    // Save report
    const { data: report, error: saveError } = await supabase
      .from('home_weekly_reports')
      .insert({
        family_id,
        child_id: child.id,
        week_start,
        week_end: week_end || week_start,
        content: reportContent,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Report save error:', saveError.message);
      return errorResponse('Failed to save report', { message: saveError.message });
    }

    return NextResponse.json({ success: true, report: { ...report, content: reportContent } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reports POST error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// DELETE: Remove report
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const familyId = searchParams.get('family_id');

    if (!id || !familyId) {
      return errorResponse('id and family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify report belongs to this family
    const { data: report, error: findError } = await supabase
      .from('home_weekly_reports')
      .select('id')
      .eq('id', id)
      .eq('family_id', familyId)
      .single();

    if (findError || !report) {
      return errorResponse('Report not found', { message: findError?.message }, 404);
    }

    const { error } = await supabase
      .from('home_weekly_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete report:', error.message);
      return errorResponse('Failed to delete report', { message: error.message });
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reports DELETE error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// PATCH: Update report
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, family_id, ...updates } = body;

    if (!id || !family_id) {
      return errorResponse('id and family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify report belongs to family
    const { data: report, error: findError } = await supabase
      .from('home_weekly_reports')
      .select('id')
      .eq('id', id)
      .eq('family_id', family_id)
      .single();

    if (findError || !report) {
      return errorResponse('Report not found', { message: findError?.message }, 404);
    }

    const { data, error } = await supabase
      .from('home_weekly_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update report:', error.message);
      return errorResponse('Failed to update report', { message: error.message });
    }

    return NextResponse.json({ success: true, report: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reports PATCH error:', message);
    return errorResponse('Internal server error', { message });
  }
}

function getStatusLabel(status: number | string): string {
  if (status === 1 || status === 'presented') return 'Introduced';
  if (status === 2 || status === 'practicing') return 'Practicing';
  if (status === 3 || status === 'mastered' || status === 'completed') return 'Mastered';
  return 'Started';
}
