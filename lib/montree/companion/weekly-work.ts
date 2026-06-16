// lib/montree/companion/weekly-work.ts
//
// The "make-it-at-home" DIY work of the week — a small Montessori-aligned
// activity a parent can build from household things, folded into the family Plan.
//
// Resolution order:
//   1. CURATED — a row in montree_weekly_works for this week (this is how a human
//      curates one: deep-dive with Claude, insert a row; it shows to every family
//      whose child fits the age range).
//   2. CACHED — the per-child generated work already made for this week.
//   3. GENERATED — Ivy makes one on the fly, grounded in the child's age + current
//      focus, cached weekly in settings.companion.weekly_work.
//   4. TEMPLATE — a gentle generic fallback when there's no AI (free tier), so the
//      Plan always has something. Not cached (a real one replaces it on upgrade).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { anthropic } from '@/lib/ai/anthropic';
import { AREA_LABELS_EN as AREA_LABELS } from '@/lib/montree/i18n/area-labels';

export interface WeeklyWork {
  week_of: string;
  title: string;
  the_idea: string;
  what_it_builds: string;
  materials: string[];
  make_it: string[];
  how_to_present: string[];
  variation: string | null;
  source: 'curated' | 'generated' | 'template';
  source_url?: string | null;
}

/** Monday (local) of the current week, as YYYY-MM-DD. */
export function weekOfMonday(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : '')).filter(Boolean);
}

function templateWork(weekOf: string): WeeklyWork {
  return {
    week_of: weekOf,
    title: 'A Pouring Station',
    the_idea: 'A little tray where your child pours water (or dry beans) from one small jug to another. Simple, absorbing, and endlessly repeatable.',
    what_it_builds: 'Concentration, a careful hand, and real independence — the same control of movement that later steadies a pencil.',
    materials: ['A small tray', 'Two small jugs or cups your child can hold in one hand', 'A little water (or dry rice/beans to start)', 'A small sponge or cloth for spills'],
    make_it: ['Set both jugs on the tray, the full one on the left.', 'Fill the left jug about a third full.', 'Put the sponge at the front of the tray.'],
    how_to_present: ['Sit on your child\'s right. Slowly lift the left jug with one hand.', 'Pour into the right jug in one smooth, unhurried movement. Set it down.', 'If a drop spills, calmly wipe it with the sponge — no fuss.', 'Then say: "Now you try," and let them repeat as many times as they like.'],
    variation: 'Once water is easy, try pouring through a small funnel, or into two cups to "share equally".',
    source: 'template',
    source_url: null,
  };
}

function templateWorkExtra(weekOf: string): WeeklyWork {
  return {
    week_of: weekOf,
    title: 'A Sorting Tray',
    the_idea: 'A small tray with two bowls and a handful of objects in two clear groups (buttons by colour, or spoons and forks) for your child to sort.',
    what_it_builds: 'The ordering mind — noticing what is the same and what is different, the root of early maths and language.',
    materials: ['A tray', 'Two small bowls', 'A handful of objects in two obvious groups (two colours, or two kinds of thing)'],
    make_it: ['Put the mixed objects in one bowl on the left.', 'Set the two empty bowls to the right.', 'Keep it to about 8–10 objects so it stays doable.'],
    how_to_present: ['Sit beside your child. Slowly pick one object and look at it.', 'Place it in one bowl, saying very little.', 'Pick a different kind and place it in the other bowl.', 'Then invite: "Now you." Let them sort, and repeat as they like.'],
    variation: 'When two groups are easy, try three — or sort by a new rule (rough/smooth, heavy/light).',
    source: 'template',
    source_url: null,
  };
}

const WEEKLY_WORK_TOOL = {
  name: 'weekly_diy_work',
  description: 'Return one make-it-at-home Montessori DIY work for the week.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Short, inviting name.' },
      the_idea: { type: 'string', description: '1-2 sentences: what it is.' },
      what_it_builds: { type: 'string', description: 'The developmental purpose, plain-parent language.' },
      materials: { type: 'array', items: { type: 'string' }, description: 'Household items, short list.' },
      make_it: { type: 'array', items: { type: 'string' }, description: 'How to build/prepare it. Ordered steps.' },
      how_to_present: { type: 'array', items: { type: 'string' }, description: 'How to show the child — slow, few words. Ordered.' },
      variation: { type: 'string', description: 'One way to extend it later. Optional.' },
    },
    required: ['title', 'the_idea', 'what_it_builds', 'materials', 'make_it', 'how_to_present'],
  },
};

