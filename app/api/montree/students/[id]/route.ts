// /api/montree/students/[id]/route.ts
// Get single student with full progress details
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Curriculum areas with work counts
const AREAS = [
  { id: 'practical_life', name: 'Practical Life', emoji: '🧼', color: '#22c55e', totalWorks: 18 },
  { id: 'sensorial', name: 'Sensorial', emoji: '👁️', color: '#f97316', totalWorks: 15 },
  { id: 'mathematics', name: 'Mathematics', emoji: '🔢', color: '#3b82f6', totalWorks: 22 },
  { id: 'language', name: 'Language', emoji: '📚', color: '#ec4899', totalWorks: 30 },
  { id: 'cultural', name: 'Cultural', emoji: '🌍', color: '#8b5cf6', totalWorks: 12 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id: studentId } = await params;

  try {
    // 1. Get student info
    const { data: student, error: studentError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, display_order')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Get all progress for this student
    const { data: progressData, error: progressError } = await supabase
      .from('child_work_completion')
      .select('*')
      .eq('child_id', studentId)
      .order('updated_at', { ascending: false });

    if (progressError) {
      console.error('Progress query error:', progressError);
    }

    // 3. Calculate progress by area
    // For now, we'll distribute progress across areas based on work_id patterns
    // TODO: Properly categorize works by area using curriculum data
    const areaProgress = AREAS.map(area => {
      // Filter progress for this area (simplified - assumes work_id contains area hint)
      const areaWorks = (progressData || []).filter(p => {
        // This is a placeholder - proper implementation would match work_id to curriculum
        return true; // For now, distribute evenly
      });
      
      const completed = Math.floor((progressData || []).filter(p => p.status === 'completed').length / AREAS.length);
      const inProgress = Math.floor((progressData || []).filter(p => p.status === 'in_progress').length / AREAS.length);
      
      return {
        ...area,
        completed,
        inProgress,
        percentage: Math.round((completed / area.totalWorks) * 100)
      };
    });

    // 4. Get recent works (last 10)
    const recentWorks = (progressData || []).slice(0, 10).map(p => ({
      id: p.id,
      workId: p.work_id || p.curriculum_work_id,
      name: p.work_id || 'Unknown Work', // TODO: Map to curriculum name
      status: p.status,
      date: p.updated_at,
      hasPhoto: false, // TODO: Check for photos
      notes: p.notes
    }));

    // 5. Calculate overall progress
    const totalWorks = AREAS.reduce((sum, a) => sum + a.totalWorks, 0);
    const totalCompleted = (progressData || []).filter(p => p.status === 'completed').length;
    const overallPercentage = Math.round((totalCompleted / totalWorks) * 100);

    return NextResponse.json({
      student,
      progress: {
        overall: {
          totalWorks,
          completed: totalCompleted,
          inProgress: (progressData || []).filter(p => p.status === 'in_progress').length,
          percentage: overallPercentage
        },
        byArea: areaProgress
      },
      recentWorks,
      workCount: (progressData || []).length
    });

  } catch (error: any) {
    console.error('Montree student API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
