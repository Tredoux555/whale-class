import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/sessions/gracious-peaceful-franklin/mnt/whale/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

const { data: kids, error: kidsErr } = await sb
  .from('montree_children')
  .select('id, name')
  .eq('classroom_id', CLASSROOM_ID)
  .order('name');

if (kidsErr) {
  console.log('kids err:', kidsErr);
  process.exit(1);
}
console.log(`\n=== ${(kids||[]).length} Whale Class children ===\n`);

const { data: focus, error: focusErr } = await sb
  .from('montree_child_focus_works')
  .select('child_id, area, work_name, set_at, set_by')
  .in('child_id', (kids||[]).map(k => k.id))
  .order('set_at', { ascending: false });

if (focusErr) {
  console.log('focus err:', focusErr);
  process.exit(1);
}

const byChild = {};
for (const f of focus || []) {
  if (!byChild[f.child_id]) byChild[f.child_id] = [];
  byChild[f.child_id].push(f);
}

console.log('Child Name      | # works | Most recent set_at         | Oldest set_at              | set_by values');
console.log('----------------|---------|----------------------------|----------------------------|----------------');
for (const k of kids) {
  const works = byChild[k.id] || [];
  const latest = works[0]?.set_at || 'NONE';
  const oldest = works[works.length - 1]?.set_at || 'NONE';
  const setByVals = [...new Set(works.map(w => w.set_by || 'null'))].join(',');
  console.log(`${k.name.padEnd(15)} | ${String(works.length).padStart(7)} | ${String(latest).padEnd(26)} | ${String(oldest).padEnd(26)} | ${setByVals}`);
}

console.log('\n=== Aggregate by set_by source ===');
const bySource = {};
for (const f of focus || []) {
  const key = f.set_by || 'null';
  bySource[key] = (bySource[key] || 0) + 1;
}
console.log(bySource);

const apr17 = '2026-04-17T00:00:00';
const newAfterApr17 = (focus || []).filter(f => f.set_at >= apr17);
console.log(`\n=== Rows set on/after 2026-04-17 (Session 33 Weekly Wrap day) ===`);
console.log(`Count: ${newAfterApr17.length} of ${(focus||[]).length} total`);
if (newAfterApr17.length > 0) {
  console.log('set_by breakdown:', [...new Set(newAfterApr17.map(f => f.set_by))]);
  console.log('First 5:');
  for (const r of newAfterApr17.slice(0, 5)) {
    console.log(`  ${r.set_at} ${r.area} "${r.work_name}" by=${r.set_by}`);
  }
}

// Compare against Apr 12 Weekly Wrap day
const apr12 = '2026-04-12T00:00:00';
const apr16 = '2026-04-16T23:59:59';
const between = (focus || []).filter(f => f.set_at >= apr12 && f.set_at <= apr16);
console.log(`\n=== Rows set 2026-04-12 to 2026-04-16 (mid-week) ===`);
console.log(`Count: ${between.length}`);

const before12 = (focus || []).filter(f => f.set_at < apr12);
console.log(`\n=== Rows set BEFORE 2026-04-12 (truly stale) ===`);
console.log(`Count: ${before12.length}`);
