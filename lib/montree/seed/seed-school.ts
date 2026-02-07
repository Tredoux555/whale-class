// lib/montree/seed/seed-school.ts
// Seeds a school's curriculum from the master stem files
// Master → School (school can then customize)

import { getSupabase } from '@/lib/supabase-client';
import type { StemArea, StemWork, SchoolCurriculumArea, SchoolCurriculumWork } from '../types';

// Import stem data
import practicalLifeData from '../stem/practical-life.json';
import sensorialData from '../stem/sensorial.json';
import mathData from '../stem/math.json';
import languageData from '../stem/language.json';
import culturalData from '../stem/cultural.json';

// Import comprehensive guides for parent descriptions
// These contain the carefully crafted parent_description and why_it_matters fields
import practicalLifeGuides from '../../curriculum/comprehensive-guides/practical-life-guides.json';
import sensorialGuides from '../../curriculum/comprehensive-guides/sensorial-guides.json';
import mathGuides from '../../curriculum/comprehensive-guides/math-guides.json';
import languageGuides from '../../curriculum/comprehensive-guides/language-guides.json';
import culturalGuides from '../../curriculum/comprehensive-guides/cultural-guides.json';

const STEM_DATA: StemArea[] = [
  practicalLifeData as unknown as StemArea,
  sensorialData as unknown as StemArea,
  mathData as unknown as StemArea,
  languageData as unknown as StemArea,
  culturalData as unknown as StemArea,
];

// Type for guide data
interface GuideWork {
  work_id?: string;
  name: string;
  parent_description?: string;
  why_it_matters?: string;
}

interface GuideData {
  works?: GuideWork[];
}

// Build lookup map from work_id to parent descriptions
// This uses the original, carefully crafted descriptions from the guides
function buildDescriptionLookup(): Map<string, { parent_description: string; why_it_matters: string }> {
  const lookup = new Map<string, { parent_description: string; why_it_matters: string }>();

  const allGuides: GuideData[] = [
    practicalLifeGuides as GuideData,
    sensorialGuides as GuideData,
    mathGuides as GuideData,
    languageGuides as GuideData,
    culturalGuides as GuideData,
  ];

  for (const guideData of allGuides) {
    const works = guideData.works || (guideData as unknown as GuideWork[]);
    if (Array.isArray(works)) {
      for (const work of works) {
        if (work.work_id && work.parent_description) {
          lookup.set(work.work_id, {
            parent_description: work.parent_description,
            why_it_matters: work.why_it_matters || '',
          });
        }
      }
    }
  }

  return lookup;
}

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
// Now includes parent_description and why_it_matters from the comprehensive guides
function mapWorkToDb(
  work: StemWork,
  schoolId: string,
  areaId: string,
  categoryKey: string,
  categoryName: string,
  sequence: number,
  descriptionLookup: Map<string, { parent_description: string; why_it_matters: string }>
) {
  // Look up the parent description from our guides by work_id
  const descriptions = descriptionLookup.get(work.id);

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
    // Include the carefully crafted parent descriptions from the guides
    parent_description: descriptions?.parent_description || null,
    why_it_matters: descriptions?.why_it_matters || null,
  };
}

// Main seeding function
export async function seedSchoolCurriculum(schoolId: string): Promise<{
  success: boolean;
  areasCreated: number;
  worksCreated: number;
  error?: string;
}> {
  const supabase = getSupabase();

  let areasCreated = 0;
  let worksCreated = 0;

  // Build the description lookup from comprehensive guides
  // This ensures all parent descriptions are included during seeding
  const descriptionLookup = buildDescriptionLookup();
  console.log(`Loaded ${descriptionLookup.size} parent descriptions from guides`);

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
            workSequence++,
            descriptionLookup
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
  const supabase = getSupabase();
  
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
  const supabase = getSupabase();
  
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
