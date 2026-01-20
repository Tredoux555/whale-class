// app/api/montree/works/search/route.ts
// GET /api/montree/works/search - Search all curriculum works
// Uses STATIC curriculum data from lib/montree/curriculum-data.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';

// Area key mapping (handle variations)
const AREA_KEY_MAP: Record<string, string> = {
  'practical_life': 'practical_life',
  'practical': 'practical_life',
  'sensorial': 'sensorial',
  'math': 'mathematics',
  'mathematics': 'mathematics',
  'language': 'language',
  'cultural': 'cultural',
  'culture': 'cultural',
};

// Map database status to display status
function mapStatusFromDb(dbStatus: string | null, currentLevel: number | null): string {
  if (currentLevel !== null && currentLevel !== undefined) {
    switch (currentLevel) {
      case 0: return 'not_started';
      case 1: return 'presented';
      case 2: return 'practicing';
      case 3: return 'mastered';
    }
  }
  if (dbStatus === 'completed' || dbStatus === 'mastered') return 'mastered';
  if (dbStatus === 'in_progress' || dbStatus === 'practicing') return 'practicing';
  if (dbStatus === 'presented') return 'presented';
  return 'not_started';
}

export async function GET(request: NextRequest) {
  const debug: string[] = [];
  
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const query = searchParams.get('q')?.toLowerCase() || '';
    const areaKey = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '400');

    debug.push(`Params: childId=${childId}, area=${areaKey}, query=${query}`);

    // Get all works from STATIC curriculum data
    let allWorks = getAllWorks();
    debug.push(`Static curriculum: ${allWorks.length} total works`);

    // Filter by area if specified
    const normalizedArea = areaKey ? AREA_KEY_MAP[areaKey.toLowerCase()] : null;
    if (normalizedArea && normalizedArea !== 'all') {
      const areaData = CURRICULUM.find(a => a.id === normalizedArea);
      if (areaData) {
        allWorks = areaData.categories.flatMap(cat => cat.works);
        debug.push(`Filtered to area ${normalizedArea}: ${allWorks.length} works`);
      }
    }

    // Filter by search query (client-side search)
    if (query) {
      allWorks = allWorks.filter(work =>
        work.name.toLowerCase().includes(query) ||
        (work.chineseName && work.chineseName.includes(query)) ||
        (work.description && work.description.toLowerCase().includes(query))
      );
      debug.push(`After search filter: ${allWorks.length} works`);
    }

    // Find area info for each work
    const worksWithArea = allWorks.map((work, index) => {
      // Find which area this work belongs to
      let areaInfo = null;
      let categoryName = '';
      
      for (const area of CURRICULUM) {
        for (const category of area.categories) {
          if (category.works.some(w => w.id === work.id)) {
            areaInfo = {
              area_key: area.id,
              name: area.name,
              color: area.color,
              icon: area.icon,
            };
            categoryName = category.name;
            break;
          }
        }
        if (areaInfo) break;
      }

      return {
        id: work.id,
        work_key: work.id,
        name: work.name,
        name_chinese: work.chineseName,
        description: work.description,
        category_name: categoryName,
        sequence: index,
        area: areaInfo,
        status: 'not_started' as const,
      };
    });

    // Get progress for child if provided
    if (childId && worksWithArea.length > 0) {
      const supabase = await createServerClient();
      const workIds = worksWithArea.map(w => w.id);

      // Check child_work_completion table
      const { data: progressData } = await supabase
        .from('child_work_completion')
        .select('work_id, status, current_level')
        .eq('child_id', childId)
        .in('work_id', workIds);

      // Check weekly_assignments for progress
      const { data: assignmentData } = await supabase
        .from('weekly_assignments')
        .select('work_id, progress_status')
        .eq('child_id', childId)
        .in('work_id', workIds);

      // Build progress map
      const progressMap = new Map<string, any>();
      
      (progressData || []).forEach(p => {
        progressMap.set(p.work_id, {
          status: p.status,
          current_level: p.current_level
        });
      });
      
      // Weekly assignments override
      (assignmentData || []).forEach(a => {
        if (a.progress_status && a.progress_status !== 'not_started') {
          progressMap.set(a.work_id, {
            status: a.progress_status,
            current_level: null
          });
        }
      });

      debug.push(`Found progress for ${progressMap.size} works`);

      // Apply progress to works
      worksWithArea.forEach(work => {
        const progress = progressMap.get(work.id);
        if (progress) {
          work.status = mapStatusFromDb(progress.status, progress.current_level) as any;
        }
      });
    }

    // Apply limit
    const limitedWorks = worksWithArea.slice(0, limit);

    return NextResponse.json({
      works: limitedWorks,
      total: limitedWorks.length,
      debug,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debug.push(`Exception: ${errorMsg}`);
    console.error('Works search error:', error);
    return NextResponse.json({
      error: errorMsg,
      works: [],
      total: 0,
      debug,
    }, { status: 500 });
  }
}
