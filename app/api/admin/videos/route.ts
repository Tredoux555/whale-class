// =====================================================
// API: Admin video management
// =====================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

// GET: List all videos
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // all, approved, pending, missing
    const area = searchParams.get('area');

    const supabase = createClient();

    let query = supabase
      .from('curriculum_videos')
      .select(`
        *,
        curriculum_roadmap (
          work_name,
          area,
          stage
        )
      `)
      .order('relevance_score', { ascending: false });

    if (status === 'approved') {
      query = query.eq('is_approved', true).eq('is_active', true);
    } else if (status === 'pending') {
      query = query.eq('is_approved', false).eq('is_active', true);
    }

    const { data: videos, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      videos: videos || [],
    });
  } catch (error) {
    console.error('List videos error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}

// PUT: Update video (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { videoId, isApproved, isActive } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'videoId required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const updateData: any = {
      last_updated: new Date().toISOString(),
    };

    if (typeof isApproved === 'boolean') {
      updateData.is_approved = isApproved;
      if (isApproved) {
        updateData.approved_at = new Date().toISOString();
      }
    }

    if (typeof isActive === 'boolean') {
      updateData.is_active = isActive;
    }

    const { data: video, error } = await supabase
      .from('curriculum_videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      video,
      message: isApproved ? 'Video approved' : 'Video updated',
    });
  } catch (error) {
    console.error('Update video error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove video
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'videoId required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('curriculum_videos')
      .delete()
      .eq('id', videoId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Video deleted',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

