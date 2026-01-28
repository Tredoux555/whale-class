// /api/montree/progress/bars/route.ts
// Calculate progress: If child is on work #15, works 1-14 are mastered

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
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child's classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (!child?.classroom_id) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get child's CURRENT assigned works (what they're working on now)
    const { data: assignments } = await supabase
      .from('weekly_assignments')
      .select('work_name, area')
      .eq('child_id', childId);

    // Get ALL works for this classroom with their sequence
    const { data: allWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id, name, sequence,
        area:montree_classroom_curriculum_areas!area_id (
          area_key
        )
      `)
      .eq('classroom_id', child.classroom_id)
      .eq('is_active', true)
      .order('sequence');

    // Build lookup: area -> sorted works with their index position
    const areaWorks: Record<string, Array<{ name: string; sequence: number; index: number }>> = {};
    
    for (const work of allWorks || []) {
      const areaKey = work.area?.area_key;
      if (!areaKey) continue;
      
      if (!areaWorks[areaKey]) {
        areaWorks[areaKey] = [];
      }
      areaWorks[areaKey].push({
        name: work.name,
        sequence: work.sequence || 0,
        index: 0, // Will set after sorting
      });
    }

    // Sort each area's works by sequence and assign index
    for (const areaKey of Object.keys(areaWorks)) {
      areaWorks[areaKey].sort((a, b) => a.sequence - b.sequence);
      areaWorks[areaKey].forEach((w, i) => { w.index = i; });
    }

    // Build lookup: normalized work name -> index in its area
    const workPositionByArea: Record<string, Record<string, number>> = {};
    for (const areaKey of Object.keys(areaWorks)) {
      workPositionByArea[areaKey] = {};
      for (const work of areaWorks[areaKey]) {
        workPositionByArea[areaKey][work.name.toLowerCase().trim()] = work.index;
      }
    }

    // Find the FURTHEST work position for each area based on assignments
    const furthestPosition: Record<string, { position: number; workName: string }> = {};
    
    for (const assignment of assignments || []) {
      // Normalize area key
      let areaKey = (assignment.area || '').toLowerCase().replace(/\s+/g, '_');
      if (areaKey === 'math') areaKey = 'mathematics';
      
      const workName = (assignment.work_name || '').toLowerCase().trim();
      
      if (workPositionByArea[areaKey] && workPositionByArea[areaKey][workName] !== undefined) {
        const position = workPositionByArea[areaKey][workName];
        
        if (!furthestPosition[areaKey] || position > furthestPosition[areaKey].position) {
          furthestPosition[areaKey] = {
            position,
            workName: assignment.work_name,
          };
        }
      }
    }

    // Calculate progress for each area
    const areas = AREA_ORDER.map(areaKey => {
      const config = AREA_CONFIG[areaKey];
      const works = areaWorks[areaKey] || [];
      const totalWorks = works.length;
      
      // Position = furthest work index + 1 (all works before are considered mastered)
      const positionData = furthestPosition[areaKey];
      const currentPosition = positionData ? positionData.position + 1 : 0;
      const currentWorkName = positionData?.workName || null;

      const percentComplete = totalWorks > 0 
        ? Math.round((currentPosition / totalWorks) * 100) 
        : 0;

      return {
        area: areaKey,
        areaName: config.name,
        icon: config.icon,
        color: config.color,
        totalWorks,
        currentPosition,
        currentWorkName,
        percentComplete,
      };
    });

    return NextResponse.json({ areas });

  } catch (error) {
    console.error('Progress bars API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
