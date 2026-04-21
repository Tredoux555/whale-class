// Retry just Kevin
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envFile.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
    const eq = l.indexOf('='); return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, '')];
  })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const WHALE = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

const { data: kevin } = await supabase.from('montree_children').select('id, name, settings').eq('classroom_id', WHALE).ilike('name', 'kevin').maybeSingle();
if (!kevin) { console.log('Kevin not found'); process.exit(1); }

const TOOL = {
  name: 'create_game_plan',
  input_schema: {
    type: 'object',
    properties: {
      nudge: { type: 'string' },
      works: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
      direction: { type: 'string' },
    },
    required: ['nudge', 'works', 'direction'],
  },
};

const previousWorks = kevin.settings?.game_plan?.works || [];
const previousNudge = kevin.settings?.game_plan?.nudge || '';

const prompt = `Plan NEXT WEEK for Kevin. Forward progression mandatory.
PREVIOUS NUDGE: "${previousNudge}"
PREVIOUS WORKS (DO NOT REPEAT): ${JSON.stringify(previousWorks)}
HARD RULES: pick 3-5 NEW works (not from previous), spread across areas, nudge describes forward movement.
What's the teacher's next move?`;

const r = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 500,
  tools: [TOOL],
  tool_choice: { type: 'tool', name: 'create_game_plan' },
  messages: [{ role: 'user', content: prompt }],
});
const tool = r.content.find((b) => b.type === 'tool_use');
const plan = tool.input;
const updatedPlan = { ...plan, generated_at: kevin.settings?.game_plan?.generated_at || new Date().toISOString(), updated_at: new Date().toISOString(), child_name: kevin.name, source: 'weekly_wrap_manual_run' };

await supabase.from('montree_children').update({ settings: { ...(kevin.settings || {}), game_plan: updatedPlan } }).eq('id', kevin.id);
await supabase.from('montree_child_focus_works').delete().eq('child_id', kevin.id);

const { data: works } = await supabase.from('montree_classroom_curriculum_works').select('id, name, name_chinese, name_zh, area_id').eq('classroom_id', WHALE);
const { data: areas } = await supabase.from('montree_classroom_curriculum_areas').select('id, area_key').eq('classroom_id', WHALE);
const a2k = new Map(areas.map(a => [a.id, a.area_key]));
const filled = new Set();
let n = 0;
for (const wn of plan.works) {
  const m = works.find(w => w.name?.toLowerCase() === wn.toLowerCase() || w.name_chinese?.toLowerCase() === wn.toLowerCase() || w.name_zh?.toLowerCase() === wn.toLowerCase());
  if (!m) continue;
  const ak = a2k.get(m.area_id);
  if (!ak || filled.has(ak)) continue;
  filled.add(ak);
  await supabase.from('montree_child_focus_works').upsert({ child_id: kevin.id, area: ak, work_id: m.id, work_name: m.name, set_by: 'weekly_wrap', set_at: new Date().toISOString() }, { onConflict: 'child_id,area' });
  n++;
}
console.log(`✓ Kevin: ${n} works filled — "${plan.nudge}"`);
