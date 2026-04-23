// app/api/montree/children/[childId]/onboard/route.ts
// "Tell Guru about this child" — voice transcript → structured profile extraction + game plan
// Uses Sonnet tool_use to extract mental profile + curriculum level from teacher's spoken description
// Then generates a structured game plan with phases, goals, and works

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_MODEL, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';
import type { Locale } from '@/lib/montree/i18n/locales';
import { isValidLocale } from '@/lib/montree/i18n/locales';

export const maxDuration = 120; // 120s — profile extraction + game plan generation

interface RouteContext {
  params: Promise<{ childId: string }>;
}

const EXTRACTION_TOOL = {
  name: 'save_child_profile' as const,
  description: 'Extract and save a structured child profile from the teacher\'s description. Extract as much as you can infer from what the teacher said. Leave fields as null if the teacher didn\'t mention anything relevant.',
  input_schema: {
    type: 'object' as const,
    properties: {
      // Summary for the teacher to see
      summary: {
        type: 'string' as const,
        description: 'A warm 1-2 sentence summary confirming what you understood about the child. E.g. "Molly is an experienced Montessori learner who loves sensorial work and is just beginning her reading journey."',
      },
      // Experience level — drives curriculum seeding
      experience_level: {
        type: 'string' as const,
        enum: ['new', 'some', 'experienced', 'advanced'],
        description: 'new = first time in Montessori. some = a few months. experienced = 1-2 years. advanced = 2+ years.',
      },
      // Curriculum levels per area (0-100 scale, null if not mentioned)
      curriculum_practical_life: {
        type: ['number', 'null'] as unknown as 'number',
        description: 'Estimated progress 0-100 in Practical Life based on what teacher described. 0=not started, 25=beginning, 50=middle, 75=proficient, 100=mastered area.',
      },
      curriculum_sensorial: {
        type: ['number', 'null'] as unknown as 'number',
        description: 'Estimated progress 0-100 in Sensorial.',
      },
      curriculum_language: {
        type: ['number', 'null'] as unknown as 'number',
        description: 'Estimated progress 0-100 in Language.',
      },
      curriculum_mathematics: {
        type: ['number', 'null'] as unknown as 'number',
        description: 'Estimated progress 0-100 in Mathematics.',
      },
      curriculum_cultural: {
        type: ['number', 'null'] as unknown as 'number',
        description: 'Estimated progress 0-100 in Cultural Studies.',
      },
      // Temperament (1-5 scale, null if not mentioned)
      activity_level: { type: ['number', 'null'] as unknown as 'number', description: '1=very calm/still, 5=very active/energetic' },
      persistence: { type: ['number', 'null'] as unknown as 'number', description: '1=gives up easily, 5=extremely persistent' },
      adaptability: { type: ['number', 'null'] as unknown as 'number', description: '1=resists change, 5=adapts easily' },
      mood_quality: { type: ['number', 'null'] as unknown as 'number', description: '1=often negative/withdrawn, 5=generally happy/positive' },
      initial_reaction: { type: ['number', 'null'] as unknown as 'number', description: '1=withdraws from new things, 5=approaches eagerly' },
      intensity: { type: ['number', 'null'] as unknown as 'number', description: '1=mild reactions, 5=intense reactions' },
      distractibility: { type: ['number', 'null'] as unknown as 'number', description: '1=very focused, 5=easily distracted' },
      sensory_threshold: { type: ['number', 'null'] as unknown as 'number', description: '1=very sensitive to stimuli, 5=barely notices stimuli' },
      // Learning modality
      learning_visual: { type: ['number', 'null'] as unknown as 'number', description: '1-5 how much they learn visually' },
      learning_auditory: { type: ['number', 'null'] as unknown as 'number', description: '1-5 how much they learn by hearing' },
      learning_kinesthetic: { type: ['number', 'null'] as unknown as 'number', description: '1-5 how much they learn by doing/touching' },
      // Focus
      baseline_focus_minutes: { type: ['number', 'null'] as unknown as 'number', description: 'Typical concentration span in minutes' },
      optimal_time_of_day: { type: ['string', 'null'] as unknown as 'string', enum: ['morning', 'midday', 'afternoon', null], description: 'When the child focuses best' },
      // Context
      family_notes: { type: ['string', 'null'] as unknown as 'string', description: 'Family context mentioned (siblings, home language, etc.)' },
      special_considerations: { type: ['string', 'null'] as unknown as 'string', description: 'Special needs, allergies, sensitivities, etc.' },
      successful_strategies: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Strategies that work well with this child',
      },
      challenging_triggers: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Things that are challenging or triggering for this child',
      },
      // Sensitive periods
      sensitive_period_order: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
      sensitive_period_language: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
      sensitive_period_movement: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
      sensitive_period_sensory: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
      sensitive_period_small_objects: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
      sensitive_period_grace_courtesy: { type: ['string', 'null'] as unknown as 'string', enum: ['active', 'waning', 'complete', 'not_started', null] },
    },
    required: ['summary', 'experience_level'],
  },
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const body = await request.json();
    const { transcript, classroom_id, locale: bodyLocale } = body;
    const rawLocale = bodyLocale || getLocaleFromRequest(request.url);
    const locale: Locale = isValidLocale(rawLocale) ? rawLocale : 'en';

    if (!childId || !transcript) {
      return NextResponse.json(
        { success: false, error: 'child_id and transcript are required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI not configured' },
        { status: 500 }
      );
    }

    // Fetch child's name for context
    const supabase = getSupabase();
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, date_of_birth')
      .eq('id', childId)
      .maybeSingle() as { data: { name: string; date_of_birth: string | null } | null };

    const childName = child?.name || 'this child';
    const dob = child?.date_of_birth;
    const ageNote = dob
      ? `The child's date of birth is ${dob}.`
      : '';

    // Call Sonnet with tool_use for structured extraction
    console.log(`[Onboard] Extracting profile for ${childName} (${childId}) from ${transcript.length} char transcript`);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'save_child_profile' },
      messages: [{
        role: 'user',
        content: `You are a Montessori education expert. A teacher just described a child in their classroom. Extract everything you can about this child into a structured profile.

The child's name is ${childName}. ${ageNote}

TEACHER'S DESCRIPTION:
"${transcript}"

Extract as much as you can infer. For curriculum levels, use the 0-100 scale based on what works the teacher mentioned:
- Practical Life: pouring/spooning/cutting = 25-40, folding/sewing/food prep = 50-70, complex multi-step = 75-100
- Sensorial: pink tower/brown stair = 20-35, colour tablets/geometric solids = 40-60, binomial cube/complex = 70-100
- Language: sandpaper letters = 15-25, movable alphabet = 30-45, reading = 50-70, writing fluently = 75-100
- Mathematics: number rods/spindle = 15-25, golden beads = 30-45, stamp game/strip boards = 50-70, abstraction = 75-100
- Cultural: land/water forms = 15-30, puzzle maps = 30-50, botany/zoology = 50-70, cosmic education = 75-100

For temperament traits, infer from behavioral descriptions. "Quiet" suggests lower activity_level. "Focused for long periods" suggests high persistence and low distractibility. "Watches others first" suggests lower initial_reaction. "Gets frustrated easily" suggests low adaptability or high intensity.

If the teacher didn't mention anything about a field, leave it null. Only fill in what you can reasonably infer.

Create a warm summary that confirms back to the teacher what you understood.`,
      }],
    });

    // Extract tool_use result
    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error('[Onboard] No tool_use in response:', response.content);
      return NextResponse.json(
        { success: false, error: 'AI extraction failed' },
        { status: 500 }
      );
    }

    const extracted = toolBlock.input as Record<string, unknown>;
    console.log(`[Onboard] Extracted profile for ${childName}:`, JSON.stringify(extracted).slice(0, 500));

    // Save mental profile
    // Helper: validate sensitive period value (DB has CHECK constraint)
    const VALID_SP = new Set(['active', 'waning', 'complete', 'not_started']);
    const validSP = (v: unknown, fallback: string): string => {
      return typeof v === 'string' && VALID_SP.has(v) ? v : fallback;
    };

    // Helper: clamp to INT 1-5 range (DB has CHECK constraints that reject floats/out-of-range)
    const clamp15 = (v: unknown): number | null => {
      if (v == null) return null;
      const n = Math.round(Number(v));
      if (isNaN(n)) return null;
      return Math.max(1, Math.min(5, n));
    };

    const profileData: Record<string, unknown> = {
      child_id: childId,
      // Temperament (clamped to INT 1-5 — DB rejects floats/out-of-range)
      temperament_activity_level: clamp15(extracted.activity_level),
      temperament_regularity: null, // Not typically inferred from voice
      temperament_initial_reaction: clamp15(extracted.initial_reaction),
      temperament_adaptability: clamp15(extracted.adaptability),
      temperament_intensity: clamp15(extracted.intensity),
      temperament_mood_quality: clamp15(extracted.mood_quality),
      temperament_distractibility: clamp15(extracted.distractibility),
      temperament_persistence: clamp15(extracted.persistence),
      temperament_sensory_threshold: clamp15(extracted.sensory_threshold),
      // Learning modality (also 1-5)
      learning_modality_visual: clamp15(extracted.learning_visual),
      learning_modality_auditory: clamp15(extracted.learning_auditory),
      learning_modality_kinesthetic: clamp15(extracted.learning_kinesthetic),
      // Focus
      baseline_focus_minutes: extracted.baseline_focus_minutes != null ? Math.round(Number(extracted.baseline_focus_minutes)) || null : null,
      optimal_time_of_day: extracted.optimal_time_of_day ?? null,
      // Sensitive periods
      sensitive_period_order: validSP(extracted.sensitive_period_order, 'active'),
      sensitive_period_language: validSP(extracted.sensitive_period_language, 'active'),
      sensitive_period_movement: validSP(extracted.sensitive_period_movement, 'active'),
      sensitive_period_sensory: validSP(extracted.sensitive_period_sensory, 'active'),
      sensitive_period_small_objects: validSP(extracted.sensitive_period_small_objects, 'not_started'),
      sensitive_period_grace_courtesy: validSP(extracted.sensitive_period_grace_courtesy, 'not_started'),
      // Context
      family_notes: extracted.family_notes ?? null,
      special_considerations: extracted.special_considerations ?? null,
      successful_strategies: extracted.successful_strategies ?? [],
      challenging_triggers: extracted.challenging_triggers ?? [],
      // updated_by is UUID — use the authenticated teacher's userId
      updated_by: auth.userId,
    };

    const { error: profileError } = await supabase
      .from('montree_child_mental_profiles')
      .upsert(profileData as Record<string, unknown>, { onConflict: 'child_id' });

    if (profileError) {
      console.error('[Onboard] Profile save error:', profileError);
      // This IS fatal — if profile doesn't save, the onboarding card will reappear
      return NextResponse.json(
        { success: false, error: `Profile save failed: ${profileError.message}` },
        { status: 500 }
      );
    }
    console.log(`[Onboard] Profile saved for ${childName}`);

    // Save raw transcript as a teacher note for guru context
    try {
      await supabase
        .from('montree_teacher_notes')
        .insert({
          classroom_id: classroom_id || auth.classroomId,
          child_id: childId,
          school_id: auth.schoolId,
          content: `[Voice Onboard] ${transcript}`,
          created_by: auth.userId,
        } as Record<string, unknown>);
      console.log(`[Onboard] Voice transcript saved as teacher note for ${childName}`);
    } catch (noteErr) {
      console.error('[Onboard] Teacher note save error:', noteErr);
      // Non-fatal
    }

    // Seed approximate curriculum positions if classroom_id provided
    const expLevel = extracted.experience_level as string;
    const cid = classroom_id || auth.classroomId;
    if (cid && expLevel !== 'new') {
      try {
        await seedCurriculumPositions(supabase, childId, cid, extracted);
        console.log(`[Onboard] Curriculum positions seeded for ${childName} (${expLevel})`);
      } catch (seedErr) {
        console.error('[Onboard] Curriculum seed error:', seedErr);
        // Non-fatal
      }
    }

    // ── GAME PLAN GENERATION ──
    // After profile is saved, generate a structured game plan for this child
    // using the teacher's transcript + extracted profile data
    let gamePlan: Record<string, unknown> | null = null;
    try {
      gamePlan = await generateGamePlan(
        childName,
        transcript,
        extracted,
        cid,
        ageNote,
        locale,
      );
      if (gamePlan) {
        await updateChildSettings(childId, { game_plan: gamePlan });
        console.log(`[Onboard] Game plan saved for ${childName}`);
      }
    } catch (planErr) {
      console.error('[Onboard] Game plan generation error:', planErr);
      // Non-fatal — profile is already saved, game plan can be generated later
    }

    return NextResponse.json({
      success: true,
      summary: extracted.summary,
      experience_level: expLevel,
      game_plan: gamePlan,
    });

  } catch (error) {
    console.error('[Onboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Seed curriculum positions based on extracted levels.
 * For each area with a level > 0, mark works up to that percentage as "mastered"
 * and the next few as "practicing" / "presented".
 */
async function seedCurriculumPositions(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  classroomId: string,
  extracted: Record<string, unknown>,
) {
  const AREAS = [
    { key: 'practical_life', field: 'curriculum_practical_life' },
    { key: 'sensorial', field: 'curriculum_sensorial' },
    { key: 'language', field: 'curriculum_language' },
    { key: 'mathematics', field: 'curriculum_mathematics' },
    { key: 'cultural', field: 'curriculum_cultural' },
  ];

  // Default levels based on experience_level for areas not specifically mentioned
  const expLevel = extracted.experience_level as string;
  const defaultLevel = expLevel === 'advanced' ? 60 : expLevel === 'experienced' ? 40 : expLevel === 'some' ? 20 : 0;

  for (const area of AREAS) {
    const level = (extracted[area.field] as number | null) ?? defaultLevel;
    if (level <= 0) continue;

    // Fetch ordered works for this area in this classroom
    const { data: areaRow } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('area_key', area.key)
      .maybeSingle() as { data: { id: string } | null };

    if (!areaRow) continue;

    const { data: works } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, sequence')
      .eq('classroom_id', classroomId)
      .eq('area_id', areaRow.id)
      .order('sequence', { ascending: true }) as { data: Array<{ id: string; name: string; sequence: number }> | null };

    if (!works || works.length === 0) continue;

    // Calculate cutoff: level% of works are "mastered"
    const masteredCount = Math.floor(works.length * (level / 100));
    const practicingCount = Math.min(2, works.length - masteredCount);

    const upserts: Array<{
      child_id: string;
      work_name: string;
      work_id: string;
      classroom_id: string;
      area: string;
      status: string;
    }> = [];

    for (let i = 0; i < works.length && i < masteredCount + practicingCount + 1; i++) {
      const status = i < masteredCount
        ? 'mastered'
        : i < masteredCount + practicingCount
          ? 'practicing'
          : 'presented';

      upserts.push({
        child_id: childId,
        work_name: works[i].name,
        area: area.key,
        status,
        updated_at: new Date().toISOString(),
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('montree_child_progress')
        .upsert(upserts as unknown as Record<string, unknown>[], { onConflict: 'child_id,work_name' });

      if (error) {
        console.error(`[Onboard] Progress seed error for ${area.key}:`, error);
      }
    }
  }
}

// ──────────────────────────────────────────────────────────
// GAME PLAN GENERATION
// ──────────────────────────────────────────────────────────

const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description: 'Create a brief, warm game plan nudge for a tired teacher. This is NOT a lesson plan — it is a compass heading. One sentence the teacher reads in 2 seconds and knows where to start.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nudge: {
        type: 'string' as const,
        description: 'One warm, practical sentence that tells the teacher where to start with this child. Speaks directly to the teacher. Max 25 words. E.g. "She needs to feel safe before she can learn. Practical Life is her anchor — name everything she touches in English."',
      },
      works: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '3-5 specific Montessori works to present first. Use EXACT names from the classroom curriculum. These are the starting point, not a full plan.',
      },
      direction: {
        type: 'string' as const,
        description: 'The area progression in arrow format, max 5 words. E.g. "Practical Life → Sensorial → Language"',
      },
    },
    required: ['nudge', 'works', 'direction'],
  },
};

