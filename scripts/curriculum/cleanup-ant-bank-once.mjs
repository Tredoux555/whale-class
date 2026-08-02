// One-off: remove the stale ant-on-my-apple book-page rows (old key names
// p1-ant/p2-anchor/p3-alligator/p4-ambulance/p5-recap) before re-running
// upload-dark-phonics-book-art.mjs for the new curated 3-word set
// (ant/alligator/anteater). p3-alligator and p5-recap share their key name
// with brand-new image content and would otherwise be silently skipped by
// the insert-only dedupe. Deletes both the storage object and the DB row
// for each match.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env; run with node --env-file=.env.local');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = 'photo-bank';

const STALE_LABELS = [
  'ant-on-my-apple p1-ant',
  'ant-on-my-apple p2-anchor',
  'ant-on-my-apple p3-alligator',
  'ant-on-my-apple p4-ambulance',
  'ant-on-my-apple p5-recap',
];

const { data, error } = await sb
  .from('montree_photo_bank')
  .select('id, label, storage_path, tags')
  .in('label', STALE_LABELS);
if (error) { console.error('select failed:', error.message); process.exit(1); }

console.log(`Found ${data.length} stale row(s):`);
for (const r of data) console.log(`  id=${r.id} label="${r.label}" storage_path=${r.storage_path}`);

for (const r of data) {
  if (r.storage_path) {
    const { error: rmErr } = await sb.storage.from(BUCKET).remove([r.storage_path]);
    if (rmErr) console.error(`  storage remove failed for ${r.storage_path}: ${rmErr.message}`);
  }
  const { error: delErr } = await sb.from('montree_photo_bank').delete().eq('id', r.id);
  if (delErr) console.error(`  db delete failed for id=${r.id}: ${delErr.message}`);
  else console.log(`  deleted id=${r.id} label="${r.label}"`);
}
console.log('done');
