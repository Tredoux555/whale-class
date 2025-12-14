import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const area = searchParams.get('area');
    const status = searchParams.get('status');

    const supabase = createClient();
    
    let query = supabase
      .from('montessori_works')
      .select('*')
      .order('curriculum_area', { ascending: true })
      .order('name', { ascending: true });

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (area) {
      query = query.eq('curriculum_area', area);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching montessori works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
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

