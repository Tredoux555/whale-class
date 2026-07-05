// lib/montree/reports/replan-child.ts
// Per-child replan helper used at the end of Weekly Wrap.
//
// 🚨 MONTESSORI INVARIANT (do NOT weaken this):
// A work leaves a child's focus shelf ONLY when the teacher has marked it
// MASTERED. Nothing about a week rolling over — or a report being (re)generated
// — may move, swap, or re-roll a work the child is still working on. When a work
// IS mastered, its slot advances to the NEXT work in that area's curriculum
// sequence (the first the child hasn't touched). Empty area slots seed the first
// developmentally-appropriate untouched work. All of this is DETERMINISTIC — no
// AI chooses works, ever. This mirrors advance-shelf-after-mastery.ts, which
// already does the same thing in real time on a mastery mark.
//
// History: the previous version of this file WIPED the whole shelf every wrap and
// refilled it from a temperature-1.0 LLM that was prompted to "always move
// forward, never repeat last week." For a brand-new child with nothing mastered
// that abandoned the hand-set starter shelf and produced a different random
// advanced set on every regenerate — the shelf "jumped around like a jack in the
// box." That is fixed here by removing the wipe + the LLM work-selection entirely.
//
// The LLM is now used ONLY for the warm trilingual "nudge" sentence (text), at
// temperature:0, AFTER the deterministic shelf is already written — so an LLM
// failure can never disturb the shelf, and the nudge is stable across reruns.
//
// Splices into app/api/montree/reports/weekly-wrap/route.ts processChild().
// Failure here MUST NOT fail the report — caller wraps in try/catch.

import type Anthropic from '@anthropic-ai/sdk';
import type { Locale } from '@/lib/montree/i18n/locales';
import { logApiUsage } from '@/lib/montree/api-usage';
import { seedRecommendedWork } from '@/lib/montree/progress/seed-recommended-work';
import { AREA_LABELS_EN, AREA_LABELS_ZH, AREA_LABELS_ES } from '@/lib/montree/i18n/area-labels';

// ── Trilingual nudge tool (TEXT ONLY — never drives the shelf) ────────
// The `works` field is required by the schema for backward compatibility but
// is IGNORED — the shelf is computed deterministically before this runs.
const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description:
    'Write a brief, warm one-sentence nudge for a tired teacher about the works already on this child\'s shelf. Provide it in English, Chinese, and Argentine Spanish.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nudge_en: {
        type: 'string' as const,
        description:
          'One warm sentence in ENGLISH about the works already on the shelf. Max 25 words. Do NOT invent new works.',
      },
      nudge_zh: {
        type: 'string' as const,
        description: 'The SAME nudge translated to Chinese (中文). Max 25 words equivalent.',
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
          'Copy the FOCUS SHELF list from the prompt exactly (this field is ignored — the shelf is already set).',
      },
      direction: {
        type: 'string' as const,
        description: 'The areas in order, arrow format (e.g. "Practical Life → Sensorial → Language").',
      },
    },
    required: ['nudge_en', 'nudge_zh', 'nudge_es', 'works', 'direction'],
  },
};

const CORE_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

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
 * Reconcile the child's focus shelf (deterministic, mastery-driven) + refresh
 * the game-plan nudge text. Returns { replanned: false, error } on failure —
 * never throws. Every stage emits a `[Replan:<childName>]` log line.
 */
