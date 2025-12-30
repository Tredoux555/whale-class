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

    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    // Get the plan to extract translated content (for notes/focus areas)
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('translated_content')
      .eq('id', planId)
      .single();

    // Get all assignments for this plan
    const { data: assignments, error } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        child_id,
        work_id,
        work_name,
        area,
        notes,
        children(id, name, avatar_emoji)
      `)
      .eq('weekly_plan_id', planId)
      .order('area');

    if (error) {
      console.error('Assignments query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get video URLs for matched works
    const workIds = assignments?.map(a => a.work_id).filter(Boolean) || [];
    const { data: videos } = await supabase
      .from('curriculum_roadmap')
      .select('id, video_url, chinese_name')
      .in('id', workIds);

    const videoMap = new Map(videos?.map(v => [v.id, { url: v.video_url, chinese: v.chinese_name }]) || []);

    // Extract notes and focus areas from translated content
    const planContent = plan?.translated_content as any;
    const childNotesMap = new Map<string, { notes?: string; focusArea?: string }>();
    
    if (planContent?.assignments) {
      for (const assignment of planContent.assignments) {
        childNotesMap.set(assignment.childName.toLowerCase(), {
          notes: assignment.observationNotes,
          focusArea: assignment.focusArea
        });
      }
    }

    // Group assignments by child
    const childMap = new Map<string, {
      id: string;
      name: string;
      focus_area?: string;
      observation_notes?: string;
      assignments: any[];
    }>();

    for (const a of (assignments || [])) {
      const childData = a.children as any;
      if (!childData) continue;

      const childId = childData.id;
      const childName = childData.name;
      
      if (!childMap.has(childId)) {
        const extraInfo = childNotesMap.get(childName.toLowerCase()) || {};
        childMap.set(childId, {
          id: childId,
          name: childName,
          focus_area: extraInfo.focusArea,
          observation_notes: extraInfo.notes,
          assignments: []
        });
      }

      const videoInfo = a.work_id ? videoMap.get(a.work_id) : null;
      
      childMap.get(childId)!.assignments.push({
        id: a.id,
        work_name: a.work_name,
        work_name_chinese: videoInfo?.chinese,
        area: a.area,
        progress_status: 'not_started',
        work_id: a.work_id,
        video_url: videoInfo?.url,
        notes: a.notes
      });
    }

    // Convert to array and sort by name
    const children = Array.from(childMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ children });

  } catch (error) {
    console.error('Failed to fetch assignments by plan:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
