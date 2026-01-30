// /api/curriculum-import/onboarding/route.ts
// Classroom onboarding API - curriculum first, then students, then works
// Session: Curriculum Import System

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// GET: Get classroom onboarding status
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get classroom with onboarding state
    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .select('id, name, onboarding_phase, curriculum_locked, onboarding_completed_at')
      .eq('id', classroomId)
      .single();

    if (error || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get counts for each phase
    const [customCurriculum, children, workImports] = await Promise.all([
      supabase
        .from('montree_custom_curriculum')
        .select('id', { count: 'exact' })
        .eq('classroom_id', classroomId),
      supabase
        .from('montree_children')
        .select('id', { count: 'exact' })
        .eq('classroom_id', classroomId),
      supabase
        .from('montree_work_imports')
        .select('id, match_status', { count: 'exact' })
        .eq('classroom_id', classroomId)
    ]);

    // Calculate work import summary
    const workSummary = {
      total: workImports.count || 0,
      matched: workImports.data?.filter(w =>
        ['auto', 'confirmed', 'manual'].includes(w.match_status)
      ).length || 0,
      needsReview: workImports.data?.filter(w =>
        ['unmatched', 'suggested'].includes(w.match_status)
      ).length || 0
    };

    return NextResponse.json({
      success: true,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        onboardingPhase: classroom.onboarding_phase || 'curriculum',
        curriculumLocked: classroom.curriculum_locked || false,
        completedAt: classroom.onboarding_completed_at
      },
      counts: {
        curriculumItems: customCurriculum.count || 0,
        students: children.count || 0,
        works: workSummary
      },
      // Phase requirements
      canProceedToStudents: (customCurriculum.count || 0) > 0 && classroom.curriculum_locked,
      canProceedToWorks: (children.count || 0) > 0,
      canComplete: workSummary.needsReview === 0 && workSummary.total > 0
    });

  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Update onboarding phase
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { classroomId, action } = body;

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Get current state
    const { data: classroom, error: fetchError } = await supabase
      .from('montree_classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    if (fetchError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const currentPhase = classroom.onboarding_phase || 'curriculum';

    switch (action) {
      case 'lock_curriculum': {
        // Lock curriculum and move to students phase
        const { data: curriculumCount } = await supabase
          .from('montree_custom_curriculum')
          .select('id', { count: 'exact' })
          .eq('classroom_id', classroomId);

        if (!curriculumCount || (curriculumCount as any).count === 0) {
          return NextResponse.json(
            { error: 'Cannot lock curriculum - no items added' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('montree_classrooms')
          .update({
            curriculum_locked: true,
            onboarding_phase: 'students'
          })
          .eq('id', classroomId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: 'Curriculum locked. Proceed to import students.',
          newPhase: 'students'
        });
      }

      case 'proceed_to_works': {
        if (currentPhase !== 'students') {
          return NextResponse.json(
            { error: 'Must be in students phase to proceed to works' },
            { status: 400 }
          );
        }

        // Check if students exist
        const { count: studentCount } = await supabase
          .from('montree_children')
          .select('id', { count: 'exact' })
          .eq('classroom_id', classroomId);

        if (!studentCount || studentCount === 0) {
          return NextResponse.json(
            { error: 'Cannot proceed - no students added' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('montree_classrooms')
          .update({ onboarding_phase: 'works' })
          .eq('id', classroomId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: 'Proceed to import student works.',
          newPhase: 'works'
        });
      }

      case 'complete_onboarding': {
        if (currentPhase !== 'works') {
          return NextResponse.json(
            { error: 'Must be in works phase to complete' },
            { status: 400 }
          );
        }

        // Check for unresolved works
        const { data: unresolvedWorks } = await supabase
          .from('montree_work_imports')
          .select('id')
          .eq('classroom_id', classroomId)
          .in('match_status', ['unmatched', 'suggested']);

        if (unresolvedWorks && unresolvedWorks.length > 0) {
          return NextResponse.json({
            success: false,
            warning: `${unresolvedWorks.length} works still need review`,
            unresolvedCount: unresolvedWorks.length
          });
        }

        const { error: updateError } = await supabase
          .from('montree_classrooms')
          .update({
            onboarding_phase: 'complete',
            onboarding_completed_at: new Date().toISOString()
          })
          .eq('id', classroomId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: 'Onboarding complete! Classroom is ready.',
          newPhase: 'complete',
          completed: true
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding' },
      { status: 500 }
    );
  }
}
