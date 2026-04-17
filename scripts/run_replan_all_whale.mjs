// One-off: run the end-of-week replan for every Whale Class child NOW.
// Uses the same logic as lib/montree/reports/replan-child.ts but inlined
// so this can run as a plain node script outside the Next.js build.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq), l.slice(eq + 1).replace(/^["']|["']$/g, '')];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const WHALE_CLASSROOM = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const MODEL = 'claude-haiku-4-5';

const GAME_PLAN_TOOL = {
  name: 'create_game_plan',
  description:
    "Create a brief, tired-teacher-friendly game plan. One sentence nudge, 3-5 NEW works (not from last week), direction as area progression.",
  input_schema: {
    type: 'object',
    properties: {
      nudge: {
        type: 'string',
        description: 'One warm sentence a tired teacher reads in 2 seconds. Describe FORWARD movement.',
      },
      works: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 5,
        description: 'Exactly 5 works — one from EACH area (practical_life, sensorial, mathematics, language, cultural). Copy names EXACTLY from the AVAILABLE WORKS list.',
      },
      direction: {
        type: 'string',
        description: 'Area progression in arrow format, e.g. "Practical Life → Sensorial → Language"',
      },
    },
    required: ['nudge', 'works', 'direction'],
  },
};

async function buildProgressSummary(childId) {
  const { data: progress } = await supabase
    .from('montree_child_work_progress')
    .select('work_name, area_key, status, photos_count, updated_at')
    .eq('child_id', childId);

  if (!progress || progress.length === 0) return '';

  const byArea = {};
  for (const row of progress) {
    const area = row.area_key || 'other';
    if (!byArea[area]) byArea[area] = { mastered: [], practicing: [], presented: [] };
    const bucket = byArea[area][row.status];
    if (bucket) bucket.push(row.work_name);
  }

  const lines = [];
  for (const [area, buckets] of Object.entries(byArea)) {
    const parts = [];
    if (buckets.mastered.length) parts.push(`mastered: ${buckets.mastered.join(', ')}`);
    if (buckets.practicing.length) parts.push(`practicing: ${buckets.practicing.join(', ')}`);
    if (buckets.presented.length) parts.push(`presented: ${buckets.presented.join(', ')}`);
    if (parts.length) lines.push(`${area}: ${parts.join('; ')}`);
  }
  return lines.join('\n');
}

