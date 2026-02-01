// Clear ALL Montree schools (fresh start for testing)
// Run with: node scripts/clear-schools.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearSchools() {
  console.log('🌳 MONTREE CLEANUP (Whale admin is separate & unaffected)\n');

  // Get all Montree schools
  const { data: schools, error } = await supabase
    .from('montree_schools')
    .select('id, name, slug');

  if (error) {
    console.error('Error fetching schools:', error.message);
    return;
  }

  if (!schools || schools.length === 0) {
    console.log('✅ No Montree schools to delete - already clean!');
    return;
  }

  console.log('Current Montree schools:');
  schools.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.slug})`));

  console.log(`\n🗑️  Deleting ALL ${schools.length} Montree school(s)...`);

  for (const school of schools) {
    console.log(`\n  Deleting "${school.name}"...`);

    // Get classrooms first
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', school.id);

    const classroomIds = (classrooms || []).map(c => c.id);

    // Delete curriculum works and areas for all classrooms
    if (classroomIds.length > 0) {
      await supabase.from('montree_classroom_curriculum_works').delete().in('classroom_id', classroomIds);
      await supabase.from('montree_classroom_curriculum_areas').delete().in('classroom_id', classroomIds);
    }

    // Delete school data
    await supabase.from('montree_children').delete().eq('school_id', school.id);
    await supabase.from('montree_teachers').delete().eq('school_id', school.id);
    await supabase.from('montree_classrooms').delete().eq('school_id', school.id);
    await supabase.from('montree_school_admins').delete().eq('school_id', school.id);

    const { error: delError } = await supabase
      .from('montree_schools')
      .delete()
      .eq('id', school.id);

    if (delError) {
      console.log(`    ❌ Failed: ${delError.message}`);
    } else {
      console.log(`    ✅ Deleted`);
    }
  }

  console.log('\n✅ Montree is clean! Ready for fresh testing.');
  console.log('   (Whale admin at /admin is unaffected - uses mock data)');
}

clearSchools();
