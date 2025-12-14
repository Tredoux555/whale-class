// Bulk Upload Script for 60 Montessori Works
// Save this as: scripts/upload-montessori-works.ts
// Run with: npx tsx scripts/upload-montessori-works.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const works = [
  // PRACTICAL LIFE (17 works)
  { name: 'Care of Environment', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Pouring/Transferring', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Pouring Game', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Scooping/Spooning', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Cutting/Scissors', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Scissors Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Advanced Scissors Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Dressing Frame Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Dressing/Undressing Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Zipper Dressing Frame', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Braiding', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Braiding Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Folding Clothes', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Washing Tables', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Flower Arranging', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Food Preparation', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Independence', curriculum_area: 'practical_life', status: 'in_progress' },

  // SENSORIAL (13 works)
  { name: 'Pink Tower', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Brown Stair', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Red Rods', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Color Tablets', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Geometric Cabinet', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Binomial Cube', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Trinomial Cube', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Triangle Construction Box', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Bells/Sound Bottles Matching', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Smell Bottles Matching', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Taste Bottles', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Temperature Tablets', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Matching Work', curriculum_area: 'sensorial', status: 'in_progress' },

  // MATHEMATICS (9 works)
  { name: 'Counting', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Linear Counting', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Numerals and Counters', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Golden Beads Introduction', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Decenary/Ten Bead Board', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Addition Finger Board', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Addition Snake', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Stamp Game - Multiplication', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Cube Chain', curriculum_area: 'mathematics', status: 'in_progress' },

  // LANGUAGE (9 works)
  { name: 'Sandpaper Letters', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Beginning Sounds', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Phoneme Review', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Movable Alphabet', curriculum_area: 'language', status: 'in_progress' },
  { name: 'CVC Words', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Word Building Work', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Word Family Work', curriculum_area: 'language', status: 'in_progress' },
  { name: '3-Part Cards', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Small to Big Letter Matching Puzzle', curriculum_area: 'language', status: 'in_progress' },

  // SCIENCE & CULTURE (12 works)
  { name: 'Colored Globe', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Continents Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'China Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Leaf Puzzle Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Parts of a Tree', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Animal Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Bird Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Butterfly Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Flower Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Frog Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Turtle Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Culture Envelope', curriculum_area: 'culture', status: 'in_progress' },
];

async function uploadWorks() {
  console.log(`Uploading ${works.length} Montessori works...`);
  
  const { data, error } = await supabase
    .from('montessori_works')
    .insert(works)
    .select();

  if (error) {
    console.error('Error uploading works:', error);
    
    // Check if error is due to duplicate entries
    if (error.code === '23505') {
      console.error('\n⚠️  Some works already exist in the database.');
      console.error('This is normal if you\'ve already run the SQL script.');
      console.error('You can safely ignore this error or delete existing works first.');
    }
    
    process.exit(1);
  }

  console.log(`✅ Successfully uploaded ${data.length} works!`);
  
  // Show count by area
  const counts = works.reduce((acc, work) => {
    acc[work.curriculum_area] = (acc[work.curriculum_area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBreakdown by curriculum area:');
  Object.entries(counts).forEach(([area, count]) => {
    console.log(`  ${area}: ${count} works`);
  });
}

uploadWorks();

