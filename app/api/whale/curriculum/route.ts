// app/api/whale/curriculum/route.ts
// Curriculum-related API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getChildProgress, getNextCurriculumWork } from '@/lib/curriculum/progression';

/**
 * GET /api/whale/curriculum/progress?childId={uuid}
 * Get child's curriculum progress
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'childId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('name')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Get progress
    const progress = await getChildProgress(childId);

    // Get current work details
    let currentWorkDetails = null;
    if (progress.current_work) {
      currentWorkDetails = {
        id: progress.current_work.id,
        sequence_order: progress.current_work.sequence_order,
        work_name: progress.current_work.work_name,
        area: progress.current_work.area,
        stage: progress.current_work.stage,
        description: progress.current_work.description,
      };
    }

    // Get recent completions
    const { data: recentCompletions } = await supabase
      .from('child_work_completion')
      .select(`
        completion_date,
        times_practiced,
        curriculum_work:curriculum_roadmap(work_name)
      `)
      .eq('child_id', childId)
      .order('completion_date', { ascending: false })
      .limit(5);

    // Format stage name
    const stageNames: Record<string, string> = {
      stage_0: 'Stage 0: Foundation',
      stage_1: 'Stage 1: Preliminary Exercises',
      stage_2: 'Stage 2: Sensorial Foundation',
      stage_3: 'Stage 3: Early Language & Counting',
      stage_4: 'Stage 4: Reading & Writing Preparation',
      stage_5: 'Stage 5: Mathematics Foundation',
      stage_6: 'Stage 6: Advanced Sensorial',
      stage_7: 'Stage 7: Phonetic Reading & Writing',
      stage_8: 'Stage 8: Decimal System & Operations',
      stage_9: 'Stage 9: Extended Language & Phonetics',
      stage_10: 'Stage 10: Advanced Mathematics',
      stage_11: 'Stage 11: Mastery & Depth',
    };

    return NextResponse.json({
      success: true,
      data: {
        child_name: child.name,
        current_stage: progress.current_stage,
        stage_name: stageNames[progress.current_stage] || progress.current_stage,
        works_completed: progress.works_completed,
        current_work: currentWorkDetails,
        stage_progress: {
          ...progress.stage_progress,
          remaining_works:
            progress.stage_progress.total_works - progress.stage_progress.completed_works,
        },
        recent_activities: recentCompletions?.map((c: any) => ({
          work_name: c.curriculum_work?.work_name || 'Unknown',
          completion_date: c.completion_date,
          times_practiced: c.times_practiced || 1,
        })) || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching curriculum progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch curriculum progress',
      },
      { status: 500 }
    );
  }
}

// Note: For roadmap endpoint, create separate file at:
// app/api/whale/curriculum/roadmap/route.ts