async function replanChild(childId, childName) {
  // Load existing plan
  const { data: child } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .maybeSingle();

  const settings = child?.settings || {};
  const existingPlan = settings.game_plan || {};
  const previousNudge = existingPlan.nudge || existingPlan.headline || '';
  const previousWorks = existingPlan.works || [];

  // Profile
  const { data: profile } = await supabase
    .from('montree_child_mental_profiles')
    .select('family_notes, temperament_activity_level, temperament_persistence')
    .eq('child_id', childId)
    .maybeSingle();

  // Recent notes (last 14d)
  const { data: notes } = await supabase
    .from('montree_teacher_notes')
    .select('note, created_at')
    .eq('child_id', childId)
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  const recentNotes = (notes || []).map((n) => `- ${n.note}`).join('\n');

  const progressSummary = await buildProgressSummary(childId);

  // Load curriculum work names to constrain Haiku to real names
  const { data: curriculumWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, name_zh, area_id')
    .eq('classroom_id', WHALE_CLASSROOM);
  const { data: curriculumAreas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key')
    .eq('classroom_id', WHALE_CLASSROOM);
  const areaIdToKey = new Map((curriculumAreas || []).map((a) => [a.id, a.area_key]));

  const worksByArea = {};
  for (const w of (curriculumWorks || [])) {
    const areaKey = areaIdToKey.get(w.area_id);
    if (!areaKey) continue;
    if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
    worksByArea[areaKey].push(w.name);
  }

  const availableWorksList = Object.entries(worksByArea)
    .map(([area, works]) => `[${area}] ${works.join(', ')}`)
    .join('\n');

  const prompt = `Plan NEXT WEEK for this child. Forward progression is mandatory — this is not a recap.

CHILD: ${childName}
PREVIOUS NUDGE: "${previousNudge}"
PREVIOUS WORKS (last week's shelf — DO NOT REPEAT): ${JSON.stringify(previousWorks)}

${progressSummary ? `PROGRESS:\n${progressSummary}` : 'No progress data yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}

AVAILABLE WORKS IN THIS CLASSROOM — you MUST pick from this list using EXACT names as written:
${availableWorksList}

RULES:
1. Pick EXACTLY 5 works — ONE from EACH area (practical_life, sensorial, mathematics, language, cultural). Every area must be covered.
2. DO NOT pick any work from PREVIOUS WORKS.
3. Copy each name EXACTLY as written in the AVAILABLE WORKS list — do not paraphrase, shorten, or rename.
4. Natural progression: if they mastered the pink tower, move to the brown stair, not back to the pink tower.
5. The nudge describes FORWARD movement: "Ready for X", "Move her into Y" — never "continue with".

What's the teacher's next move?`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    tools: [GAME_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'create_game_plan' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock) throw new Error('no tool_use');
  const newPlan = toolBlock.input;
  const planWorks = (newPlan.works || []).filter((w) => typeof w === 'string' && w.trim().length > 0);

  const updatedPlan = {
    ...newPlan,
    generated_at: existingPlan.generated_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    child_name: childName,
    source: 'weekly_wrap_manual_run',
  };

  // Persist plan
  await supabase
    .from('montree_children')
    .update({ settings: { ...settings, game_plan: updatedPlan } })
    .eq('id', childId);

  // Wipe old shelf
  await supabase.from('montree_child_focus_works').delete().eq('child_id', childId);

  // Curriculum already loaded above for prompt constraint — reuse here

  // Tokenize-tolerant fuzzy match — same algorithm as replan-child.ts
  function fuzzyFindWork(planWorkName) {
    const planTokens = planWorkName.toLowerCase().split(/[-_\s—()\u3000]+/).filter(t => t.length > 1);
    if (planTokens.length < 2) return null;
    let best = null;
    for (const w of (curriculumWorks || [])) {
      const areaKey = areaIdToKey.get(w.area_id);
      if (!areaKey) continue;
      const currTokens = w.name.toLowerCase().split(/[-_\s—()\u3000]+/).filter(t => t.length > 1);
      if (currTokens.length === 0) continue;
      let hits = 0;
      for (const pt of planTokens) {
        if (currTokens.some(ct => ct.startsWith(pt) || pt.startsWith(ct))) hits++;
      }
      const score = hits / Math.max(planTokens.length, currTokens.length);
      if (score >= 0.6 && hits >= 2 && (!best || score > best.score)) {
        best = { match: w, areaKey, score };
      }
    }
    return best;
  }

  const filledAreas = new Set();
  let filled = 0;
  for (let workName of planWorks) {
    // Strip area prefix if Haiku wrote "Practical Life: Pouring Water"
    if (workName.includes(':')) {
      workName = workName.split(':').pop().trim();
    }
    // Pass 1: exact case-insensitive match
    let match = (curriculumWorks || []).find(
      (w) =>
        w.name?.toLowerCase() === workName.toLowerCase() ||
        w.name_chinese?.toLowerCase() === workName.toLowerCase() ||
        w.name_zh?.toLowerCase() === workName.toLowerCase()
    );
    let areaKey = match ? areaIdToKey.get(match.area_id) : null;

    // Pass 2: fuzzy tokenized match
    if (!match || !areaKey) {
      const fuzzy = fuzzyFindWork(workName);
      if (fuzzy) {
        match = fuzzy.match;
        areaKey = fuzzy.areaKey;
        console.log(`  ↳ Fuzzy: "${workName}" → "${match.name}" (${areaKey})`);
      }
    }

    if (!match || !areaKey || filledAreas.has(areaKey)) continue;
    filledAreas.add(areaKey);

    await supabase.from('montree_child_focus_works').upsert(
      {
        child_id: childId,
        area: areaKey,
        work_id: match.id,
        work_name: match.name,
        set_by: 'weekly_wrap',
        set_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,area' }
    );

    await supabase.from('montree_child_work_progress').upsert(
      {
        child_id: childId,
        work_id: match.id,
        work_name: match.name,
        area_key: areaKey,
        status: 'presented',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,work_id' }
    );
    filled++;
  }

  return { nudge: updatedPlan.nudge, works: planWorks, filled };
}

async function main() {
  const { data: children } = await supabase
    .from('montree_children')
    .select('id, name')
    .eq('classroom_id', WHALE_CLASSROOM)
    .eq('is_active', true)
    .order('name');

  console.log(`Found ${children?.length || 0} active children`);

  for (const child of children || []) {
    try {
      const result = await replanChild(child.id, child.name);
      console.log(`✓ ${child.name}: ${result.filled} works filled — "${result.nudge}"`);
    } catch (err) {
      console.error(`✗ ${child.name}: ${err.message}`);
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
