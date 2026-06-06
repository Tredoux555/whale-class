// Seeds + verifies the Dark Phonics works pack via the Supabase REST (service role).
// Usage: npx tsx scripts/seed-phonics.ts [--apply] [schoolId]
//   (no --apply = dry run: just report current state)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { phonicsWorkRows } from '../lib/montree/phonics/phonics-works';

function loadEnv() {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
  }
}

async function main() {
  loadEnv();
  const APPLY = process.argv.includes('--apply');
  const schoolId = process.argv.find((a) => /^[0-9a-f-]{36}$/.test(a)) || 'c6280fae-567c-45ed-ad4d-934eae79aabc';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const SOURCE = 'phonics_pack';
  const rows = phonicsWorkRows();

  const { data: classrooms } = await supabase.from('montree_classrooms').select('id, name').eq('school_id', schoolId);
  console.log(`School ${schoolId}: ${classrooms?.length || 0} classroom(s)`);

  let totalInserted = 0, totalReactivated = 0, totalRepaired = 0;

  for (const c of classrooms || []) {
    const { data: area } = await supabase.from('montree_classroom_curriculum_areas')
      .select('id').eq('classroom_id', c.id).eq('area_key', 'language').maybeSingle();
    const { data: existing } = await supabase.from('montree_classroom_curriculum_works')
      .select('work_key, is_active').eq('classroom_id', c.id).eq('source', SOURCE);
    const have = new Set((existing || []).map((r: any) => r.work_key));
    const hidden = (existing || []).filter((r: any) => !r.is_active).length;
    console.log(`  • ${c.name || c.id}: language area=${area?.id ? 'yes' : 'MISSING'}, phonics rows=${existing?.length || 0} (hidden=${hidden})`);

    if (!APPLY || !area?.id) continue;

    if (hidden) {
      const { data: r } = await supabase.from('montree_classroom_curriculum_works')
        .update({ is_active: true }).eq('classroom_id', c.id).eq('source', SOURCE).eq('is_active', false).select('id');
      totalReactivated += r?.length || 0;
    }
    const toInsert = rows.filter((r) => !have.has(r.work_key)).map((r) => ({
      classroom_id: c.id, name: r.name, work_key: r.work_key, area_id: area.id,
      sequence: 10000 + r.sequence, description: r.description.slice(0, 500),
      parent_description: r.description.slice(0, 1000), is_custom: false, is_active: true, source: SOURCE,
    }));
    if (toInsert.length) {
      const { data: ins, error } = await supabase.from('montree_classroom_curriculum_works').insert(toInsert).select('id');
      if (error) { console.error('  INSERT ERROR:', error.message); process.exit(1); }
      totalInserted += ins?.length || 0;
    }
    // Repair photos tagged with the old virtual id ('phonics_NN') → real row id.
    const { data: seeded } = await supabase.from('montree_classroom_curriculum_works')
      .select('id, work_key').eq('classroom_id', c.id).eq('source', SOURCE);
    for (const w of seeded || []) {
      const { data: rep } = await supabase.from('montree_media')
        .update({ work_id: (w as any).id }).eq('classroom_id', c.id).eq('work_id', (w as any).work_key).select('id');
      totalRepaired += rep?.length || 0;
    }
  }

  if (APPLY) console.log(`\nAPPLIED → inserted=${totalInserted}, reactivated=${totalReactivated}, media repaired=${totalRepaired}`);
  else console.log('\n(dry run — re-run with --apply to seed)');

  const { data: verify } = await supabase.from('montree_classroom_curriculum_works')
    .select('classroom_id').eq('source', SOURCE).eq('is_active', true);
  const byRoom: Record<string, number> = {};
  for (const v of verify || []) byRoom[(v as any).classroom_id] = (byRoom[(v as any).classroom_id] || 0) + 1;
  console.log('Active phonics works per classroom:', byRoom);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
