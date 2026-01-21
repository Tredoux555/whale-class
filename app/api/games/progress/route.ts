// app/api/games/progress/route.ts
// Track and retrieve game progress

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/games/progress
 * Query params:
 *   - student_id: Required - get progress for this student
 *   - game_id: Optional - filter to specific game
 *   - limit: Optional - number of records (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const gameId = searchParams.get('game_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    let query = supabase
      .from('game_progress')
      .select(`
        *,
        game:montessori_games(id, name, slug, game_type),
        work:montessori_works(id, name, curriculum_area)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data: progress, error } = await query;

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const summary = {
      total_sessions: progress?.length || 0,
      total_time_seconds: progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0,
      average_accuracy: progress?.length 
        ? progress.reduce((sum, p) => sum + (p.accuracy_percent || 0), 0) / progress.length 
        : 0,
      games_played: [...new Set(progress?.map(p => p.game_id))].length,
    };

    return NextResponse.json({
      success: true,
      student_id: studentId,
      summary,
      progress,
    });
  } catch (error: any) {
    console.error('Error in games/progress GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/games/progress
 * Record a game session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      student_id,
      game_id,
      work_id,
      time_spent_seconds,
      items_attempted,
      items_correct,
      level_reached,
      high_score,
      completed,
      session_data,
    } = body;

    if (!student_id || !game_id) {
      return NextResponse.json(
        { success: false, error: 'student_id and game_id are required' },
        { status: 400 }
      );
    }

    // Calculate accuracy
    const accuracy_percent = items_attempted > 0 
      ? Math.round((items_correct / items_attempted) * 10000) / 100
      : null;

    const supabase = createClient();

    const { data: progress, error } = await supabase
      .from('game_progress')
      .insert({
        student_id,
        game_id,
        work_id: work_id || null,
        time_spent_seconds: time_spent_seconds || 0,
        items_attempted: items_attempted || 0,
        items_correct: items_correct || 0,
        accuracy_percent,
        level_reached: level_reached || 1,
        high_score: high_score || 0,
        completed: completed || false,
        session_data: session_data || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording progress:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    console.error('Error in games/progress POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record progress' },
      { status: 500 }
    );
  }
}