export async function replanChildInProcess(input: ReplanInput): Promise<ReplanResult> {
  const { childId, childName, classroomId, schoolId, anthropic, model, supabase } = input;
  void input.locale; // reserved for future per-locale prompts

  const tag = `[Replan:${childName}]`;
  console.log(`${tag} START model=${model} child_id=${childId.slice(0, 8)} ts=${new Date().toISOString()}`);

  try {
    // ── Stage 1: Load child + profile + progress + notes + curriculum + shelf ──
    const [childRes, profileRes, progressRes, notesRes, areasRes, worksRes, focusRes] =
      await Promise.all([
        supabase.from('montree_children').select('name, settings').eq('id', childId).maybeSingle(),
        supabase
          .from('montree_child_mental_profiles')
          .select('family_notes')
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
        supabase
          .from('montree_classroom_curriculum_areas')
          .select('id, area_key')
          .eq('classroom_id', classroomId),
        supabase
          .from('montree_classroom_curriculum_works')
          .select('name, name_chinese, sequence, area_id, is_active')
          .eq('classroom_id', classroomId),
        supabase
          .from('montree_child_focus_works')
          .select('area, work_name')
          .eq('child_id', childId),
      ]);

    const child = childRes.data as { name: string; settings: Record<string, unknown> | null } | null;
    if (!child) return { replanned: false, works: [], error: 'load: child not found' };

    const existingPlan = (child.settings?.game_plan as Record<string, unknown>) || {};
    const profile = profileRes.data as { family_notes?: string | null } | null;
    const progress = (progressRes.data || []) as Array<{ work_name: string; area: string; status: string }>;
    const notes = (notesRes.data || []) as Array<{ content: string; created_at: string }>;

    // area_id ↔ area_key
    const areas = (areasRes.data || []) as Array<{ id: string; area_key: string }>;
    const areaIdToKey: Record<string, string> = {};
    for (const a of areas) areaIdToKey[a.id] = a.area_key;

    // area_key → works sorted by curriculum sequence (active only); en→zh lookup
    const areaWorksSorted: Record<string, Array<{ name: string; seq: number }>> = {};
    const enToZhWorkName: Record<string, string> = {};
    for (const w of (worksRes.data || []) as Array<{
      name: string;
      name_chinese: string | null;
      sequence: number | null;
      area_id: string;
      is_active: boolean | null;
    }>) {
      if (w.name_chinese) enToZhWorkName[w.name.toLowerCase()] = w.name_chinese;
      if (w.is_active === false) continue;
      const ak = areaIdToKey[w.area_id];
      if (!ak) continue;
      (areaWorksSorted[ak] ||= []).push({ name: w.name, seq: w.sequence ?? 1_000_000 });
    }
    for (const ak of Object.keys(areaWorksSorted)) {
      // Stable tiebreak on name so null/duplicate sequences don't make the
      // seeded/advanced work vary across reruns (determinism guarantee).
      areaWorksSorted[ak].sort((a, b) => a.seq - b.seq || a.name.localeCompare(b.name));
    }

    // Current shelf: area_key → work_name (one row per area by construction)
    const currentShelf: Record<string, string> = {};
    for (const fw of (focusRes.data || []) as Array<{ area: string; work_name: string }>) {
      currentShelf[fw.area] = fw.work_name;
    }

    // Progress: status per work + the set of every work the child has touched.
    // statusByWork is keyed by AREA::work so a work_name that legitimately exists
    // in two areas (e.g. a "Sorting"/"Matching" work) can't cross-contaminate the
    // KEEP/advance decision — and a miss defaults to KEEP, never a false advance.
    // touched stays work_name-only (matches advance-shelf-after-mastery.ts): a
    // work the child has seen is never re-recommended into any area.
    const statusByWork: Record<string, string> = {};
    const touched = new Set<string>();
    for (const p of progress) {
      const wl = p.work_name.toLowerCase();
      statusByWork[`${p.area}::${wl}`] = p.status;
      touched.add(wl);
    }

    // ── Stage 2: Deterministic, mastery-driven shelf reconcile ──────────
    // KEEP non-mastered works. Advance a MASTERED slot to the next untouched
    // work in curriculum sequence. Seed empty area slots with the first
    // untouched work. Never delete the shelf. No AI picks works.
    const now = new Date().toISOString();
    const finalShelf: Array<{ area: string; work_name: string }> = [];
    let keptCount = 0;
    let advancedCount = 0;
    let seededCount = 0;

    const nextUntouchedInArea = (area: string): string | null => {
      const list = areaWorksSorted[area] || [];
      const hit = list.find((w) => !touched.has(w.name.toLowerCase()));
      return hit ? hit.name : null;
    };

    const placeOnShelf = async (area: string, workName: string, setBy: string) => {
      const { error: upErr } = await supabase.from('montree_child_focus_works').upsert(
        {
          child_id: childId,
          classroom_id: classroomId,
          area,
          work_name: workName,
          set_at: now,
          set_by: setBy,
          updated_at: now,
        },
        { onConflict: 'child_id,area' },
      );
      if (upErr) console.error(`${tag} FAIL stage=shelf_upsert area=${area} work="${workName}" msg=${upErr.message}`);
      // Seed the honest starting rung; NEVER downgrades an advanced work.
      await seedRecommendedWork({ supabase, childId, workName, area });
      touched.add(workName.toLowerCase());
    };

    for (const area of CORE_AREAS) {
      const current = currentShelf[area];

      if (!current) {
        // Empty slot → seed the first developmentally-appropriate untouched work.
        const next = nextUntouchedInArea(area);
        if (!next) {
          console.log(`${tag} area=${area} empty + no untouched work — left empty`);
          continue;
        }
        await placeOnShelf(area, next, 'weekly_wrap');
        finalShelf.push({ area, work_name: next });
        seededCount++;
        console.log(`${tag} area=${area} seeded="${next}" (was empty)`);
        continue;
      }

      const status = statusByWork[`${area}::${current.toLowerCase()}`] || 'not_started';

      if (status === 'mastered') {
        // The ONLY trigger for a work to leave the shelf: teacher-confirmed mastery.
        const next = nextUntouchedInArea(area);
        if (next) {
          await placeOnShelf(area, next, 'weekly_wrap_advance');
          finalShelf.push({ area, work_name: next });
          advancedCount++;
          console.log(`${tag} area=${area} advanced "${current}"(mastered) → "${next}"`);
        } else {
          // Whole area covered — leave the mastered work in the slot.
          finalShelf.push({ area, work_name: current });
          keptCount++;
          console.log(`${tag} area=${area} "${current}" mastered but area fully covered — kept`);
        }
        continue;
      }

      // not_started / presented / practicing → KEEP. The child is still on it.
      finalShelf.push({ area, work_name: current });
      keptCount++;
    }

    console.log(`${tag} SHELF reconciled kept=${keptCount} advanced=${advancedCount} seeded=${seededCount}`);

    // ── Stage 3: Warm trilingual nudge (TEXT ONLY, temperature:0) ───────
    // Runs AFTER the shelf is written, so an LLM failure never touches the shelf.
    const shelfWorksEn = finalShelf.map((f) => f.work_name);
    const progressSummary = (() => {
      const byArea: Record<string, { mastered: string[]; practicing: string[]; presented: string[] }> = {};
      for (const p of progress) {
        (byArea[p.area] ||= { mastered: [], practicing: [], presented: [] });
        const bucket = p.status === 'mastered' ? 'mastered' : p.status === 'practicing' ? 'practicing' : 'presented';
        byArea[p.area][bucket].push(p.work_name);
      }
      return Object.entries(byArea)
        .map(([area, d]) => {
          const parts: string[] = [];
          if (d.mastered.length) parts.push(`mastered: ${d.mastered.join(', ')}`);
          if (d.practicing.length) parts.push(`practicing: ${d.practicing.join(', ')}`);
          if (d.presented.length) parts.push(`presented: ${d.presented.join(', ')}`);
          return `${area}: ${parts.join(' | ')}`;
        })
        .join('\n');
    })();
    const recentNotes = notes.map((n) => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`).join('\n');

    let nudgeEn = '';
    let nudgeZh = '';
    let nudgeEs = '';
    if (shelfWorksEn.length > 0) {
      const nudgePrompt = `Write ONE warm, short sentence for a busy Montessori teacher about ${childName}'s current focus shelf. Encourage what is ALREADY on the shelf — do NOT invent or suggest new works.

FOCUS SHELF (already decided — do not change): ${shelfWorksEn.join(', ')}
${progressSummary ? `PROGRESS:\n${progressSummary}` : 'This child is just getting started — nothing mastered yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}

Return nudge_en (English, max 25 words), nudge_zh (Chinese), nudge_es (Argentine Spanish, voseo). For "works", copy the FOCUS SHELF list exactly. For "direction", list the areas in order.`;

      try {
        const nudgeResp = await anthropic.messages.create({
          model,
          max_tokens: 320,
          temperature: 0,
          tools: [GAME_PLAN_TOOL],
          tool_choice: { type: 'tool', name: 'create_game_plan' },
          messages: [{ role: 'user', content: nudgePrompt }],
        });
        if (nudgeResp.usage) {
          try {
            logApiUsage({
              schoolId,
              classroomId,
              endpoint: '/lib/montree/reports/replan-child',
              model,
              inputTokens: nudgeResp.usage.input_tokens,
              outputTokens: nudgeResp.usage.output_tokens,
            });
          } catch (e) {
            console.error(`${tag} usage_log_failed (non-fatal):`, e);
          }
        }
        const tb = nudgeResp.content.find((b) => b.type === 'tool_use');
        if (tb && tb.type === 'tool_use') {
          const rp = tb.input as { nudge_en?: string; nudge_zh?: string; nudge_es?: string; nudge?: string };
          nudgeEn = rp.nudge_en || rp.nudge || '';
          nudgeZh = rp.nudge_zh || nudgeEn;
          nudgeEs = rp.nudge_es || nudgeEn;
        }
      } catch (nudgeErr) {
        console.error(`${tag} nudge_gen_failed (non-fatal, shelf already set):`, nudgeErr);
      }
    }

    // ── Stage 4: Build + persist the game plan (nudge text + the real shelf) ──
    const worksZh = shelfWorksEn.map((w) => enToZhWorkName[w.toLowerCase()] || w);
    const dirAreas = (CORE_AREAS as readonly string[]).filter((a) => finalShelf.some((f) => f.area === a));
    const directionEn = dirAreas.map((a) => AREA_LABELS_EN[a] || a).join(' → ');
    const directionZh = dirAreas.map((a) => AREA_LABELS_ZH[a] || a).join(' → ');
    const directionEs = dirAreas.map((a) => AREA_LABELS_ES[a] || a).join(' → ');

    const updatedPlan = {
      nudge: { en: nudgeEn, zh: nudgeZh, es: nudgeEs },
      works: { en: shelfWorksEn, zh: worksZh, es: shelfWorksEn },
      direction: { en: directionEn, zh: directionZh, es: directionEs },
      generated_at: (existingPlan.generated_at as string | undefined) || now,
      updated_at: now,
      child_name: childName,
      source: 'weekly_wrap',
    };

    // Read-merge-write so a silent .update() failure surfaces as a returned error.
    const { data: existingChildRow, error: readErr } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .maybeSingle();
    if (readErr) {
      console.error(`${tag} FAIL stage=settings_read msg=${readErr.message}`);
      return { replanned: false, works: shelfWorksEn, error: `settings-read: ${readErr.message}` };
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
      return { replanned: false, works: shelfWorksEn, error: `game-plan-write: ${gpWriteErr.message}` };
    }

    console.log(
      `${tag} DONE deterministic shelf=${shelfWorksEn.length} (kept=${keptCount} advanced=${advancedCount} seeded=${seededCount}) — ${finalShelf
        .map((f) => `${f.area}=${f.work_name}`)
        .join(', ')}`,
    );

    return { replanned: true, works: shelfWorksEn };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`${tag} FAIL stage=unhandled msg=${msg}`, err);
    return { replanned: false, works: [], error: `unhandled: ${msg}` };
  }
}
