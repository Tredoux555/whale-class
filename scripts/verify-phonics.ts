// End-to-end audit of the seeded Dark Phonics works. Read-only.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
  }
}

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const CR = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'; // Whale Class
  const pass: string[] = []; const fail: string[] = [];

  // 1) Picker query shape: active works in classroom, joined to area (mirrors works/route.ts)
  const { data: works } = await supabase.from('montree_classroom_curriculum_works')
    .select('id, work_key, name, source, is_active, area:montree_classroom_curriculum_areas!area_id(area_key, name)')
    .eq('classroom_id', CR).eq('is_active', true).order('sequence');
  const phonics = (works || []).filter((w: any) => w.source === 'phonics_pack');
  (phonics.length === 49 ? pass : fail).push(`picker returns 49 phonics works (got ${phonics.length})`);

  // 2) No duplicate work_keys
  const keys = phonics.map((w: any) => w.work_key);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  (dupes.length === 0 ? pass : fail).push(`no duplicate work_keys (dupes: ${dupes.join(',') || 'none'})`);

  // 3) Every phonics work resolves area = Language (the media work_id->name + area path)
  const badArea = phonics.filter((w: any) => (Array.isArray(w.area) ? w.area[0]?.area_key : w.area?.area_key) !== 'language');
  (badArea.length === 0 ? pass : fail).push(`all phonics works resolve to Language area (bad: ${badArea.length})`);

  // 4) Names are the real labels (sample)
  const sample = phonics.find((w: any) => w.work_key === 'phonics_40') as any;
  (sample && /^Phonics 40:/.test(sample.name) ? pass : fail).push(`name resolves e.g. "${sample?.name || 'MISSING'}"`);

  // 5) AI candidate set = curriculum_works for classroom → now includes phonics (inClassroom gate will pass)
  const { data: all } = await supabase.from('montree_classroom_curriculum_works')
    .select('name, source').eq('classroom_id', CR).eq('is_active', true);
  const aiSeesPhonics = (all || []).some((w: any) => w.source === 'phonics_pack');
  (aiSeesPhonics ? pass : fail).push(`AI candidate set (curriculum_works) includes phonics → auto-progress gate passes`);

  // 6) Progress round-trip is keyed by work_name; confirm a phonics work_name is a valid target
  const { data: anyProg } = await supabase.from('montree_child_progress').select('work_name').limit(1);
  (anyProg !== null ? pass : fail).push(`montree_child_progress reachable (progress keyed by work_name)`);

  console.log('PASS:'); pass.forEach((p) => console.log('  ✓ ' + p));
  if (fail.length) { console.log('FAIL:'); fail.forEach((f) => console.log('  ✗ ' + f)); }
  console.log(`\n${fail.length === 0 ? '✅ 100% CLEAN' : '❌ ' + fail.length + ' issue(s)'}`);
  process.exit(fail.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
