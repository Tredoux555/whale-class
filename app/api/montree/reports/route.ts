// /api/montree/reports/route.ts
// GET/POST weekly reports with parent-friendly descriptions
// CHAIN: progress.work_name → curriculum.name → work_key → brain.slug → descriptions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch reports
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

    return NextResponse.json({ success: true, reports: data || [] });
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

    const school_id = child.classroom?.school_id;

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
    const { data: weekProgress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at, notes')
      .eq('child_id', child_id)
      .gte('updated_at', week_start)
      .lte('updated_at', week_end || new Date().toISOString());

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

    // Get photos
    const { data: photos } = await supabase
      .from('montree_child_photos')
      .select('id, url, caption, created_at')
      .eq('child_id', child_id)
      .gte('created_at', week_start)
      .lte('created_at', week_end || new Date().toISOString())
      .limit(10);

    // Overall stats
    const { data: allProgress } = await supabase
      .from('montree_child_progress')
      .select('status')
      .eq('child_id', child_id);

    const stats = { presented: 0, practicing: 0, mastered: 0, total: allProgress?.length || 0 };
    for (const p of allProgress || []) {
      if (p.status === 1 || p.status === 'presented') stats.presented++;
      else if (p.status === 2 || p.status === 'practicing') stats.practicing++;
      else if (p.status === 3 || p.status === 'mastered' || p.status === 'completed') stats.mastered++;
    }

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
