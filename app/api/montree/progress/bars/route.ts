// /api/montree/progress/bars/route.ts
// Calculate progress based on current work position
// If student is at Work #15, works #1-14 are considered completed
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const AREA_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: '#f97316' },
  mathematics: { name: 'Math', icon: '🔢', color: '#3b82f6' },
  math: { name: 'Math', icon: '🔢', color: '#3b82f6' },
  language: { name: 'Language', icon: '📖', color: '#ec4899' },
  cultural: { name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
  culture: { name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Normalize area key
function normalizeArea(area: string): string {
  const a = (area || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (a === 'math') return 'mathematics';
  if (a === 'culture') return 'cultural';
  return a;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get the child to find their classroom
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      console.error('Child not found:', childError);
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get curriculum areas for this classroom
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', child.classroom_id);

    // Build area_id -> area_key lookup
    const areaIdToKey: Record<string, string> = {};
    for (const area of areas || []) {
      areaIdToKey[area.id] = area.area_key;
    }

    // Get classroom curriculum works
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, sequence, area_id')
      .eq('classroom_id', child.classroom_id)
      .order('sequence', { ascending: true });

    // Build work lookup by name -> sequence per area
    const worksByArea: Record<string, { name: string; sequence: number }[]> = {};
    for (const work of curriculumWorks || []) {
      const areaKey = normalizeArea(areaIdToKey[work.area_id] || '');
      if (!areaKey) continue;
      if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
      worksByArea[areaKey].push({
        name: work.name,
        sequence: work.sequence,
      });
    }

    // Sort each area's works by sequence
    for (const areaKey of Object.keys(worksByArea)) {
      worksByArea[areaKey].sort((a, b) => a.sequence - b.sequence);
    }

    // Get ALL progress records for this child
    const { data: progressRecords } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status')
      .eq('child_id', childId);

    // Find highest sequence work per area (any status except not_started means they've reached it)
    const highestSequenceByArea: Record<string, { sequence: number; workName: string; status: string }> = {};

    for (const record of progressRecords || []) {
      const areaKey = normalizeArea(record.area);
      const areaWorks = worksByArea[areaKey] || [];

      // Find this work's sequence
      const workInfo = areaWorks.find(w =>
        w.name.toLowerCase() === record.work_name?.toLowerCase()
      );

      if (workInfo) {
        const currentHighest = highestSequenceByArea[areaKey];
        if (!currentHighest || workInfo.sequence > currentHighest.sequence) {
          highestSequenceByArea[areaKey] = {
            sequence: workInfo.sequence,
            workName: record.work_name,
            status: record.status,
          };
        }
      }
    }

    // Build response - progress = all works BEFORE current position
    const areasResponse = AREA_ORDER.map(areaKey => {
      const config = AREA_CONFIG[areaKey];
      const areaWorks = worksByArea[areaKey] || [];
      const totalWorks = areaWorks.length;
      const highest = highestSequenceByArea[areaKey];

      let completedCount = 0;
      let currentWorkName = null;

      if (highest) {
        // Count all works with sequence < highest as completed
        // The current work itself counts as "in progress" not completed
        completedCount = areaWorks.filter(w => w.sequence < highest.sequence).length;

        // If the highest work is mastered, it also counts as completed
        // Handle both 'mastered' and 'completed' (legacy status value)
        if (highest.status === 'mastered' || highest.status === 'completed') {
          completedCount++;
        }

        currentWorkName = highest.workName;
      }

      const percentComplete = totalWorks > 0
        ? Math.round((completedCount / totalWorks) * 100)
        : 0;

      return {
        area: areaKey,
        areaName: config.name,
        icon: config.icon,
        color: config.color,
        totalWorks,
        currentPosition: completedCount,
        currentWorkName,
        percentComplete,
      };
    });

    return NextResponse.json({ areas: areasResponse });

  } catch (error) {
    console.error('Progress bars API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
