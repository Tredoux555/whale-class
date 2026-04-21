import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dmfncjjtsoxrnvcdnvjq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZm5jamp0c294cm52Y2RudmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg0NzY1MiwiZXhwIjoyMDc4NDIzNjUyfQ.qapJCECkxlq-n5XFvvyH5CQ4T_2LY5-2sFIEyF2A8jw'
);

const CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// Get all Whale Class children
const { data: children } = await supabase
  .from('montree_children')
  .select('id, name')
  .eq('classroom_id', CLASSROOM)
  .eq('is_active', true);

console.log('Whale Class active children:', children?.length);

// For each child, show ALL focus works rows for area='language' with timestamps
for (const child of (children || []).slice(0, 5)) {
  const { data: rows } = await supabase
    .from('montree_child_focus_works')
    .select('*')
    .eq('child_id', child.id)
    .eq('area', 'language')
    .order('set_at', { ascending: false });
  console.log(`\n=== ${child.name} (${child.id}) — ${rows?.length || 0} language row(s) ===`);
  for (const r of (rows || [])) {
    console.log(`  work_name="${r.work_name}" | set_by=${r.set_by} | set_at=${r.set_at} | created_at=${r.created_at}`);
  }
}

// Now count TOTAL language focus rows in classroom across all children
const childIds = (children || []).map(c => c.id);
const { data: allLang, count } = await supabase
  .from('montree_child_focus_works')
  .select('child_id, area, work_name, set_by, set_at, created_at', { count: 'exact' })
  .in('child_id', childIds)
  .eq('area', 'language')
  .order('set_at', { ascending: false });

console.log(`\n\n=== TOTAL language rows across all Whale children: ${count} ===`);

// Group by set_by and set_at date to see when stuff was actually written
const byDate = {};
for (const r of (allLang || [])) {
  const day = r.set_at ? r.set_at.slice(0, 10) : 'NULL_SET_AT';
  const key = `${day} / set_by=${r.set_by}`;
  byDate[key] = (byDate[key] || 0) + 1;
}
console.log('\nBreakdown by set_at date + set_by:');
for (const [k, v] of Object.entries(byDate)) console.log(`  ${k}: ${v}`);
