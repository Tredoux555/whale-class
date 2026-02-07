import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { markWorkComplete } from '@/lib/curriculum/progression';
import type { 
  CreateVideoWatchRequest, 
  VideoWatchResponse, 
  VideoWatchError,
  ChildVideoWatch 
} from '@/types/database';

// Completion threshold: 80% of video watched
const COMPLETION_THRESHOLD = 0.8;

/**
 * POST /api/whale/video-watches
 * Create or update a video watch record
 * Auto-completes curriculum work when watch percentage >= 80%
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateVideoWatchRequest = await request.json();
    
    // Validate required fields
    const { 
      childId, 
      curriculumVideoId, 
      curriculumWorkId, 
      watchDurationSeconds,
      videoDurationSeconds 
    } = body;

    if (!childId || !curriculumVideoId || !curriculumWorkId) {
      return NextResponse.json<VideoWatchError>(
        { 
          success: false,
          error: 'Missing required fields',
          details: 'childId, curriculumVideoId, and curriculumWorkId are required'
        },
        { status: 400 }
      );
    }

    if (watchDurationSeconds === undefined || videoDurationSeconds === undefined) {
      return NextResponse.json<VideoWatchError>(
        { 
          success: false,
          error: 'Missing duration fields',
          details: 'watchDurationSeconds and videoDurationSeconds are required'
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Calculate watch percentage
    const watchPercentage = videoDurationSeconds > 0 
      ? Math.min((watchDurationSeconds / videoDurationSeconds) * 100, 100)
      : 0;

    // Check if watch is complete (>= 80%)
    const isComplete = watchPercentage >= (COMPLETION_THRESHOLD * 100);

    // Prepare watch data
    const watchData = {
      child_id: childId,
      curriculum_video_id: curriculumVideoId,
      curriculum_work_id: curriculumWorkId,
      watch_started_at: body.watchStartedAt || new Date().toISOString(),
      watch_completed_at: body.watchCompletedAt || (isComplete ? new Date().toISOString() : null),
      watch_duration_seconds: watchDurationSeconds,
      video_duration_seconds: videoDurationSeconds,
      watch_percentage: Math.round(watchPercentage * 100) / 100, // Round to 2 decimals
      is_complete: isComplete,
      device_type: body.deviceType || 'unknown',
      updated_at: new Date().toISOString(),
    };

    // Get today's date for the unique constraint
    const today = new Date().toISOString().split('T')[0];

    // Check if a watch record already exists for this child/video/day
    const { data: existingWatch } = await supabase
      .from('child_video_watches')
      .select('*')
      .eq('child_id', childId)
      .eq('curriculum_video_id', curriculumVideoId)
      .gte('watch_started_at', `${today}T00:00:00`)
      .lt('watch_started_at', `${today}T23:59:59`)
      .maybeSingle();

    let watchRecord: ChildVideoWatch;
    let workCompleted = false;

    if (existingWatch) {
      // Update existing watch record
      // Accumulate watch duration (don't overwrite)
      const updatedDuration = Math.max(
        existingWatch.watch_duration_seconds + watchDurationSeconds,
        existingWatch.watch_duration_seconds
      );
      
      const updatedPercentage = videoDurationSeconds > 0
        ? Math.min((updatedDuration / videoDurationSeconds) * 100, 100)
        : existingWatch.watch_percentage || 0;

      const updatedIsComplete = updatedPercentage >= (COMPLETION_THRESHOLD * 100);

      const { data: updated, error: updateError } = await supabase
        .from('child_video_watches')
        .update({
          watch_duration_seconds: updatedDuration,
          watch_percentage: Math.round(updatedPercentage * 100) / 100,
          is_complete: updatedIsComplete,
          watch_completed_at: updatedIsComplete && !existingWatch.watch_completed_at 
            ? new Date().toISOString() 
            : existingWatch.watch_completed_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWatch.id)
        .select()
        .single();

      if (updateError) throw updateError;
      watchRecord = updated as ChildVideoWatch;

      // If this update pushed it over the completion threshold
      if (updatedIsComplete && !existingWatch.is_complete) {
        workCompleted = true;
      }
    } else {
      // Create new watch record
      const { data: created, error: createError } = await supabase
        .from('child_video_watches')
        .insert(watchData)
        .select()
        .single();

      if (createError) throw createError;
      watchRecord = created as ChildVideoWatch;

      // Check if newly created record is complete
      if (isComplete) {
        workCompleted = true;
      }
    }

    // Auto-complete curriculum work if watch is complete
    if (workCompleted) {
      try {
        await markWorkComplete(childId, curriculumWorkId);
      } catch (completionError) {
        // Log error but don't fail the request
        console.error('❌ Error marking curriculum work complete:', completionError);
        // We still return success since the watch was recorded
      }
    }

    return NextResponse.json<VideoWatchResponse>({
      success: true,
      watchRecord,
      workCompleted,
      message: workCompleted 
        ? 'Video watch recorded and curriculum work marked complete!'
        : 'Video watch recorded successfully',
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof Error ? error.toString() : String(error);
    console.error('❌ Error in video watch API:', error);
    return NextResponse.json<VideoWatchError>(
      {
        success: false,
        error: message || 'Failed to record video watch',
        details
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whale/video-watches?childId=xxx&videoId=xxx
 * Get watch records for a child/video
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const videoId = searchParams.get('videoId');
    const workId = searchParams.get('workId');

    const supabase = getSupabase();
    let query = supabase.from('child_video_watches').select('*');

    if (childId) {
      query = query.eq('child_id', childId);
    }

    if (videoId) {
      query = query.eq('curriculum_video_id', videoId);
    }

    if (workId) {
      query = query.eq('curriculum_work_id', workId);
    }

    const { data, error } = await query.order('watch_started_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      watches: data || [],
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching video watches:', error);
    return NextResponse.json<VideoWatchError>(
      {
        success: false,
        error: message || 'Failed to fetch video watches'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whale/video-watches?watchId=xxx
 * Delete a watch record (for testing/admin purposes)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const watchId = searchParams.get('watchId');

    if (!watchId) {
      return NextResponse.json<VideoWatchError>(
        { 
          success: false,
          error: 'watchId is required'
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('child_video_watches')
      .delete()
      .eq('id', watchId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Watch record deleted successfully',
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error deleting video watch:', error);
    return NextResponse.json<VideoWatchError>(
      {
        success: false,
        error: message || 'Failed to delete video watch'
      },
      { status: 500 }
    );
  }
}

