require('dotenv').config({ path: '/sessions/sweet-great-fermi/mnt/whale/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHALE_CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// Targets from the 11 stale corrections
const targets = [
  'Bingo - CMAT',
  'Bingo Game - Beginning Sound Objects CMAT',
  'Bingo - Phonics Review',
  'Bingo Phonics Review',
  'Bingo',
  'Blue Series Blends - Writing',
];

(async () => {
  const { data: allBingo, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, area_id')
    .eq('classroom_id', WHALE_CLASSROOM)
    .ilike('name', '%bingo%');
  
  if (error) {
    console.error('Query error:', error);
    return;
  }
  
  console.log('=== All Bingo-related works in Whale Class ===');
  allBingo.forEach(w => console.log(`  "${w.name}"`));
  
  const { data: blueSeries } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name')
    .eq('classroom_id', WHALE_CLASSROOM)
    .ilike('name', '%blue series%');
  
  console.log('\n=== All Blue Series works in Whale Class ===');
  (blueSeries || []).forEach(w => console.log(`  "${w.name}"`));
  
  console.log('\n=== Exact matches for each target (case-insensitive trim) ===');
  for (const t of targets) {
    const { data } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', WHALE_CLASSROOM)
      .ilike('name', t.trim());
    console.log(`  "${t}" → ${data && data.length ? `EXISTS as "${data[0].name}"` : 'MISSING'}`);
  }
  
  console.log('\n=== All 11 stale corrections with suggested action ===');
  const { data: stale } = await supabase
    .from('montree_guru_corrections')
    .select('id, original_work_name, corrected_work_name, corrected_area, created_at, correction_type')
    .eq('classroom_id', WHALE_CLASSROOM)
    .order('created_at', { ascending: false });
  
  const { data: allWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name')
    .eq('classroom_id', WHALE_CLASSROOM);
  
  const canonicalNames = new Set((allWorks || []).map(w => w.name.toLowerCase().trim()));
  
  const staleOnly = (stale || []).filter(c => {
    if (!c.corrected_work_name) return false;
    return !canonicalNames.has(c.corrected_work_name.toLowerCase().trim());
  });
  
  staleOnly.forEach(r => {
    console.log(`  id=${r.id.slice(0, 8)} "${r.original_work_name}" → "${r.corrected_work_name}" (${r.correction_type || 'no-type'})`);
  });
  
  console.log(`\nTotal stale: ${staleOnly.length}`);
})();
