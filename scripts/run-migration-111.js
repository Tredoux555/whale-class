// Run migration 111: Fix data integrity
// Deletes duplicate progress records, keeping newest

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Starting migration 111: Fix data integrity...\n');

  // Step 1: Get all progress records
  console.log('1. Fetching all progress records...');
  const { data: allProgress, error: fetchError } = await supabase
    .from('montree_child_progress')
    .select('id, child_id, work_name, status, updated_at, presented_at, created_at');

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  console.log(`   Found ${allProgress.length} total records`);

  // Step 2: Find duplicates (group by child_id + work_name)
  console.log('\n2. Finding duplicates...');
  const grouped = {};
  for (const row of allProgress) {
    const key = `${row.child_id}|${row.work_name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const duplicates = Object.entries(grouped).filter(([k, v]) => v.length > 1);
  console.log(`   Found ${duplicates.length} work names with duplicates`);

  // Step 3: Delete duplicates (keep newest)
  console.log('\n3. Deleting duplicates (keeping newest)...');
  let totalDeleted = 0;

  for (const [key, rows] of duplicates) {
    // Sort by date descending (newest first)
    rows.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.presented_at || a.created_at || '1970-01-01');
      const dateB = new Date(b.updated_at || b.presented_at || b.created_at || '1970-01-01');
      return dateB - dateA;
    });

    // Delete all but first (newest)
    const toDelete = rows.slice(1).map(r => r.id);
    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('montree_child_progress')
        .delete()
        .in('id', toDelete);

      if (!delError) {
        totalDeleted += toDelete.length;
        console.log(`   Deleted ${toDelete.length} for: ${rows[0].work_name.substring(0, 30)}...`);
      } else {
        console.error(`   Delete error for ${rows[0].work_name}:`, delError.message);
      }
    }
  }

  console.log(`\n   Total deleted: ${totalDeleted}`);

  // Step 4: Normalize status values
  console.log('\n4. Normalizing status values (completed -> mastered)...');
  const { data: updated, error: updateError } = await supabase
    .from('montree_child_progress')
    .update({ status: 'mastered' })
    .eq('status', 'completed')
    .select('id');

  if (updateError) {
    console.error('   Update error:', updateError.message);
  } else {
    console.log(`   Normalized ${updated?.length || 0} records`);
  }

  // Step 5: Verify Leo's data
  console.log('\n5. Verifying Leo\'s data...');
  const { data: leoProgress } = await supabase
    .from('montree_child_progress')
    .select('work_name, status')
    .eq('child_id', '310743a4-51cf-4f8f-9920-9a087adb084f');

  console.log(`   Leo now has ${leoProgress?.length || 0} progress records`);

  // Check for remaining duplicates
  const leoGrouped = {};
  for (const row of leoProgress || []) {
    if (!leoGrouped[row.work_name]) leoGrouped[row.work_name] = 0;
    leoGrouped[row.work_name]++;
  }

  const remaining = Object.entries(leoGrouped).filter(([k, v]) => v > 1);
  if (remaining.length > 0) {
    console.log('   ⚠️  WARNING: Still have duplicates:', remaining);
  } else {
    console.log('   ✅ No duplicates remaining for Leo');
  }

  // List Leo's works
  console.log('\n   Leo\'s works:');
  for (const row of leoProgress || []) {
    console.log(`     - ${row.work_name}: ${row.status}`);
  }

  console.log('\n✅ Migration 111 complete!');
  console.log('\n⚠️  IMPORTANT: You still need to add the UNIQUE constraint via Supabase SQL Editor:');
  console.log('   ALTER TABLE montree_child_progress ADD CONSTRAINT unique_child_work UNIQUE (child_id, work_name);');
}

runMigration().catch(console.error);
