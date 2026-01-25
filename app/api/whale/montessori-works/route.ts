import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const area = searchParams.get('area');
    const status = searchParams.get('status');

    const supabase = createClient();
    
    // Fetch from curriculum_roadmap instead of montessori_works
    let query = supabase
      .from('curriculum_roadmap')
      .select(`
        id,
        work_name,
        area,
        stage,
        sequence_order,
        description,
        age_min,
        age_max,
        curriculum_videos!left (
          id,
          youtube_url,
          title,
          is_approved,
          is_active
        )
      `)
      .order('sequence_order', { ascending: true });

    // Apply filters
    if (search) {
      query = query.ilike('work_name', `%${search}%`);
    }

    if (area) {
      query = query.eq('area', area);
    }

    const { data: roadmapData, error } = await query;

    if (error) {
      console.error('Error fetching curriculum roadmap:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform curriculum_roadmap data to match MontessoriWork interface
    let works = (roadmapData || []).map((work: any) => {
      // Get approved video URL if available
      const approvedVideo = Array.isArray(work.curriculum_videos) 
        ? work.curriculum_videos.find((v: any) => v.is_approved && v.is_active)
        : null;
      
      // Determine status based on whether work has an approved video
      const workStatus = approvedVideo ? 'completed' : 'in_progress';

      return {
        id: work.id,
        name: work.work_name,
        curriculum_area: work.area,
        status: workStatus,
        video_url: approvedVideo?.youtube_url || null,
        sequence_order: work.sequence_order,
        stage: work.stage,
        description: work.description,
        age_min: work.age_min,
        age_max: work.age_max,
        created_at: new Date().toISOString(), // Placeholder
        updated_at: new Date().toISOString(), // Placeholder
      };
    });

    // Filter by status if specified
    if (status && status !== '' && status !== 'all') {
      works = works.filter((work: any) => work.status === status);
    }

    return NextResponse.json({
      success: true,
      data: works,
      count: works.length
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/whale/montessori-works:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, curriculum_area, video_url, status } = body;

    // Validation
    if (!name || !curriculum_area) {
      return NextResponse.json(
        { success: false, error: 'Name and curriculum area are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('montessori_works')
      .insert({
        name,
        curriculum_area,
        video_url: video_url || null,
        status: status || 'in_progress'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating montessori work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Work created successfully'
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/whale/montessori-works:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

