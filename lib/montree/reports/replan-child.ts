// lib/montree/reports/replan-child.ts
// Per-child replan helper used at the end of Weekly Wrap.
// "Wrap up this week" → for each child whose reports just generated cleanly,
// (a) refresh their game plan (Haiku/Sonnet via tier resolver) using their
// latest progress, then (b) wipe the current focus shelf and (c) fill it with
// the works from the new plan.
//
// Splices into app/api/montree/reports/weekly-wrap/route.ts processChild().
// Failure here MUST NOT fail the report — caller wraps in try/catch.
//
// Tier-aware: receives `model` from resolveReportModel() — never hardcodes a
// model string. Whale Class on Haiku tier today; Sonnet schools route through
// the same path with the same tool_use schema.
//
// Same DB write pattern as the canonical interactive flows so we don't drift:
//   - Game plan: lib/montree/guru/settings-helper.ts updateChildSettings({ game_plan })
//   - Shelf fill: app/api/montree/children/[childId]/fill-shelf/route.ts
//   - Plan refresh: app/api/montree/children/[childId]/game-plan/refresh/route.ts

import type Anthropic from '@anthropic-ai/sdk';
import type { Locale } from '@/lib/montree/i18n/locales';
import { logApiUsage } from '@/lib/montree/api-usage';
import { seedRecommendedWork } from '@/lib/montree/progress/seed-recommended-work';
import { AREA_LABELS_EN, AREA_LABELS_ZH, AREA_LABELS_ES } from '@/lib/montree/i18n/area-labels';

// ── Bilingual Game Plan Tool ─────────────────────────────────────────
// Haiku generates English works (canonical for DB matching) + bilingual
// nudge. Direction and works_zh are derived post-generation from DB
// lookups and area-label maps — no AI needed for those.
const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description:
    'Create a brief, warm game plan nudge for a tired teacher. One sentence they read in 2 seconds and know what to do next. Provide the nudge in ENGLISH, Chinese, and Argentine Spanish.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nudge_en: {
        type: 'string' as const,
        description:
          'One warm sentence in ENGLISH telling the teacher what to focus on next. Max 25 words.',
      },
      nudge_zh: {
        type: 'string' as const,
        description:
          'The SAME nudge translated to Chinese (中文). Max 25 words equivalent.',
      },
      nudge_es: {
        type: 'string' as const,
        description:
          'The SAME nudge translated to Argentine Spanish (Spanish with voseo: vos tenés). Max 25 words equivalent.',
      },
      works: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          'Exactly 5 works — one from EACH area (practical_life, sensorial, mathematics, language, cultural). Copy ENGLISH names EXACTLY from the AVAILABLE WORKS list.',
      },
      direction: {
        type: 'string' as const,
        description:
          'The area progression in arrow format using ENGLISH area names. Example: "Practical Life → Sensorial → Language"',
      },
    },
    required: ['nudge_en', 'nudge_zh', 'nudge_es', 'works', 'direction'],
  },
};

export interface ReplanInput {
  childId: string;
  childName: string;
  classroomId: string;
  /** School ID for API usage logging. */
  schoolId: string;
  locale: Locale;
  /** Anthropic SDK client (must be initialized — caller checks). */
  anthropic: Anthropic;
  /** Anthropic model string from resolveReportModel(). NEVER hardcoded. */
  model: string;
  /** Service-role Supabase client. Reused from the caller's request scope. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}

export interface ReplanResult {
  replanned: boolean;
  works: string[];
  /** Brief error string if replan didn't complete. Shape: 'stage: msg'. */
  error?: string;
}

/**
 * Refresh the child's game plan + clear/refill the focus shelf in-process.
 * Returns { replanned: false, error } on any failure — never throws.
 *
 * Diagnostic logging: every stage emits a `[Replan:<childName>]` log line so
 * Railway logs reveal exactly where a silent failure happened. Add new lines
 * around any new write.
 */
