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

    if (!childId || !week || !year) {
      return NextResponse.json({ error: 'childId, week, year required' }, { status: 400 });
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, avatar_emoji')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get assignments for this week
    const { data: assignments, error: assignError } = await supabase
      .from('weekly_assignments')
      .select('id, work_id, work_name, area, status, progress_status, notes')
      .eq('child_id', childId)
      .eq('week_number', parseInt(week))
      .eq('year', parseInt(year))
      .order('area');

    if (assignError) {
      console.error('Assignments error:', assignError);
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

    const formattedAssignments = (assignments || []).map(a => {
      const videoInfo = a.work_id ? videoMap.get(a.work_id) : null;
      return {
        id: a.id,
        work_name: a.work_name,
        work_name_chinese: videoInfo?.chinese,
        area: a.area,
        progress_status: a.progress_status || a.status || 'not_started',
        work_id: a.work_id,
        video_url: videoInfo?.url,
        notes: a.notes
      };
    });

    return NextResponse.json({
      child: {
        ...child,
        assignments: formattedAssignments
      }
    });

  } catch (error) {
    console.error('Failed to fetch child detail:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
