// app/api/games/route.ts
// List all games with optional filters

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/games
 * Query params:
 *   - type: Filter by game_type (tracer, matching, sorting, etc.)
 *   - age: Filter games appropriate for this age
 *   - work_id: Get games related to a specific work
 *   - active_only: Only return active games (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('type');
    const age = searchParams.get('age');
    const workId = searchParams.get('work_id');
    const activeOnly = searchParams.get('active_only') !== 'false';

    const supabase = createClient();

    // If work_id provided, get games for that work
    if (workId) {
      const { data: workGames, error } = await supabase
        .from('work_games')
        .select(`
          relationship_type,
          display_order,
          game_config,
          game:montessori_games(
            id, name, slug, description, game_type, 
            difficulty_level, age_min, age_max,
            component_path, instructions, learning_objectives,
            thumbnail_url, is_active, is_premium
          )
        `)
        .eq('work_id', workId)
        .order('display_order');

      if (error) {
        console.error('Error fetching work games:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      const games = workGames?.map(wg => ({
        ...wg.game,
        relationship_type: wg.relationship_type,
        game_config: wg.game_config,
      })) || [];

      return NextResponse.json({
        success: true,
        work_id: workId,
        count: games.length,
        games,
      });
    }

    // Otherwise, list all games
    let query = supabase
      .from('montessori_games')
      .select('*')
      .order('game_type')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (gameType) {
      query = query.eq('game_type', gameType);
    }

    if (age) {
      const ageNum = parseFloat(age);
      query = query.lte('age_min', ageNum).gte('age_max', ageNum);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error('Error fetching games:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: games?.length || 0,
      games,
    });
  } catch (error: any) {
    console.error('Error in games:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