export async function replanChildInProcess(input: ReplanInput): Promise<ReplanResult> {
  const { childId, childName, classroomId, schoolId, anthropic, model, supabase } = input;
  // `locale` is on ReplanInput for forward compatibility (per-locale prompts) but
  // not yet consumed — Sonnet generates trilingual output in one tool call.
  void input.locale;

  const tag = `[Replan:${childName}]`;
  console.log(`${tag} START model=${model} child_id=${childId.slice(0,8)} ts=${new Date().toISOString()}`);

  try {
    // ── Stage 1: Load child + profile + progress + recent notes ────────
    const [childRes, profileRes, progressRes, notesRes] = await Promise.all([
      supabase
        .from('montree_children')
        .select('name, date_of_birth, settings')
        .eq('id', childId)
        .maybeSingle(),
      supabase
        .from('montree_child_mental_profiles')
        .select('family_notes, special_considerations, successful_strategies, challenging_triggers')
        .eq('child_id', childId)
        .maybeSingle(),
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status')
        .eq('child_id', childId),
      supabase
        .from('montree_teacher_notes')
        .select('content, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const child = childRes.data as
      | { name: string; date_of_birth: string | null; settings: Record<string, unknown> | null }
      | null;
    if (!child) {
      return { replanned: false, works: [], error: 'load: child not found' };
    }

    const existingPlan = (child.settings?.game_plan as Record<string, unknown>) || {};
    const profile = profileRes.data as {
      family_notes?: string | null;
      special_considerations?: string | null;
    } | null;
    const progress = (progressRes.data || []) as Array<{
      work_name: string;
      area: string;
      status: string;
    }>;
    const notes = (notesRes.data || []) as Array<{ content: string; created_at: string }>;

    // ── Stage 2: Build progress summary for the prompt ─────────────────
    const progressByArea: Record<
      string,
      { mastered: string[]; practicing: string[]; presented: string[] }
    > = {};
    for (const p of progress) {
      if (!progressByArea[p.area]) {
        progressByArea[p.area] = { mastered: [], practicing: [], presented: [] };
      }
      const bucket =
        p.status === 'mastered' ? 'mastered' : p.status === 'practicing' ? 'practicing' : 'presented';
      progressByArea[p.area][bucket].push(p.work_name);
    }

    const progressSummary = Object.entries(progressByArea)
      .map(([area, data]) => {
        const parts: string[] = [];
        if (data.mastered.length) parts.push(`mastered: ${data.mastered.join(', ')}`);
        if (data.practicing.length) parts.push(`practicing: ${data.practicing.join(', ')}`);
        if (data.presented.length) parts.push(`presented: ${data.presented.join(', ')}`);
        return `${area}: ${parts.join(' | ')}`;
      })
      .join('\n');

    const recentNotes = notes
      .map((n) => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`)
      .join('\n');

    const previousNudge =
      (existingPlan as Record<string, unknown>).nudge ||
      (existingPlan as Record<string, unknown>).headline ||
      '';
    const previousWorks =
      (existingPlan as Record<string, unknown>).works ||
      ((existingPlan as Record<string, unknown>).phases as Array<Record<string, unknown>> | undefined)?.[0]
        ?.works ||
      [];

    // ── Stage 2.5: Load curriculum work names to constrain Haiku ──────
    // Feed the actual work list into the prompt so Haiku picks from real
    // names instead of paraphrasing. Eliminates the fuzzy-match problem.
    const [promptAreasRes, promptWorksRes] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroomId),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('name, name_chinese, area_id')
        .eq('classroom_id', classroomId),
    ]);

    const promptAreas = (promptAreasRes.data || []) as Array<{ id: string; area_key: string }>;
    const promptAreaIdToKey: Record<string, string> = {};
    for (const a of promptAreas) promptAreaIdToKey[a.id] = a.area_key;

    // Always feed ENGLISH names to Haiku — canonical for DB matching.
    // Chinese names are resolved post-generation from the DB.
    const worksByArea: Record<string, string[]> = {};
    // Build English→Chinese lookup for post-generation resolution
    const enToZhWorkName: Record<string, string> = {};
    for (const w of (promptWorksRes.data || []) as Array<{ name: string; name_chinese: string | null; area_id: string }>) {
      const areaKey = promptAreaIdToKey[w.area_id];
      if (!areaKey) continue;
      if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
      worksByArea[areaKey].push(w.name);
      if (w.name_chinese) {
        enToZhWorkName[w.name.toLowerCase()] = w.name_chinese;
      }
    }

    const availableWorksList = Object.entries(worksByArea)
      .map(([area, works]) => `[${area}] ${works.join(', ')}`)
      .join('\n');

    const prompt = `Plan NEXT WEEK for this child. Forward progression is mandatory — this is not a recap.

IMPORTANT — TRILINGUAL OUTPUT:
- Write nudge_en in English, nudge_zh in Chinese (中文), and nudge_es in Argentine Spanish (voseo: vos tenés).
- All three nudges say the same thing.
- Pick works using their ENGLISH names from the AVAILABLE WORKS list.
- Write the direction using ENGLISH area names (e.g. "Practical Life → Sensorial → Language").

CHILD: ${childName}
PREVIOUS NUDGE: "${typeof previousNudge === 'object' ? (previousNudge as Record<string, string>).en || '' : previousNudge}"
PREVIOUS WORKS (last week's shelf — DO NOT REPEAT): ${JSON.stringify(
      Array.isArray(previousWorks)
        ? previousWorks
        : typeof previousWorks === 'object' && previousWorks !== null
          ? (previousWorks as Record<string, string[]>).en || []
          : []
    )}

${progressSummary ? `PROGRESS:\n${progressSummary}` : 'No progress data yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}

AVAILABLE WORKS IN THIS CLASSROOM — you MUST pick from this list using EXACT ENGLISH names as written:
${availableWorksList}

LANGUAGE PREREQUISITE CHAIN (MANDATORY — do NOT skip steps):
- Sound Games → Sandpaper Letters → Moveable Alphabet → CVC word building
- Pink Series (CVC words, Pink CVC Words, Pink Readers) REQUIRE mastery of Sandpaper Letters AND Sound Games
- Blue Series REQUIRES mastery of Pink Series
- Green Series (Phonograms) REQUIRES mastery of Blue Series
- If the child has NOT mastered the prerequisite, pick the prerequisite instead — never jump ahead
- Check the PROGRESS section above: if Sandpaper Letters is NOT listed under "mastered", do NOT pick Pink CVC Words or any Pink Series work

RULES:
1. Pick exactly 5 works — ONE from EACH area (practical_life, sensorial, mathematics, language, cultural).
2. DO NOT pick any work from PREVIOUS WORKS.
3. Copy each name EXACTLY as written in the AVAILABLE WORKS list — do not paraphrase, shorten, or rename.
4. Natural progression: if they mastered the pink tower, move to the brown stair, not back to the pink tower.
5. The nudge describes FORWARD movement: "Ready for X", "Move her into Y" — never "continue with".
6. Spread works across all 5 curriculum areas.
7. RESPECT PREREQUISITES: Never suggest a work if its prerequisite chain is not satisfied (see LANGUAGE PREREQUISITE CHAIN above).

What's the teacher's next move?`;

    // ── Stage 3: Generate the new game plan via tool_use ───────────────
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      tools: [GAME_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'create_game_plan' },
      messages: [{ role: 'user', content: prompt }],
    });

    // Log API usage. logApiUsage() is sync void (fire-and-forget internally
    // via its own .then() chain — see lib/montree/api-usage.ts). Calling
    // .catch() on its undefined return value was throwing TypeError and
    // killing every replan at this exact line, before any DB writes ran.
    // That single misplaced .catch() is why focus_works hadn't moved
    // since April 21 even though Anthropic was charging us for the calls.
    if (response.usage) {
      try {
        logApiUsage({
          schoolId,
          classroomId,
          endpoint: '/lib/montree/reports/replan-child',
          model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });
      } catch (err) {
        console.error(`${tag} usage_log_failed (non-fatal):`, err);
      }
    }

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error(`${tag} FAIL stage=tool_block content_blocks=${response.content.length} types=${response.content.map(b => b.type).join(',')}`);
      return { replanned: false, works: [], error: 'plan: no tool_use block' };
    }

    const rawPlan = toolBlock.input as {
      nudge_en?: string; nudge_zh?: string; nudge_es?: string;
      nudge?: string; // backward compat if model ignores new schema
      works?: string[]; direction?: string;
    };
    const planWorks = (rawPlan.works || []).filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
    console.log(`${tag} STAGE_3 sonnet_returned works=${planWorks.length} direction="${rawPlan.direction || ''}" nudge_en_len=${(rawPlan.nudge_en || rawPlan.nudge || '').length}`);
    if (planWorks.length === 0) {
      console.warn(`${tag} WARN sonnet returned zero works — raw_plan=${JSON.stringify(rawPlan).slice(0, 500)}`);
    }

    // ── Build trilingual JSONB structure ─────────────────────────────
    // Works: always English from Haiku, Chinese resolved from DB, Spanish falls back to English (no name_es column)
    const worksZh = planWorks.map(w => enToZhWorkName[w.toLowerCase()] || w);
    const worksEs = planWorks; // Spanish work names fall back to English (no name_es column per design)

    // Direction: English from Haiku, Chinese and Spanish derived from area labels
    const directionEn = rawPlan.direction || '';
    let directionZh = directionEn;
    let directionEs = directionEn;
    for (const [key, enLabel] of Object.entries(AREA_LABELS_EN)) {
      directionZh = directionZh.replace(new RegExp(enLabel, 'gi'), AREA_LABELS_ZH[key] || enLabel);
      directionEs = directionEs.replace(new RegExp(enLabel, 'gi'), AREA_LABELS_ES[key] || enLabel);
    }

    // Nudge: all three from Haiku tool output
    const nudgeEn = rawPlan.nudge_en || rawPlan.nudge || '';
    const nudgeZh = rawPlan.nudge_zh || nudgeEn;
    const nudgeEs = rawPlan.nudge_es || nudgeEn;

    const updatedPlan = {
      nudge: { en: nudgeEn, zh: nudgeZh, es: nudgeEs },
      works: { en: planWorks, zh: worksZh, es: worksEs },
      direction: { en: directionEn, zh: directionZh, es: directionEs },
      generated_at: (existingPlan.generated_at as string | undefined) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      child_name: childName,
      source: 'weekly_wrap',
    };

    // Inline read-merge-write so we can SEE the write succeed (or fail).
    // The shared updateChildSettings() in guru/settings-helper.ts swallows
    // .update() errors silently — when a write quietly fails (which is what
    // was happening here), the function returns void with no signal.
    // Reuse the request-scope `supabase` client so every replan write is
    // visible in Railway logs and surfaces as a returned error.
    const { data: existingChildRow, error: readErr } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .maybeSingle();
    if (readErr) {
      console.error(`${tag} FAIL stage=settings_read msg=${readErr.message}`);
      return { replanned: false, works: planWorks, error: `settings-read: ${readErr.message}` };
    }
    const mergedSettings = {
      ...((existingChildRow?.settings as Record<string, unknown>) || {}),
      game_plan: updatedPlan,
    };
    const { error: gpWriteErr } = await supabase
      .from('montree_children')
      .update({ settings: mergedSettings })
      .eq('id', childId);
    if (gpWriteErr) {
      console.error(`${tag} FAIL stage=game_plan_write msg=${gpWriteErr.message}`);
      return { replanned: false, works: planWorks, error: `game-plan-write: ${gpWriteErr.message}` };
    }
    console.log(`${tag} STAGE_3.5 game_plan written source=weekly_wrap works=${planWorks.length}`);

    // ── Stage 4: Wipe the current focus shelf ──────────────────────────
    // Weekly Wrap is "advance to next week" — it intentionally clears the
    // shelf so the new plan's works can populate empty slots. Single-area
    // overrides the teacher made this week are ephemeral by design.
    const { error: deleteErr } = await supabase
      .from('montree_child_focus_works')
      .delete()
      .eq('child_id', childId);
    if (deleteErr) {
      console.error(`${tag} FAIL stage=shelf_clear msg=${deleteErr.message}`);
      return {
        replanned: false,
        works: planWorks,
        error: `shelf-clear: ${deleteErr.message}`,
      };
    }
    console.log(`${tag} STAGE_4 shelf_cleared`);

    if (planWorks.length === 0) {
      // Plan with no works is rare but not fatal — game plan still saved.
      console.log(`${tag} DONE early plan_saved_but_no_works_to_fill`);
      return { replanned: true, works: [] };
    }

    // ── Stage 5: Fill the shelf from the new plan's works ──────────────
    // Resolve plan work names to areas via classroom curriculum. Mirrors the
    // canonical fill-shelf route's logic: case-insensitive lookup against
    // BOTH English `name` and `name_chinese` (so zh-locale plans still hit),
    // store canonical English in DB. Empty area slots only — but we just
    // cleared, so every area is empty.
    const [areasRes, worksRes] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroomId),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('name, name_chinese, area_id')
        .eq('classroom_id', classroomId),
    ]);

    const areas = (areasRes.data || []) as Array<{ id: string; area_key: string }>;
    if (areas.length === 0) {
      return {
        replanned: true,
        works: planWorks,
        error: 'shelf-fill: no curriculum areas',
      };
    }

    const areaIdToKey: Record<string, string> = {};
    for (const a of areas) areaIdToKey[a.id] = a.area_key;

    const workToArea: Record<string, string> = {};
    const lookupToCanonical: Record<string, string> = {};
    const allCurriculumWorks = (worksRes.data || []) as Array<{
      name: string;
      name_chinese: string | null;
      area_id: string;
    }>;
    for (const w of allCurriculumWorks) {
      const areaKey = areaIdToKey[w.area_id];
      if (!areaKey) continue;
      const enKey = w.name.toLowerCase();
      workToArea[enKey] = areaKey;
      lookupToCanonical[enKey] = w.name;
      if (w.name_chinese) {
        const zhKey = w.name_chinese.toLowerCase();
        workToArea[zhKey] = areaKey;
        lookupToCanonical[zhKey] = w.name;
      }
    }

    // ── Tokenize-tolerant fuzzy matcher (Session 26 pattern) ─────────
    // Haiku generates fuzzy work names like "Bingo Phonics Review Cards"
    // when curriculum has "Bingo Phonics Review". Exact match drops these.
    // Tokenize both strings, check prefix overlap. Threshold: 60% match
    // with at least 2 token hits to prevent false positives on short names.
    function fuzzyFindWork(
      planWorkName: string,
    ): { canonicalName: string; areaKey: string } | null {
      const planTokens = planWorkName
        .toLowerCase()
        .split(/[-_\s—()\u3000]+/)
        .filter((t) => t.length > 1);
      if (planTokens.length < 2) return null; // single-token → exact only

      let best: { name: string; areaKey: string; score: number } | null = null;

      for (const w of allCurriculumWorks) {
        const areaKey = areaIdToKey[w.area_id];
        if (!areaKey) continue;
        const currTokens = w.name
          .toLowerCase()
          .split(/[-_\s—()\u3000]+/)
          .filter((t) => t.length > 1);
        if (currTokens.length === 0) continue;

        // Count plan tokens that prefix-match a curriculum token
        let hits = 0;
        for (const pt of planTokens) {
          if (currTokens.some((ct) => ct.startsWith(pt) || pt.startsWith(ct))) {
            hits++;
          }
        }

        const score = hits / Math.max(planTokens.length, currTokens.length);
        if (score >= 0.6 && hits >= 2 && (!best || score > best.score)) {
          best = { name: w.name, areaKey, score };
        }
      }

      return best ? { canonicalName: best.name, areaKey: best.areaKey } : null;
    }

    const filled: Array<{ work_name: string; area: string }> = [];
    const filledAreas = new Set<string>();
    const now = new Date().toISOString();

    for (let workName of planWorks) {
      // Strip area prefix if Haiku wrote "Practical Life: Pouring Water"
      if (workName.includes(':')) {
        workName = workName.split(':').pop()!.trim();
      }
      const key = workName.toLowerCase();
      let area = workToArea[key];
      let canonicalName = lookupToCanonical[key] || workName;

      // Fuzzy fallback when exact match fails
      if (!area) {
        const fuzzy = fuzzyFindWork(workName);
        if (fuzzy) {
          area = fuzzy.areaKey;
          canonicalName = fuzzy.canonicalName;
          console.log(
            `[Replan] Fuzzy match: "${workName}" → "${canonicalName}" (area=${area}) for ${childName}`,
          );
        }
      }

      if (!area) {
        console.log(`${tag} skip "${workName}" — no curriculum match`);
        continue;
      }
      if (filledAreas.has(area)) continue; // first match per area wins

      const { error: shelfUpsertErr } = await supabase.from('montree_child_focus_works').upsert(
        {
          child_id: childId,
          classroom_id: classroomId,
          area,
          work_name: canonicalName,
          set_at: now,
          set_by: 'weekly_wrap',
          updated_at: now,
        },
        { onConflict: 'child_id,area' },
      );
      if (shelfUpsertErr) {
        console.error(`${tag} FAIL stage=shelf_upsert area=${area} work="${canonicalName}" msg=${shelfUpsertErr.message}`);
        // Don't bail — try to fill remaining areas, surface error at end.
      }

      // Recommendation seeds the starting rung ('not_started') only — it NEVER
      // resets a work the child has already advanced (seedRecommendedWork guards
      // against downgrade). Fixes the old blind upsert that reset practicing→presented.
      await seedRecommendedWork({ supabase, childId, workName: canonicalName, area });

      filled.push({ work_name: canonicalName, area });
      filledAreas.add(area);
    }

    // ── Stage 6: Deterministic gap-fill for missing areas ────────────
    // Haiku sometimes picks 2 works from the same area despite being told
    // "one per area". When that happens, one core area is left empty.
    // Fill each gap with the first available curriculum work from that
    // area that wasn't in the previous week's plan (no AI, deterministic).
    const CORE_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const missingAreas = CORE_AREAS.filter((a) => !filledAreas.has(a));

    if (missingAreas.length > 0) {
      const prevWorksFlat = Array.isArray(previousWorks)
        ? previousWorks as string[]
        : typeof previousWorks === 'object' && previousWorks !== null
          ? ((previousWorks as Record<string, string[]>).en || [])
          : [];
      const prevWorkNames = new Set(
        prevWorksFlat.map((w: string) => w.toLowerCase()),
      );

      for (const missingArea of missingAreas) {
        // Find all curriculum works in this area
        const candidates = allCurriculumWorks.filter((w) => {
          const ak = areaIdToKey[w.area_id];
          return ak === missingArea && !prevWorkNames.has(w.name.toLowerCase());
        });

        if (candidates.length === 0) continue;

        // Pick a random candidate (avoid always recommending the first one)
        const pick = candidates[Math.floor(Math.random() * candidates.length)];

        const { error: gapShelfErr } = await supabase.from('montree_child_focus_works').upsert(
          {
            child_id: childId,
            classroom_id: classroomId,
            area: missingArea,
            work_name: pick.name,
            set_at: now,
            set_by: 'weekly_wrap',
            updated_at: now,
          },
          { onConflict: 'child_id,area' },
        );
        if (gapShelfErr) {
          console.error(`${tag} FAIL stage=gap_shelf_upsert area=${missingArea} work="${pick.name}" msg=${gapShelfErr.message}`);
        }

        await seedRecommendedWork({ supabase, childId, workName: pick.name, area: missingArea });

        filled.push({ work_name: pick.name, area: missingArea });
        filledAreas.add(missingArea);
        console.log(`${tag} gap-filled ${missingArea}="${pick.name}" (sonnet skipped this area)`);
      }
    }

    console.log(
      `${tag} DONE shelf_advanced filled=${filled.length}/${CORE_AREAS.length} (${filled
        .map((f) => `${f.area}=${f.work_name}`)
        .join(', ')})`,
    );

    return { replanned: true, works: planWorks };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`${tag} FAIL stage=unhandled msg=${msg}`, err);
    return { replanned: false, works: [], error: `unhandled: ${msg}` };
  }
}
