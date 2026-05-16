// lib/montree/photo-identification/sonnet-draft.ts
//
// Sonnet "rich write-up" generator for the new take-and-tag photo identification
// pipeline. Called when Haiku two-pass cannot confidently identify a photo
// (low confidence OR no visual memory entry for the matched work).
//
// Sonnet's job here is NOT to "match harder" — it's to draft a complete proposal
// the teacher can act on in Photo Audit:
//
//   1. A detailed visual_description of what's actually happening in the photo
//   2. A proposed work name (if it matches existing curriculum, use that name;
//      otherwise propose a brand new work)
//   3. A warm parent_description and developmental why_it_matters
//   4. A list of key_materials visible
//   5. A closest_existing_match field — even when proposing a new work, Sonnet
//      points at the existing curriculum work it most resembles, so the teacher
//      can choose: enrich the existing work, or create a new variant
//
// This output is stored verbatim on `montree_media.sonnet_draft` (JSONB) and
// surfaced in the Photo Audit "Needs Review" tab as a rich card with two

import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
// action buttons: "Add as new custom work" and "Attach to existing work".
//
// Uses Anthropic `tool_use` for structured output — the API handles JSON
// serialization, so the model never produces raw JSON text. Eliminates all
// JSON-corruption issues regardless of language (this was the lesson from the
// teacher report Chinese localization saga in Sessions 3-4).
//
// Side-effect-free: writes nothing to the database. The caller (the new
// background route) takes the returned draft and persists it.

import type { Locale } from '@/lib/montree/i18n/locales';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import type { CurriculumWork } from '@/lib/montree/curriculum-loader';
import { VISUAL_ID_GUIDE } from './visual-id-guide';
import type { IdentificationContext } from './context-loader';

const SONNET_TIMEOUT_MS = 45_000;

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
type ValidArea = typeof VALID_AREAS[number];

// ----- Public types -----

export interface SonnetDraftInput {
  photoUrl: string;
  childName: string;
  childAge: number | string;
  /** Curriculum works (for the prompt + closest_existing_match validation) */
  curriculum: CurriculumWork[];
  /** Visual description from Pass 1 (so Sonnet has the same starting point as Haiku) */
  pass1Description: string;
  /** What Haiku said (so Sonnet can disagree with reasoning) */
  haikuGuess: { workName: string; confidence: number } | null;
  /** Same loaded context as the two-pass run — passed in to avoid re-querying */
  context: IdentificationContext;
  locale: Locale;
  abortSignal?: AbortSignal;
}

export interface SonnetDraft {
  visual_description: string;
  proposed_name: string;
  suggested_area: ValidArea;
  parent_description: string;
  why_it_matters: string;
  key_materials: string[];
  /**
   * The existing curriculum work this photo most resembles. Sonnet always
   * tries to fill this in — even when proposing a new work — so the teacher
   * has the option to attach to the existing work instead of creating a new one.
   */
  closest_existing_match: {
    work_name: string;
    work_key: string | null;
    similarity: number; // 0.0–1.0
  } | null;
  /** Sonnet's confidence in its overall draft (not the same as Haiku confidence) */
  confidence: number;
  /** ISO timestamp when the draft was generated */
  drafted_at: string;
}

export interface SonnetDraftResult {
  success: boolean;
  draft: SonnetDraft | null;
  errors: string[];
}

// ----- Tool definition -----

const DRAFT_WORK_WRITEUP_TOOL = {
  name: 'draft_work_writeup' as const,
  description: 'Draft a complete, teacher-ready write-up for a Montessori classroom photo. Use this when the photo could not be confidently auto-identified and needs human review.',
  input_schema: {
    type: 'object' as const,
    properties: {
      visual_description: {
        type: 'string',
        description: '3-5 sentences. Detailed objective description of what is physically visible: the child\'s posture, the materials and their arrangement, what the hands are doing, any colors/patterns/textures. Do not name the work yet — just describe.',
      },
      proposed_name: {
        type: 'string',
        description: 'A short title-case name for this activity (2-5 words). If it clearly matches an existing curriculum work, use the exact existing name. If not, propose a new descriptive name (e.g. "Bead Threading on String", "Nature Tray Sorting"). Describes the ACTIVITY, not the materials.',
      },
      suggested_area: {
        type: 'string',
        enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
        description: 'The Montessori curriculum area this activity best fits.',
      },
      parent_description: {
        type: 'string',
        description: '2-3 warm sentences describing what the child is learning, written for a parent who has never set foot in a Montessori classroom. Use "your child" or the child\'s name. No jargon. No words like "manipulative" or "isolation of difficulty".',
      },
      why_it_matters: {
        type: 'string',
        description: '2-3 sentences explaining the developmental purpose: what skill or capacity this activity builds (fine motor, concentration, sequencing, language, etc.), and why that matters for a child of this age.',
      },
      key_materials: {
        type: 'array',
        description: 'List of 3-8 specific physical items visible in the photo. Be concrete: "wooden tray", "small glass beads", "blue cotton string", not "materials" or "tools".',
        items: { type: 'string' },
      },
      closest_existing_match: {
        type: 'object',
        description: 'The existing standard curriculum work this photo most resembles, even if you are proposing a new custom work. Set similarity to 1.0 if it IS the existing work. Omit only if truly nothing in the curriculum is even remotely similar.',
        properties: {
          work_name: { type: 'string', description: 'The exact name from the curriculum list provided' },
          similarity: { type: 'number', description: '0.0-1.0 — how confident you are this matches the existing work' },
        },
        required: ['work_name', 'similarity'],
      },
      confidence: {
        type: 'number',
        description: 'Your overall confidence in this draft, 0.0-1.0. Lower = "the teacher really needs to review this carefully".',
      },
    },
    required: ['visual_description', 'proposed_name', 'suggested_area', 'parent_description', 'why_it_matters', 'key_materials', 'confidence'],
  },
};

