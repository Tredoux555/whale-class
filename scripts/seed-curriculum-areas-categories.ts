// scripts/seed-curriculum-areas-categories.ts
// Seeds curriculum_areas and curriculum_categories tables

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Curriculum Areas Data
const curriculumAreas = [
  {
    id: 'practical_life',
    name: 'Practical Life',
    description: 'Activities that help children develop independence, coordination, concentration, and order. These works prepare children for daily life and other areas of learning.',
    color: '#4A90E2',
    icon: '🛠️',
    sequence: 1,
  },
  {
    id: 'sensorial',
    name: 'Sensorial',
    description: 'Materials designed to help children refine their senses and develop their ability to observe, compare, and classify.',
    color: '#50C878',
    icon: '👁️',
    sequence: 2,
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Concrete materials that introduce mathematical concepts through hands-on exploration, leading to abstract understanding.',
    color: '#FF6B6B',
    icon: '🔢',
    sequence: 3,
  },
  {
    id: 'language',
    name: 'Language',
    description: 'Activities that develop vocabulary, reading, writing, and communication skills through spoken language, phonics, and written expression.',
    color: '#9B59B6',
    icon: '📚',
    sequence: 4,
  },
  {
    id: 'cultural',
    name: 'Science & Culture',
    description: 'Exploration of geography, biology, history, and the sciences that help children understand their world and place in it.',
    color: '#F39C12',
    icon: '🌍',
    sequence: 5,
  },
];

// Curriculum Categories Data
const curriculumCategories = [
  // Practical Life Categories
  {
    id: 'pl_care_of_self',
    area_id: 'practical_life',
    name: 'Care of Self',
    description: 'Activities for personal hygiene, dressing, and self-care',
    sequence: 1,
  },
  {
    id: 'pl_care_of_environment',
    area_id: 'practical_life',
    name: 'Care of Environment',
    description: 'Activities for cleaning, organizing, and maintaining the environment',
    sequence: 2,
  },
  {
    id: 'pl_grace_and_courtesy',
    area_id: 'practical_life',
    name: 'Grace & Courtesy',
    description: 'Social skills, manners, and respectful interactions',
    sequence: 3,
  },
  {
    id: 'pl_control_of_movement',
    area_id: 'practical_life',
    name: 'Control of Movement',
    description: 'Activities developing gross and fine motor control',
    sequence: 4,
  },
  {
    id: 'pl_transfer',
    area_id: 'practical_life',
    name: 'Transfer Activities',
    description: 'Pouring, spooning, and transferring materials',
    sequence: 5,
  },
  
  // Sensorial Categories
  {
    id: 'sens_visual',
    area_id: 'sensorial',
    name: 'Visual Discrimination',
    description: 'Materials for size, shape, and color discrimination',
    sequence: 1,
  },
  {
    id: 'sens_tactile',
    area_id: 'sensorial',
    name: 'Tactile Sense',
    description: 'Materials for touch discrimination and texture exploration',
    sequence: 2,
  },
  {
    id: 'sens_auditory',
    area_id: 'sensorial',
    name: 'Auditory Sense',
    description: 'Materials for sound discrimination and music',
    sequence: 3,
  },
  {
    id: 'sens_olfactory',
    area_id: 'sensorial',
    name: 'Olfactory Sense',
    description: 'Materials for smell discrimination',
    sequence: 4,
  },
  {
    id: 'sens_gustatory',
    area_id: 'sensorial',
    name: 'Gustatory Sense',
    description: 'Materials for taste discrimination',
    sequence: 5,
  },
  {
    id: 'sens_stereognostic',
    area_id: 'sensorial',
    name: 'Stereognostic Sense',
    description: 'Materials for recognizing objects through touch without vision',
    sequence: 6,
  },
  
  // Mathematics Categories
  {
    id: 'math_numbers_0_10',
    area_id: 'mathematics',
    name: 'Numbers 0-10',
    description: 'Introduction to quantity and symbol for numbers 0-10',
    sequence: 1,
  },
  {
    id: 'math_decimal_system',
    area_id: 'mathematics',
    name: 'Decimal System',
    description: 'Understanding place value and the decimal system',
    sequence: 2,
  },
  {
    id: 'math_operations',
    area_id: 'mathematics',
    name: 'Operations',
    description: 'Addition, subtraction, multiplication, and division',
    sequence: 3,
  },
  {
    id: 'math_linear_counting',
    area_id: 'mathematics',
    name: 'Linear Counting',
    description: 'Counting beyond 10 and skip counting',
    sequence: 4,
  },
  {
    id: 'math_memorization',
    area_id: 'mathematics',
    name: 'Memorization',
    description: 'Memorizing math facts and tables',
    sequence: 5,
  },
  {
    id: 'math_fractions',
    area_id: 'mathematics',
    name: 'Fractions',
    description: 'Introduction to fractions and parts of a whole',
    sequence: 6,
  },
  {
    id: 'math_geometry',
    area_id: 'mathematics',
    name: 'Geometry',
    description: 'Shapes, patterns, and geometric concepts',
    sequence: 7,
  },
  
  // Language Categories
  {
    id: 'lang_oral',
    area_id: 'language',
    name: 'Oral Language',
    description: 'Vocabulary development and spoken language',
    sequence: 1,
  },
  {
    id: 'lang_phonics',
    area_id: 'language',
    name: 'Phonics',
    description: 'Letter sounds and phonetic reading',
    sequence: 2,
  },
  {
    id: 'lang_writing',
    area_id: 'language',
    name: 'Writing',
    description: 'Pre-writing, letter formation, and composition',
    sequence: 3,
  },
  {
    id: 'lang_reading',
    area_id: 'language',
    name: 'Reading',
    description: 'Word building, reading, and comprehension',
    sequence: 4,
  },
  {
    id: 'lang_grammar',
    area_id: 'language',
    name: 'Grammar',
    description: 'Parts of speech, sentence structure, and grammar concepts',
    sequence: 5,
  },
  
  // Cultural Categories
  {
    id: 'cult_geography',
    area_id: 'cultural',
    name: 'Geography',
    description: 'Maps, continents, countries, and landforms',
    sequence: 1,
  },
  {
    id: 'cult_biology',
    area_id: 'cultural',
    name: 'Biology',
    description: 'Plants, animals, and life sciences',
    sequence: 2,
  },
  {
    id: 'cult_history',
    area_id: 'cultural',
    name: 'History',
    description: 'Time, calendars, and historical concepts',
    sequence: 3,
  },
  {
    id: 'cult_science',
    area_id: 'cultural',
    name: 'Science',
    description: 'Physical sciences, experiments, and scientific method',
    sequence: 4,
  },
  {
    id: 'cult_art',
    area_id: 'cultural',
    name: 'Art & Music',
    description: 'Creative expression, art appreciation, and music',
    sequence: 5,
  },
];