async function loadCuratedForWeek(supabase: SupabaseClient, weekOf: string, ageYears: number | null): Promise<WeeklyWork | null> {
  try {
    const { data, error } = await supabase
      .from('montree_weekly_works')
      .select('age_min, age_max, title, the_idea, what_it_builds, materials, make_it, how_to_present, variation, source_url')
      .eq('week_of', weekOf)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error || !data) return null;
    for (const row of data as Array<Record<string, unknown>>) {
      const min = typeof row.age_min === 'number' ? row.age_min : null;
      const max = typeof row.age_max === 'number' ? row.age_max : null;
      if (ageYears != null) {
        if (min != null && ageYears < min) continue;
        if (max != null && ageYears > max) continue;
      }
      return {
        week_of: weekOf,
        title: String(row.title || 'This week\'s work'),
        the_idea: String(row.the_idea || ''),
        what_it_builds: String(row.what_it_builds || ''),
        materials: asStringArray(row.materials),
        make_it: asStringArray(row.make_it),
        how_to_present: asStringArray(row.how_to_present),
        variation: typeof row.variation === 'string' ? row.variation : null,
        source: 'curated',
        source_url: typeof row.source_url === 'string' ? row.source_url : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface WeeklyWorkArgs {
  childId: string;
  childName?: string;
  childAgeYears?: number | null;
  /** Resolved tier model, or null for free tier (→ template). */
  model: string | null;
}

export async function getWeeklyWork(supabase: SupabaseClient, args: WeeklyWorkArgs): Promise<WeeklyWork> {
  const weekOf = weekOfMonday();
  const ageYears = args.childAgeYears ?? null;

  // 1. Curated row wins.
  const curated = await loadCuratedForWeek(supabase, weekOf, ageYears);
  if (curated) return curated;

  // 2. Cached per-child generated work for this week.
  let settings: Record<string, unknown> = {};
  try {
    const { data } = await supabase.from('montree_children').select('settings').eq('id', args.childId).maybeSingle();
    settings = (data?.settings as Record<string, unknown>) || {};
    const companion = (settings.companion as Record<string, unknown>) || {};
    const cached = companion.weekly_work as { week_of?: string; work?: WeeklyWork } | undefined;
    if (cached?.week_of === weekOf && cached.work) {
      return { ...cached.work, source: 'generated', week_of: weekOf };
    }
  } catch { /* fall through */ }

  // 3. Generate (tier-aware), then cache for the week.
  const generated = await aiGenerateWork(
    supabase,
    { childId: args.childId, childName: args.childName, ageYears, model: args.model },
    { weekOf, fresh: false },
  );
  if (generated) {
    try {
      const companion = (settings.companion as Record<string, unknown>) || {};
      const merged = { ...settings, companion: { ...companion, weekly_work: { week_of: weekOf, work: generated } } };
      await supabase.from('montree_children').update({ settings: merged }).eq('id', args.childId);
    } catch { /* cache best-effort */ }
    return generated;
  }

  // 4. Template fallback (always available, free).
  return templateWork(weekOf);
}

/** Generate one DIY work via AI (no caching). Returns null with no AI / on failure. */
async function aiGenerateWork(
  supabase: SupabaseClient,
  args: { childId: string; childName?: string; ageYears: number | null; model: string | null },
  opts: { weekOf: string; fresh: boolean },
): Promise<WeeklyWork | null> {
  if (!args.model || !anthropic) return null;

  let focusHint = '';
  try {
    const { data: fw } = await supabase
      .from('montree_child_focus_works')
      .select('area, work_name')
      .eq('child_id', args.childId)
      .limit(1)
      .maybeSingle();
    if (fw?.area) focusHint = `They're currently focused on ${AREA_LABELS[fw.area as string] || fw.area}${fw.work_name ? ` (${fw.work_name})` : ''} — a related home work is ideal but not required.`;
  } catch { /* optional */ }

  const ageBit = typeof args.ageYears === 'number' && args.ageYears > 0 ? `about ${Math.round(args.ageYears * 10) / 10} years old` : '3 to 6 years old';
  const freshNudge = opts.fresh ? ' Make a DIFFERENT activity from the usual — something fresh, ideally touching a different area or interest.' : '';
  try {
    const resp = await anthropic.messages.create({
      model: args.model,
      max_tokens: 1500,
      system: `You are Ivy, a warm Montessori guide. Design ONE "make-it-at-home" DIY work for a child ${ageBit}, for a parent with no Montessori training to build from common household items.${freshNudge} ${focusHint}
Honour real Montessori principles: a clear single purpose, isolate one difficulty, control of error where possible, slow few-word presentation, child does it themselves and repeats. Keep materials genuinely household and the build genuinely doable. Warm, plain language. Return it via the weekly_diy_work tool.`,
      tools: [WEEKLY_WORK_TOOL],
      tool_choice: { type: 'tool', name: 'weekly_diy_work' },
      messages: [{ role: 'user', content: `Make a DIY work for ${args.childName || 'my child'} (${ageBit}).` }],
    });
    const block = resp.content.find((b) => b.type === 'tool_use');
    if (block && block.type === 'tool_use') {
      const out = block.input as Record<string, unknown>;
      return {
        week_of: opts.weekOf,
        title: String(out.title || 'A little work'),
        the_idea: String(out.the_idea || ''),
        what_it_builds: String(out.what_it_builds || ''),
        materials: asStringArray(out.materials),
        make_it: asStringArray(out.make_it),
        how_to_present: asStringArray(out.how_to_present),
        variation: typeof out.variation === 'string' ? out.variation : null,
        source: 'generated',
        source_url: null,
      };
    }
  } catch (err) {
    console.warn('[companion/weekly-work] generation failed:', err instanceof Error ? err.message : 'unknown');
  }
  return null;
}

/**
 * A fresh, different DIY work on demand ("make another") — included in the
 * subscription, no separate charge. Fresh each call, never cached as the weekly one.
 */
export async function generateExtraWork(supabase: SupabaseClient, args: WeeklyWorkArgs): Promise<WeeklyWork> {
  const weekOf = weekOfMonday();
  const gen = await aiGenerateWork(
    supabase,
    { childId: args.childId, childName: args.childName, ageYears: args.childAgeYears ?? null, model: args.model },
    { weekOf, fresh: true },
  );
  return gen || templateWorkExtra(weekOf);
}
