// /app/api/games/progress/route.ts
// API for tracking game sessions and progress
// Supports: start session, update progress, end session, get stats

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Fetch game progress for a child
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const gameId = searchParams.get('game_id');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get overall progress per game
    let query = supabase
      .from('student_game_progress')
      .select('*')
      .eq('child_id', childId)
      .order('last_played_at', { ascending: false });

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data: progress, error } = await query;
    if (error) throw error;

    // Get recent sessions (last 10)
    const { data: recentSessions } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('started_at', { ascending: false })
      .limit(10);

    // Calculate totals
    const totalTime = (progress || []).reduce((sum, p) => sum + (p.total_time_seconds || 0), 0);
    const totalSessions = (progress || []).reduce((sum, p) => sum + (p.total_sessions || 0), 0);

    return NextResponse.json({
      progress: progress || [],
      recentSessions: recentSessions || [],
      summary: {
        totalTimeSeconds: totalTime,
        totalTimeMinutes: Math.round(totalTime / 60),
        totalSessions,
        gamesPlayed: (progress || []).length
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching game progress:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Start/update/end game session
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { action, childId, gameId, gameName, sessionId, itemsCompleted, itemsTotal, score, levelReached, itemsMastered } = body;

    if (!action) {
      return NextResponse.json({ error: 'action required (start/update/end)' }, { status: 400 });
    }

    // START: Create new session
    if (action === 'start') {
      if (!childId || !gameId || !gameName) {
        return NextResponse.json({ error: 'childId, gameId, gameName required' }, { status: 400 });
      }

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          child_id: childId,
          game_id: gameId,
          game_name: gameName,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ sessionId: session.id, started: true });
    }

    // UPDATE: Update session progress
    if (action === 'update') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      }

      const updates: Record<string, unknown> = {};
      if (itemsCompleted !== undefined) updates.items_completed = itemsCompleted;
      if (itemsTotal !== undefined) updates.items_total = itemsTotal;
      if (score !== undefined) updates.score = score;
      if (levelReached !== undefined) updates.level_reached = levelReached;

      const { error } = await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      return NextResponse.json({ updated: true });
    }

    // END: Complete session and update aggregates
    if (action === 'end') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      }

      // Get session data
      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const endTime = new Date();
      const startTime = new Date(session.started_at);
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      // Update session with end time and duration
      const sessionUpdates: Record<string, unknown> = {
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds
      };
      if (itemsCompleted !== undefined) sessionUpdates.items_completed = itemsCompleted;
      if (itemsTotal !== undefined) sessionUpdates.items_total = itemsTotal;
      if (score !== undefined) sessionUpdates.score = score;
      if (levelReached !== undefined) sessionUpdates.level_reached = levelReached;

      await supabase
        .from('game_sessions')
        .update(sessionUpdates)
        .eq('id', sessionId);

      // Update or create aggregate progress
      const { data: existing } = await supabase
        .from('student_game_progress')
        .select('*')
        .eq('child_id', session.child_id)
        .eq('game_id', session.game_id)
        .single();

      if (existing) {
        // Update existing
        const newMastered = itemsMastered 
          ? [...new Set([...(existing.items_mastered || []), ...itemsMastered])]
          : existing.items_mastered;

        await supabase
          .from('student_game_progress')
          .update({
            total_sessions: (existing.total_sessions || 0) + 1,
            total_time_seconds: (existing.total_time_seconds || 0) + durationSeconds,
            highest_level: Math.max(existing.highest_level || 0, levelReached || 0),
            items_mastered: newMastered,
            last_played_at: endTime.toISOString(),
            updated_at: endTime.toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new
        await supabase
          .from('student_game_progress')
          .insert({
            child_id: session.child_id,
            game_id: session.game_id,
            game_name: session.game_name,
            total_sessions: 1,
            total_time_seconds: durationSeconds,
            highest_level: levelReached || 0,
            items_mastered: itemsMastered || [],
            last_played_at: endTime.toISOString()
          });
      }

      return NextResponse.json({ 
        ended: true, 
        durationSeconds,
        durationMinutes: Math.round(durationSeconds / 60)
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in game progress:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
