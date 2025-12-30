import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get('planId');

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    
    // Get all children with their assignments for this plan
    const { data: assignments, error: assignError } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        work_name,
        area,
        progress_status,
        work_id,
        child_id,
        children (
          id,
          name
        )
      `)
      .eq('weekly_plan_id', planId);

    if (assignError) throw assignError;

    // Get video URLs for matched works
    const workIds = assignments
      ?.filter(a => a.work_id)
      .map(a => a.work_id) || [];

    let videoMap: Record<string, string> = {};
    if (workIds.length > 0) {
      const { data: works } = await supabase
        .from('curriculum_roadmap')
        .select('id, video_url')
        .in('id', workIds);

      if (works) {
        videoMap = works.reduce((acc, w) => {
          if (w.video_url) acc[w.id] = w.video_url;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Group by child
    const childrenMap = new Map<string, {
      id: string;
      name: string;
      assignments: any[];
    }>();

    for (const assignment of (assignments || [])) {
      const childData = assignment.children as any;
      if (!childData) continue;

      if (!childrenMap.has(childData.id)) {
        childrenMap.set(childData.id, {
          id: childData.id,
          name: childData.name,
          assignments: [],
        });
      }

      childrenMap.get(childData.id)!.assignments.push({
        id: assignment.id,
        work_name: assignment.work_name,
        area: assignment.area,
        progress_status: assignment.progress_status,
        work_id: assignment.work_id,
        video_url: assignment.work_id ? videoMap[assignment.work_id] : undefined,
      });
    }

    // Sort children alphabetically
    const children = Array.from(childrenMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ children });

  } catch (error) {
    console.error('Failed to fetch assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
