import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dmfncjjtsoxrnvcdnvjq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZm5jamp0c294cm52Y2RudmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg0NzY1MiwiZXhwIjoyMDc4NDIzNjUyfQ.qapJCECkxlq-n5XFvvyH5CQ4T_2LY5-2sFIEyF2A8jw'
);

const CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

const { data: children } = await supabase
  .from('montree_children')
  .select('id, name')
  .eq('classroom_id', CLASSROOM)
  .eq('is_active', true);

const childIds = children.map(c => c.id);

// Check saved notes for week 2026-04-13
const { data: notes } = await supabase
  .from('montree_weekly_admin_notes')
  .select('child_id, week_start, plan_areas, notes_text, updated_at')
  .in('child_id', childIds)
  .eq('week_start', '2026-04-13');

console.log(`Saved notes for week 2026-04-13: ${notes?.length || 0}\n`);

const byChild = {};
for (const n of (notes || [])) byChild[n.child_id] = n;

for (const c of children.slice(0, 5)) {
  const n = byChild[c.id];
  if (!n) { console.log(`${c.name}: NO saved note`); continue; }
  const pa = n.plan_areas || {};
  console.log(`${c.name}: plan_areas.language = "${pa.language || '(empty)'}" | updated_at=${n.updated_at}`);
}

// Also check the ACTUAL classroom curriculum — what Language work names exist?
console.log('\n\n=== Classroom Language curriculum works (what Haiku needs to match EXACTLY) ===');
const { data: areaRow } = await supabase
  .from('montree_classroom_curriculum_areas')
  .select('id')
  .eq('classroom_id', CLASSROOM)
  .eq('area_key', 'language')
  .maybeSingle();

if (areaRow) {
  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, name_zh, name_chinese')
    .eq('classroom_id', CLASSROOM)
    .eq('area_id', areaRow.id)
    .order('sequence');
  console.log(`Total Language works in Whale Class: ${langWorks?.length}`);
  for (const w of (langWorks || []).slice(0, 30)) {
    console.log(`  "${w.name}"`);
  }
}

// Now cross-check Haiku proposals against classroom names
console.log('\n\n=== PROPOSED-vs-CLASSROOM exact-match check ===');
const { data: childrenFull } = await supabase
  .from('montree_children')
  .select('id, name, settings')
  .in('id', childIds);

const { data: allWorks } = await supabase
  .from('montree_classroom_curriculum_works')
  .select('name, name_zh, name_chinese')
  .eq('classroom_id', CLASSROOM);

const workSet = new Set(allWorks.map(w => w.name?.toLowerCase()).filter(Boolean));

for (const c of childrenFull) {
  const works = c.settings?.game_plan?.works || [];
  for (const wn of works) {
    const matchExact = workSet.has(wn.toLowerCase());
    if (!matchExact) {
      console.log(`  ${c.name.padEnd(12)} proposed "${wn}" — NO exact match`);
    }
  }
}
