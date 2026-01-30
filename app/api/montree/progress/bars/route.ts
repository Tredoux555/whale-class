// /api/montree/progress/bars/route.ts
// Calculate progress based on completed/mastered works
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

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

    // Get ALL progress records for this child
    const { data: progressRecords } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status')
      .eq('child_id', childId);

    // Count completed works per area from actual progress
    const completedByArea: Record<string, number> = {};
    const currentWorkByArea: Record<string, string> = {};
    
    for (const record of progressRecords || []) {
      const areaKey = normalizeArea(record.area);
      if (!completedByArea[areaKey]) completedByArea[areaKey] = 0;

      // Count mastered works as completed progress
      // Status values are: not_started, presented, practicing, mastered
      if (record.status === 'mastered') {
        completedByArea[areaKey]++;
      }

      // Track current work (most recently touched in this area)
      if (record.status === 'practicing' || record.status === 'presented') {
        currentWorkByArea[areaKey] = record.work_name;
      }
    }

    // Get total works per area from curriculum
    const totalByArea: Record<string, number> = {};
    for (const areaData of CURRICULUM) {
      let count = 0;
      for (const category of areaData.categories) {
        count += category.works.length;
      }
      totalByArea[areaData.id] = count;
    }

    // Build response
    const areas = AREA_ORDER.map(areaKey => {
      const config = AREA_CONFIG[areaKey];
      const totalWorks = totalByArea[areaKey] || 0;
      const completedCount = completedByArea[areaKey] || 0;
      const currentWorkName = currentWorkByArea[areaKey] || null;

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

    return NextResponse.json({ areas });

  } catch (error) {
    console.error('Progress bars API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
