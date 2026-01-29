// scripts/import-parent-descriptions-to-brain.ts
// Imports parent descriptions from seed file to montessori_works table
// Run: npx tsx scripts/import-parent-descriptions-to-brain.ts

import { createClient } from '@supabase/supabase-js';
import { parentDescriptions } from '../lib/montree/seed/parent-descriptions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importDescriptions() {
  console.log('🧠 Importing Parent Descriptions to Montessori Brain...\n');
  
  const workIds = Object.keys(parentDescriptions);
  console.log(`📚 Found ${workIds.length} descriptions to import\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const notFoundList: string[] = [];

  for (const workId of workIds) {
    const desc = parentDescriptions[workId];
    
    // Try to find the work by slug (work_id matches slug pattern)
    const { data, error } = await supabase
      .from('montessori_works')
      .update({
        parent_explanation_simple: desc.parent_description,
        parent_why_it_matters: desc.why_it_matters,
        // Store home_connection in detailed field for now
        parent_explanation_detailed: desc.home_connection,
      })
      .eq('slug', workId)
      .select('id, name');

    if (error) {
      console.error(`  ❌ Error updating ${workId}:`, error.message);
      errors++;
      continue;
    }

    if (data && data.length > 0) {
      console.log(`  ✅ ${workId} → ${data[0].name}`);
      updated++;
    } else {
      notFoundList.push(workId);
      notFound++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 20) {
    console.log('\n⚠️  Works not found in database:');
    notFoundList.forEach(id => console.log(`   - ${id}`));
  } else if (notFoundList.length > 20) {
    console.log(`\n⚠️  ${notFoundList.length} works not found (showing first 20):`);
    notFoundList.slice(0, 20).forEach(id => console.log(`   - ${id}`));
  }

  console.log('\n✨ Import complete!');
}

importDescriptions().catch(console.error);