async function seedAreasAndCategories() {
  try {
    console.log('🌱 Seeding Curriculum Areas and Categories...\n');

    // Step 1: Seed Areas
    console.log('1. Seeding curriculum areas...');
    for (const area of curriculumAreas) {
      const { error } = await supabase
        .from('curriculum_areas')
        .upsert({
          id: area.id,
          name: area.name,
          description: area.description,
          color: area.color,
          icon: area.icon,
          sequence: area.sequence,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error(`   ❌ Error seeding area ${area.name}:`, error.message);
      } else {
        console.log(`   ✅ ${area.icon} ${area.name}`);
      }
    }

    // Step 2: Seed Categories
    console.log('\n2. Seeding curriculum categories...');
    let categoryCount = 0;
    for (const category of curriculumCategories) {
      const { error } = await supabase
        .from('curriculum_categories')
        .upsert({
          id: category.id,
          area_id: category.area_id,
          name: category.name,
          description: category.description,
          sequence: category.sequence,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error(`   ❌ Error seeding category ${category.name}:`, error.message);
      } else {
        categoryCount++;
        console.log(`   ✅ ${category.name} (${category.area_id})`);
      }
    }

    // Step 3: Verify
    console.log('\n3. Verifying data...');
    const { data: areas, error: areasError } = await supabase
      .from('curriculum_areas')
      .select('id, name')
      .order('sequence');

    const { data: categories, error: categoriesError } = await supabase
      .from('curriculum_categories')
      .select('id, name, area_id')
      .order('area_id, sequence');

    if (areasError) {
      console.error('   ❌ Error fetching areas:', areasError.message);
    } else {
      console.log(`   ✅ Found ${areas?.length || 0} areas`);
    }

    if (categoriesError) {
      console.error('   ❌ Error fetching categories:', categoriesError.message);
    } else {
      console.log(`   ✅ Found ${categories?.length || 0} categories`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Seeding Complete!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`   Areas: ${curriculumAreas.length}`);
    console.log(`   Categories: ${curriculumCategories.length}`);
    console.log(`\n✅ All curriculum areas and categories have been seeded!`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedAreasAndCategories();