async function generateGamePlan(
  childName: string,
  transcript: string,
  extractedProfile: Record<string, unknown>,
  classroomId: string | undefined,
  ageNote: string,
  locale: Locale = 'en',
): Promise<Record<string, unknown> | null> {
  if (!anthropic) return null;

  // Fetch available curriculum works for context (so the plan references real works)
  let availableWorks = '';
  if (classroomId) {
    try {
      const supabase = getSupabase();
      const { data: areas } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroomId);

      if (areas && areas.length > 0) {
        const typedAreas = areas as Array<{ id: string; area_key: string }>;
        const worksByArea: Record<string, string[]> = {};
        for (const area of typedAreas) {
          const { data: works } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('name, name_chinese')
            .eq('classroom_id', classroomId)
            .eq('area_id', area.id)
            .order('sequence', { ascending: true })
            .limit(15);
          if (works && works.length > 0) {
            worksByArea[area.area_key] = (works as Array<{ name: string; name_chinese: string | null }>)
              .map(w => (locale === 'zh' && w.name_chinese) ? w.name_chinese : w.name);
          }
        }
        availableWorks = Object.entries(worksByArea)
          .map(([area, names]) => `${area}: ${names.join(', ')}`)
          .join('\n');
      }
    } catch (err) {
      console.error('[Onboard] Error fetching works for game plan:', err);
    }
  }

  const expLevel = extractedProfile.experience_level || 'new';
  const profileSummary = extractedProfile.summary || '';

  const languageNote = locale === 'zh'
    ? '\n\nIMPORTANT: Write the nudge AND direction IN CHINESE (简体中文). Use the Chinese work names from CLASSROOM WORKS exactly as provided.'
    : '';

  const prompt = `A teacher just described a child. Give them a compass heading — not a lesson plan.

CHILD: ${childName} | ${ageNote} | Experience: ${expLevel}
TEACHER SAID: "${transcript}"
${extractedProfile.family_notes ? `FAMILY: ${extractedProfile.family_notes}` : ''}
${availableWorks ? `CLASSROOM WORKS (use EXACT names):\n${availableWorks}` : ''}

Write ONE warm sentence a tired teacher reads in 2 seconds and knows where to start. Then pick 3-5 works to present first. Keep it human.${languageNote}`;

  console.log(`[Onboard] Generating game plan for ${childName} (Haiku)...`);

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 500,
    tools: [GAME_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'create_game_plan' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    console.error('[Onboard] No tool_use in game plan response');
    return null;
  }

  const plan = toolBlock.input as Record<string, unknown>;

  // Wrap with metadata
  return {
    ...plan,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    child_name: childName,
    source: 'onboard',
  };
}