// ----- Helpers -----

function buildCurriculumHint(curriculum: CurriculumWork[]): string {
  // Compact list grouped by area, just names — Sonnet uses this for closest_existing_match
  const byArea: Record<string, string[]> = {};
  for (const w of curriculum) {
    if (!byArea[w.area_key]) byArea[w.area_key] = [];
    byArea[w.area_key].push(w.name);
  }
  const sections: string[] = [];
  for (const area of VALID_AREAS) {
    const works = byArea[area];
    if (!works || works.length === 0) continue;
    sections.push(`${area.toUpperCase()}: ${works.join(', ')}`);
  }
  return sections.join('\n\n');
}

function findWorkKey(curriculum: CurriculumWork[], name: string): string | null {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  for (const w of curriculum) {
    if (w.name.trim().toLowerCase() === norm) return w.work_key;
  }
  return null;
}

function validateDraft(rawInput: Record<string, unknown>, curriculum: CurriculumWork[]): SonnetDraft | null {
  const visual_description = typeof rawInput.visual_description === 'string' ? rawInput.visual_description.trim().slice(0, 1500) : '';
  const proposed_name = typeof rawInput.proposed_name === 'string' ? rawInput.proposed_name.trim().slice(0, 100) : '';
  const suggested_area_raw = typeof rawInput.suggested_area === 'string' ? rawInput.suggested_area : '';
  const suggested_area = (VALID_AREAS as readonly string[]).includes(suggested_area_raw)
    ? (suggested_area_raw as ValidArea)
    : null;
  const parent_description = typeof rawInput.parent_description === 'string' ? rawInput.parent_description.trim().slice(0, 800) : '';
  const why_it_matters = typeof rawInput.why_it_matters === 'string' ? rawInput.why_it_matters.trim().slice(0, 800) : '';
  const key_materials = Array.isArray(rawInput.key_materials)
    ? rawInput.key_materials
        .filter((m): m is string => typeof m === 'string')
        .map(m => m.trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const confidence = typeof rawInput.confidence === 'number' && !isNaN(rawInput.confidence)
    ? Math.max(0, Math.min(1, rawInput.confidence))
    : 0.5;

  let closest_existing_match: SonnetDraft['closest_existing_match'] = null;
  if (rawInput.closest_existing_match && typeof rawInput.closest_existing_match === 'object') {
    const m = rawInput.closest_existing_match as Record<string, unknown>;
    const work_name = typeof m.work_name === 'string' ? m.work_name.trim().slice(0, 200) : '';
    const similarity = typeof m.similarity === 'number' && !isNaN(m.similarity)
      ? Math.max(0, Math.min(1, m.similarity))
      : 0;
    if (work_name) {
      closest_existing_match = {
        work_name,
        work_key: findWorkKey(curriculum, work_name),
        similarity,
      };
    }
  }

  if (!visual_description || !proposed_name || !suggested_area || !parent_description || !why_it_matters) {
    return null;
  }

  return {
    visual_description,
    proposed_name,
    suggested_area,
    parent_description,
    why_it_matters,
    key_materials,
    closest_existing_match,
    confidence,
    drafted_at: new Date().toISOString(),
  };
}

// ----- Main entry point -----

/**
 * Generates a rich Sonnet draft for a photo that Haiku could not confidently
 * identify. Returns a structured proposal the teacher can act on (add as new
 * custom work, or attach to closest existing work) in Photo Audit.
 *
 * Side-effect-free. Caller persists the result to montree_media.sonnet_draft.
 */
export async function generateSonnetDraft(input: SonnetDraftInput): Promise<SonnetDraftResult> {
  const errors: string[] = [];

  if (!anthropic) {
    return { success: false, draft: null, errors: ['Anthropic client not configured'] };
  }

  const langInstruction = (() => {
    const L: Record<string, string> = {
      zh: 'Write parent_description and why_it_matters in Simplified Chinese. Keep proposed_name in English.',
      es: 'Write parent_description and why_it_matters in Spanish. Keep proposed_name in English.',
    };
    return L[input.locale || 'en'] || 'Write all text fields in English.';
  })();

  const haikuLine = input.haikuGuess && input.haikuGuess.workName
    ? `\n\nA fast vision model previously guessed: "${input.haikuGuess.workName}" (confidence ${input.haikuGuess.confidence.toFixed(2)}). You may agree or disagree — make your own assessment based on what you actually see.`
    : '';

  const curriculumHint = buildCurriculumHint(input.curriculum);

  // 🚨 Session 113 V2 photo AI quality audit Q-4 — prompt caching for Sonnet
  // draft. Same architecture as Pass 2 in two-pass.ts: cached static prefix
  // (boilerplate rules + VISUAL_ID_GUIDE) + dynamic suffix (langInstruction +
  // curriculum hint + per-classroom corrections/visualMemory). Sonnet 4.6 is
  // $3/$15 per MTok so each cached call saves more $$$ than Haiku — the same
  // 3-4K token prefix that costs ~$0.012 uncached costs ~$0.001 cached.
  // Auto-Sonnet fires on ~20-40% of haiku_drafted photos so volume is real.
  const SONNET_STATIC_INSTRUCTIONS = `You are a senior Montessori curriculum expert reviewing a classroom photo that a fast model could not confidently identify. Your job is to use the draft_work_writeup tool to produce a complete, teacher-ready proposal.

CRITICAL RULES:
1. LOOK AT THE PHOTO FIRST — describe what is actually visible, not what you expect to see
2. If the photo clearly matches a STANDARD curriculum work below, use the EXACT standard name in proposed_name AND set closest_existing_match.similarity to 0.95+
3. If it matches NO standard work, propose a new descriptive name AND still fill in closest_existing_match with the nearest cousin (lower similarity) — never leave the teacher without a comparison point
4. Write parent_description as if speaking to a parent over coffee — warm, specific, jargon-free
5. Write why_it_matters with developmental substance — what capacity is this building, and why does it matter for THIS child's age?
6. key_materials must list ITEMS YOU CAN ACTUALLY SEE, not abstract categories

${VISUAL_ID_GUIDE}`;

  const sonnetSystemDynamic = `${langInstruction}

STANDARD CURRICULUM WORKS (use exact names for closest_existing_match):

${curriculumHint}
${input.context.correctionsContext}${input.context.visualMemoryContext}`;

  const userMessage = `Child: ${input.childName}, age ${input.childAge}

PRELIMINARY VISUAL DESCRIPTION (from a fast model — verify against the photo):
"${input.pass1Description}"${haikuLine}

Look at the photo and produce a complete teacher-ready write-up using the draft_work_writeup tool.`;

  const passAbort = new AbortController();
  const onParentAbort = () => passAbort.abort();
  if (input.abortSignal) input.abortSignal.addEventListener('abort', onParentAbort, { once: true });
  const timer = setTimeout(() => passAbort.abort(), SONNET_TIMEOUT_MS);

  try {
    const msg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: [
        // Cached prefix: boilerplate rules + VISUAL_ID_GUIDE. Identical across
        // every Sonnet draft call platform-wide.
        { type: 'text', text: SONNET_STATIC_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
        // Dynamic suffix: langInstruction + curriculum hint + per-classroom
        // corrections/visualMemory. Re-sent in full each call.
        { type: 'text', text: sonnetSystemDynamic },
      ],
      tools: [DRAFT_WORK_WRITEUP_TOOL],
      tool_choice: { type: 'tool', name: 'draft_work_writeup' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: input.photoUrl } },
          { type: 'text', text: userMessage },
        ],
      }],
    }, { signal: passAbort.signal });

    const toolBlock = msg.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      errors.push('Sonnet returned no tool_use block');
      return { success: false, draft: null, errors };
    }

    const draft = validateDraft(toolBlock.input as Record<string, unknown>, input.curriculum);
    if (!draft) {
      errors.push('Sonnet draft failed validation (missing required fields)');
      return { success: false, draft: null, errors };
    }

    return { success: true, draft, errors };
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
    errors.push(`Sonnet draft ${isAbort ? 'timed out' : 'failed'}: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, draft: null, errors };
  } finally {
    clearTimeout(timer);
    if (input.abortSignal) input.abortSignal.removeEventListener('abort', onParentAbort);
  }
}
