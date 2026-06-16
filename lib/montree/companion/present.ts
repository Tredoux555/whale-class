// lib/montree/companion/present.ts
//
// The Step Card generator — turns ONE chosen work into a fully hand-held card a
// zero-experience parent can act on tonight. This is the second half of the
// home loop's spine: pickNextStep() chooses the work, generateStepCard() makes
// it doable.
//
// Grounded in the real curriculum guide (montree_classroom_curriculum_works,
// then the master Brain table, then static JSON — same 3-tier lookup the guide
// API uses) and rewritten by Ivy into warm, plain-parent language. Tier-aware:
// free schools get a clean template card built straight from the curriculum
// (no AI), paid schools get the AI-warmed version.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { anthropic } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { findCurriculumWorkByName } from '@/lib/montree/curriculum-loader';
import { AREA_LABELS_EN as AREA_LABELS } from '@/lib/montree/i18n/area-labels';
import type { NextStep } from '@/lib/montree/companion/next-step';

/** The hand-held card the parent works from. Arrays are short, ordered lists. */
export interface StepCard {
  work_name: string;
  area_label: string;
  /** Why this work, for this child, right now — plain developmental purpose. */
  why_now: string;
  /** Household-where-possible items the parent gathers. */
  what_you_need: string[];
  /** Preparing the space + tray, simply. */
  set_it_up: string[];
  /** The presentation — slow, few words, what to do with your hands. */
  show_it: string[];
  /** Montessori restraint — what to say. */
  say: string[];
  /** What NOT to say/do (don't quiz, don't correct, let them repeat). */
  dont_say: string[];
  /** What "yes, it landed" looks like. */
  yes_looks_like: string[];
  /** What "not ready yet" looks like — information, not failure. */
  not_yet_looks_like: string[];
  /** True when this came straight from the curriculum without AI warming (free tier or AI failure). */
  is_template: boolean;
}

interface RawGuide {
  name: string;
  quick_guide: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
  control_of_error: string | null;
  direct_aims: string[];
  materials: string[];
  presentation_steps: Array<Record<string, unknown>> | string[];
}

function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : '')).filter(Boolean);
}

/** Flatten presentation_steps (objects with title/description, or plain strings) into readable lines. */
function flattenSteps(steps: RawGuide['presentation_steps']): string[] {
  if (!Array.isArray(steps)) return [];
  const out: string[] = [];
  for (const s of steps) {
    if (typeof s === 'string') {
      if (s.trim()) out.push(s.trim());
    } else if (s && typeof s === 'object') {
      const obj = s as Record<string, unknown>;
      const title = typeof obj.title === 'string' ? obj.title.trim() : '';
      const desc = typeof obj.description === 'string' ? obj.description.trim() : '';
      const line = [title, desc].filter(Boolean).join(' — ');
      if (line) out.push(line);
    }
  }
  return out;
}

/**
 * 3-tier curriculum guide lookup (classroom → master Brain → static JSON),
 * mirroring app/api/montree/works/guide/route.ts. Returns null if nothing found.
 */
async function fetchWorkGuide(
  supabase: SupabaseClient,
  classroomId: string | null,
  workName: string,
): Promise<RawGuide | null> {
  // 1. Classroom curriculum (the home child's own classroom).
  if (classroomId) {
    const { data } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, quick_guide, parent_description, why_it_matters, control_of_error, direct_aims, materials, presentation_steps')
      .eq('classroom_id', classroomId)
      .ilike('name', `%${escapeIlike(workName)}%`)
      .limit(1)
      .maybeSingle();
    if (data && (data.quick_guide || data.presentation_steps)) {
      return {
        name: (data.name as string) || workName,
        quick_guide: (data.quick_guide as string) || null,
        parent_description: (data.parent_description as string) || null,
        why_it_matters: (data.why_it_matters as string) || null,
        control_of_error: (data.control_of_error as string) || null,
        direct_aims: asStringArray(data.direct_aims),
        materials: asStringArray(data.materials),
        presentation_steps: (data.presentation_steps as RawGuide['presentation_steps']) || [],
      };
    }
  }

  // 2. Master Brain table.
  {
    const { data } = await supabase
      .from('montessori_works')
      .select('name, quick_guide, parent_explanation_detailed, parent_why_it_matters, control_of_error, direct_aims, materials_needed, presentation_steps')
      .ilike('name', `%${escapeIlike(workName)}%`)
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        name: (data.name as string) || workName,
        quick_guide: (data.quick_guide as string) || null,
        parent_description: (data.parent_explanation_detailed as string) || null,
        why_it_matters: (data.parent_why_it_matters as string) || null,
        control_of_error: (data.control_of_error as string) || null,
        direct_aims: asStringArray(data.direct_aims),
        materials: asStringArray(data.materials_needed),
        presentation_steps: (data.presentation_steps as RawGuide['presentation_steps']) || [],
      };
    }
  }

  // 3. Static curriculum JSON (comprehensive guides, fuzzy matched).
  try {
    const w = findCurriculumWorkByName(workName);
    if (w && (w.quick_guide || (w.presentation_steps && w.presentation_steps.length > 0))) {
      return {
        name: w.name || workName,
        quick_guide: w.quick_guide || null,
        parent_description: w.parent_description || null,
        why_it_matters: w.why_it_matters || null,
        control_of_error: w.control_of_error || null,
        direct_aims: w.direct_aims || [],
        materials: w.materials || [],
        presentation_steps: w.presentation_steps || [],
      };
    }
  } catch (err) {
    console.error('[companion/present] static guide fallback failed:', err);
  }

  return null;
}

