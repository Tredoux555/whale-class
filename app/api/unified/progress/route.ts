// /app/api/unified/progress/route.ts
// UNIFIED API: Child progress with game recommendations
// THE KEY INTEGRATION - Teacher progress → Parent view → Game recommendations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface WorkProgress {
  work_id: string;
  work_name: string;
  area: string;
  status: number;
  status_label: string;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
  updated_at: string | null;
  updated_by: string;
  notes: string | null;
}

interface GameRecommendation {
  game_id: string;
  game_name: string;
  game_url: string;
  game_icon: string;
  game_description: string | null;
  reason: string;
  relevance: number;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Not Started',
  1: 'Presented',
  2: 'Practicing',
  3: 'Mastered'
};

// GET: Get child's progress with optional game recommendations
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const area = searchParams.get('area'); // Filter by area
  const includeGames = searchParams.get('include_games') !== 'false';
  const todayOnly = searchParams.get('today_only') === 'true';

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get curriculum works
    let curriculumQuery = supabase
      .from('curriculum_roadmap')
      .select('id, name, area, category_id, sequence_order')
      .order('sequence_order');

    if (area) {
      curriculumQuery = curriculumQuery.eq('area', area);
    }

    const { data: curriculum, error: currError } = await curriculumQuery;
    if (currError) throw currError;

    // Get child's progress from UNIFIED child_work_progress
    let progressQuery = supabase
      .from('child_work_progress')
      .select('*')
      .eq('child_id', childId);

    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      progressQuery = progressQuery.gte('updated_at', today.toISOString());
    }

    const { data: progress, error: progError } = await progressQuery;
    if (progError) throw progError;

    // Create progress lookup map
    const progressMap = new Map(
      (progress || []).map(p => [p.work_id, p])
    );

    // Build progress list with work details
    const worksWithProgress: WorkProgress[] = (curriculum || []).map(work => {
      const prog = progressMap.get(work.id);
      return {
        work_id: work.id,
        work_name: work.name,
        area: work.area,
        status: prog?.status || 0,
        status_label: STATUS_LABELS[prog?.status || 0],
        presented_date: prog?.presented_date || null,
        practicing_date: prog?.practicing_date || null,
        mastered_date: prog?.mastered_date || null,
        updated_at: prog?.updated_at || null,
        updated_by: prog?.updated_by || 'none',
        notes: prog?.notes || null
      };
    });

    // Filter to only works with progress if today_only
    const filteredWorks = todayOnly 
      ? worksWithProgress.filter(w => w.status > 0)
      : worksWithProgress;

    // Get game recommendations for Language works
    let gameRecommendations: GameRecommendation[] = [];
    
    if (includeGames) {
      // Get works that are presented, practicing, or mastered in Language area
      const languageProgress = (progress || []).filter(p => {
        const work = curriculum?.find(c => c.id === p.work_id);
        return work?.area === 'language' && p.status >= 1 && p.status <= 3;
      });

      if (languageProgress.length > 0) {
        const workIds = languageProgress.map(p => p.work_id);
        
        // Get game mappings for these works
        const { data: gameMappings } = await supabase
          .from('game_curriculum_mapping')
          .select('*')
          .in('work_id', workIds)
          .order('relevance', { ascending: false });

        // Deduplicate games (keep highest relevance per game)
        const seenGames = new Set<string>();
        gameRecommendations = (gameMappings || [])
          .filter(gm => {
            if (seenGames.has(gm.game_id)) return false;
            seenGames.add(gm.game_id);
            return true;
          })
          .slice(0, 5) // Top 5 recommendations
          .map(gm => {
            const work = curriculum?.find(c => c.id === gm.work_id);
            const prog = progressMap.get(gm.work_id);
            const statusLabel = STATUS_LABELS[prog?.status || 0];
            
            return {
              game_id: gm.game_id,
              game_name: gm.game_name,
              game_url: gm.game_url,
              game_icon: gm.game_icon || '🎮',
              game_description: gm.game_description,
              reason: `Practice "${work?.name || gm.work_name}" (${statusLabel})`,
              relevance: gm.relevance
            };
          });
      }
    }

    // Calculate summary stats
    const summary = {
      total: filteredWorks.length,
      mastered: filteredWorks.filter(w => w.status === 3).length,
      practicing: filteredWorks.filter(w => w.status === 2).length,
      presented: filteredWorks.filter(w => w.status === 1).length,
      not_started: filteredWorks.filter(w => w.status === 0).length
    };

    return NextResponse.json({
      child_id: childId,
      summary,
      works: filteredWorks,
      game_recommendations: gameRecommendations,
      filtered_by: {
        area: area || 'all',
        today_only: todayOnly
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Update progress (for parent marking home practice)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { child_id, work_id, status, notes, updated_by = 'parent' } = body;

    if (!child_id || !work_id || status === undefined) {
      return NextResponse.json(
        { error: 'child_id, work_id, and status required' },
        { status: 400 }
      );
    }

    // Validate status
    if (![0, 1, 2, 3].includes(status)) {
      return NextResponse.json(
        { error: 'status must be 0, 1, 2, or 3' },
        { status: 400 }
      );
    }

    // Get current progress if exists
    const { data: existing } = await supabase
      .from('child_work_progress')
      .select('*')
      .eq('child_id', child_id)
      .eq('work_id', work_id)
      .single();

    const now = new Date().toISOString();
    
    // Build update object
    const progressData: Record<string, unknown> = {
      child_id,
      work_id,
      status,
      updated_by,
      updated_at: now
    };

    // Set date fields based on status
    if (status >= 1 && !existing?.presented_date) {
      progressData.presented_date = now;
    }
    if (status >= 2 && !existing?.practicing_date) {
      progressData.practicing_date = now;
    }
    if (status >= 3 && !existing?.mastered_date) {
      progressData.mastered_date = now;
    }

    if (notes !== undefined) {
      progressData.notes = notes;
    }

    // Upsert progress
    const { data: progress, error } = await supabase
      .from('child_work_progress')
      .upsert(progressData, {
        onConflict: 'child_id,work_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      progress,
      updated: true,
      status_label: STATUS_LABELS[status]
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
