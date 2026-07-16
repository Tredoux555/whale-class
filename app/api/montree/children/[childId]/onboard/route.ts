// app/api/montree/children/[childId]/onboard/route.ts
// "Tell Guru about this child" — voice transcript → structured profile extraction + game plan
// Uses Sonnet tool_use to extract mental profile + curriculum level from teacher's spoken description
// Then generates a structured game plan with phases, goals, and works

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';
import type { Locale } from '@/lib/montree/i18n/locales';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';

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
      // ── FOCUS WORKS PER AREA ──
      // Extract or strongly infer the ONE Montessori work the child is currently
      // focused on in each area. The shelf editor expects one row per area, so
      // these MUST be filled — match what the teacher said when possible, and
      // when not mentioned, take a confident best guess based on the child's
      // age + experience level + the typical Montessori progression. NEVER
      // leave these null. Use EXACT names from the AVAILABLE WORKS list in the
      // prompt so they map to real curriculum rows.
      focus_practical_life: {
        type: 'string' as const,
        description: 'Exact work name from the Practical Life section of AVAILABLE WORKS. If teacher mentioned a specific PL work for this child, use that. Otherwise pick the most likely PL work for this child\'s age and stage.',
      },
      focus_practical_life_status: {
        type: 'string' as const,
        enum: ['presented', 'practicing', 'mastered'],
        description: 'practicing if teacher said child is currently working on it; presented if just introduced or you are inferring; mastered if teacher described full proficiency.',
      },
      focus_sensorial: {
        type: 'string' as const,
        description: 'Exact work name from Sensorial. Same rules as focus_practical_life.',
      },
      focus_sensorial_status: { type: 'string' as const, enum: ['presented', 'practicing', 'mastered'] },
      focus_mathematics: {
        type: 'string' as const,
        description: 'Exact work name from Mathematics. Same rules as focus_practical_life.',
      },
      focus_mathematics_status: { type: 'string' as const, enum: ['presented', 'practicing', 'mastered'] },
      focus_language: {
        type: 'string' as const,
        description: 'Exact work name from Language. Same rules as focus_practical_life.',
      },
      focus_language_status: { type: 'string' as const, enum: ['presented', 'practicing', 'mastered'] },
      focus_cultural: {
        type: 'string' as const,
        description: 'Exact work name from Cultural. Same rules as focus_practical_life.',
      },
      focus_cultural_status: { type: 'string' as const, enum: ['presented', 'practicing', 'mastered'] },
    },
    required: [
      'summary',
      'experience_level',
      'focus_practical_life',
      'focus_practical_life_status',
      'focus_sensorial',
      'focus_sensorial_status',
      'focus_mathematics',
      'focus_mathematics_status',
      'focus_language',
      'focus_language_status',
      'focus_cultural',
      'focus_cultural_status',
    ],
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
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', code: 'invalid_json' },
        { status: 400 }
      );
    }
    const { transcript, classroom_id, locale: bodyLocale } = body as {
      transcript?: string;
      classroom_id?: string;
      locale?: string;
    };
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

    const supabase = getSupabase();

    // 🚨 Tier gate (Session 137 health check). Voice onboarding ran Sonnet,
    // hardcoded + ungated — a free school onboarding 20 children burned $2-6 of
    // Sonnet per burst. Gate it like every other AI route: free → 402; Core →
    // Haiku (sufficient for this structured extraction); Premium → Sonnet.
    const aiTier = await resolveReportModel(supabase, auth.schoolId);
    if (aiTier.tier === 'free' || !aiTier.model) {
      return NextResponse.json(
        {
          error: 'Voice onboarding requires an active AI tier.',
          tier: aiTier.tier,
          requires_upgrade: true,
          upgrade_url: '/montree/admin/billing',
          feature: 'voice_onboarding',
        },
        { status: 402 }
      );
    }

    // Fetch child's name for context
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

    // Fetch the classroom's curriculum grouped by area so Sonnet can pick
    // EXACT work names that map to real curriculum rows. Previously this fetch
    // happened only inside generateGamePlan; we now lift it up so the focus
    // work extraction has the same vocabulary.
    const cidForWorks = classroom_id || auth.classroomId;
    const worksByArea: Record<string, string[]> = {
      practical_life: [], sensorial: [], mathematics: [], language: [], cultural: [],
    };
    if (cidForWorks) {
      try {
        const { data: areas } = await supabase
          .from('montree_classroom_curriculum_areas')
          .select('id, area_key')
          .eq('classroom_id', cidForWorks);
        if (areas && areas.length > 0) {
          const typedAreas = areas as Array<{ id: string; area_key: string }>;
          for (const area of typedAreas) {
            const { data: works } = await supabase
              .from('montree_classroom_curriculum_works')
              .select('name')
              .eq('classroom_id', cidForWorks)
              .eq('area_id', area.id)
              .order('sequence', { ascending: true });
            if (works && works.length > 0 && worksByArea[area.area_key] !== undefined) {
              worksByArea[area.area_key] = (works as Array<{ name: string }>).map(w => w.name);
            }
          }
        }
      } catch (err) {
        console.error('[Onboard] Curriculum fetch for extraction failed (non-fatal):', err);
      }
    }
    const availableWorksBlock = (Object.keys(worksByArea) as Array<keyof typeof worksByArea>)
      .filter(k => worksByArea[k].length > 0)
      .map(k => `${k.toUpperCase()} (pick ONE for focus_${k}):\n${worksByArea[k].slice(0, 80).map(n => `  - ${n}`).join('\n')}`)
      .join('\n\n');

    // Call Sonnet with tool_use for structured extraction
    console.log(`[Onboard] Extracting profile for ${childName} (${childId}) from ${transcript.length} char transcript`);

    // Empty classroom curriculum → the focus_* picks have no vocabulary to map
    // to real rows. Surface it in logs at extraction time so empty-curriculum
    // classrooms are diagnosable (they still run via canonical fallbacks).
    if (availableWorksBlock === '') {
      console.warn('[Onboard] empty classroom curriculum for', cidForWorks || childId);
    }

    const summaryLanguageInstruction = getAILanguageInstruction(locale);

    let response;
    try {
      response = await anthropic.messages.create({
      model: aiTier.model,
      max_tokens: 2000,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'save_child_profile' },
      messages: [{
        role: 'user',
        content: `You are a Montessori education expert. A teacher just described a child in their classroom. Extract everything you can about this child into a structured profile.

The child's name is ${childName}. ${ageNote}

TEACHER'S DESCRIPTION:
"${transcript}"

${availableWorksBlock ? `AVAILABLE WORKS (the actual curriculum in this teacher's classroom — you MUST pick from this list when filling focus_* fields):\n\n${availableWorksBlock}\n` : ''}

Extract as much as you can infer. For curriculum levels, use the 0-100 scale based on what works the teacher mentioned:
- Practical Life: pouring/spooning/cutting = 25-40, folding/sewing/food prep = 50-70, complex multi-step = 75-100
- Sensorial: pink tower/brown stair = 20-35, colour tablets/geometric solids = 40-60, binomial cube/complex = 70-100
- Language: sandpaper letters = 15-25, movable alphabet = 30-45, reading = 50-70, writing fluently = 75-100
- Mathematics: number rods/spindle = 15-25, golden beads = 30-45, stamp game/strip boards = 50-70, abstraction = 75-100
- Cultural: land/water forms = 15-30, puzzle maps = 30-50, botany/zoology = 50-70, cosmic education = 75-100

For temperament traits, infer from behavioral descriptions. "Quiet" suggests lower activity_level. "Focused for long periods" suggests high persistence and low distractibility. "Watches others first" suggests lower initial_reaction. "Gets frustrated easily" suggests low adaptability or high intensity.

If the teacher didn't mention anything about a temperament/learning/sensitive-period field, leave it null. Only fill in what you can reasonably infer.

CRITICAL — FOCUS WORKS (5 fields, all REQUIRED, NEVER null):
The teacher's shelf editor will display ONE focus work per area. You MUST pick one work per area from the AVAILABLE WORKS list above:
- focus_practical_life, focus_sensorial, focus_mathematics, focus_language, focus_cultural

Rules for picking:
1. If the teacher EXPLICITLY mentioned a work in that area (e.g. "she's working on Pink Tower", "he's just started Sandpaper Letters"), match it to the closest exact name in AVAILABLE WORKS for that area. Status: "practicing" if they're working on it, "mastered" if teacher said proficient/done, "presented" if just introduced.
2. If the teacher did NOT mention a work in that area, take a confident BEST GUESS based on the child's age, experience_level, and the typical Montessori progression. Status: "presented" (you are inferring, not observing).
3. Match by MEANING, not just literal text. "the pink tower" → "Pink Tower", "she pours water" → "Pouring Water", "letter sounds" → "Sandpaper Letters" or first phonics work in the curriculum.
4. NEVER invent a work name. Use the EXACT spelling from AVAILABLE WORKS.
5. If AVAILABLE WORKS is empty for an area, pick a canonical Montessori starting work for that area (e.g. "Pouring Water", "Pink Tower", "Number Rods", "Sandpaper Letters", "Land and Water Forms"). The system will auto-create the curriculum row.

Listen carefully to the transcript — teachers often mention works in passing ("she just loves the brown stair", "he's getting into spindle boxes"). Don't miss those.

Create a warm summary that confirms back to the teacher what you understood. The summary should focus on what the teacher actually said about this specific child — strengths, weaknesses, current works, interests, personality — rendered back to them clearly and concisely. Mirror the teacher's own thoughts but more organized than how they said it.${summaryLanguageInstruction ? `\n\n${summaryLanguageInstruction} Write the SUMMARY field in this language. All other structured fields stay in English (they are stored values, not user-facing text).` : ''}`,
      }],
      });
    } catch (err) {
      const e = err as { message?: string; status?: number };
      console.error('[Onboard] extraction call failed', err);
      return NextResponse.json(
        {
          success: false,
          error: 'AI extraction unavailable',
          code: 'extraction_failed',
          detail: String(e?.message || err).slice(0, 300),
          anthropic_status: e?.status ?? null,
        },
        { status: 502 }
      );
    }

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

    // 🚨 Session 113 V2 polish — write enrolled_at back to montree_children
    // when voice onboarding extracts an experience_level. Previously this
    // signal drove curriculum seeding ONLY and was never reflected in the
    // child's Time-in-Program field on the Edit Student modal. Teachers
    // who said 'Amy's been with us for two years' on the voice intro
    // would see Time in Program stuck at 'Just started'.
    //
    // Mapping aligns with the existing TENURE_OPTIONS in students/page.tsx:
    //   new          → 0 months   (just enrolled)
    //   some         → 2 months   (a few months)
    //   experienced  → 15 months  (1+ years — matches '1_year_plus' tenure)
    //   advanced     → 24 months  (2+ years)
    //
    // Only writes when enrolled_at is currently NULL — never overwrites a
    // date the teacher set manually via Edit Student. Voice extraction is
    // a best-guess; manual edits are ground truth.
    try {
      const { data: childRow } = await supabase
        .from('montree_children')
        .select('enrolled_at')
        .eq('id', childId)
        .maybeSingle();
      const enrolledAtCurrent = (childRow as { enrolled_at: string | null } | null)?.enrolled_at;
      if (!enrolledAtCurrent) {
        const monthsBack = expLevel === 'advanced' ? 24
                         : expLevel === 'experienced' ? 15
                         : expLevel === 'some' ? 2
                         : 0;
        const enrolledAt = new Date();
        enrolledAt.setMonth(enrolledAt.getMonth() - monthsBack);
        const isoDate = enrolledAt.toISOString().slice(0, 10); // YYYY-MM-DD
        const { error: enrolErr } = await supabase
          .from('montree_children')
          .update({ enrolled_at: isoDate })
          .eq('id', childId);
        if (enrolErr) {
          console.error('[Onboard] enrolled_at update error (non-fatal):', enrolErr);
        } else {
          console.log(`[Onboard] enrolled_at set to ${isoDate} for ${childName} (expLevel=${expLevel}, ~${monthsBack} months)`);
        }
      } else {
        console.log(`[Onboard] enrolled_at already set for ${childName} (${enrolledAtCurrent}) — preserving teacher's manual value`);
      }
    } catch (enrolErr) {
      console.error('[Onboard] enrolled_at branch error (non-fatal):', enrolErr);
    }

    // ── ALWAYS seed the 5 focus works (one per area) regardless of expLevel ──
    // Sonnet's job above was to guarantee non-null focus_<area> picks. We now
    // upsert each one as a montree_child_progress row with is_focus=true so
    // the seededShelf fetch (and the dashboard) always shows a populated shelf.
    // Auto-creates curriculum rows for picks that aren't yet in the curriculum.
    if (cid) {
      try {
        await seedFocusWorks(supabase, childId, cid, extracted);
        console.log(`[Onboard] Focus works seeded for ${childName}`);
      } catch (focusSeedErr) {
        console.error('[Onboard] Focus works seed error (non-fatal):', focusSeedErr);
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

    // Fetch the actual focus shelf so the orchestrator can show EXACTLY what
    // 'This Week's Focus' will show on the child's page. This mirrors the
    // logic in app/montree/dashboard/[childId]/page.tsx:fetchAssignments —
    // ONE focus work per area, max 5, prioritized by status (the dashboard's
    // is_focus is derived from the legacy montree_child_focus_works table,
    // not from a column on this table).
    const seededShelf: Array<{ work_name: string; area: string; status: string }> = [];
    try {
      const { data: progressRows, error: shelfFetchErr } = await supabase
        .from('montree_child_progress')
        .select('work_name, area, status')
        .eq('child_id', childId);

      if (shelfFetchErr) {
        console.error('[Onboard] Seeded shelf SELECT error:', shelfFetchErr);
      }

      const allProgress = (progressRows ?? []) as Array<{
        work_name: string;
        area: string;
        status: string;
      }>;

      const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      const STATUS_PRIORITY: Record<string, number> = {
        practicing: 1,
        presented: 2,
        not_started: 3,
        completed: 4,
        mastered: 4,
      };

      for (const area of AREA_ORDER) {
        const areaWorks = allProgress.filter(p => {
          const pArea = p.area === 'math' ? 'mathematics' : p.area;
          return pArea === area;
        });
        if (areaWorks.length === 0) continue;

        areaWorks.sort((a, b) => {
          return (STATUS_PRIORITY[a.status] ?? 5) - (STATUS_PRIORITY[b.status] ?? 5);
        });

        const top = areaWorks[0];
        seededShelf.push({ work_name: top.work_name, area: top.area, status: top.status });
      }
    } catch (shelfErr) {
      console.error('[Onboard] Seeded shelf fetch error (non-fatal):', shelfErr);
    }

    return NextResponse.json({
      success: true,
      summary: extracted.summary,
      experience_level: expLevel,
      game_plan: gamePlan,
      seeded_shelf: seededShelf,
    });

  } catch (error) {
    const ref = Math.random().toString(36).slice(2, 8);
    console.error(`[Onboard] Error (ref=${ref}):`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'onboard_unhandled',
        ref,
        detail: String((error as { message?: string })?.message || error).slice(0, 200),
      },
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

/**
 * Seed the 5 focus works (one per area) extracted by Sonnet.
 *
 * Always runs regardless of experience_level. The shelf editor + dashboard
 * shelf rely on every child having at least one is_focus=true row per area.
 *
 * Strategy:
 * 1. For each of the 5 areas, take Sonnet's pick (focus_<area> + status).
 * 2. Match it to a curriculum row in this classroom by exact name first,
 *    then case-insensitive ILIKE. If no match, fall back to a canonical
 *    Montessori starting work for that area (auto-created via curriculum
 *    insert) — guarantees the row always exists.
 * 3. UPSERT into montree_child_progress with is_focus=true.
 * 4. Demote any other is_focus=true rows in the same area on this child.
 */
async function seedFocusWorks(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  classroomId: string,
  extracted: Record<string, unknown>,
) {
  const FALLBACKS: Record<string, string> = {
    practical_life: 'Pouring Water',
    sensorial: 'Pink Tower',
    mathematics: 'Number Rods',
    language: 'Sandpaper Letters',
    cultural: 'Land and Water Forms',
  };
  const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
  const VALID_STATUSES = new Set(['presented', 'practicing', 'mastered']);
  const now = new Date().toISOString();

  for (const areaKey of AREA_KEYS) {
    const sonnetPickRaw = extracted[`focus_${areaKey}`];
    const sonnetStatusRaw = extracted[`focus_${areaKey}_status`];
    const sonnetPick = typeof sonnetPickRaw === 'string' ? sonnetPickRaw.trim() : '';
    const status = typeof sonnetStatusRaw === 'string' && VALID_STATUSES.has(sonnetStatusRaw)
      ? sonnetStatusRaw
      : 'presented';

    // Resolve area_id (skip if classroom doesn't have this area for some reason)
    const { data: areaRow } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('area_key', areaKey)
      .maybeSingle() as { data: { id: string } | null };

    if (!areaRow) {
      console.warn(`[Onboard] No area row for ${areaKey} in classroom ${classroomId}, skipping focus seed`);
      continue;
    }

    // Try to match Sonnet's pick to an existing curriculum row.
    // Pass 1: exact name match (case-insensitive).
    let matchedName: string | null = null;
    if (sonnetPick) {
      const escaped = sonnetPick.replace(/[%_\\]/g, '\\$&');
      const { data: exactMatch } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name')
        .eq('classroom_id', classroomId)
        .eq('area_id', areaRow.id)
        .ilike('name', escaped)
        .maybeSingle() as { data: { name: string } | null };
      if (exactMatch?.name) {
        matchedName = exactMatch.name;
      }
    }

    // Pass 2: fuzzy ILIKE on either side ("Pink Tower" matches "the Pink Tower").
    if (!matchedName && sonnetPick) {
      const escaped = sonnetPick.replace(/[%_\\]/g, '\\$&');
      const { data: fuzzyMatch } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name')
        .eq('classroom_id', classroomId)
        .eq('area_id', areaRow.id)
        .ilike('name', `%${escaped}%`)
        .order('sequence', { ascending: true })
        .limit(1)
        .maybeSingle() as { data: { name: string } | null };
      if (fuzzyMatch?.name) {
        matchedName = fuzzyMatch.name;
      }
    }

    // Pass 3: fallback to a canonical Montessori starting work for this area.
    // We auto-create the curriculum row if missing so the progress UPSERT works.
    if (!matchedName) {
      const fallbackName = FALLBACKS[areaKey];
      console.log(`[Onboard] No curriculum match for "${sonnetPick}" in ${areaKey}, falling back to "${fallbackName}"`);

      // Check if the fallback already exists in the curriculum
      const escapedFallback = fallbackName.replace(/[%_\\]/g, '\\$&');
      const { data: existing } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name')
        .eq('classroom_id', classroomId)
        .eq('area_id', areaRow.id)
        .ilike('name', escapedFallback)
        .maybeSingle() as { data: { name: string } | null };

      if (existing?.name) {
        matchedName = existing.name;
      } else {
        // Auto-create the fallback as a custom work
        const { data: maxSeq } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('sequence')
          .eq('area_id', areaRow.id)
          .order('sequence', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: { sequence: number | null } | null };
        const nextSeq = (maxSeq?.sequence || 0) + 1;
        const { error: insertErr } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert({
            classroom_id: classroomId,
            area_id: areaRow.id,
            work_key: `auto_${areaKey}_${Date.now()}`,
            name: fallbackName,
            sequence: nextSeq,
            is_custom: true,
            is_active: true,
          });
        if (insertErr) {
          console.error(`[Onboard] Failed to auto-create fallback work "${fallbackName}":`, insertErr);
          continue;
        }
        matchedName = fallbackName;
      }
    }

    // SELECT-then-UPDATE-or-INSERT to preserve any higher status that
    // seedCurriculumPositions may have already written for this work
    // (e.g., if it was already mastered, we don't want to downgrade to
    // presented/practicing just because Sonnet was picking a focus).
    const STATUS_RANK: Record<string, number> = {
      not_started: 0, presented: 1, practicing: 2, mastered: 3, completed: 3,
    };
    const { data: existingRow } = await supabase
      .from('montree_child_progress')
      .select('id, status')
      .eq('child_id', childId)
      .eq('work_name', matchedName)
      .maybeSingle() as { data: { id: string; status: string } | null };

    if (existingRow) {
      // Row exists — only upgrade status if Sonnet's pick is higher in the
      // progression than what's already stored. Never downgrade.
      const existingRank = STATUS_RANK[existingRow.status] ?? 0;
      const newRank = STATUS_RANK[status] ?? 0;
      const finalStatus = newRank > existingRank ? status : existingRow.status;
      const { error: updateErr } = await supabase
        .from('montree_child_progress')
        .update({
          status: finalStatus,
          updated_at: now,
        })
        .eq('id', existingRow.id);
      if (updateErr) {
        console.error(`[Onboard] Focus update error for ${areaKey} (${matchedName}):`, updateErr);
        continue;
      }
    } else {
      // No existing row — insert fresh.
      const { error: insertErr } = await supabase
        .from('montree_child_progress')
        .insert({
          child_id: childId,
          work_name: matchedName,
          area: areaKey,
          status,
          updated_at: now,
        } as unknown as Record<string, unknown>);
      if (insertErr) {
        console.error(`[Onboard] Focus insert error for ${areaKey} (${matchedName}):`, insertErr);
        continue;
      }
    }

    // (is_focus demote block removed — column doesn't exist on
    // montree_child_progress. The dashboard sort falls back to status
    // priority, which already gives a deterministic single-focus-per-area
    // because we picked exactly one work per area above.)
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

  const languageNote = (() => {
    const L: Record<string, string> = {
      zh: '\n\nIMPORTANT: Write the nudge AND direction IN CHINESE (简体中文). Use the Chinese work names from CLASSROOM WORKS exactly as provided.',
      es: '\n\nIMPORTANT: Write the nudge AND direction IN SPANISH (español). Use the Spanish work names from CLASSROOM WORKS exactly as provided.',
    };
    return L[locale || 'en'] || '';
  })();

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
    temperature: 0, // seeds the starter shelf → deterministic (mirrors replan-child.ts)
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
