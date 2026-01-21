// app/api/games/[slug]/route.ts
// Get single game by slug with related Montessori works

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/games/[slug]
 * Returns game details with related Montessori works
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const supabase = createClient();

    // 1. Get game by slug
    const { data: game, error: gameError } = await supabase
      .from('montessori_games')
      .select('*')
      .eq('slug', slug)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // 2. Get related works via work_games junction
    const { data: workGames } = await supabase
      .from('work_games')
      .select(`
        relationship_type,
        display_order,
        work:montessori_works(
          id, name, slug, curriculum_area, sub_area,
          age_min, age_max, is_gateway,
          parent_explanation_simple
        )
      `)
      .eq('game_id', game.id)
      .order('display_order');

    // 3. Format related works
    const relatedWorks = workGames?.map(wg => ({
      ...wg.work,
      relationship_type: wg.relationship_type,
    })).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      game,
      related_works: relatedWorks,
    });
  } catch (error: any) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
