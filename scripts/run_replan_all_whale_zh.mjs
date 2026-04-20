// One-off: regenerate game plans for every Whale Class child in CHINESE locale.
// Mirrors run_replan_all_whale.mjs but passes locale='zh' so Haiku generates
// nudge, direction, and work names in Chinese. Run after Phase 2 localization
// fixes land so all 20 stored game plans are in Chinese.

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

// Chinese area names for the direction arrow
const AREA_LABELS_ZH = {
  practical_life: '日常',
  sensorial: '感官',
  mathematics: '数学',
  language: '语言',
  cultural: '文化',
};

const GAME_PLAN_TOOL = {
  name: 'create_game_plan',
  description:
    '为疲惫的老师创建简短的游戏计划。一句话提示，3-5个新工作（不要重复上周的），方向用区域箭头表示。',
  input_schema: {
    type: 'object',
    properties: {
      nudge: {
        type: 'string',
        description: '一句温暖的话，疲惫的老师2秒内能读完。描述前进方向。',
      },
      works: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 5,
        description:
          '恰好5个工作——每个区域一个（日常、感官、数学、语言、文化）。必须使用下方可用工作列表中的确切名称。',
      },
      direction: {
        type: 'string',
        description: '区域进展箭头格式，例如 "日常 → 感官 → 语言"',
      },
    },
    required: ['nudge', 'works', 'direction'],
  },
};