/** Build a plain (non-AI) card straight from the curriculum guide. Always works. */
function templateCard(step: NextStep, guide: RawGuide | null): StepCard {
  const whyParts = [guide?.why_it_matters, guide?.parent_description].filter(Boolean) as string[];
  return {
    work_name: step.work_name,
    area_label: step.area_label,
    why_now: whyParts[0] || `A natural next step for ${step.area_label.toLowerCase()} — it builds on what they've been doing.`,
    what_you_need: guide?.materials?.length ? guide.materials : ['The material on a small tray they can carry'],
    set_it_up: [
      'Put everything ready on a tray or mat, in the order it will be used.',
      'Choose a calm spot with little distraction. Sit on their non-dominant side.',
    ],
    show_it: guide ? (flattenSteps(guide.presentation_steps).slice(0, 8).length
      ? flattenSteps(guide.presentation_steps).slice(0, 8)
      : (guide.quick_guide ? [guide.quick_guide] : ['Show it slowly, with very few words. Let your hands do the talking.']))
      : ['Show it slowly, with very few words. Let your hands do the talking.'],
    say: ['Almost nothing. Name the work once: "This is ' + step.work_name.toLowerCase() + '." Then let them watch.'],
    dont_say: ["Don't quiz them, don't correct mistakes, don't interrupt. If they want to repeat, let them — that's the work doing its job."],
    yes_looks_like: ['They lean in, want a turn, or repeat it. Concentration — even briefly — is success.'],
    not_yet_looks_like: ['They wander off or aren\'t interested. That\'s fine — it\'s information, not failure. Try again another day or follow what they ARE drawn to.'],
    is_template: true,
  };
}

const STEP_CARD_TOOL = {
  name: 'step_card',
  description: 'Return the hand-held Step Card for the parent.',
  input_schema: {
    type: 'object' as const,
    properties: {
      why_now: { type: 'string', description: 'Plain-parent why: the developmental purpose for THIS child, right now. 1-2 warm sentences.' },
      what_you_need: { type: 'array', items: { type: 'string' }, description: 'Items to gather, household where possible. Short.' },
      set_it_up: { type: 'array', items: { type: 'string' }, description: 'How to prepare the space + tray, simply. 1-3 steps.' },
      show_it: { type: 'array', items: { type: 'string' }, description: 'The presentation — slow, few words, what to do with your hands. Ordered steps.' },
      say: { type: 'array', items: { type: 'string' }, description: 'The few words to say (Montessori restraint).' },
      dont_say: { type: 'array', items: { type: 'string' }, description: "What NOT to say or do — don't quiz, don't correct, let them repeat." },
      yes_looks_like: { type: 'array', items: { type: 'string' }, description: 'Signs it landed / they\'re ready.' },
      not_yet_looks_like: { type: 'array', items: { type: 'string' }, description: 'Signs they\'re not ready yet — framed as information, never failure.' },
    },
    required: ['why_now', 'what_you_need', 'set_it_up', 'show_it', 'say', 'dont_say', 'yes_looks_like', 'not_yet_looks_like'],
  },
};

export interface GenerateStepCardArgs {
  childId: string;
  classroomId: string | null;
  schoolId: string;
  step: NextStep;
  childName?: string;
  childAgeYears?: number | null;
  locale?: string;
}

/**
 * Produce the parent-facing Step Card for a chosen work.
 * - Free tier (or AI unavailable / failure): a clean template card from the curriculum.
 * - Paid tier: AI rewrites the curriculum into warm, plain, hand-held language.
 * Never throws — always returns a usable card.
 */
