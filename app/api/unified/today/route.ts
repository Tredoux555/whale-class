// /app/api/unified/today/route.ts
// UNIFIED API: "What did my child learn today at school?"
// THE MAGIC ENDPOINT - Shows teacher updates with game recommendations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Not Started',
  1: 'Presented',
  2: 'Practicing', 
  3: 'Mastered'
};

const STATUS_EMOJI: Record<number, string> = {
  0: '⬜',
  1: '📖',
  2: '🔄',
  3: '⭐'
};

// GET: What did child learn today (or this week)?
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const period = searchParams.get('period') || 'today'; // today, week, month

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default: // today
        startDate.setHours(0, 0, 0, 0);
    }

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('id, name, color')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get progress updates in date range
    const { data: recentProgress } = await supabase
      .from('child_work_progress')
      .select('*')
      .eq('child_id', childId)
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: false });

    // Get curriculum details for these works
    const workIds = (recentProgress || []).map(p => p.work_id);
    
    const { data: curriculum } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area, category_id')
      .in('id', workIds);

    const curriculumMap = new Map((curriculum || []).map(c => [c.id, c]));

    // Build the "what learned today" list
    const learningUpdates = (recentProgress || []).map(progress => {
      const work = curriculumMap.get(progress.work_id);
      return {
        work_id: progress.work_id,
        work_name: work?.name || 'Unknown Work',
        area: work?.area || 'unknown',
        status: progress.status,
        status_label: STATUS_LABELS[progress.status],
        status_emoji: STATUS_EMOJI[progress.status],
        updated_at: progress.updated_at,
        updated_by: progress.updated_by || 'teacher',
        notes: progress.notes
      };
    });

    // Get Language updates for game recommendations
    const languageUpdates = learningUpdates.filter(u => u.area === 'language');
    
    let gameRecommendations: Array<{
      game_id: string;
      game_name: string;
      game_url: string;
      game_icon: string;
      reason: string;
      relevance: number;
    }> = [];

    if (languageUpdates.length > 0) {
      const languageWorkIds = languageUpdates.map(u => u.work_id);
      
      const { data: mappings } = await supabase
        .from('game_curriculum_mapping')
        .select('*')
        .in('work_id', languageWorkIds)
        .order('relevance', { ascending: false });

      // Deduplicate and get top 3
      const seenGames = new Set<string>();
      gameRecommendations = (mappings || [])
        .filter(m => {
          if (seenGames.has(m.game_id)) return false;
          seenGames.add(m.game_id);
          return true;
        })
        .slice(0, 3)
        .map(m => {
          const update = languageUpdates.find(u => u.work_id === m.work_id);
          return {
            game_id: m.game_id,
            game_name: m.game_name,
            game_url: m.game_url,
            game_icon: m.game_icon || '🎮',
            reason: `Practice "${update?.work_name || m.work_name}"`,
            relevance: m.relevance || 5
          };
        });
    }

    // If no specific mappings found, suggest default language games
    if (gameRecommendations.length === 0 && languageUpdates.length > 0) {
      gameRecommendations = [
        {
          game_id: 'letter-sounds',
          game_name: 'Letter Sounds',
          game_url: '/games/letter-sounds',
          game_icon: '🔤',
          reason: 'Learn letter-sound connections',
          relevance: 10
        },
        {
          game_id: 'letter-tracer',
          game_name: 'Letter Tracer',
          game_url: '/games/letter-tracer',
          game_icon: '✏️',
          reason: 'Practice writing letters',
          relevance: 9
        },
        {
          game_id: 'word-builder',
          game_name: 'Word Builder',
          game_url: '/games/word-builder',
          game_icon: '🧱',
          reason: 'Build words from sounds',
          relevance: 8
        }
      ];
    }

    // If no language work today, suggest general games
    if (gameRecommendations.length === 0 && learningUpdates.length > 0) {
      gameRecommendations = [
        {
          game_id: 'letter-sounds',
          game_name: 'Letter Sounds',
          game_url: '/games/letter-sounds',
          game_icon: '🔤',
          reason: 'Great for any day!',
          relevance: 7
        },
        {
          game_id: 'quantity-match',
          game_name: 'Quantity Match',
          game_url: '/games/quantity-match',
          game_icon: '🔢',
          reason: 'Practice counting',
          relevance: 6
        }
      ];
    }

    // Group by area for nice display
    const byArea: Record<string, typeof learningUpdates> = {};
    learningUpdates.forEach(update => {
      if (!byArea[update.area]) byArea[update.area] = [];
      byArea[update.area].push(update);
    });

    // Calculate summary
    const summary = {
      total_updates: learningUpdates.length,
      newly_presented: learningUpdates.filter(u => u.status === 1).length,
      practicing: learningUpdates.filter(u => u.status === 2).length,
      newly_mastered: learningUpdates.filter(u => u.status === 3).length,
      areas_touched: Object.keys(byArea).length
    };

    // Build friendly message
    let message = '';
    if (learningUpdates.length === 0) {
      message = period === 'today' 
        ? `No new updates for ${child.name} today yet.`
        : `No updates for ${child.name} in the past ${period}.`;
    } else if (period === 'today') {
      message = `${child.name} worked on ${learningUpdates.length} ${learningUpdates.length === 1 ? 'activity' : 'activities'} today!`;
    } else {
      message = `${child.name} has ${learningUpdates.length} updates this ${period}.`;
    }

    return NextResponse.json({
      child: {
        id: child.id,
        name: child.name,
        color: child.color || '#4F46E5'
      },
      period,
      message,
      summary,
      updates: learningUpdates,
      by_area: byArea,
      game_recommendations: gameRecommendations,
      has_language_updates: languageUpdates.length > 0
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching today updates:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
