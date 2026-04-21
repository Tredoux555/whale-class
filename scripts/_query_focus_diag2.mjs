import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dmfncjjtsoxrnvcdnvjq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZm5jamp0c294cm52Y2RudmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg0NzY1MiwiZXhwIjoyMDc4NDIzNjUyfQ.qapJCECkxlq-n5XFvvyH5CQ4T_2LY5-2sFIEyF2A8jw'
);

const CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

const { data: children } = await supabase
  .from('montree_children')
  .select('id, name, settings')
  .eq('classroom_id', CLASSROOM)
  .eq('is_active', true);

console.log('=== ALL 20 WHALE CHILDREN: Language focus + settings.game_plan.works ===\n');

const childIds = children.map(c => c.id);

// Get ALL focus rows for these children
const { data: allFocus } = await supabase
  .from('montree_child_focus_works')
  .select('*')
  .in('child_id', childIds);

const focusByChild = {};
for (const r of (allFocus || [])) {
  if (!focusByChild[r.child_id]) focusByChild[r.child_id] = [];
  focusByChild[r.child_id].push(r);
}

let sandpaperCount = 0;
let emptyCount = 0;
const gamePlanWorksMap = {};

for (const c of children) {
  const focusRows = focusByChild[c.id] || [];
  const langRow = focusRows.find(r => r.area === 'language');
  const plan = c.settings?.game_plan || {};
  const planWorks = plan.works || [];
  const planNudge = plan.nudge || '(none)';
  const planUpdated = plan.updated_at || '(none)';

  gamePlanWorksMap[c.name] = planWorks;

  const lang = langRow ? langRow.work_name : '(no row)';
  if (lang === 'Sandpaper Letters') sandpaperCount++;
  if (!langRow) emptyCount++;

  console.log(`${c.name.padEnd(12)} | language_slot="${lang}" | game_plan.works=[${planWorks.join(', ')}] | nudge: ${planNudge.slice(0, 80)}`);
}

console.log(`\n\nSandpaper Letters count in language slots: ${sandpaperCount} / 20`);
console.log(`Children with NO language focus row: ${emptyCount} / 20`);

// Check what works appear in game_plan.works across all children for language area
console.log('\n\n=== ALL UNIQUE game_plan.works values across 20 children ===');
const uniqueWorks = new Set();
for (const works of Object.values(gamePlanWorksMap)) {
  for (const w of works) uniqueWorks.add(w);
}
for (const w of [...uniqueWorks].sort()) console.log(`  "${w}"`);

// Now check last week's weekly report to see what the PREVIOUS plan was
console.log('\n\n=== Previous weekly reports (to see what Haiku was told was "last week") ===');
const { data: reports } = await supabase
  .from('montree_weekly_reports')
  .select('child_id, week_start, content')
  .in('child_id', childIds)
  .order('week_start', { ascending: false })
  .limit(40);

const bywk = {};
for (const r of (reports || [])) {
  bywk[r.week_start] = (bywk[r.week_start] || 0) + 1;
}
console.log('Weekly reports by week_start:');
for (const [wk, ct] of Object.entries(bywk)) console.log(`  ${wk}: ${ct} reports`);
