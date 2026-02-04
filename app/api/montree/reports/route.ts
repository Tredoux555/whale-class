// /api/montree/reports/route.ts
// GET/POST weekly reports with parent-friendly descriptions
// CHAIN: progress.work_name → curriculum.name → work_key → brain.slug → descriptions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Import JSON files directly so they're bundled with the build
import practicalLifeGuides from '@/lib/curriculum/comprehensive-guides/practical-life-guides.json';
import sensorialGuides from '@/lib/curriculum/comprehensive-guides/sensorial-guides.json';
import mathGuides from '@/lib/curriculum/comprehensive-guides/math-guides.json';
import languageGuides from '@/lib/curriculum/comprehensive-guides/language-guides.json';
import culturalGuides from '@/lib/curriculum/comprehensive-guides/cultural-guides.json';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Load parent descriptions from bundled JSON files
function loadParentDescriptions(): Map<string, { description: string; why_it_matters: string }> {
  const descriptions = new Map();
  const allGuides = [practicalLifeGuides, sensorialGuides, mathGuides, languageGuides, culturalGuides];

  for (const data of allGuides) {
    const works = (data as any).works || data;
    for (const item of works) {
      if (item.name && item.parent_description) {
        descriptions.set(item.name.toLowerCase(), {
          description: item.parent_description,
          why_it_matters: item.why_it_matters || '',
        });
      }
    }
  }
  return descriptions;
}

