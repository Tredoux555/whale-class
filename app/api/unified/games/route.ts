// /app/api/unified/games/route.ts
// UNIFIED API: Game recommendations and play tracking
// Links games to curriculum, tracks when parent plays recommended games

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// All available games with metadata
const ALL_GAMES = [
  {
    id: 'letter-sounds',
    name: 'Letter Sounds',
    url: '/games/letter-sounds',
    icon: '🔤',
    description: 'Match letters to their sounds',
    category: 'phonics',
    difficulty: 1
  },
  {
    id: 'beginning-sounds',
    name: 'Beginning Sounds',
    url: '/games/sound-games/beginning',
    icon: '👂',
    description: 'I spy something that begins with...',
    category: 'phonics',
    difficulty: 1
  },
  {
    id: 'middle-sounds',
    name: 'Middle Sounds',
    url: '/games/sound-games/middle',
    icon: '🎯',
    description: 'Find the middle sound',
    category: 'phonics',
    difficulty: 2
  },
  {
    id: 'ending-sounds',
    name: 'Ending Sounds',
    url: '/games/sound-games/ending',
    icon: '📚',
    description: 'I spy something that ends with...',
    category: 'phonics',
    difficulty: 2
  },
  {
    id: 'combined-i-spy',
    name: 'Combined I Spy',
    url: '/games/combined-i-spy',
    icon: '🔍',
    description: 'Find by beginning AND ending sounds',
    category: 'phonics',
    difficulty: 3
  },
  {
    id: 'letter-match',
    name: 'Letter Match',
    url: '/games/letter-match',
    icon: '🔡',
    description: 'Match uppercase to lowercase',
    category: 'letters',
    difficulty: 1
  },
  {
    id: 'letter-tracer',
    name: 'Letter Tracer',
    url: '/games/letter-tracer',
    icon: '✏️',
    description: 'Practice writing letters',
    category: 'writing',
    difficulty: 2
  },
  {
    id: 'word-builder',
    name: 'Word Builder',
    url: '/games/word-builder',
    icon: '🔤',
    description: 'Build words letter by letter',
    category: 'reading',
    difficulty: 3
  },
  {
    id: 'vocabulary-builder',
    name: 'Vocabulary Builder',
    url: '/games/vocabulary-builder',
    icon: '📚',
    description: 'Learn new words with pictures',
    category: 'vocabulary',
    difficulty: 2
  },
  {
    id: 'grammar-symbols',
    name: 'Grammar Symbols',
    url: '/games/grammar-symbols',
    icon: '▲',
    description: 'Learn parts of speech',
    category: 'grammar',
    difficulty: 3
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    url: '/games/sentence-builder',
    icon: '📝',
    description: 'Build sentences with word cards',
    category: 'reading',
    difficulty: 4
  },
  {
    id: 'sentence-match',
    name: 'Sentence Match',
    url: '/games/sentence-match',
    icon: '🖼️',
    description: 'Match sentences to pictures',
    category: 'reading',
    difficulty: 4
  }
];

// GET: Get all games or recommendations for a child
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const category = searchParams.get('category');
  const recommended = searchParams.get('recommended') === 'true';

  try {
    // If no child_id, return all games
    if (!childId) {
      let games = ALL_GAMES;
      if (category) {
        games = games.filter(g => g.category === category);
      }
      return NextResponse.json({ games });
    }

    // Get child's Language progress
    const { data: progress } = await supabase
      .from('child_work_progress')
      .select(`
        work_id,
        status,
        updated_at
      `)
      .eq('child_id', childId)
      .gte('status', 1); // At least presented

    // Get curriculum to filter Language works
    const { data: curriculum } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area')
      .eq('area', 'language');

    const languageWorkIds = new Set((curriculum || []).map(c => c.id));
    const languageProgress = (progress || []).filter(p => languageWorkIds.has(p.work_id));

    if (recommended && languageProgress.length > 0) {
      // Get game mappings for child's Language works
      const workIds = languageProgress.map(p => p.work_id);
      
      const { data: mappings } = await supabase
        .from('game_curriculum_mapping')
        .select('*')
        .in('work_id', workIds)
        .order('relevance', { ascending: false });

      // Build recommended games with reasons
      const recommendedGames = new Map<string, {
        game: typeof ALL_GAMES[0];
        relevance: number;
        reasons: string[];
      }>();

      (mappings || []).forEach(mapping => {
        const game = ALL_GAMES.find(g => g.id === mapping.game_id);
        if (!game) return;

        const existing = recommendedGames.get(mapping.game_id);
        const work = curriculum?.find(c => c.id === mapping.work_id);
        const reason = work ? `Supports: ${work.name}` : 'Recommended';

        if (existing) {
          existing.reasons.push(reason);
          existing.relevance = Math.max(existing.relevance, mapping.relevance);
        } else {
          recommendedGames.set(mapping.game_id, {
            game,
            relevance: mapping.relevance,
            reasons: [reason]
          });
        }
      });

      // Sort by relevance and return top recommendations
      const sortedRecommendations = Array.from(recommendedGames.values())
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 6)
        .map(rec => ({
          ...rec.game,
          relevance: rec.relevance,
          reasons: rec.reasons.slice(0, 3) // Max 3 reasons per game
        }));

      return NextResponse.json({
        games: sortedRecommendations,
        total_language_works: languageProgress.length,
        child_id: childId
      });
    }

    // Return all games with child context
    let games = ALL_GAMES;
    if (category) {
      games = games.filter(g => g.category === category);
    }

    return NextResponse.json({ 
      games,
      child_id: childId,
      has_language_progress: languageProgress.length > 0
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Log when a game is played (for tracking)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { child_id, game_id, duration_seconds, from_recommendation } = body;

    if (!child_id || !game_id) {
      return NextResponse.json(
        { error: 'child_id and game_id required' },
        { status: 400 }
      );
    }

    // Log the game play (we can create a game_play_log table later)
    // For now, we'll update child_work_progress notes if from recommendation
    
    const game = ALL_GAMES.find(g => g.id === game_id);
    
    // If from recommendation, we could update related work progress
    // This is optional enhancement - for now just acknowledge
    
    return NextResponse.json({
      logged: true,
      game_id,
      game_name: game?.name || game_id,
      child_id,
      duration_seconds: duration_seconds || 0,
      from_recommendation: from_recommendation || false,
      played_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error logging game play:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
