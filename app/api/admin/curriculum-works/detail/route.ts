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
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search');
    const workId = searchParams.get('workId');
    
    if (!search && !workId) {
      return NextResponse.json({ success: false, error: 'search or workId required' }, { status: 400 });
    }

    let work = null;

    // Try by ID first
    if (workId) {
      const { data } = await supabase
        .from('curriculum_roadmap')
        .select('id, work_name, chinese_name, video_url, video_channel, area, description, stage')
        .eq('id', workId)
        .single();
      work = data;
    }

    // Try by name search if no ID match
    if (!work && search) {
      // First try exact name match
      const { data: exactMatch } = await supabase
        .from('curriculum_roadmap')
        .select('id, work_name, chinese_name, video_url, video_channel, area, description, stage')
        .ilike('work_name', search)
        .limit(1)
        .single();

      if (exactMatch) {
        work = exactMatch;
      } else {
        // Try partial match
        const { data: partialMatch } = await supabase
          .from('curriculum_roadmap')
          .select('id, work_name, chinese_name, video_url, video_channel, area, description, stage')
          .ilike('work_name', `%${search}%`)
          .limit(1)
          .single();
        
        work = partialMatch;
      }
    }

    // If still no match, check curriculum_videos table as fallback
    if (!work && search) {
      const { data: videoWork } = await supabase
        .from('curriculum_videos')
        .select(`
          id,
          work_id,
          video_url,
          source,
          curriculum_roadmap!inner (
            id,
            work_name,
            chinese_name,
            area,
            description,
            stage
          )
        `)
        .ilike('curriculum_roadmap.work_name', `%${search}%`)
        .eq('is_approved', true)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (videoWork?.curriculum_roadmap) {
        const curriculum = videoWork.curriculum_roadmap as any;
        work = {
          id: curriculum.id,
          work_name: curriculum.work_name,
          chinese_name: curriculum.chinese_name,
          video_url: videoWork.video_url,
          video_channel: videoWork.source,
          area: curriculum.area,
          description: curriculum.description,
          stage: curriculum.stage,
        };
      }
    }

    if (work) {
      // Normalize the response
      return NextResponse.json({
        success: true,
        work: {
          id: work.id,
          name: work.work_name,
          chinese_name: work.chinese_name,
          video_url: work.video_url,
          video_channel: work.video_channel,
          area: work.area,
          description: work.description,
          stage: work.stage,
        }
      });
    }

    return NextResponse.json({ success: true, work: null });

  } catch (error) {
    console.error('Curriculum work detail error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
