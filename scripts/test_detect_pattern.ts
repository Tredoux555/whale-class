// scripts/test_detect_pattern.ts
// Quick smoke test for the detect_pattern tool. Run:
//   npx tsx scripts/test_detect_pattern.ts
//
// Expected: reproduce the Yo-yo sleep-pattern detection (~9 true positives).

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { detectPattern } from '../lib/montree/tracy/tools/detect_pattern';

const WHALE_SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }
  const supabase = createClient(url, key);

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
    console.error('Could not find Yo-yo in Whale Class');
    process.exit(2);
  }
  console.log(`Testing detect_pattern for ${child.name} (${child.id})`);

  // The Yo-yo sleep pattern — strict phrases that signal a rest event
  // WITHOUT matching false positives like "resting hands".
  const sleep = await detectPattern(
    {
      childId: child.id,
      schoolId: WHALE_SCHOOL_ID,
      themePhrases: [
        // Phrases that signal a rest event. Drawn from real Yo-yo records
        // (montree_behavioral_observations.behavior_description).
        'sleep',
        'sleeping',
        'lying',
        'lay down',
        'asleep',
        'slumped',
        'face-down',
        'head down',
        'rest',
        'tired',
        'lethargic',
      ],
      match: 'any',
      negativePhrases: [
        // The Yo-yo lesson: "resting hands" is the Montessori three-period
        // lesson term for finished hands on lap. NOT a rest event.
        'resting hands',
        'rest his hands',
        'rests her hands',
        'rest hands',
      ],
      daysBack: 90,
      maxQuotes: 12,
    },
    supabase
  );

  console.log('Sleep-pattern detection:', {
    ok: sleep.ok,
    error: sleep.error,
    event_count: sleep.data?.event_count,
    cluster_days: sleep.data?.cluster_days,
    weekday_distribution: sleep.data?.weekday_distribution,
    sample_quotes: sleep.data?.events.slice(0, 3).map((e) => ({
      date: e.date,
      source: e.source,
      text_preview: e.text.slice(0, 120),
    })),
  });

  // Sanity check — completely off-topic phrases should return 0 events
  const noise = await detectPattern(
    {
      childId: child.id,
      schoolId: WHALE_SCHOOL_ID,
      themePhrases: ['cucumber', 'astronaut', 'velociraptor'],
      daysBack: 365,
    },
    supabase
  );
  console.log('Off-topic phrases:', {
    ok: noise.ok,
    event_count: noise.data?.event_count,
    expected: '0 events',
  });

  console.log('detect_pattern smoke test complete');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
