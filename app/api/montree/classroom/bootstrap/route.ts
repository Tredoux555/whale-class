// app/api/montree/classroom/bootstrap/route.ts
// CONFIRMED IMPORT - Receives validated children from preview step
// BACKFILLS progression: If child is practicing work X, all works before X are marked mastered

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(request: NextRequest) {
  try {
    const { classroom_id, children } = await request.json();
    
    if (!classroom_id || !isValidUUID(classroom_id)) {
      return NextResponse.json({ error: 'Valid classroom_id required' }, { status: 400 });
    }
    
    if (!children || !Array.isArray(children) || children.length === 0) {
      return NextResponse.json({ error: 'Children array required' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Verify classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id')
      .eq('id', classroom_id)
      .single();
    
    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    
    // Get classroom curriculum (required for assignments)
    let { data: classroomWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, work_key, sequence, area_id')
      .eq('classroom_id', classroom_id)
      .order('sequence');
    
    // Auto-seed curriculum if empty
    if (!classroomWorks || classroomWorks.length === 0) {
      console.log('Auto-seeding curriculum for classroom:', classroom_id);
      
      const areaInserts = CURRICULUM.map((area, index) => ({
        classroom_id,
        area_key: area.id,
        name: area.name,
        icon: area.icon,
        color: area.color,
        sequence: index,
        is_active: true,
      }));

      const { data: insertedAreas, error: areaError } = await supabase
        .from('montree_classroom_curriculum_areas')
        .insert(areaInserts)
        .select();

      if (areaError) {
        return NextResponse.json({ 
          error: `Failed to seed curriculum areas: ${areaError.message}` 
        }, { status: 500 });
      }

      const areaIdMap: Record<string, string> = {};
      insertedAreas?.forEach(area => {
        areaIdMap[area.area_key] = area.id;
      });

      const workInserts: any[] = [];
      let seq = 0;
      
      for (const area of CURRICULUM) {
        const areaId = areaIdMap[area.id];
        for (const category of area.categories) {
          for (const work of category.works) {
            workInserts.push({
              area_id: areaId,
              classroom_id,
              work_key: work.id,
              name: work.name,
              name_chinese: work.chineseName,
              description: work.description,
              age_range: work.ageRange,
              materials: work.materials || [],
              direct_aims: work.directAims || [],
              indirect_aims: work.indirectAims || [],
              control_of_error: work.controlOfError,
              prerequisites: work.prerequisites || [],
              video_search_terms: work.videoSearchTerms || [],
              category_key: category.id,
              category_name: category.name,
              sequence: seq++,
              is_active: true,
            });
          }
        }
      }

      for (let i = 0; i < workInserts.length; i += 100) {
        const batch = workInserts.slice(i, i + 100);
        await supabase.from('montree_classroom_curriculum_works').insert(batch);
      }
      
      // Re-fetch
      const { data: refetched } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, work_key, sequence, area_id')
        .eq('classroom_id', classroom_id)
        .order('sequence');
      classroomWorks = refetched;
    }
    
    // Create lookup maps
    const workKeyToId = new Map<string, string>();
    const workKeyToSequence = new Map<string, number>();
    const workKeyToAreaId = new Map<string, string>();
    const areaIdToWorkKeys = new Map<string, string[]>();
    
    (classroomWorks || []).forEach(w => {
      workKeyToId.set(w.work_key, w.id);
      workKeyToSequence.set(w.work_key, w.sequence);
      workKeyToAreaId.set(w.work_key, w.area_id);
      
      if (!areaIdToWorkKeys.has(w.area_id)) {
        areaIdToWorkKeys.set(w.area_id, []);
      }
      areaIdToWorkKeys.get(w.area_id)!.push(w.work_key);
    });
    
    // Results
    const result = {
      children_created: 0,
      assignments_created: 0,
      mastered_backfilled: 0,
      children: [] as { id: string; name: string; current_works: number; mastered_works: number }[],
      errors: [] as string[],
    };
    
    const now = new Date().toISOString();
    
    // Create children and their assignments WITH BACKFILL
    for (const child of children) {
      if (!child.name?.trim()) {
        result.errors.push('Skipped child with empty name');
        continue;
      }
      
      // Create child
      const { data: newChild, error: childError } = await supabase
        .from('montree_children')
        .insert({
          classroom_id,
          name: child.name.trim(),
          age: child.age || null,
          settings: { name_chinese: child.name_chinese?.trim() || null },
          created_at: now,
        })
        .select('id, name')
        .single();
      
      if (childError) {
        result.errors.push(`Failed to create "${child.name}": ${childError.message}`);
        continue;
      }
      
      let currentWorksCount = 0;
      let masteredWorksCount = 0;
      
      // Process works from validated preview
      const assignmentsToCreate: any[] = [];
      
      for (const work of (child.works || [])) {
        // Skip unmatched/missing works (teacher chose to skip)
        if (!work.work_id) continue;
        
        const workKey = work.work_id;
        const workId = workKeyToId.get(workKey);
        
        if (!workId) {
          result.errors.push(`Work "${workKey}" not found in curriculum for "${child.name}"`);
          continue;
        }
        
        const areaId = workKeyToAreaId.get(workKey)!;
        const currentSequence = workKeyToSequence.get(workKey)!;
        
        // Get all works in this area
        const areaWorks = areaIdToWorkKeys.get(areaId) || [];
        
        // Backfill: Mark all works BEFORE current as mastered
        for (const prevWorkKey of areaWorks) {
          const prevSequence = workKeyToSequence.get(prevWorkKey)!;
          const prevWorkId = workKeyToId.get(prevWorkKey)!;
          
          if (prevSequence < currentSequence) {
            assignmentsToCreate.push({
              child_id: newChild.id,
              work_id: prevWorkId,
              status: 'mastered',
              current_level: 3,
              assigned_at: now,
              presented_at: now,
              mastered_at: now,
              notes: 'Backfilled - mastered before current work',
            });
            masteredWorksCount++;
          }
        }
        
        // Add current work as practicing
        assignmentsToCreate.push({
          child_id: newChild.id,
          work_id: workId,
          status: 'practicing',
          current_level: 1,
          assigned_at: now,
          presented_at: now,
          mastered_at: null,
          notes: 'Current work - imported via bootstrap',
        });
        currentWorksCount++;
      }
      
      // Batch insert assignments
      if (assignmentsToCreate.length > 0) {
        for (let i = 0; i < assignmentsToCreate.length; i += 50) {
          const batch = assignmentsToCreate.slice(i, i + 50);
          const { error: batchError } = await supabase
            .from('montree_child_assignments')
            .insert(batch);
          
          if (batchError) {
            result.errors.push(`Batch insert error for "${child.name}": ${batchError.message}`);
          }
        }
        result.assignments_created += assignmentsToCreate.length;
        result.mastered_backfilled += masteredWorksCount;
      }
      
      result.children_created++;
      result.children.push({ 
        id: newChild.id, 
        name: newChild.name,
        current_works: currentWorksCount,
        mastered_works: masteredWorksCount,
      });
    }
    
    return NextResponse.json({
      success: true,
      classroom: { id: classroom.id, name: classroom.name },
      ...result,
    });
    
  } catch (error) {
    console.error('Bootstrap error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bootstrap' },
      { status: 500 }
    );
  }
}