export async function generateStepCard(
  supabase: SupabaseClient,
  args: GenerateStepCardArgs,
): Promise<StepCard> {
  const { schoolId, step, childName, childAgeYears } = args;
  const guide = await fetchWorkGuide(supabase, args.classroomId, step.work_name);

  // Tier gate — free tier returns the template card (no AI spend).
  let model: string | null = null;
  try {
    const resolved = await resolveReportModel(supabase, schoolId);
    model = resolved.model;
  } catch {
    model = null;
  }

  if (!model || !anthropic) {
    return templateCard(step, guide);
  }

  const ageBit = typeof childAgeYears === 'number' && childAgeYears > 0
    ? ` (about ${Math.round(childAgeYears * 10) / 10} years old)`
    : '';
  const who = childName || 'the child';

  // Ground the AI in the real curriculum so it warms-up real content, never invents materials.
  const guideContext = guide
    ? [
        `WORK: ${guide.name}`,
        guide.quick_guide ? `QUICK GUIDE: ${guide.quick_guide}` : '',
        guide.parent_description ? `PARENT DESCRIPTION: ${guide.parent_description}` : '',
        guide.why_it_matters ? `WHY IT MATTERS: ${guide.why_it_matters}` : '',
        guide.direct_aims.length ? `DIRECT AIMS: ${guide.direct_aims.join('; ')}` : '',
        guide.materials.length ? `MATERIALS: ${guide.materials.join('; ')}` : '',
        flattenSteps(guide.presentation_steps).length ? `PRESENTATION STEPS:\n- ${flattenSteps(guide.presentation_steps).join('\n- ')}` : '',
        guide.control_of_error ? `CONTROL OF ERROR: ${guide.control_of_error}` : '',
      ].filter(Boolean).join('\n')
    : `WORK: ${step.work_name} (area: ${step.area_label}). No curriculum guide on file — use your Montessori knowledge of this work for 3-6 year olds.`;

  const sequencerReason = step.reasons?.length ? step.reasons.join('; ') : step.reason;

  const localeLine = args.locale && args.locale !== 'en'
    ? `\nWrite EVERY field of the card in the parent's language (locale "${args.locale}"), except the work name itself.`
    : '';

  const system = `You are Ivy, a warm Montessori guide helping a parent with NO Montessori training present ONE work to ${who}${ageBit} at home tonight.
Turn the curriculum below into a hand-held Step Card. Plain, kind, concrete — a friend kneeling on the floor beside them, never a manual.
Rules:
- Ground everything in the curriculum provided. Do NOT invent materials or steps that aren't supported by it.
- Prefer household items where the curriculum allows. Keep lists short and doable.
- Montessori restraint: in "show_it" use slow movements and very few words; in "say" say almost nothing; in "dont_say" remind them not to quiz, correct, or interrupt repetition.
- "yes_looks_like" and "not_yet_looks_like" must help the parent READ the child — and frame "not yet" as information, never failure.
- Warm, plain language. No jargon (or explain it in three words).${localeLine}
Return the card by calling the step_card tool.`;

  const user = `This child's next step is "${step.work_name}" in ${step.area_label}.
Why the engine chose it (restate this warmly in why_now): ${sequencerReason}
${step.current_work ? `They are currently on "${step.current_work}" (${step.current_work_status || 'in progress'}) in this area.` : ''}

CURRICULUM:
${guideContext}`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system,
      tools: [STEP_CARD_TOOL],
      tool_choice: { type: 'tool', name: 'step_card' },
      messages: [{ role: 'user', content: user }],
    });

    const block = response.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      return templateCard(step, guide);
    }
    const out = block.input as Record<string, unknown>;
    return {
      work_name: step.work_name,
      area_label: step.area_label,
      why_now: typeof out.why_now === 'string' ? out.why_now : templateCard(step, guide).why_now,
      what_you_need: asStringArray(out.what_you_need),
      set_it_up: asStringArray(out.set_it_up),
      show_it: asStringArray(out.show_it),
      say: asStringArray(out.say),
      dont_say: asStringArray(out.dont_say),
      yes_looks_like: asStringArray(out.yes_looks_like),
      not_yet_looks_like: asStringArray(out.not_yet_looks_like),
      is_template: false,
    };
  } catch (err) {
    console.error('[companion/present] AI step card failed, using template:', err);
    return templateCard(step, guide);
  }
}

/**
 * Build a Step Card for ANY work the parent taps (not just the sequencer's next
 * step) — e.g. tapping a work on the Shelf. Same warm, hand-held card.
 */
export async function generateStepCardForWork(
  supabase: SupabaseClient,
  args: { childId: string; classroomId: string | null; schoolId: string; workName: string; area: string; areaLabel?: string; childName?: string; childAgeYears?: number | null; locale?: string },
): Promise<StepCard> {
  const step: NextStep = {
    work_name: args.workName,
    work_key: args.workName,
    area: args.area,
    area_label: args.areaLabel || AREA_LABELS[args.area] || args.area,
    reason: `${args.childName || 'Your child'} is working on this.`,
    reasons: [],
    tier: 'available',
    score: 0,
    confidence: 'medium',
    is_bridge: false,
    bridge_from_area: null,
    current_work: null,
    current_work_status: null,
  };
  return generateStepCard(supabase, {
    childId: args.childId,
    classroomId: args.classroomId,
    schoolId: args.schoolId,
    step,
    childName: args.childName,
    childAgeYears: args.childAgeYears,
    locale: args.locale,
  });
}
