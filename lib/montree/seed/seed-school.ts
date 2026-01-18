// lib/montree/seed/seed-school.ts
// Seeds a school's curriculum from the master stem files
// Master → School (school can then customize)

import { createServerClient } from '@/lib/supabase/server';
import type { StemArea, StemWork, SchoolCurriculumArea, SchoolCurriculumWork } from '../types';

// Import stem data
import practicalLifeData from '../stem/practical-life.json';
import sensorialData from '../stem/sensorial.json';
import mathData from '../stem/math.json';
import languageData from '../stem/language.json';
import culturalData from '../stem/cultural.json';

const STEM_DATA: StemArea[] = [
  practicalLifeData as unknown as StemArea,
  sensorialData as unknown as StemArea,
  mathData as unknown as StemArea,
  languageData as unknown as StemArea,
  culturalData as unknown as StemArea,
];

// Helper: Extract and aggregate videoSearchTerms from all levels
function aggregateVideoSearchTerms(work: StemWork): string[] {
  const terms: Set<string> = new Set();
  
  // Add work-level terms if any
  if (work.videoSearchTerms) {
    work.videoSearchTerms.forEach(t => terms.add(t));
  }
  
  // Add level-specific terms
  if (work.levels) {
    work.levels.forEach(level => {
      if (level.videoSearchTerms) {
        level.videoSearchTerms.forEach(t => terms.add(t));
      }
    });
  }
  
  return Array.from(terms);
}

// Helper: Map stem work to database format (camelCase → snake_case)
function mapWorkToDb(
  work: StemWork,
  schoolId: string,
  areaId: string,
  categoryKey: string,
  categoryName: string,
  sequence: number
) {
  return {
    school_id: schoolId,
    area_id: areaId,
    work_key: work.id,
    name: work.name,
    name_chinese: work.chineseName || null,
    description: work.description || null,
    age_range: work.ageRange || '3-6',
    materials: work.materials || [],
    direct_aims: work.directAims || [],
    indirect_aims: work.indirectAims || [],
    control_of_error: work.controlOfError || null,
    prerequisites: work.prerequisites || [],
    video_search_terms: aggregateVideoSearchTerms(work),
    levels: work.levels || [],
    category_key: categoryKey,
    category_name: categoryName,
    sequence: sequence,
    is_active: true,
  };
}

// Main seeding function
export async function seedSchoolCurriculum(schoolId: string): Promise<{
  success: boolean;
  areasCreated: number;
  worksCreated: number;
  error?: string;
}> {
  const supabase = await createServerClient();
  
  let areasCreated = 0;
  let worksCreated = 0;
  
  try {
    // Process each area from stem
    for (const area of STEM_DATA) {
      // Insert area
      const { data: areaData, error: areaError } = await supabase
        .from('montree_school_curriculum_areas')
        .upsert({
          school_id: schoolId,
          area_key: area.id,
          name: area.name,
          name_chinese: null, // Add if available in stem
          icon: area.icon,
          color: area.color,
          description: area.description || null,
          sequence: area.sequence || 0,
          is_active: true,
        }, {
          onConflict: 'school_id,area_key',
        })
        .select('id')
        .single();
      
      if (areaError) {
        console.error(`Error inserting area ${area.id}:`, areaError);
        continue;
      }
      
      areasCreated++;
      const areaId = areaData.id;

      // Process each category in the area
      let workSequence = 0;
      for (const category of area.categories || []) {
        // Process each work in the category
        for (const work of category.works || []) {
          const workData = mapWorkToDb(
            work as StemWork,
            schoolId,
            areaId,
            category.id,
            category.name,
            workSequence++
          );
          
          const { error: workError } = await supabase
            .from('montree_school_curriculum_works')
            .upsert(workData, {
              onConflict: 'school_id,work_key',
            });
          
          if (workError) {
            console.error(`Error inserting work ${work.id}:`, workError);
            continue;
          }
          
          worksCreated++;
        }
      }
    }
    
    return {
      success: true,
      areasCreated,
      worksCreated,
    };
    
  } catch (error) {
    console.error('Error seeding school curriculum:', error);
    return {
      success: false,
      areasCreated,
      worksCreated,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Check if school curriculum already exists
export async function isSchoolSeeded(schoolId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { count, error } = await supabase
    .from('montree_school_curriculum_areas')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId);
  
  if (error) {
    console.error('Error checking school seed status:', error);
    return false;
  }
  
  return (count || 0) > 0;
}

// Get school curriculum stats
export async function getSchoolCurriculumStats(schoolId: string): Promise<{
  areas: number;
  works: number;
}> {
  const supabase = await createServerClient();
  
  const { count: areaCount } = await supabase
    .from('montree_school_curriculum_areas')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId);
  
  const { count: workCount } = await supabase
    .from('montree_school_curriculum_works')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId);
  
  return {
    areas: areaCount || 0,
    works: workCount || 0,
  };
}
