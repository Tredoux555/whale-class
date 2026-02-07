// app/api/whale/curriculum/progress/[childId]/route.ts
// Get and update child's curriculum progress

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  try {
    // Get child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .eq('id', childId)
      .single();

    if (childError) throw childError;

    // Get progress by area
    const { data: areaProgress, error: areaError } = await supabase
      .from('child_curriculum_progress')
      .select('*')
      .eq('child_id', childId);

    if (areaError) throw areaError;

    // Get all completed works
    const { data: completedWorksData, error: completedError } = await supabase
      .from('child_work_completion')
      .select(`
        work_id,
        status,
        current_level,
        max_level,
        level_completions,
        started_at,
        completed_at
      `)
      .eq('child_id', childId)
      .order('completed_at', { ascending: false });

    if (completedError) throw completedError;

    // Get work details separately
    const workIds = completedWorksData?.map(w => w.work_id).filter(Boolean) || [];
    let completedWorks: Record<string, unknown>[] = [];
    
    if (workIds.length > 0) {
      const { data: worksData, error: worksError } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area_id, category_id, levels')
        .in('id', workIds);

      if (worksError) throw worksError;

      // Combine the data
      completedWorks = (completedWorksData || []).map(completion => {
        const work = worksData?.find(w => w.id === completion.work_id);
        return {
          ...completion,
          curriculum_roadmap: work || null,
        };
      });
    }

    // Get current position
    const { data: positionData, error: posError } = await supabase
      .from('child_curriculum_position')
      .select('current_work_id')
      .eq('child_id', childId)
      .single();

    let position: Record<string, unknown> | null = null;
    if (positionData?.current_work_id) {
      const { data: currentWork } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area_id, category_id')
        .eq('id', positionData.current_work_id)
        .single();
      
      position = currentWork ? { curriculum_roadmap: currentWork } : null;
    }

    // Calculate overall stats
    const totalCompleted = completedWorks?.filter(w => w.status === 'completed').length || 0;
    const totalInProgress = completedWorks?.filter(w => w.status === 'in_progress').length || 0;

    return NextResponse.json({
      child,
      currentPosition: position?.curriculum_roadmap || null,
      areaProgress: areaProgress || [],
      completedWorks: completedWorks || [],
      stats: {
        totalCompleted,
        totalInProgress,
        totalWorks: 268,
        overallPercentage: Math.round((totalCompleted / 268) * 100),
      },
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// Update work progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;
  const body = await request.json();

  const { workId, action, level } = body;
  // action: 'start' | 'complete_level' | 'complete_work' | 'reset'

  try {
    if (action === 'start') {
      // Start a new work
      const { data: work } = await supabase
        .from('curriculum_roadmap')
        .select('levels')
        .eq('id', workId)
        .single();

      const maxLevel = work?.levels?.length || 1;

      const { error } = await supabase
        .from('child_work_completion')
        .upsert({
          child_id: childId,
          work_id: workId,
          status: 'in_progress',
          current_level: 1,
          max_level: maxLevel,
          level_completions: {},
          started_at: new Date().toISOString(),
        }, { onConflict: 'child_id,work_id' });

      if (error) throw error;

      // Update current position
      await supabase
        .from('child_curriculum_position')
        .upsert({
          child_id: childId,
          current_work_id: workId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id' });

    } else if (action === 'complete_level') {
      // Complete a specific level
      const { data: current } = await supabase
        .from('child_work_completion')
        .select('level_completions, max_level')
        .eq('child_id', childId)
        .eq('work_id', workId)
        .single();

      const levelCompletions = current?.level_completions || {};
      levelCompletions[level] = {
        completed_at: new Date().toISOString(),
      };

      const newCurrentLevel = Math.min(level + 1, current?.max_level || 1);
      const isWorkComplete = level >= (current?.max_level || 1);

      const { error } = await supabase
        .from('child_work_completion')
        .update({
          current_level: newCurrentLevel,
          level_completions: levelCompletions,
          status: isWorkComplete ? 'completed' : 'in_progress',
          completed_at: isWorkComplete ? new Date().toISOString() : null,
        })
        .eq('child_id', childId)
        .eq('work_id', workId);

      if (error) throw error;

    } else if (action === 'complete_work') {
      // Mark entire work as complete
      const { error } = await supabase
        .from('child_work_completion')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('child_id', childId)
        .eq('work_id', workId);

      if (error) throw error;

    } else if (action === 'reset') {
      // Reset work progress
      const { error } = await supabase
        .from('child_work_completion')
        .delete()
        .eq('child_id', childId)
        .eq('work_id', workId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

