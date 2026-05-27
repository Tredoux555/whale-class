// scripts/test_prepare_parent_meeting.ts
// Reproduce the Yo-yo parent-meeting dossier. The full test — calls Sonnet
// for real. ~$0.05 per run.
//
// Run:
//   npx tsx scripts/test_prepare_parent_meeting.ts
// or with output to disk:
//   npx tsx scripts/test_prepare_parent_meeting.ts > /tmp/yoyo_dossier.md
//
// Expected: a 1500-2500 word dossier matching the structure of the
// hand-built Yoyo_Sleep_Briefing_EN.md, with the right voice + script.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { preparePMeeting } from '../lib/montree/tracy/tools/prepare_parent_meeting';

const WHALE_SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
// Whale Class principal id (the founder-principal — Tredoux). Used as
// the principalId for the cache write. From CLAUDE.md.
const WHALE_PRINCIPAL_ID = '16eec1c0-bfb5-4edf-a160-059bb41803fb';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key || !anthropicKey) {
    console.error('Missing env (need SUPABASE + ANTHROPIC_API_KEY)');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

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
  console.error(`Building Yo-yo dossier (${child.id})...`);

  const result = await preparePMeeting({
    childId: child.id,
    schoolId: WHALE_SCHOOL_ID,
    principalId: WHALE_PRINCIPAL_ID,
    meetingPurpose:
      "concerns about Yo-yo's emerging sleep / rest pattern in the classroom",
    parentContext:
      "expectation-driven mother, has only ever heard positive feedback about Yo-yo at school. Does not yet know we've been counting moments. Her first instinct will be to fix or to defend; her job is to defend him.",
    outputFormat: 'markdown',
    anthropic,
    supabase,
  });

  if (!result.ok) {
    console.error('FAILED:', result.error);
    process.exit(3);
  }
  const d = result.data!;
  console.error('---');
  console.error(`Generated for: ${d.child_name}`);
  console.error(`From cache: ${d.from_cache}`);
  console.error(`Cost: $${d.cost_usd?.toFixed(4) ?? 'n/a'}`);
  console.error(`Tokens in/out: ${d.input_tokens}/${d.output_tokens}`);
  console.error(`Generation time: ${d.generation_ms}ms`);
  console.error(`Cache active: ${d.cache_active}`);
  console.error('Sources:', d.source_counts);
  console.error('---');
  console.error('Payload follows:');
  console.error('');
  console.log(d.payload);
}

main().catch((e) => {
  console.error('Test threw:', e);
  process.exit(1);
});
