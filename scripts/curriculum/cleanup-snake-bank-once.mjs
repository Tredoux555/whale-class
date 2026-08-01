// One-off: remove the stale snake-in-my-sock book-page rows (old key names
// p1-snake/p2-star/p3-soap/p4-seal, and the OLD-CONTENT p5-recap which shares
// its key name with the new sloth recap and would otherwise be skipped as
// "already ingested" by upload-dark-phonics-book-art.mjs's insert-only dedupe).
// Deletes both the storage object and the DB row for each match.
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
  'snake-in-my-sock p1-snake',
  'snake-in-my-sock p2-star',
  'snake-in-my-sock p3-soap',
  'snake-in-my-sock p4-seal',
  'snake-in-my-sock p5-recap',
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
