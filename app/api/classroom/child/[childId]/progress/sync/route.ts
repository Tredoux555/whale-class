import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// CLASSROOM CURRICULUM SYNC API
// - Matches weekly assignments to classroom curriculum
// - AUTO-ADDS missing works to classroom curriculum
// - Backfills progress for preceding works

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Status mapping from string to number
const statusToNumber: Record<string, number> = {
  'not_started': 0,
  'presented': 1,
  'practicing': 2,
  'mastered': 3
};

// Normalize area names
function normalizeArea(area: string): string {
  const areaMap: Record<string, string> = {
    'math': 'mathematics',
    'culture': 'cultural',
  };
  return areaMap[area] || area;
}

// Fuzzy matching helper
function findBestMatch(workName: string, curriculumWorks: any[]): any | null {
  const normalizedName = workName.toLowerCase().trim()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
  
  // Exact match
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName === normalizedName) {
      return work;
    }
  }
  
  // Contains match
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName.includes(normalizedName) || normalizedName.includes(currName)) {
      return work;
    }
  }
  
  // Word-based matching (at least 2 words match)
  const nameWords = normalizedName.split(' ').filter(w => w.length > 2);
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase();
    const matchCount = nameWords.filter(word => currName.includes(word)).length;
    if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1)) {
      return work;
    }
  }
  
  return null;
}

// POST /api/classroom/child/[childId]/progress/sync
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  // Get classroom areas
  const { data: areas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key, name')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('is_active', true);

  if (!areas || areas.length === 0) {
    return NextResponse.json({ error: 'No curriculum areas found for classroom' }, { status: 500 });
  }

  const areaKeyToId = new Map(areas.map(a => [a.area_key, a.id]));
  const areaIdToKey = new Map(areas.map(a => [a.id, a.area_key]));

  // Get all classroom curriculum works
  const { data: curriculum } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, work_key, name, area_id, sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID);

  if (!curriculum) {
    return NextResponse.json({ error: 'Failed to load classroom curriculum' }, { status: 500 });
  }

  // Get weekly assignments for this child
  const { data: assignments } = await supabase
    .from('weekly_assignments')
    .select('id, work_id, work_name, area, progress_status')
    .eq('child_id', childId);

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ message: 'No weekly assignments found', synced: 0 });
  }

  // Build area-based curriculum maps for backfilling
  const worksByArea = new Map<string, { id: string; sequence: number }[]>();
  for (const work of curriculum) {
    const areaKey = areaIdToKey.get(work.area_id) || '';
    if (!worksByArea.has(areaKey)) {
      worksByArea.set(areaKey, []);
    }
    worksByArea.get(areaKey)!.push({ 
      id: work.id, 
      sequence: work.sequence || 0 
    });
  }
  
  // Sort by sequence
  for (const [, works] of worksByArea) {
    works.sort((a, b) => a.sequence - b.sequence);
  }

  // Results tracking
  const results = {
    matched: 0,
    alreadyLinked: 0,
    autoAdded: 0,
    notFound: [] as string[],
    backfilled: 0
  };

  // Process each assignment
  for (const assignment of assignments) {
    // Skip if already linked
    if (assignment.work_id) {
      results.alreadyLinked++;
      continue;
    }

    if (!assignment.work_name) continue;

    const normalizedAreaKey = normalizeArea(assignment.area || 'practical_life');
    
    // Filter curriculum by area
    const areaId = areaKeyToId.get(normalizedAreaKey);
    let searchPool = curriculum;
    if (areaId) {
      searchPool = curriculum.filter(c => c.area_id === areaId);
    }

    // Find best match
    let match = findBestMatch(assignment.work_name, searchPool.length > 0 ? searchPool : curriculum);

    // If no match found, AUTO-ADD the work to classroom curriculum
    if (!match && areaId) {
      const newWorkId = uuidv4();
      const newWorkKey = `custom_${assignment.work_name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50)}`;
      
      // Get max sequence order for this area
      const areaWorks = worksByArea.get(normalizedAreaKey) || [];
      const maxSequence = areaWorks.length > 0 
        ? Math.max(...areaWorks.map(w => w.sequence)) 
        : 0;

      const { error: insertError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert({
          id: newWorkId,
          classroom_id: WHALE_CLASSROOM_ID,
          area_id: areaId,
          work_key: newWorkKey,
          name: assignment.work_name,
          sequence: maxSequence + 1
        });

      if (!insertError) {
        match = { 
          id: newWorkId, 
          work_key: newWorkKey,
          area_id: areaId,
          sequence: maxSequence + 1 
        };
        results.autoAdded++;
        
        // Add to worksByArea for backfilling
        if (!worksByArea.has(normalizedAreaKey)) {
          worksByArea.set(normalizedAreaKey, []);
        }
        worksByArea.get(normalizedAreaKey)!.push({ 
          id: newWorkId, 
          sequence: maxSequence + 1 
        });
        
        console.log(`[Sync] Auto-added: "${assignment.work_name}" to ${normalizedAreaKey}`);
      } else {
        console.error(`[Sync] Failed to auto-add: "${assignment.work_name}"`, insertError);
        results.notFound.push(assignment.work_name);
        continue;
      }
    }

    if (match) {
      // Update weekly_assignment with matched work_id
      await supabase
        .from('weekly_assignments')
        .update({ work_id: match.id })
        .eq('id', assignment.id);

      // Create/update child_work_progress for current work (use actual status from assignment)
      const actualStatus = statusToNumber[assignment.progress_status] || 2; // default to practicing
      await supabase
        .from('child_work_progress')
        .upsert({
          child_id: childId,
          work_id: match.id,
          status: actualStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'child_id,work_id' });

      // BACKFILL: Mark all works BEFORE this one in the same area as mastered
      const areaKey = areaIdToKey.get(match.area_id) || normalizedAreaKey;
      const areaWorks = worksByArea.get(areaKey) || [];
      
      for (const prevWork of areaWorks) {
        if (prevWork.sequence < (match.sequence || 0)) {
          const { error } = await supabase
            .from('child_work_progress')
            .upsert({
              child_id: childId,
              work_id: prevWork.id,
              status: 3, // mastered
              updated_at: new Date().toISOString()
            }, { onConflict: 'child_id,work_id' });
          
          if (!error) results.backfilled++;
        }
      }

      results.matched++;
      console.log(`[Sync] Matched: "${assignment.work_name}" → ${match.id}`);
    } else {
      results.notFound.push(assignment.work_name);
      console.log(`[Sync] No match and no area for: "${assignment.work_name}"`);
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Synced ${results.matched} works, auto-added ${results.autoAdded}, backfilled ${results.backfilled} mastered works`
  });
}
