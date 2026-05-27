// scripts/test_consult_guru.ts
// Quick smoke test for the consult_guru tool. Run:
//   npx tsx scripts/test_consult_guru.ts
// or:
//   node --import tsx scripts/test_consult_guru.ts
//
// Expected: returns analyses for Yo-yo (Whale Class) if any Guru chats exist.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { consultGuru } from '../lib/montree/tracy/tools/consult_guru';

const WHALE_SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // Find Yo-yo's child id within Whale Class
  const { data: classrooms } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('school_id', WHALE_SCHOOL_ID);
  const classroomIds = (classrooms || []).map((c) => c.id);
  const { data: kids } = await supabase
    .from('montree_children')
    .select('id, name')
    .in('classroom_id', classroomIds)
    .ilike('name', '%yo-yo%')
    .limit(1);
  const child = kids?.[0];
  if (!child) {
    console.error('Could not find Yo-yo in Whale Class — try with another child');
    process.exit(2);
  }
  console.log(`Testing consult_guru for ${child.name} (${child.id})`);

  // Test 1 — no keywords (most recent)
  const all = await consultGuru(
    { childId: child.id, schoolId: WHALE_SCHOOL_ID, limit: 5 },
    supabase
  );
  console.log('No-keywords result:', {
    ok: all.ok,
    error: all.error,
    count: all.data?.analyses.length,
    total: all.data?.total_matches,
  });

  // Test 2 — sleep-themed keywords
  const sleep = await consultGuru(
    {
      childId: child.id,
      schoolId: WHALE_SCHOOL_ID,
      topicKeywords: ['sleep', 'rest', 'regulation', 'tired'],
      limit: 5,
    },
    supabase
  );
  console.log('Sleep-keyword result:', {
    ok: sleep.ok,
    error: sleep.error,
    count: sleep.data?.analyses.length,
    keyword_filtered: sleep.data?.keyword_filtered,
    first_insight: sleep.data?.analyses[0]?.insight.slice(0, 100),
  });

  // Test 3 — cross-school isolation (use a fake school id)
  const isolated = await consultGuru(
    {
      childId: child.id,
      schoolId: '00000000-0000-0000-0000-000000000000',
      limit: 5,
    },
    supabase
  );
  console.log('Cross-school isolation:', {
    ok: isolated.ok,
    error: isolated.error,
    expected: 'ok=false, error contains "does not belong"',
  });

  console.log('consult_guru smoke test complete');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
