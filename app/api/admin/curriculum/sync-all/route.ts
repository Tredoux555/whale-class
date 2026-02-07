import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { v4 as uuidv4 } from 'uuid';

// POST /api/admin/curriculum/sync-all
// Sync ALL children in the classroom - matches weekly assignments to curriculum
// auto-adds missing works, AND BACKFILLS mastered works based on sequence

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

// Status mapping from string to number
const statusToNumber: Record<string, number> = {
  'not_started': 0,
  'presented': 1,
  'practicing': 2,
  'mastered': 3
};

function normalizeArea(area: string): string {
  const areaMap: Record<string, string> = {
    'math': 'mathematics',
    'culture': 'cultural',
  };
  return areaMap[area] || area;
}

function findBestMatch(workName: string, curriculumWorks: any[]): any | null {
  const normalizedName = workName.toLowerCase().trim()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
  
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName === normalizedName) return work;
  }
  
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName.includes(normalizedName) || normalizedName.includes(currName)) return work;
  }
  
  const nameWords = normalizedName.split(' ').filter(w => w.length > 2);
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase();
    const matchCount = nameWords.filter(word => currName.includes(word)).length;
    if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1)) return work;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // Get classroom areas
  const { data: areas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('is_active', true);

  if (!areas || areas.length === 0) {
    return NextResponse.json({ error: 'No curriculum areas found' }, { status: 500 });
  }

  const areaKeyToId = new Map(areas.map(a => [a.area_key, a.id]));
  const areaIdToKey = new Map(areas.map(a => [a.id, a.area_key]));

  // Get all curriculum works WITH sequence for backfill
  let { data: curriculum } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, work_key, name, area_id, sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .order('area_id')
    .order('sequence');

  if (!curriculum) curriculum = [];

  // Build area -> works lookup for backfill
  const worksByAreaId = new Map<string, { id: string; sequence: number }[]>();
  const workIdToInfo = new Map<string, { area_id: string; sequence: number }>();
  
  for (const work of curriculum) {
    if (!worksByAreaId.has(work.area_id)) {
      worksByAreaId.set(work.area_id, []);
    }
    worksByAreaId.get(work.area_id)!.push({ id: work.id, sequence: work.sequence || 0 });
    workIdToInfo.set(work.id, { area_id: work.area_id, sequence: work.sequence || 0 });
  }

  // Get ALL unlinked weekly_assignments
  const { data: allAssignments } = await supabase
    .from('weekly_assignments')
    .select('id, child_id, work_id, work_name, area, progress_status')
    .is('work_id', null)
    .not('work_name', 'is', null);

  if (!allAssignments || allAssignments.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'No unlinked assignments found',
      results: { matched: 0, autoAdded: 0, childrenSynced: 0, backfilled: 0 }
    });
  }

  // Track what works we've added (to avoid duplicates)
  const addedWorks = new Map<string, string>(); // work_name -> work_id
  
  // Build sequence tracking per area
  const maxSequenceByArea = new Map<string, number>();
  for (const work of curriculum) {
    const areaKey = areaIdToKey.get(work.area_id) || '';
    const current = maxSequenceByArea.get(areaKey) || 0;
    maxSequenceByArea.set(areaKey, Math.max(current, work.sequence || 0));
  }

  const results = {
    matched: 0,
    autoAdded: 0,
    childrenSynced: new Set<string>(),
    backfilled: 0
  };

  // Collect all progress records to upsert (for efficiency)
  const progressToUpsert: { child_id: string; work_id: string; status: number }[] = [];

  // Process each assignment
  for (const assignment of allAssignments) {
    const normalizedAreaKey = normalizeArea(assignment.area || 'practical_life');
    const areaId = areaKeyToId.get(normalizedAreaKey);
    
    if (!areaId) {
      console.log(`[Sync-All] Unknown area: ${assignment.area}`);
      continue;
    }

    // Check if we already added this work in this sync run
    const workKey = `${assignment.work_name}|${normalizedAreaKey}`;
    let matchedWorkId = addedWorks.get(workKey);
    
    if (!matchedWorkId) {
      // Try to find in curriculum
      const areaWorks = curriculum.filter(c => c.area_id === areaId);
      const match = findBestMatch(assignment.work_name, areaWorks.length > 0 ? areaWorks : curriculum);
      
      if (match) {
        matchedWorkId = match.id;
        results.matched++;
      } else {
        // Auto-add to curriculum
        const newWorkId = uuidv4();
        const newWorkKey = `custom_${assignment.work_name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50)}_${Date.now()}`;
        
        const currentMaxSeq = maxSequenceByArea.get(normalizedAreaKey) || 0;
        const newSequence = currentMaxSeq + 1;
        maxSequenceByArea.set(normalizedAreaKey, newSequence);

        const { error } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert({
            id: newWorkId,
            classroom_id: WHALE_CLASSROOM_ID,
            area_id: areaId,
            work_key: newWorkKey,
            name: assignment.work_name,
            sequence: newSequence
          });

        if (!error) {
          matchedWorkId = newWorkId;
          results.autoAdded++;
          
          // Add to curriculum array and lookup maps
          curriculum.push({
            id: newWorkId,
            work_key: newWorkKey,
            name: assignment.work_name,
            area_id: areaId,
            sequence: newSequence
          });
          
          if (!worksByAreaId.has(areaId)) {
            worksByAreaId.set(areaId, []);
          }
          worksByAreaId.get(areaId)!.push({ id: newWorkId, sequence: newSequence });
          workIdToInfo.set(newWorkId, { area_id: areaId, sequence: newSequence });
          
          console.log(`[Sync-All] Auto-added: "${assignment.work_name}" to ${normalizedAreaKey}`);
        }
      }
      
      if (matchedWorkId) {
        addedWorks.set(workKey, matchedWorkId);
      }
    }

    if (matchedWorkId) {
      // Link the assignment
      await supabase
        .from('weekly_assignments')
        .update({ work_id: matchedWorkId })
        .eq('id', assignment.id);

      // Add current work as practicing
      const actualStatus = statusToNumber[assignment.progress_status] || 2;
      progressToUpsert.push({
        child_id: assignment.child_id,
        work_id: matchedWorkId,
        status: actualStatus
      });

      // BACKFILL: Mark all PREVIOUS works in same area as MASTERED
      const workInfo = workIdToInfo.get(matchedWorkId);
      if (workInfo) {
        const areaWorks = worksByAreaId.get(workInfo.area_id) || [];
        for (const prevWork of areaWorks) {
          if (prevWork.sequence < workInfo.sequence) {
            progressToUpsert.push({
              child_id: assignment.child_id,
              work_id: prevWork.id,
              status: 3 // mastered
            });
          }
        }
      }

      results.childrenSynced.add(assignment.child_id);
    }
  }

  // Now upsert all progress records efficiently
  // First get existing progress to avoid demotions
  if (progressToUpsert.length > 0) {
    const childIds = [...new Set(progressToUpsert.map(p => p.child_id))];
    const workIds = [...new Set(progressToUpsert.map(p => p.work_id))];
    
    const { data: existingProgress } = await supabase
      .from('child_work_progress')
      .select('child_id, work_id, status')
      .in('child_id', childIds)
      .in('work_id', workIds);
    
    // Build lookup map
    const existingMap = new Map<string, number>();
    if (existingProgress) {
      for (const p of existingProgress) {
        existingMap.set(`${p.child_id}|${p.work_id}`, p.status);
      }
    }
    
    // Filter to only upgrades, then batch upsert
    const upgrades = progressToUpsert.filter(p => {
      const key = `${p.child_id}|${p.work_id}`;
      const existing = existingMap.get(key) ?? -1;
      return p.status > existing; // Only upgrade, never demote
    });
    
    // Deduplicate (keep highest status per child+work)
    const deduped = new Map<string, { child_id: string; work_id: string; status: number }>();
    for (const p of upgrades) {
      const key = `${p.child_id}|${p.work_id}`;
      const existing = deduped.get(key);
      if (!existing || p.status > existing.status) {
        deduped.set(key, p);
      }
    }
    
    const toInsert = [...deduped.values()].map(p => ({
      child_id: p.child_id,
      work_id: p.work_id,
      status: p.status,
      updated_at: new Date().toISOString()
    }));
    
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('child_work_progress')
        .upsert(toInsert, { onConflict: 'child_id,work_id' });
      
      if (!error) {
        results.backfilled = toInsert.length;
        console.log(`[Sync-All] Backfilled ${toInsert.length} progress records`);
      } else {
        console.error('[Sync-All] Backfill error:', error);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${results.childrenSynced.size} children. Matched ${results.matched} works, auto-added ${results.autoAdded}, backfilled ${results.backfilled} progress records.`,
    results: {
      matched: results.matched,
      autoAdded: results.autoAdded,
      childrenSynced: results.childrenSynced.size,
      backfilled: results.backfilled,
      totalAssignments: allAssignments.length
    }
  });
}
