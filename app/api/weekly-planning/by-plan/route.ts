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
    const planId = url.searchParams.get('planId');
    const week = url.searchParams.get('week');
    const year = url.searchParams.get('year');
    const schoolId = url.searchParams.get('schoolId');

    // Get week/year from plan if planId provided
    let weekNumber = week ? parseInt(week) : 0;
    let yearNumber = year ? parseInt(year) : new Date().getFullYear();

    if (planId) {
      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('week_number, year, translated_content')
        .eq('id', planId)
        .single();
      
      if (plan) {
        weekNumber = plan.week_number;
        yearNumber = plan.year;
      }
    }

    if (!weekNumber) {
      return NextResponse.json({ error: 'week required' }, { status: 400 });
    }

    // If schoolId provided, get children IDs for this school
    let schoolChildIds: string[] | null = null;
    if (schoolId) {
      const { data: schoolChildren } = await supabase
        .from('children')
        .select('id')
        .eq('school_id', schoolId);
      schoolChildIds = schoolChildren?.map(c => c.id) || [];
    }

    // Build assignments query
    let query = supabase
      .from('weekly_assignments')
      .select(`
        id,
        child_id,
        work_id,
        work_name,
        area,
        status,
        progress_status,
        notes,
        children(id, name, avatar_emoji, school_id)
      `)
      .eq('week_number', weekNumber)
      .eq('year', yearNumber);

    // Filter by school's children if specified
    if (schoolChildIds !== null) {
      if (schoolChildIds.length === 0) {
        // No children for this school yet
        return NextResponse.json({ 
          children: [],
          week: weekNumber,
          year: yearNumber,
          totalAssignments: 0
        });
      }
      query = query.in('child_id', schoolChildIds);
    }

    const { data: assignments, error } = await query.order('area');

    if (error) {
      console.error('Assignments query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get video URLs for matched works
    const workIds = assignments?.map(a => a.work_id).filter(Boolean) || [];
    let videoMap = new Map();
    
    if (workIds.length > 0) {
      const { data: videos } = await supabase
        .from('curriculum_roadmap')
        .select('id, video_url, chinese_name')
        .in('id', workIds);
      videoMap = new Map(videos?.map(v => [v.id, { url: v.video_url, chinese: v.chinese_name }]) || []);
    }

    // Group assignments by child
    const childMap = new Map<string, {
      id: string;
      name: string;
      assignments: any[];
    }>();

    for (const a of (assignments || [])) {
      const childData = a.children as any;
      if (!childData) continue;

      const childId = childData.id;
      const childName = childData.name;
      
      if (!childMap.has(childId)) {
        childMap.set(childId, {
          id: childId,
          name: childName,
          assignments: []
        });
      }

      const videoInfo = a.work_id ? videoMap.get(a.work_id) : null;
      
      childMap.get(childId)!.assignments.push({
        id: a.id,
        work_name: a.work_name,
        work_name_chinese: videoInfo?.chinese,
        area: a.area,
        progress_status: a.progress_status || a.status || 'not_started',
        work_id: a.work_id,
        video_url: videoInfo?.url,
        notes: a.notes
      });
    }

    // Convert to array and sort by name
    const children = Array.from(childMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      children,
      week: weekNumber,
      year: yearNumber,
      totalAssignments: assignments?.length || 0
    });

  } catch (error) {
    console.error('Failed to fetch assignments by plan:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