// Enrich stored report content with descriptions (for old reports that don't have them)
function enrichReportContent(content: any, descriptions: Map<string, { description: string; why_it_matters: string }>) {
  if (!content || !content.works) return content;

  const enrichedWorks = content.works.map((work: any) => {
    // If work already has a description, keep it
    if (work.parent_description) return work;

    // Otherwise, look up description from JSON
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
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
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

    // Load descriptions and enrich all reports
    const descriptions = loadParentDescriptions();
    const enrichedReports = (data || []).map((report: any) => ({
      ...report,
      content: enrichReportContent(report.content, descriptions),
    }));

    return NextResponse.json({ success: true, reports: enrichedReports });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { child_id, week_start, week_end, report_type = 'weekly' } = body;

    if (!child_id || !week_start) {
      return NextResponse.json({ error: 'child_id and week_start required' }, { status: 400 });
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

    // STEP 1: Get ALL curriculum works for this classroom (with work_key for brain lookup)
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id, name, work_key, name_chinese,
        area:montree_classroom_curriculum_areas!area_id (area_key, name, icon)
      `)
      .eq('classroom_id', child.classroom_id);

    // Build curriculum lookup by lowercase name
    const curriculumByName = new Map();
    for (const cw of curriculumWorks || []) {
      curriculumByName.set(cw.name?.toLowerCase(), cw);
    }

    // STEP 2: Get ALL brain works (parent descriptions)
    const { data: brainWorks } = await supabase
      .from('montessori_works')
      .select('slug, parent_explanation_simple, parent_explanation_detailed, parent_why_it_matters');

    // Build brain lookup by slug (work_key)
    const brainBySlug = new Map();
    for (const bw of brainWorks || []) {
      brainBySlug.set(bw.slug, bw);
    }

    // STEP 3: Get child's progress for this week
    // Add time component to make date range inclusive
    const weekStartTime = `${week_start}T00:00:00`;
    const weekEndTime = week_end ? `${week_end}T23:59:59` : new Date().toISOString();

    console.log(`[Reports] Querying progress for ${child_id} from ${weekStartTime} to ${weekEndTime}`);

    // Get ALL progress for this child, then filter by date in JS
    // This handles records with NULL updated_at (old records before fix)
    const { data: allProgress, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at, presented_at, notes')
      .eq('child_id', child_id);

    // Filter to this week - check updated_at first, fallback to presented_at
    const weekProgress = (allProgress || []).filter(p => {
      const activityDate = p.updated_at || p.presented_at;
      if (!activityDate) return false;
      return activityDate >= weekStartTime && activityDate <= weekEndTime;
    });

    // Debug: show sample dates
    if (allProgress && allProgress.length > 0) {
      const sample = allProgress.slice(0, 3).map(p => ({
        work: p.work_name?.substring(0, 20),
        updated: p.updated_at?.substring(0, 10),
        presented: p.presented_at?.substring(0, 10),
      }));
      console.log(`[Reports] Sample records:`, JSON.stringify(sample));
      console.log(`[Reports] Week range: ${weekStartTime} to ${weekEndTime}`);
    }

    console.log(`[Reports] Found ${weekProgress?.length || 0} progress records for week (from ${allProgress?.length || 0} total)`, progressError || '');

    // STEP 4: Build works with parent descriptions using the CHAIN
    // progress.work_name → curriculum.name → work_key → brain.slug → descriptions
    const worksWithDetails = (weekProgress || []).map(progress => {
      // Find curriculum work by name (case insensitive)
      const curriculum = curriculumByName.get(progress.work_name?.toLowerCase());
      
      // If found in curriculum, get brain data via work_key
      const brain = curriculum ? brainBySlug.get(curriculum.work_key) : null;
      
      return {
        name: progress.work_name,
        name_chinese: curriculum?.name_chinese || null,
        area: curriculum?.area?.name || getAreaName(progress.area),
        area_key: curriculum?.area?.area_key || progress.area,
        area_icon: curriculum?.area?.icon || getAreaIcon(progress.area),
        status: progress.status,
        status_label: getStatusLabel(progress.status),
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
    console.log(`Report: ${matched}/${worksWithDetails.length} works matched. Unmatched:`, unmatched);

    // Get photos from montree_media
    const { data: mediaItems } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, caption, captured_at, work_id')
      .eq('child_id', child_id)
      .gte('captured_at', week_start)
      .lte('captured_at', week_end || new Date().toISOString())
      .limit(10);

    // Build photo URLs
    const photos = (mediaItems || []).map(item => ({
      id: item.id,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${item.storage_path}`,
      thumbnail_url: item.thumbnail_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${item.thumbnail_path}` : null,
      caption: item.caption,
      captured_at: item.captured_at,
      work_id: item.work_id,
    }));

    // Overall stats
    const { data: overallProgress } = await supabase
      .from('montree_child_progress')
      .select('status')
      .eq('child_id', child_id);

    const stats = { presented: 0, practicing: 0, mastered: 0, total: overallProgress?.length || 0 };
    for (const p of overallProgress || []) {
      const s = p.status;
      if (s === 1 || s === 'presented') stats.presented++;
      else if (s === 2 || s === 'practicing') stats.practicing++;
      else if (s === 3 || s === 'mastered' || s === 'completed') stats.mastered++;
    }
    console.log('[Reports] Stats calculated:', stats);

    // Group by area
    const worksByArea: Record<string, any[]> = {};
    for (const work of worksWithDetails) {
      const areaName = work.area;
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

function getStatusLabel(status: any): string {
  if (status === 1 || status === 'presented') return 'Introduced';
  if (status === 2 || status === 'practicing') return 'Practicing';
  if (status === 3 || status === 'mastered' || status === 'completed') return 'Mastered';
  return 'Started';
}

function getAreaIcon(area: string): string {
  const icons: Record<string, string> = {
    practical_life: '🧹', sensorial: '👁️', mathematics: '🔢', math: '🔢', language: '📚', cultural: '🌍',
  };
  return icons[area?.toLowerCase()] || '📋';
}

function getAreaName(area: string): string {
  const names: Record<string, string> = {
    practical_life: 'Practical Life', sensorial: 'Sensorial', mathematics: 'Mathematics', 
    math: 'Mathematics', language: 'Language', cultural: 'Cultural',
  };
  return names[area?.toLowerCase()] || area || 'Other';
}
