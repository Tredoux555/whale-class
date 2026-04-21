import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/sessions/gracious-peaceful-franklin/mnt/whale/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

// Most recent Weekly Wrap runs (use generated_at and updated_at)
const { data: reports, error } = await sb
  .from('montree_weekly_reports')
  .select('child_id, week_start, report_type, status, generated_at, updated_at')
  .eq('classroom_id', CLASSROOM_ID)
  .order('updated_at', { ascending: false })
  .limit(50);

if (error) { console.log('err:', error); process.exit(1); }

console.log('Most recent 20 weekly_reports rows (any type) for Whale Class:');
console.log('week_start  | type    | status | generated_at                 | updated_at');
for (const r of (reports||[]).slice(0, 20)) {
  console.log(`${r.week_start} | ${r.report_type.padEnd(7)} | ${(r.status||'').padEnd(6)} | ${(r.generated_at||'').padEnd(28)} | ${r.updated_at}`);
}

// Group by week_start, count
const weekCounts = {};
for (const r of (reports||[])) {
  weekCounts[r.week_start] = (weekCounts[r.week_start] || 0) + 1;
}
console.log('\nReport count per week_start (last 50):');
console.log(weekCounts);

// Check: any reports updated AFTER 2026-04-17 16:08 UTC+8 (which is the time replan was deployed = Apr 17 08:08 UTC)?
const replanDeployTime = '2026-04-17T08:08:00';
const afterReplan = (reports||[]).filter(r => (r.updated_at || '') > replanDeployTime);
console.log(`\nReports updated AFTER replan deploy (2026-04-17 08:08 UTC = 16:08 +08:00): ${afterReplan.length}`);
if (afterReplan.length > 0) {
  for (const r of afterReplan.slice(0, 5)) {
    console.log(`  ${r.week_start} ${r.report_type} updated_at=${r.updated_at}`);
  }
}
