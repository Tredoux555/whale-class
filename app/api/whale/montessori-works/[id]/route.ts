import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montessori_works')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching montessori work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Work not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/whale/montessori-works/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, curriculum_area, video_url, status } = body;

    const supabase = getSupabase();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (curriculum_area !== undefined) updateData.curriculum_area = curriculum_area;
    if (video_url !== undefined) updateData.video_url = video_url;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('montessori_works')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating montessori work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Work updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/whale/montessori-works/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // First get the work to check if it has a video
    const { data: work } = await supabase
      .from('montessori_works')
      .select('video_url')
      .eq('id', id)
      .single();

    // Delete video from storage if exists
    if (work?.video_url) {
      const videoPath = work.video_url.split('/').pop();
      if (videoPath) {
        await supabase.storage
          .from('videos')
          .remove([`montessori-works/${videoPath}`]);
      }
    }

    // Delete the work record
    const { error } = await supabase
      .from('montessori_works')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting montessori work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Work deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/whale/montessori-works/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

