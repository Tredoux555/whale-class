// /api/montree/reports/route.ts
// GET/POST weekly reports with parent-friendly descriptions
// CHAIN: progress.work_name → curriculum.name → work_key → brain.slug → descriptions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getLocaleFromRequest, getTranslator, getTranslatedAreaName, getTranslatedStatus } from '@/lib/montree/i18n/server';

// Enrich stored report content with descriptions from database
async function enrichReportContent(
  content: Record<string, unknown>,
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string | null
) {
  if (!content || !content.works || !classroomId) return content;

  // Get curriculum works with descriptions from database
  const { data: curriculumWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, parent_description, why_it_matters')
    .eq('classroom_id', classroomId);

  // Build lookup map
  const descriptions = new Map<string, { description: string; why_it_matters: string }>();
  for (const work of curriculumWorks || []) {
    if (work.name && work.parent_description) {
      descriptions.set(work.name.toLowerCase(), {
        description: work.parent_description,
        why_it_matters: work.why_it_matters || '',
      });
    }
  }

  const enrichedWorks = (content.works as Array<Record<string, unknown>>).map((work) => {
    // If work already has a description, keep it
    if (work.parent_description) return work;

    // Otherwise, look up description from database
    const workNameLower = (work.name || '').toLowerCase();
    const desc = descriptions.get(workNameLower);

    return {
      ...work,
      parent_description: desc?.description || null,
      why_it_matters: desc?.why_it_matters || null,
    };
  });

  return {
    ...content,
    works: enrichedWorks,
  };
}

// GET - Fetch reports (with enriched descriptions)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const locale = getLocaleFromRequest(request.url);
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const weekStart = searchParams.get('week_start');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('montree_weekly_reports')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(limit);

    if (classroomId) query = query.eq('classroom_id', classroomId);
    if (childId) query = query.eq('child_id', childId);
    if (weekStart) query = query.eq('week_start', weekStart);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('Reports fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Enrich all reports — batch curriculum fetch by unique classroom IDs (avoid N+1)
    const uniqueClassroomIds = [...new Set((data || []).map((r: { classroom_id: string | null }) => r.classroom_id).filter(Boolean))] as string[];
    const descriptionsByClassroom = new Map<string, Map<string, { description: string; why_it_matters: string }>>();

    if (uniqueClassroomIds.length > 0) {
      const { data: allCurriculumWorks } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('classroom_id, name, parent_description, why_it_matters')
        .in('classroom_id', uniqueClassroomIds);

      for (const work of allCurriculumWorks || []) {
        if (!work.name || !work.parent_description) continue;
        if (!descriptionsByClassroom.has(work.classroom_id)) {
          descriptionsByClassroom.set(work.classroom_id, new Map());
        }
        descriptionsByClassroom.get(work.classroom_id)!.set(work.name.toLowerCase(), {
          description: work.parent_description,
          why_it_matters: work.why_it_matters || '',
        });
      }
    }

    const enrichedReports = (data || []).map((report: { content: Record<string, unknown>; classroom_id: string | null }) => {
      const content = report.content;
      if (!content?.works || !report.classroom_id) return report;
      const descriptions = descriptionsByClassroom.get(report.classroom_id);
      if (!descriptions) return report;
      const enrichedWorks = (content.works as Array<Record<string, unknown>>).map((work) => {
        if (work.parent_description) return work;
        const desc = descriptions.get(((work.name as string) || '').toLowerCase());
        return { ...work, parent_description: desc?.description || null, why_it_matters: desc?.why_it_matters || null };
      });
      return { ...report, content: { ...content, works: enrichedWorks } };
    });

    return NextResponse.json({ success: true, reports: enrichedReports });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { child_id, week_start, week_end, report_type = 'weekly' } = body;

    if (!child_id || !week_start) {
      return NextResponse.json({ error: 'child_id and week_start required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select(`
        id, name, classroom_id, photo_url,
        classroom:montree_classrooms!classroom_id (school_id)
      `)
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Handle classroom which may be an object or array depending on Supabase
    const classroom = Array.isArray(child.classroom) ? child.classroom[0] : child.classroom;
    const school_id = classroom?.school_id;

    // PARALLEL: Fetch curriculum, brain works, and progress all at once
    const weekStartTime = `${week_start}T00:00:00`;
    const weekEndTime = week_end ? `${week_end}T23:59:59` : new Date().toISOString();

    const [
      { data: curriculumWorks, error: currError },
      { data: brainWorks, error: brainError },
      { data: allProgress, error: progressError },
    ] = await Promise.all([
      // STEP 1: Get ALL curriculum works for this classroom
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, work_key, name_chinese, area:montree_classroom_curriculum_areas!area_id(area_key, name, icon)')
        .eq('classroom_id', child.classroom_id),
      // STEP 2: Get ALL brain works (parent descriptions)
      supabase
        .from('montessori_works')
        .select('slug, parent_explanation_simple, parent_explanation_detailed, parent_why_it_matters'),
      // STEP 3: Get child's progress
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at, presented_at, notes')
        .eq('child_id', child_id),
    ]);

    if (currError || brainError || progressError) {
      console.error('Report data fetch error:', currError || brainError || progressError);
      return NextResponse.json({ error: 'Failed to load report data' }, { status: 500 });
    }

    // Build curriculum lookup by lowercase name
    const curriculumByName = new Map<string, Record<string, unknown>>();
    for (const cw of curriculumWorks || []) {
      const name = cw.name as string | undefined;
      if (name) curriculumByName.set(name.toLowerCase(), cw);
    }

    // Build brain lookup by slug (work_key)
    const brainBySlug = new Map<string, Record<string, unknown>>();
    for (const bw of brainWorks || []) {
      const slug = bw.slug as string | undefined;
      if (slug) brainBySlug.set(slug, bw);
    }

    // Filter to this week - check updated_at first, fallback to presented_at
    const weekProgress = (allProgress || []).filter(p => {
      const activityDate = p.updated_at || p.presented_at;
      if (!activityDate) return false;
      return activityDate >= weekStartTime && activityDate <= weekEndTime;
    });

    // Debug: show sample dates
    if (allProgress && allProgress.length > 0) {
      // stripped
    }

    // STEP 4: Build works with parent descriptions using the CHAIN
    // progress.work_name → curriculum.name → work_key → brain.slug → descriptions
    const worksWithDetails = (weekProgress || []).map((progress: { work_name?: string; area?: string; status?: number; notes?: string }) => {
      // Find curriculum work by name (case insensitive)
      const curriculum = curriculumByName.get(progress.work_name?.toLowerCase());
      
      // If found in curriculum, get brain data via work_key
      const brain = curriculum ? brainBySlug.get(curriculum.work_key) : null;
      
      return {
        name: progress.work_name,
        name_chinese: curriculum?.name_chinese || null,
        area: curriculum?.area?.name || getAreaName(progress.area, locale),
        area_key: curriculum?.area?.area_key || progress.area,
        area_icon: curriculum?.area?.icon || getAreaIcon(progress.area),
        status: progress.status,
        status_label: getStatusLabel(progress.status, locale),
        notes: progress.notes,
        // Parent-friendly content - THE GOLD!
        parent_explanation: brain?.parent_explanation_simple || '',
        why_it_matters: brain?.parent_why_it_matters || '',
        detailed_explanation: brain?.parent_explanation_detailed || '',
        // Debug: show if we found matches
        _matched_curriculum: !!curriculum,
        _matched_brain: !!brain,
      };
    });

    // Log matching stats for debugging
    const matched = worksWithDetails.filter(w => w._matched_brain).length;
    const unmatched = worksWithDetails.filter(w => !w._matched_brain).map(w => w.name);

    // PARALLEL: Fetch photos and overall stats together
    const [{ data: mediaItems }, { data: overallProgress }] = await Promise.all([
      supabase
        .from('montree_media')
        .select('id, storage_path, thumbnail_path, caption, captured_at, work_id')
        .eq('child_id', child_id)
        .neq('parent_visible', false)
        .gte('captured_at', week_start)
        .lte('captured_at', week_end || new Date().toISOString())
        .limit(10),
      supabase
        .from('montree_child_progress')
        .select('status')
        .eq('child_id', child_id),
    ]);

    // Build photo URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const photos = (mediaItems || []).map((item: { id: string; storage_path: string; thumbnail_path?: string; caption?: string; captured_at: string; work_id?: string }) => ({
      id: item.id,
      url: `${supabaseUrl}/storage/v1/object/public/montree-media/${item.storage_path}`,
      thumbnail_url: item.thumbnail_path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${item.thumbnail_path}` : null,
      caption: item.caption,
      captured_at: item.captured_at,
      work_id: item.work_id,
    }));

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
      child: { name: child.name, photo_url: child.photo_url },
      week: { start: week_start, end: week_end },
      summary: {
        works_this_week: worksWithDetails.length,
        works_matched: matched,
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
      .from('montree_weekly_reports')
      .insert({
        school_id,
        classroom_id: child.classroom_id,
        child_id: child.id,
        week_start,
        week_end: week_end || week_start,
        report_type,
        status: 'draft',
        content: reportContent,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Report save error:', saveError);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: { ...report, content: reportContent } });

  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getStatusLabel(status: number | string, locale: 'en' | 'zh' = 'en'): string {
  const t = getTranslator(locale);
  if (status === 1 || status === 'presented') return t('progress.presented' as any, 'Presented');
  if (status === 2 || status === 'practicing') return t('progress.practicing' as any, 'Practicing');
  if (status === 3 || status === 'mastered' || status === 'completed') return t('progress.mastered' as any, 'Mastered');
  return t('progress.notStarted' as any, 'Started');
}

function getAreaIcon(area: string): string {
  const icons: Record<string, string> = {
    practical_life: '🧹', sensorial: '👁️', mathematics: '🔢', math: '🔢', language: '📚', cultural: '🌍',
  };
  return icons[area?.toLowerCase()] || '📋';
}

function getAreaName(area: string, locale: 'en' | 'zh' = 'en'): string {
  return getTranslatedAreaName(area, locale);
}
