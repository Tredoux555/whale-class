// /api/montree/parent/weekly-review/route.ts
// GET: Fetch parent-friendly weekly analysis report
// Auth: Cookie-based parent session OR test mode with child ID

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { getChineseNameMap } from '@/lib/montree/curriculum-loader';

// Area icons for display
const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  math: '🔢',
  language: '📚',
  cultural: '🌍',
};

// Home activity suggestions based on area
const HOME_ACTIVITIES: Record<string, Array<{
  title: string;
  description: string;
  materials?: string;
  icon: string;
}>> = {
  practical_life: [
    {
      title: 'Kitchen Helper',
      description: 'Let your child help with simple tasks like washing vegetables, setting the table, or pouring water.',
      materials: 'Child-safe items, small pitcher',
      icon: '🍳',
    },
    {
      title: 'Folding Clothes',
      description: 'Practice folding washcloths or small towels together. Start with simple squares!',
      materials: 'Small towels or washcloths',
      icon: '👕',
    },
  ],
  sensorial: [
    {
      title: 'Mystery Bag',
      description: 'Put household objects in a bag and have your child identify them by touch alone.',
      materials: 'Cloth bag, various textured objects',
      icon: '👜',
    },
    {
      title: 'Sound Matching',
      description: 'Fill small containers with different materials (rice, beans, bells) and match them by sound.',
      materials: 'Small containers, rice, beans, etc.',
      icon: '🔔',
    },
  ],
  mathematics: [
    {
      title: 'Counting Snacks',
      description: 'Count out snacks together at snack time. "How many crackers would you like?"',
      materials: 'Snacks like crackers or fruit pieces',
      icon: '🍪',
    },
    {
      title: 'Shape Hunt',
      description: 'Go on a shape hunt around your home. "Can you find something round? Square?"',
      materials: 'None needed!',
      icon: '🔷',
    },
  ],
  language: [
    {
      title: 'Sound Safari',
      description: 'Find objects around your home that start with a particular sound. "Let\'s find things that start with /b/!"',
      materials: 'None needed!',
      icon: '🔤',
    },
    {
      title: 'Story Time Plus',
      description: 'After reading, ask "What do you think happens next?" to build comprehension and imagination.',
      materials: 'Picture books',
      icon: '📖',
    },
  ],
  cultural: [
    {
      title: 'Nature Walk',
      description: 'Go on a walk and collect leaves, rocks, or look at bugs. Talk about what you see!',
      materials: 'Small bag for collecting',
      icon: '🌿',
    },
    {
      title: 'Map Adventure',
      description: 'Look at a globe or map together. Find where you live and talk about other places.',
      materials: 'Globe or world map',
      icon: '🗺️',
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    // Get child ID from session cookie (secure - no test mode bypass)
    let childId: string | null = null;

    const session = await verifyParentSession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    childId = session.childId;
    
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
        classroom:montree_classrooms!classroom_id (name)
      `)
      .eq('id', childId)
      .single();
    
    if (childError || !child) {
      return NextResponse.json({ 
        success: false, 
        error: 'Child not found' 
      }, { status: 404 });
    }
    
    // Get available weeks (all analyses for this child)
    const { data: allAnalyses } = await supabase
      .from('montree_weekly_analysis')
      .select('week_start')
      .eq('child_id', childId)
      .order('week_start', { ascending: false });
    
    const availableWeeks = (allAnalyses || []).map(a => a.week_start);
    
    // Determine which week to fetch
    const targetWeek = weekParam || availableWeeks[0] || null;
    
    if (!targetWeek) {
      return NextResponse.json({
        success: true,
        child: {
          id: child.id,
          name: child.name,
          photo_url: child.photo_url,
          classroom_name: child.classroom?.name,
        },
        analysis: null,
        homeActivities: [],
        availableWeeks: [],
        message: 'No reports available yet',
      });
    }
    
    // Fetch the specific weekly analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('montree_weekly_analysis')
      .select('*')
      .eq('child_id', childId)
      .eq('week_start', targetWeek)
      .single();
    
    if (analysisError || !analysis) {
      return NextResponse.json({
        success: true,
        child: {
          id: child.id,
          name: child.name,
          photo_url: child.photo_url,
          classroom_name: child.classroom?.name,
        },
        analysis: null,
        homeActivities: [],
        availableWeeks,
        message: 'Report not found for this week',
      });
    }
    
    // Generate home activities based on area distribution
    const homeActivities: Array<{
      title: string;
      description: string;
      materials?: string;
      area: string;
      icon: string;
    }> = [];
    
    const areaDistribution = analysis.area_distribution || {};
    const sortedAreas = Object.entries(areaDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([area]) => area);
    
    // Pick 2-3 home activities based on most active areas
    for (const area of sortedAreas.slice(0, 3)) {
      const areaActivities = HOME_ACTIVITIES[area.toLowerCase()] || HOME_ACTIVITIES.practical_life;
      const randomActivity = areaActivities[Math.floor(Math.random() * areaActivities.length)];
      homeActivities.push({
        ...randomActivity,
        area,
      });
    }
    
    // Parse recommended_works if it's stored as JSONB
    let recommendedWorks: Array<{ work_name: string; area: string; reason: string; home_activity?: string; chineseName?: string }> = [];
    try {
      const raw = typeof analysis.recommended_works === 'string'
        ? JSON.parse(analysis.recommended_works)
        : (analysis.recommended_works || []);
      // Enrich with chineseName
      const cnMap = getChineseNameMap();
      recommendedWorks = (raw as Array<{ work_name: string; area: string; reason: string; home_activity?: string }>).map(w => ({
        ...w,
        chineseName: w.work_name ? cnMap.get(w.work_name.toLowerCase().trim()) || null : null,
      }));
    } catch {
      recommendedWorks = [];
    }
    
    return NextResponse.json({
      success: true,
      child: {
        id: child.id,
        name: child.name,
        photo_url: child.photo_url,
        classroom_name: child.classroom?.name,
      },
      analysis: {
        id: analysis.id,
        week_start: analysis.week_start,
        week_end: analysis.week_end,
        parent_summary: analysis.parent_summary,
        area_distribution: analysis.area_distribution || {},
        concentration_score: analysis.concentration_score,
        recommended_works: recommendedWorks,
        active_sensitive_periods: analysis.active_sensitive_periods || [],
        created_at: analysis.created_at,
      },
      homeActivities,
      availableWeeks,
    });
    
  } catch (error) {
    console.error('Parent weekly review error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
