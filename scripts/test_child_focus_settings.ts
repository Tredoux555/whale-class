// scripts/test_child_focus_settings.ts
// Verifies Session 133 — child_focus now surfaces settings JSONB
// (developmental insights, parent states, weekly advice, game plan,
// area reasons). Uses fetchChildContext directly so we can inspect the
// raw bundle without running Sonnet.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchChildContext } from '../lib/montree/tracy/frameworks/child-focus';

const WHALE_SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing env');
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
    console.error('Could not find Yo-yo');
    process.exit(2);
  }

  const context = await fetchChildContext(
    {
      id: child.id,
      name: child.name,
      age: null,
      classroom_name: 'Whale Class',
    },
    null,
    supabase
  );

  console.log('Yo-yo context shape:', {
    profile_summary: context.profile_summary?.slice(0, 100) || '(none)',
    progress_count: context.progress.length,
    observations_count: context.observations.length,
    notes_count: context.notes.length,
    evidence_summary: context.evidence_summary,
    developmental_insights_count: context.developmental_insights.length,
    parent_states_count: context.parent_states.length,
    has_parent_current_state: context.parent_current_state !== null,
    has_weekly_advice: context.weekly_advice !== null,
    has_game_plan: context.game_plan !== null,
    guru_area_reasons_keys: Object.keys(context.guru_area_reasons),
  });

  if (context.developmental_insights.length > 0) {
    console.log(
      '\nFirst developmental insight:',
      JSON.stringify(context.developmental_insights[0], null, 2).slice(0, 400)
    );
  }
  if (context.parent_current_state) {
    console.log(
      '\nCurrent parent state:',
      JSON.stringify(context.parent_current_state, null, 2).slice(0, 400)
    );
  }
  if (context.game_plan) {
    console.log(
      '\nGame plan keys:',
      Object.keys(context.game_plan)
    );
  }

  // Verify the column-name fix landed — observations should now have
  // caption populated (previously empty due to teacher_caption bug).
  const withCaptions = context.observations.filter(
    (o) => o.teacher_caption && o.teacher_caption.trim().length > 0
  );
  console.log(
    `\nObservations with captions: ${withCaptions.length}/${context.observations.length}`
  );

  console.log('child_focus settings smoke test complete');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
