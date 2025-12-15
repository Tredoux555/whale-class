// scripts/seed-curriculum.ts
// Seed curriculum roadmap data into database

// Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient as createSupabaseClientJS } from '@supabase/supabase-js';

// Load .env.local if it exists (takes precedence)
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath, override: true });
config(); // Also load .env

// Now import after env vars are loaded
import { CURRICULUM_ROADMAP_SEED } from '@/lib/curriculum/roadmap-seed';

async function seedCurriculum() {
  // Create Supabase client directly with environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  }

  // Prefer service role key, fall back to anon key
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;
  
  if (!supabaseKey) {
    throw new Error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set in .env.local');
  }

  const supabase = createSupabaseClientJS(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (supabaseServiceKey) {
    console.log('Using service role key (admin access)');
  } else {
    console.log('Using anon key (may have RLS restrictions)');
  }

  console.log('Starting curriculum seed...');
  console.log(`Seeding ${CURRICULUM_ROADMAP_SEED.length} curriculum works...`);

  try {
    // Check if data already exists
    const { data: existing } = await supabase
      .from('curriculum_roadmap')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Curriculum data already exists. Skipping seed.');
      console.log('To re-seed, delete existing data first.');
      return;
    }

    // Insert all curriculum works
    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .insert(CURRICULUM_ROADMAP_SEED)
      .select();

    if (error) {
      console.error('Error seeding curriculum:', error);
      throw error;
    }

    console.log(`✅ Successfully seeded ${data.length} curriculum works!`);
    
    // Show breakdown by stage
    const stageCounts: Record<string, number> = {};
    CURRICULUM_ROADMAP_SEED.forEach((work) => {
      stageCounts[work.stage] = (stageCounts[work.stage] || 0) + 1;
    });

    console.log('\nBreakdown by stage:');
    Object.entries(stageCounts).forEach(([stage, count]) => {
      console.log(`  ${stage}: ${count} works`);
    });

    // Show breakdown by area
    const areaCounts: Record<string, number> = {};
    CURRICULUM_ROADMAP_SEED.forEach((work) => {
      areaCounts[work.area] = (areaCounts[work.area] || 0) + 1;
    });

    console.log('\nBreakdown by area:');
    Object.entries(areaCounts).forEach(([area, count]) => {
      console.log(`  ${area}: ${count} works`);
    });

  } catch (error) {
    console.error('Failed to seed curriculum:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedCurriculum()
    .then(() => {
      console.log('\n✅ Seed complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export default seedCurriculum;

