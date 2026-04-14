import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

async function main() {
  const file = process.argv[2] || '/tmp/batch_zh.json';
  const T = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ok = 0, fail = 0;
  for (const t of T) {
    const { error } = await sb.from('montree_classroom_curriculum_works')
      .update({ guide_content_zh: t.zh })
      .eq('classroom_id', CID)
      .ilike('name', t.name);
    if (error) { console.log('FAIL:', t.name, error.message); fail++; }
    else { console.log('OK:', t.name); ok++; }
  }
  console.log(`Done: ${ok} ok, ${fail} fail`);
}
main();
