// /api/montree-v2/students/[id]/route.ts
// Get single student with full progress details
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize at request time, not build time
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Curriculum areas with work counts (from JSON files)
const AREAS = [
  { id: 'practical_life', name: 'Practical Life', emoji: '🧼', color: '#22c55e', totalWorks: 18 },
  { id: 'sensorial', name: 'Sensorial', emoji: '👁️', color: '#f97316', totalWorks: 15 },
  { id: 'mathematics', name: 'Mathematics', emoji: '🔢', color: '#3b82f6', totalWorks: 22 },
  { id: 'language', name: 'Language', emoji: '📚', color: '#ec4899', totalWorks: 30 },
  { id: 'cultural', name: 'Cultural', emoji: '🌍', color: '#8b5cf6', totalWorks: 12 },
];

// Map work_id prefixes to areas
function getAreaFromWorkId(workId: string): string {
  if (!workId) return 'unknown';
  const lower = workId.toLowerCase();
  if (lower.startsWith('pl_') || lower.includes('practical')) return 'practical_life';
  if (lower.startsWith('se_') || lower.includes('sensorial')) return 'sensorial';
  if (lower.startsWith('ma_') || lower.includes('math')) return 'mathematics';
  if (lower.startsWith('la_') || lower.includes('language')) return 'language';
  if (lower.startsWith('cu_') || lower.includes('cultural')) return 'cultural';
  if (lower.match(/^(wbw|wfw|sound|letter|read)/)) return 'language';
  if (lower.match(/^(pink|brown|cylinder|color)/)) return 'sensorial';
  if (lower.match(/^(number|spindle|teen)/)) return 'mathematics';
  if (lower.match(/^(pour|spoon|button|zip)/)) return 'practical_life';
  return 'language';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id: studentId } = await params;

  try {
    // 1. Get student info
    const { data: student, error: studentErr } = await supabase
      .from('children')
      .select('id, name, date_of_birth, display_order')
      .eq('id', studentId)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Get all progress for this student
    const { data: progressData } = await supabase
      .from('child_work_completion')
      .select('*')
      .eq('child_id', studentId)
      .order('created_at', { ascending: false });

    // 3. Calculate progress by area
    const areaStats: Record<string, { completed: number; practicing: number }> = {};
    AREAS.forEach(a => { areaStats[a.id] = { completed: 0, practicing: 0 }; });

    (progressData || []).forEach(p => {
      const area = getAreaFromWorkId(p.work_id);
      if (areaStats[area]) {
        if (p.status === 'completed' || p.status === 'mastered') {
          areaStats[area].completed++;
        } else if (p.status === 'in_progress' || p.status === 'practicing') {
          areaStats[area].practicing++;
        }
      }
    });

    const areaProgress = AREAS.map(area => ({
      ...area,
      completed: areaStats[area.id].completed,
      practicing: areaStats[area.id].practicing,
      percentage: Math.round((areaStats[area.id].completed / area.totalWorks) * 100)
    }));

    // 4. Calculate overall
    const totalWorks = AREAS.reduce((sum, a) => sum + a.totalWorks, 0);
    const totalCompleted = Object.values(areaStats).reduce((sum, a) => sum + a.completed, 0);
    const totalPracticing = Object.values(areaStats).reduce((sum, a) => sum + a.practicing, 0);

    // 5. Get recent works (last 10)
    const recentWorks = (progressData || []).slice(0, 10).map(p => ({
      id: p.id,
      workId: p.work_id,
      name: p.work_id?.replace(/_/g, ' ').replace(/^(wbw|wfw|la|pl|se|ma|cu)\s*/i, '') || 'Unknown Work',
      status: p.status,
      date: p.created_at,
      hasPhoto: false,
      notes: p.notes
    }));

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        displayOrder: student.display_order
      },
      progress: {
        overall: {
          totalWorks,
          completed: totalCompleted,
          practicing: totalPracticing,
          percentage: Math.round((totalCompleted / totalWorks) * 100)
        },
        byArea: areaProgress
      },
      recentWorks,
      workCount: (progressData || []).length
    });

  } catch (error: any) {
    console.error('[Montree API] Student detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
