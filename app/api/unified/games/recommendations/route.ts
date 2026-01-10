// /app/api/unified/games/recommendations/route.ts
// UNIFIED API: Game Recommendations based on child's Language progress
// THE MAGIC: Teacher marks work → Parent sees recommended games

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface GameRecommendation {
  game_id: string;
  game_name: string;
  game_url: string;
  game_icon: string;
  game_description: string;
  work_name: string;
  work_status: number;
  work_status_label: string;
  relevance: number;
  reason: string;
}

// GET: Get game recommendations for a child
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const limit = parseInt(searchParams.get('limit') || '3');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get child's Language progress (status 1, 2, or 3)
    const { data: progress, error: progressError } = await supabase
      .from('child_work_progress')
      .select(`
        work_id,
        status,
        updated_at
      `)
      .eq('child_id', childId)
      .in('status', [1, 2, 3])
      .order('updated_at', { ascending: false });

    if (progressError) throw progressError;

    if (!progress || progress.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        message: 'No progress yet - games will be recommended as the child learns!'
      });
    }

    // Get the work IDs and filter for Language area
    const workIds = progress.map(p => p.work_id);

    // Get curriculum info to filter by Language
    const { data: languageWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area')
      .in('id', workIds)
      .eq('area', 'language');

    if (!languageWorks || languageWorks.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        message: 'No Language works in progress yet - games will be recommended soon!'
      });
    }

    const languageWorkIds = languageWorks.map(w => w.id);
    const workNameMap = Object.fromEntries(languageWorks.map(w => [w.id, w.name]));

    // Get game mappings for these works
    const { data: mappings, error: mappingError } = await supabase
      .from('game_curriculum_mapping')
      .select('*')
      .in('work_id', languageWorkIds)
      .order('relevance', { ascending: false });

    if (mappingError) throw mappingError;

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        message: 'Games are being mapped to the curriculum - check back soon!'
      });
    }

    // Create progress lookup
    const progressMap = Object.fromEntries(
      progress.map(p => [p.work_id, { status: p.status, updated_at: p.updated_at }])
    );

    // Build recommendations - prioritize by: 
    // 1. Status = 2 (Practicing) - they need the most practice
    // 2. Status = 1 (Presented) - recently introduced
    // 3. Status = 3 (Mastered) - for review/fun
    // And by relevance score

    const statusLabels: Record<number, string> = {
      1: 'Presented',
      2: 'Practicing', 
      3: 'Mastered'
    };

    const statusPriority: Record<number, number> = {
      2: 100, // Practicing gets highest priority
      1: 50,  // Presented
      3: 10   // Mastered (for review)
    };

    const scoredMappings = mappings.map(m => {
      const workProgress = progressMap[m.work_id];
      const status = workProgress?.status || 0;
      const score = (statusPriority[status] || 0) + m.relevance;
      
      return {
        ...m,
        work_status: status,
        work_status_label: statusLabels[status] || 'Unknown',
        score
      };
    });

    // Sort by score and deduplicate by game_id (keep highest scored)
    scoredMappings.sort((a, b) => b.score - a.score);
    
    const seenGames = new Set<string>();
    const recommendations: GameRecommendation[] = [];

    for (const m of scoredMappings) {
      if (seenGames.has(m.game_id)) continue;
      if (recommendations.length >= limit) break;

      seenGames.add(m.game_id);

      // Generate reason based on status
      let reason = '';
      switch (m.work_status) {
        case 1:
          reason = `Recently learned "${m.work_name}" - reinforce with practice!`;
          break;
        case 2:
          reason = `Currently practicing "${m.work_name}" - perfect game to help!`;
          break;
        case 3:
          reason = `Mastered "${m.work_name}" - play for fun review!`;
          break;
      }

      recommendations.push({
        game_id: m.game_id,
        game_name: m.game_name,
        game_url: m.game_url,
        game_icon: m.game_icon || '🎮',
        game_description: m.game_description || '',
        work_name: workNameMap[m.work_id] || m.work_name || 'Language work',
        work_status: m.work_status,
        work_status_label: m.work_status_label,
        relevance: m.relevance,
        reason
      });
    }

    return NextResponse.json({ 
      recommendations,
      child_id: childId,
      generated_at: new Date().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting game recommendations:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