async function buildProgressSummary(childId) {
  const { data: progress } = await supabase
    .from('montree_child_progress')
    .select('work_name, area, status, updated_at')
    .eq('child_id', childId);

  if (!progress || progress.length === 0) return '';

  const byArea = {};
  for (const row of progress) {
    const area = row.area || 'other';
    if (!byArea[area]) byArea[area] = { mastered: [], practicing: [], presented: [] };
    const bucket = byArea[area][row.status];
    if (bucket) bucket.push(row.work_name);
  }

  const lines = [];
  for (const [area, buckets] of Object.entries(byArea)) {
    const label = AREA_LABELS_ZH[area] || area;
    const parts = [];
    if (buckets.mastered.length) parts.push(`已掌握: ${buckets.mastered.join('、')}`);
    if (buckets.practicing.length) parts.push(`练习中: ${buckets.practicing.join('、')}`);
    if (buckets.presented.length) parts.push(`已展示: ${buckets.presented.join('、')}`);
    if (parts.length) lines.push(`${label}: ${parts.join(' | ')}`);
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

  // Load curriculum work names — use Chinese names for the constraint list
  const { data: curriculumWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, name_zh, area_id')
    .eq('classroom_id', WHALE_CLASSROOM);
  const { data: curriculumAreas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key')
    .eq('classroom_id', WHALE_CLASSROOM);
  const areaIdToKey = new Map((curriculumAreas || []).map((a) => [a.id, a.area_key]));

  // Build available works list using Chinese names when available
  const worksByArea = {};
  for (const w of curriculumWorks || []) {
    const areaKey = areaIdToKey.get(w.area_id);
    if (!areaKey) continue;
    if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
    const displayName = w.name_chinese || w.name_zh || w.name;
    worksByArea[areaKey].push(displayName);
  }

  const availableWorksList = Object.entries(worksByArea)
    .map(([area, works]) => {
      const label = AREA_LABELS_ZH[area] || area;
      return `[${label}] ${works.join('、')}`;
    })
    .join('\n');

  const prompt = `为这个孩子制定下周计划。必须向前发展——这不是回顾。

孩子: ${childName}
上次提示: "${previousNudge}"
上周工作（不要重复）: ${JSON.stringify(previousWorks)}

${progressSummary ? `进度:\n${progressSummary}` : '暂无进度数据。'}
${recentNotes ? `近期笔记:\n${recentNotes}` : ''}
${profile?.family_notes ? `家庭信息: ${profile.family_notes}` : ''}

本教室可用工作——你必须使用列表中的确切名称:
${availableWorksList}

重要: 请完全使用中文回答。
- 提示语用中文写。
- 方向箭头使用中文区域名称: 日常、感官、数学、语言、文化。
- 使用上方可用工作列表中的确切中文工作名称。
- 方向示例: "日常 → 感官 → 语言"

规则:
1. 恰好选择5个工作——每个区域一个（日常、感官、数学、语言、文化）。每个区域都必须覆盖。
2. 不要选择上周工作中的任何工作。
3. 完全按照可用工作列表中的名称复制——不要改写、缩短或重命名。
4. 自然进展: 如果掌握了粉红塔，就进入棕色梯，而不是回到粉红塔。
5. 提示描述前进方向: "准备好X"、"带她进入Y"——不要说"继续"。

老师的下一步是什么？`;

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
    source: 'weekly_wrap_manual_run_zh',
    locale: 'zh',
  };

  // Persist plan
  await supabase
    .from('montree_children')
    .update({ settings: { ...settings, game_plan: updatedPlan } })
    .eq('id', childId);

  // Wipe old shelf
  await supabase.from('montree_child_focus_works').delete().eq('child_id', childId);

  // Build lookup maps for both Chinese and English names
  const zhToWork = new Map();
  const enToWork = new Map();
  for (const w of curriculumWorks || []) {
    const areaKey = areaIdToKey.get(w.area_id);
    if (!areaKey) continue;
    if (w.name_chinese) zhToWork.set(w.name_chinese.toLowerCase(), { match: w, areaKey });
    if (w.name_zh) zhToWork.set(w.name_zh.toLowerCase(), { match: w, areaKey });
    if (w.name) enToWork.set(w.name.toLowerCase(), { match: w, areaKey });
  }

  // Tokenize-tolerant fuzzy match — checks both Chinese and English names
  function fuzzyFindWork(planWorkName) {
    // For Chinese names, try character-level substring matching first
    if (/[\u4e00-\u9fff]/.test(planWorkName)) {
      const needle = planWorkName.toLowerCase();
      for (const w of curriculumWorks || []) {
        const areaKey = areaIdToKey.get(w.area_id);
        if (!areaKey) continue;
        const zhName = (w.name_chinese || w.name_zh || '').toLowerCase();
        if (zhName && (zhName.includes(needle) || needle.includes(zhName))) {
          return { match: w, areaKey, score: 0.8 };
        }
      }
    }

    // Fall back to token-based matching (works for English names)
    const planTokens = planWorkName.toLowerCase().split(/[-_\s—()\u3000]+/).filter((t) => t.length > 1);
    if (planTokens.length < 2) return null;
    let best = null;
    for (const w of curriculumWorks || []) {
      const areaKey = areaIdToKey.get(w.area_id);
      if (!areaKey) continue;
      // Check against all name variants
      for (const nameStr of [w.name, w.name_chinese, w.name_zh].filter(Boolean)) {
        const currTokens = nameStr.toLowerCase().split(/[-_\s—()\u3000]+/).filter((t) => t.length > 1);
        if (currTokens.length === 0) continue;
        let hits = 0;
        for (const pt of planTokens) {
          if (currTokens.some((ct) => ct.startsWith(pt) || pt.startsWith(ct))) hits++;
        }
        const score = hits / Math.max(planTokens.length, currTokens.length);
        if (score >= 0.6 && hits >= 2 && (!best || score > best.score)) {
          best = { match: w, areaKey, score };
        }
      }
    }
    return best;
  }

  const filledAreas = new Set();
  let filled = 0;
  for (let workName of planWorks) {
    // Strip area prefix if Haiku wrote "日常: 倒水" or "Practical Life: Pouring"
    if (workName.includes(':') || workName.includes('：')) {
      workName = workName.split(/[:：]/).pop().trim();
    }

    // Pass 1: exact match against Chinese names first, then English
    let found = zhToWork.get(workName.toLowerCase()) || enToWork.get(workName.toLowerCase());
    let match = found?.match;
    let areaKey = found?.areaKey;

    // Pass 2: fuzzy tokenized match
    if (!match || !areaKey) {
      const fuzzy = fuzzyFindWork(workName);
      if (fuzzy) {
        match = fuzzy.match;
        areaKey = fuzzy.areaKey;
        console.log(`  ↳ Fuzzy: "${workName}" → "${match.name_chinese || match.name}" (${AREA_LABELS_ZH[areaKey] || areaKey})`);
      }
    }

    if (!match || !areaKey || filledAreas.has(areaKey)) continue;
    filledAreas.add(areaKey);

    await supabase.from('montree_child_focus_works').upsert(
      {
        child_id: childId,
        classroom_id: WHALE_CLASSROOM,
        area: areaKey,
        work_name: match.name, // Always store canonical English name
        set_by: 'weekly_wrap',
        set_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,area' }
    );

    await supabase.from('montree_child_progress').upsert(
      {
        child_id: childId,
        work_name: match.name,
        area: areaKey,
        status: 'presented',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,work_name' }
    );
    filled++;
  }

  // ── Deterministic gap-fill for missing areas ──────────────────────
  const CORE_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
  const missingAreas = CORE_AREAS.filter((a) => !filledAreas.has(a));

  if (missingAreas.length > 0) {
    const prevWorkNames = new Set(
      (existingPlan.works || []).map((w) => w.toLowerCase())
    );

    for (const missingArea of missingAreas) {
      const candidates = (curriculumWorks || []).filter((w) => {
        const ak = areaIdToKey.get(w.area_id);
        return ak === missingArea && !prevWorkNames.has(w.name.toLowerCase());
      });

      if (candidates.length === 0) continue;

      const pick = candidates[Math.floor(Math.random() * candidates.length)];

      await supabase.from('montree_child_focus_works').upsert(
        {
          child_id: childId,
          classroom_id: WHALE_CLASSROOM,
          area: missingArea,
          work_name: pick.name,
          set_by: 'weekly_wrap',
          set_at: new Date().toISOString(),
        },
        { onConflict: 'child_id,area' }
      );

      await supabase.from('montree_child_progress').upsert(
        {
          child_id: childId,
          work_name: pick.name,
          area: missingArea,
          status: 'presented',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id,work_name' }
      );

      filled++;
      filledAreas.add(missingArea);
      console.log(`  ↳ Gap-fill ${AREA_LABELS_ZH[missingArea] || missingArea}: "${pick.name_chinese || pick.name}" (Haiku skipped this area)`);
    }
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

  console.log(`Found ${children?.length || 0} active children — generating Chinese game plans`);

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
