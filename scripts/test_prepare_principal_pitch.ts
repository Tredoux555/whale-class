// scripts/test_prepare_principal_pitch.ts
// Full Sonnet call — ~$0.05 — to produce a real pitch dossier.
//
// Run:
//   npx tsx scripts/test_prepare_principal_pitch.ts > /tmp/pitch_dossier.md
//
// Expected: a 1500-2500 word pitch dossier with all 9 sections from the
// pitch-prep prompt + a real "what's in it for you?" commission section.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { preparePitch } from '../lib/montree/mira/tools/prepare_principal_pitch';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key || !anthropicKey) {
    console.error('Missing env');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  // Use an arbitrary UUID as the agent id — preparePitch doesn't validate
  // it against the DB (the route does that upstream).
  const FAKE_AGENT_ID = '11111111-1111-1111-1111-111111111111';

  console.error('Building principal-pitch dossier...');
  const result = await preparePitch({
    principalName: 'Mrs Chen',
    schoolName: 'Yuhua International Montessori',
    schoolSize: '250 students across 15 classrooms',
    country: 'China (Beijing)',
    language: 'zh',
    knownPainPoints: [
      'two senior teachers near burnout from Friday afternoon paperwork',
      'expectation-driven Chinese parents want clear academic progress reports',
      'principal is bilingual but Chinese-speaking admin team handles operations',
    ],
    relationship:
      'agent met principal at a Montessori event in Beijing; principal is sophisticated, has heard the elevator and asked for a 30-minute deeper conversation',
    agentId: FAKE_AGENT_ID,
    outputFormat: 'markdown',
    anthropic,
    supabase,
  });

  if (!result.ok) {
    console.error('FAILED:', result.error);
    process.exit(2);
  }
  const d = result.data!;
  console.error('---');
  console.error(`Generated for: ${d.principal_name} (${d.school_name})`);
  console.error(`From cache: ${d.from_cache}`);
  console.error(`Cost: $${d.cost_usd?.toFixed(4) ?? 'n/a'}`);
  console.error(`Tokens in/out: ${d.input_tokens}/${d.output_tokens}`);
  console.error(`Generation: ${d.generation_ms}ms`);
  console.error('Platform signal:', d.platform_signal);
  console.error(`Cache active: ${d.cache_active}`);
  console.error('---');
  console.error('Payload:');
  console.error('');
  console.log(d.payload);
}

main().catch((e) => {
  console.error('threw:', e);
  process.exit(1);
});
