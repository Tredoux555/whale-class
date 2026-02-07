// lib/montree/seed/seed-classroom.ts
// Seeds a classroom's curriculum from the school's curriculum
// School → Classroom (teacher can then customize)

import { getSupabase } from '@/lib/supabase-client';

// Main seeding function - copies from school curriculum to classroom
export async function seedClassroomCurriculum(
  classroomId: string,
  schoolId: string
): Promise<{
  success: boolean;
  areasCreated: number;
  worksCreated: number;
  error?: string;
}> {
  const supabase = getSupabase();
  
  let areasCreated = 0;
  let worksCreated = 0;
  
  try {
    // Get all areas from school curriculum
    const { data: schoolAreas, error: areasError } = await supabase
      .from('montree_school_curriculum_areas')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('sequence');
    
    if (areasError) {
      throw new Error(`Failed to fetch school areas: ${areasError.message}`);
    }
    
    if (!schoolAreas || schoolAreas.length === 0) {
      throw new Error('School curriculum not seeded yet');
    }

    // Map to track school area ID → classroom area ID
    const areaIdMap = new Map<string, string>();
    
    // Copy each area to classroom
    for (const schoolArea of schoolAreas) {
      const { data: classroomArea, error: areaError } = await supabase
        .from('montree_classroom_curriculum_areas')
        .upsert({
          classroom_id: classroomId,
          area_key: schoolArea.area_key,
          name: schoolArea.name,
          name_chinese: schoolArea.name_chinese,
          icon: schoolArea.icon,
          color: schoolArea.color,
          description: schoolArea.description,
          sequence: schoolArea.sequence,
          is_active: true,
        }, {
          onConflict: 'classroom_id,area_key',
        })
        .select('id')
        .single();
      
      if (areaError) {
        console.error(`Error inserting classroom area ${schoolArea.area_key}:`, areaError);
        continue;
      }
      
      areasCreated++;
      areaIdMap.set(schoolArea.id, classroomArea.id);
    }

    // Get all works from school curriculum
    const { data: schoolWorks, error: worksError } = await supabase
      .from('montree_school_curriculum_works')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('sequence');
    
    if (worksError) {
      throw new Error(`Failed to fetch school works: ${worksError.message}`);
    }
    
    // Copy each work to classroom
    for (const schoolWork of schoolWorks || []) {
      const classroomAreaId = areaIdMap.get(schoolWork.area_id);

      if (!classroomAreaId) {
        console.error(`No classroom area found for school area ${schoolWork.area_id}`);
        continue;
      }

      const { error: workError } = await supabase
        .from('montree_classroom_curriculum_works')
        .upsert({
          classroom_id: classroomId,
          area_id: classroomAreaId,
          work_key: schoolWork.work_key,
          name: schoolWork.name,
          name_chinese: schoolWork.name_chinese,
          description: schoolWork.description,
          age_range: schoolWork.age_range,
          materials: schoolWork.materials,
          direct_aims: schoolWork.direct_aims,
          indirect_aims: schoolWork.indirect_aims,
          control_of_error: schoolWork.control_of_error,
          prerequisites: schoolWork.prerequisites,
          video_search_terms: schoolWork.video_search_terms,
          levels: schoolWork.levels,
          category_key: schoolWork.category_key,
          category_name: schoolWork.category_name,
          sequence: schoolWork.sequence,
          is_active: true,
          teacher_notes: null, // Fresh for teacher to customize
          // Include parent descriptions from school curriculum
          parent_description: schoolWork.parent_description,
          why_it_matters: schoolWork.why_it_matters,
        }, {
          onConflict: 'classroom_id,work_key',
        });
      
      if (workError) {
        console.error(`Error inserting classroom work ${schoolWork.work_key}:`, workError);
        continue;
      }
      
      worksCreated++;
    }

    return {
      success: true,
      areasCreated,
      worksCreated,
    };
    
  } catch (error) {
    console.error('Error seeding classroom curriculum:', error);
    return {
      success: false,
      areasCreated,
      worksCreated,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check if classroom curriculum already exists
export async function isClassroomSeeded(classroomId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { count, error } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId);
  
  if (error) {
    console.error('Error checking classroom seed status:', error);
    return false;
  }
  
  return (count || 0) > 0;
}

// Get classroom curriculum stats
export async function getClassroomCurriculumStats(classroomId: string): Promise<{
  areas: number;
  works: number;
}> {
  const supabase = getSupabase();
  
  const { count: areaCount } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId);
  
  const { count: workCount } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId);
  
  return {
    areas: areaCount || 0,
    works: workCount || 0,
  };
}
