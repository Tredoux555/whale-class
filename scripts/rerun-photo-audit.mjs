// One-shot: reset identification_status on every photo currently in the
// Whale Class audit queue (sonnet_drafted) and re-fire /photo-identification/process
// for each so the new pipeline (Session 7 + 8 corpus) gets a fresh look.
//
// Usage: node scripts/rerun-photo-audit.mjs
// Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envText = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const WHALE_CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const PROD_BASE = 'https://montree.xyz';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// 1. Find every Whale Class photo currently sonnet_drafted and not teacher_confirmed
const { data: photos, error } = await supabase
  .from('montree_media')
  .select('id, work_name, identification_status, teacher_confirmed')
  .eq('classroom_id', WHALE_CLASSROOM_ID)
  .in('identification_status', ['sonnet_drafted', 'skipped', 'failed'])
  .or('teacher_confirmed.is.null,teacher_confirmed.eq.false');

if (error) {
  console.error('Query failed:', error);
  process.exit(1);
}

console.log(`Found ${photos.length} photos to re-run`);

// 2. Reset identification_status + sonnet_draft + attempted_at so /process won't skip them
const ids = photos.map(p => p.id);
const { error: resetErr } = await supabase
  .from('montree_media')
  .update({
    identification_status: null,
    sonnet_draft: null,
    identification_attempted_at: null,
  })
  .in('id', ids);

if (resetErr) {
  console.error('Reset failed:', resetErr);
  process.exit(1);
}
console.log(`✓ Reset ${ids.length} rows`);

// 3. Need a teacher cookie to POST to /process. Since this script runs server-side
// with the service role, easiest is to call /process with a header the route accepts...
// BUT it requires verifySchoolRequest. So we can't bypass auth from a script.
//
// Workaround: Print the IDs and tell the user to fire them from the browser.
console.log('\nMedia IDs to fire from the browser:');
console.log(JSON.stringify(ids));
