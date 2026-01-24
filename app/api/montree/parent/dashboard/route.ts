// /api/montree/parent/dashboard/route.ts
// Parent Dashboard - Simple, actionable view for parents
// Redesigned: Session 63 - Jan 24, 2026
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢' },
  { id: 'language', name: 'Language', icon: '📖' },
  { id: 'cultural', name: 'Cultural', icon: '🌍' },
];

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('parent_session')?.value;
    const { searchParams } = new URL(request.url);
    
    // DEV BYPASS: ?test=childName allows testing without login
    const testChild = searchParams.get('test');
    let childId: string | null = null;
    
    const supabase = await createServerClient();

    if (testChild && process.env.NODE_ENV !== 'production') {
      // Dev mode: find child by name
      const { data: testChildData } = await supabase
        .from('children')
        .select('id')
        .ilike('name', `%${testChild}%`)
        .limit(1)
        .single();
      
      if (testChildData) {
        childId = testChildData.id;
      }
    }

    if (!childId) {
      // Normal auth flow
      if (!sessionToken) {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      }

      // Validate session and get child_id
      const { data: session, error: sessionError } = await supabase
        .from('parent_sessions')
        .select('child_id, expires_at')
        .eq('token', sessionToken)
        .single();

      if (sessionError || !session) {
        return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
      }

      // Check if session expired
      if (new Date(session.expires_at) < new Date()) {
        await supabase.from('parent_sessions').delete().eq('token', sessionToken);
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }

      childId = session.child_id;
    }

    // Fetch child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, photo_url, date_of_birth, classroom_name')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const birthDate = new Date(child.date_of_birth);
      const today = new Date();
      age = ((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    }

    // ==========================================
    // NEW: Fetch TODAY'S ACTIVITIES from work sessions
    // ==========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISOStart = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISOStart = tomorrow.toISOString();

    const { data: todaySessions } = await supabase
      .from('montree_work_sessions')
      .select(`
        id,
        work_id,
        session_type,
        duration_minutes,
        notes,
        observed_at
      `)
      .eq('child_id', childId)
      .gte('observed_at', todayISOStart)
      .lt('observed_at', tomorrowISOStart)
      .order('observed_at', { ascending: false });

    // Get work details for today's sessions
    const workIds = [...new Set((todaySessions || []).map(s => s.work_id))];
    
    let todayActivities: any[] = [];
    if (workIds.length > 0) {
      // Try curriculum_roadmap first
      const { data: worksData } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area')
        .in('id', workIds);
      
      const worksMap = new Map((worksData || []).map(w => [w.id, w]));
      
      // Also try montree_classroom_curriculum_works if needed
      const missingIds = workIds.filter(id => !worksMap.has(id));
      if (missingIds.length > 0) {
        const { data: classroomWorks } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, name, area')
          .in('id', missingIds);
        
        (classroomWorks || []).forEach(w => worksMap.set(w.id, w));
      }

      // Group sessions by work
      const workSessions = new Map<string, any>();
      (todaySessions || []).forEach(session => {
        const work = worksMap.get(session.work_id);
        if (!workSessions.has(session.work_id)) {
          workSessions.set(session.work_id, {
            work_id: session.work_id,
            work_name: work?.name || 'Activity',
            area: work?.area || 'practical_life',
            total_minutes: 0,
            session_count: 0,
            latest_type: session.session_type
          });
        }
        const entry = workSessions.get(session.work_id);
        entry.total_minutes += session.duration_minutes || 0;
        entry.session_count += 1;
      });

      todayActivities = Array.from(workSessions.values()).map(activity => ({
        ...activity,
        area_icon: AREAS.find(a => a.id === activity.area)?.icon || '📚',
        area_name: AREAS.find(a => a.id === activity.area)?.name || activity.area
      }));
    }

    // ==========================================
    // NEW: Fetch RECOMMENDED GAMES based on today's work
    // ==========================================
    let recommendedGames: any[] = [];
    
    if (workIds.length > 0) {
      // Get games mapped to works the child did today
      const { data: gameMappings } = await supabase
        .from('game_curriculum_mapping')
        .select('game_id, game_name, game_url, game_icon, game_description, work_id, relevance')
        .in('work_id', workIds)
        .order('relevance', { ascending: false });

      // Deduplicate games (one entry per game)
      const gameMap = new Map<string, any>();
      (gameMappings || []).forEach(g => {
        if (!gameMap.has(g.game_id) || g.relevance > gameMap.get(g.game_id).relevance) {
          gameMap.set(g.game_id, g);
        }
      });

      recommendedGames = Array.from(gameMap.values()).slice(0, 4);
    }

    // If no games from today's work, suggest popular games
    if (recommendedGames.length === 0) {
      const { data: popularGames } = await supabase
        .from('game_curriculum_mapping')
        .select('game_id, game_name, game_url, game_icon, game_description')
        .limit(4);
      
      // Deduplicate
      const gameMap = new Map<string, any>();
      (popularGames || []).forEach(g => {
        if (!gameMap.has(g.game_id)) {
          gameMap.set(g.game_id, g);
        }
      });
      recommendedGames = Array.from(gameMap.values()).slice(0, 4);
    }

    // ==========================================
    // Fetch WEEKLY REPORTS
    // ==========================================
    const { data: reports } = await supabase
      .from('weekly_reports')
      .select('id, week_start, week_end, status, share_token, summary')
      .eq('child_id', childId)
      .order('week_start', { ascending: false })
      .limit(5);

    // ==========================================
    // Fetch RECENT MEDIA (last 6 items)
    // ==========================================
    const { data: legacyMedia } = await supabase
      .from('child_work_media')
      .select('id, media_type, media_url, work_name, taken_at')
      .eq('child_id', childId)
      .order('taken_at', { ascending: false })
      .limit(6);

    const { data: montreeMedia } = await supabase
      .from('montree_media')
      .select('id, media_type, storage_path, caption, captured_at')
      .eq('child_id', childId)
      .order('captured_at', { ascending: false })
      .limit(6);

    // Convert montree_media to same format with public URLs
    const montreeWithUrls = (montreeMedia || []).map(m => {
      const { data: urlData } = supabase.storage
        .from('whale-media')
        .getPublicUrl(m.storage_path);
      
      return {
        id: m.id,
        media_type: m.media_type,
        media_url: urlData.publicUrl,
        work_name: m.caption,
        taken_at: m.captured_at
      };
    });

    // Combine and sort by date
    const allMedia = [...(legacyMedia || []), ...montreeWithUrls]
      .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
      .slice(0, 6);

    // ==========================================
    // LEGACY: Progress stats (keeping for backward compat)
    // ==========================================
    const { data: assignments } = await supabase
      .from('weekly_assignments')
      .select('progress_status, area')
      .eq('child_id', childId);

    const progress = {
      presented: 0,
      practicing: 0,
      mastered: 0,
      total: 0,
    };

    const areaStats: Record<string, { presented: number; practicing: number; mastered: number; total: number }> = {};
    AREAS.forEach(a => {
      areaStats[a.id] = { presented: 0, practicing: 0, mastered: 0, total: 0 };
    });

    (assignments || []).forEach((a: any) => {
      progress.total++;
      const area = a.area || 'practical_life';
      if (areaStats[area]) areaStats[area].total++;

      if (a.progress_status === 'mastered') {
        progress.mastered++;
        if (areaStats[area]) areaStats[area].mastered++;
      } else if (a.progress_status === 'practicing') {
        progress.practicing++;
        if (areaStats[area]) areaStats[area].practicing++;
      } else if (a.progress_status === 'presented') {
        progress.presented++;
        if (areaStats[area]) areaStats[area].presented++;
      }
    });

    const areaProgress = AREAS.map(a => ({
      ...a,
      ...areaStats[a.id],
    })).filter(a => a.total > 0);

    return NextResponse.json({
      success: true,
      child: {
        ...child,
        age,
        classroom_name: child.classroom_name || 'Whale Class'
      },
      // NEW simplified data
      todayActivities,
      recommendedGames,
      reports: (reports || []).map(r => ({
        ...r,
        summary_preview: r.summary ? r.summary.substring(0, 150) + '...' : null
      })),
      recentMedia: allMedia,
      // LEGACY data (for backward compatibility)
      progress,
      areaProgress,
    });

  } catch (error) {
    console.error('Parent dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
