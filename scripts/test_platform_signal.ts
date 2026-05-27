// scripts/test_platform_signal.ts
// Smoke test for get_platform_signal — counts should be plausible
// (Whale Class alone yields >0 schools, >0 children, >0 observations).
//
//   npx tsx scripts/test_platform_signal.ts

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getPlatformSignal } from '../lib/montree/mira/tools/get_platform_signal';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const result = await getPlatformSignal(supabase);
  if (!result.ok) {
    console.error('FAILED:', result.error);
    process.exit(2);
  }
  console.log('Platform signal:', result.data);
  console.log('From cache:', result.from_cache);

  // Second call should hit the cache.
  const second = await getPlatformSignal(supabase);
  console.log('Second call from_cache:', second.from_cache);
  if (!second.from_cache) {
    console.warn('Expected second call to hit cache');
  }
}
main().catch((e) => {
  console.error('threw:', e);
  process.exit(1);
});
