import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    const week = url.searchParams.get('week');
    const year = url.searchParams.get('year');

    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, age_group')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get the weekly plan for this week/year
    let planId: string | null = null;
    let planContent: any = null;

    if (week && year) {
      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('id, translated_content')
        .eq('week_number', parseInt(week))
        .eq('year', parseInt(year))
        .single();

      if (plan) {
        planId = plan.id;
        planContent = plan.translated_content;
      }
    }

    // Get assignments for this child and plan
    let assignmentsQuery = supabase
      .from('weekly_assignments')
      .select('id, work_id, work_name, area, notes')
      .eq('child_id', childId);

    if (planId) {
      assignmentsQuery = assignmentsQuery.eq('weekly_plan_id', planId);
    }

    const { data: assignments, error: assignError } = await assignmentsQuery.order('area');

    if (assignError) {
      console.error('Assignments error:', assignError);
    }

    // Get work IDs for video lookup
    const workIds = assignments?.map(a => a.work_id).filter(Boolean) || [];
    
    // Initialize video/chinese map
    let videoMap = new Map<string, { url?: string; chinese?: string }>();

    if (workIds.length > 0) {
      // Step 1: Get basic info from curriculum_roadmap (chinese_name, direct video_url)
      const { data: curriculumWorks } = await supabase
        .from('curriculum_roadmap')
        .select('id, video_url, chinese_name')
        .in('id', workIds);

      if (curriculumWorks) {
        videoMap = new Map(curriculumWorks.map(w => [w.id, { 
          url: w.video_url || undefined, 
          chinese: w.chinese_name 
        }]));
      }

      // Step 2: Check curriculum_videos table for approved videos (overrides direct video_url)
      const { data: curriculumVideos } = await supabase
        .from('curriculum_videos')
        .select('work_id, youtube_url')
        .in('work_id', workIds)
        .eq('is_approved', true)
        .eq('is_active', true)
        .order('relevance_score', { ascending: false });

      // Build a map of best video per work (first one is highest relevance)
      if (curriculumVideos && curriculumVideos.length > 0) {
        const bestVideos = new Map<string, string>();
        for (const video of curriculumVideos) {
          if (!bestVideos.has(video.work_id)) {
            bestVideos.set(video.work_id, video.youtube_url);
          }
        }
        
        // Override videoMap with curriculum_videos URLs
        for (const [workId, youtubeUrl] of bestVideos) {
          const existing = videoMap.get(workId) || {};
          videoMap.set(workId, { ...existing, url: youtubeUrl });
        }
      }
    }

    // Extract notes and focus area from translated content
    let focusArea: string | undefined;
    let observationNotes: string | undefined;

    if (planContent?.assignments) {
      const childAssignment = planContent.assignments.find(
        (a: any) => a.childName.toLowerCase() === child.name.toLowerCase()
      );
      if (childAssignment) {
        focusArea = childAssignment.focusArea;
        observationNotes = childAssignment.observationNotes;
      }
    }

    // Build enriched assignments
    const enrichedAssignments = (assignments || []).map(a => {
      const workInfo = a.work_id ? videoMap.get(a.work_id) : null;
      return {
        id: a.id,
        work_name: a.work_name,
        work_name_chinese: workInfo?.chinese,
        area: a.area,
        progress_status: 'not_started',
        work_id: a.work_id,
        video_url: workInfo?.url,
        notes: a.notes
      };
    });

    return NextResponse.json({
      child: {
        id: child.id,
        name: child.name,
        date_of_birth: child.date_of_birth,
        age_group: child.age_group,
        focus_area: focusArea,
        observation_notes: observationNotes,
        assignments: enrichedAssignments
      }
    });

  } catch (error) {
    console.error('Failed to fetch child detail:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
