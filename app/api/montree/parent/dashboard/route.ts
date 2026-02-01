// /api/montree/parent/dashboard/route.ts
// GET: Fetch parent dashboard data (today's activities, games, reports, photos)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Area icon mapping
const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  math: '🔢',
  language: '📚',
  cultural: '🌍',
};

const AREA_NAMES: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  math: 'Math',
  language: 'Language',
  cultural: 'Cultural',
};

// Game recommendations by area
const GAMES_BY_AREA: Record<string, Array<{
  game_id: string;
  game_name: string;
  game_url: string;
  game_icon: string;
  game_description: string;
}>> = {
  practical_life: [
    {
      game_id: 'sensorial-sort',
      game_name: 'Sensorial Sort',
      game_url: '/montree/games/sensorial-sort',
      game_icon: '🎨',
      game_description: 'Sort objects by color, size, or shape',
    },
  ],
  sensorial: [
    {
      game_id: 'color-match',
      game_name: 'Color Match',
      game_url: '/montree/games/color-match',
      game_icon: '🎨',
      game_description: 'Match colors together',
    },
    {
      game_id: 'color-grade',
      game_name: 'Color Grade',
      game_url: '/montree/games/color-grade',
      game_icon: '🌈',
      game_description: 'Arrange colors from light to dark',
    },
  ],
  mathematics: [
    {
      game_id: 'number-tracer',
      game_name: 'Number Tracer',
      game_url: '/montree/games/number-tracer',
      game_icon: '✏️',
      game_description: 'Trace numbers with your finger',
    },
    {
      game_id: 'quantity-match',
      game_name: 'Quantity Match',
      game_url: '/montree/games/quantity-match',
      game_icon: '🔢',
      game_description: 'Match numbers to quantities',
    },
    {
      game_id: 'bead-frame',
      game_name: 'Bead Frame',
      game_url: '/montree/games/bead-frame',
      game_icon: '🧮',
      game_description: 'Count with the bead frame',
    },
  ],
  language: [
    {
      game_id: 'letter-sounds',
      game_name: 'Letter Sounds',
      game_url: '/montree/games/letter-sounds',
      game_icon: '🔤',
      game_description: 'Learn the sounds letters make',
    },
    {
      game_id: 'word-builder',
      game_name: 'Word Builder',
      game_url: '/montree/games/word-builder',
      game_icon: '📝',
      game_description: 'Build words from letter sounds',
    },
    {
      game_id: 'letter-tracer',
      game_name: 'Letter Tracer',
      game_url: '/montree/games/letter-tracer',
      game_icon: '✏️',
      game_description: 'Practice writing letters',
    },
  ],
  cultural: [
    {
      game_id: 'match-attack',
      game_name: 'Match Attack',
      game_url: '/montree/games/match-attack',
      game_icon: '🧠',
      game_description: 'Memory matching game',
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const testChild = searchParams.get('test'); // For testing without auth
    
    // Get child ID from session or test param
    let childId: string | null = null;
    
    if (testChild) {
      childId = testChild;
    } else {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('montree_parent_session');
      
      if (!sessionCookie?.value) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not authenticated' 
        }, { status: 401 });
      }
      
      try {
        const session = JSON.parse(atob(sessionCookie.value));
        childId = session.child_id;
      } catch {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid session' 
        }, { status: 401 });
      }
    }
    
    if (!childId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No child ID' 
      }, { status: 400 });
    }
    
    // Fetch child info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select(`
        id, name, photo_url, 
        classroom:montree_classrooms!classroom_id (id, name)
      `)
      .eq('id', childId)
      .single();
    
    if (childError || !child) {
      return NextResponse.json({ 
        success: false, 
        error: 'Child not found' 
      }, { status: 404 });
    }
    
    // Get today's date
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    
    // Fetch today's progress entries
    const { data: todayProgress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at, duration_minutes')
      .eq('child_id', childId)
      .gte('updated_at', todayStart)
      .lt('updated_at', todayEnd)
      .order('updated_at', { ascending: false });
    
    // Build today's activities
    const todayActivities = (todayProgress || []).map(p => ({
      work_id: p.work_name, // Using name as ID since we don't have work_id
      work_name: p.work_name,
      area: p.area,
      area_name: AREA_NAMES[p.area?.toLowerCase()] || p.area || 'Other',
      area_icon: AREA_ICONS[p.area?.toLowerCase()] || '📋',
      total_minutes: p.duration_minutes || 0,
      session_count: 1,
    }));
    
    // Get most active areas from today's activities
    const areaCounts: Record<string, number> = {};
    for (const activity of todayActivities) {
      const area = activity.area?.toLowerCase() || '';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    }
    
    // Get recommended games based on today's areas
    const recommendedGames: Array<{
      game_id: string;
      game_name: string;
      game_url: string;
      game_icon: string;
      game_description: string;
    }> = [];
    
    const sortedAreas = Object.entries(areaCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([area]) => area);
    
    for (const area of sortedAreas.slice(0, 2)) {
      const areaGames = GAMES_BY_AREA[area] || [];
      recommendedGames.push(...areaGames.slice(0, 2));
    }
    
    // If no activities today, show some default games
    if (recommendedGames.length === 0) {
      recommendedGames.push(
        ...GAMES_BY_AREA.language.slice(0, 2),
        ...GAMES_BY_AREA.mathematics.slice(0, 2),
      );
    }
    
    // Fetch recent weekly analyses (as "reports")
    const { data: analyses } = await supabase
      .from('montree_weekly_analysis')
      .select('id, week_start, week_end, parent_summary, created_at')
      .eq('child_id', childId)
      .order('week_start', { ascending: false })
      .limit(5);
    
    const reports = (analyses || []).map(a => ({
      id: a.id,
      week_start: a.week_start,
      week_end: a.week_end,
      status: 'published',
      share_token: null, // Can add later if needed
      summary_preview: a.parent_summary?.slice(0, 100) || null,
    }));
    
    // Fetch recent photos from montree_media
    const { data: photos } = await supabase
      .from('montree_media')
      .select('id, storage_path, work_id, captured_at, thumbnail_path')
      .eq('child_id', childId)
      .order('captured_at', { ascending: false })
      .limit(9);

    const recentMedia = (photos || []).map(p => ({
      id: p.id,
      media_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${p.storage_path}`,
      media_type: 'image' as const,
      work_name: p.work_id,
      taken_at: p.captured_at,
    }));
    
    // Handle classroom which may be an object or array depending on Supabase
    const classroom = Array.isArray(child.classroom) ? child.classroom[0] : child.classroom;

    return NextResponse.json({
      success: true,
      child: {
        id: child.id,
        name: child.name,
        photo_url: child.photo_url,
        classroom_name: classroom?.name || null,
      },
      todayActivities,
      recommendedGames: recommendedGames.slice(0, 4), // Max 4 games
      reports,
      recentMedia,
    });
    
  } catch (error) {
    console.error('Parent dashboard error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
