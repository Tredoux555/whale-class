// scripts/seed-curriculum-v2.ts
// Seeds the 268 curriculum works into the database

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to convert ageRange to age_min and age_max
function getAgeRange(ageRange: string): { age_min: number; age_max: number } {
  const ranges: Record<string, { age_min: number; age_max: number }> = {
    'toddler': { age_min: 0, age_max: 3 },
    'primary_year1': { age_min: 3, age_max: 4 },
    'primary_year2': { age_min: 4, age_max: 5 },
    'primary_year3': { age_min: 5, age_max: 6 },
    'lower_elementary': { age_min: 6, age_max: 9 },
    'upper_elementary': { age_min: 9, age_max: 12 },
  };
  return ranges[ageRange] || { age_min: 3, age_max: 6 }; // Default to primary range
}

interface Level {
  level: number;
  name: string;
  description: string;
  videoSearchTerms: string[];
}

interface Work {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  prerequisites: string[];
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName: string;
  imageUrl?: string;
  levels: Level[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  sequence: number;
  works: Work[];
}

interface Area {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sequence: number;
  categories: Category[];
}

async function seedCurriculum() {
  console.log('Starting curriculum seed...\n');

  // Load curriculum data files
  const dataDir = path.join(process.cwd(), 'lib/curriculum/data');
  const files = [
    'practical-life.json',
    'sensorial.json',
    'math.json',
    'language.json',
    'cultural.json',
  ];

  let totalAreas = 0;
  let totalCategories = 0;
  let totalWorks = 0;
  let totalLevels = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const data: Area = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Processing: ${data.name}`);

    // Insert area
    const { error: areaError } = await supabase
      .from('curriculum_areas')
      .upsert({
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        sequence: data.sequence,
      }, { onConflict: 'id' });

    if (areaError) {
      console.error(`Error inserting area ${data.id}:`, areaError);
      continue;
    }
    totalAreas++;

    // Insert categories
    for (const category of data.categories) {
      const { error: catError } = await supabase
        .from('curriculum_categories')
        .upsert({
          id: category.id,
          area_id: data.id,
          name: category.name,
          description: category.description,
          sequence: category.sequence,
        }, { onConflict: 'id' });

      if (catError) {
        console.error(`Error inserting category ${category.id}:`, catError);
        continue;
      }
      totalCategories++;

      // Insert works
      for (const work of category.works) {
        const ageRangeValues = getAgeRange(work.ageRange);
        const { error: workError } = await supabase
          .from('curriculum_roadmap')
          .upsert({
            id: work.id,
            area_id: data.id,
            area: data.id, // Also set area (old schema) - using area id
            category_id: category.id,
            name: work.name,
            work_name: work.name, // Also set work_name for compatibility with old schema
            stage: work.ageRange, // Set stage to ageRange (old schema compatibility)
            age_min: ageRangeValues.age_min, // Set age_min (old schema compatibility)
            age_max: ageRangeValues.age_max, // Set age_max (old schema compatibility)
            description: work.description,
            age_range: work.ageRange,
            prerequisites: work.prerequisites,
            sequence: work.sequence,
            sequence_order: work.sequence, // Also set sequence_order for compatibility
            materials: work.materials,
            direct_aims: work.directAims,
            indirect_aims: work.indirectAims,
            control_of_error: work.controlOfError,
            chinese_name: work.chineseName,
            image_url: work.imageUrl || null,
            levels: work.levels,
          }, { onConflict: 'id' });

        if (workError) {
          console.error(`Error inserting work ${work.id}:`, workError);
          continue;
        }
        totalWorks++;

        // Insert levels into separate table for easier querying
        for (const level of work.levels) {
          const { error: levelError } = await supabase
            .from('curriculum_work_levels')
            .upsert({
              work_id: work.id,
              level_number: level.level,
              name: level.name,
              description: level.description,
              video_search_terms: level.videoSearchTerms,
            }, { onConflict: 'work_id,level_number' });

          if (levelError) {
            console.error(`Error inserting level ${work.id}-${level.level}:`, levelError);
          }
          totalLevels++;
        }
      }
    }

    console.log(`  ✓ ${data.categories.length} categories, ${data.categories.reduce((sum, c) => sum + c.works.length, 0)} works\n`);
  }

  console.log('='.repeat(50));
  console.log('Seed complete!');
  console.log(`  Areas: ${totalAreas}`);
  console.log(`  Categories: ${totalCategories}`);
  console.log(`  Works: ${totalWorks}`);
  console.log(`  Levels: ${totalLevels}`);
}

// Run
seedCurriculum()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

