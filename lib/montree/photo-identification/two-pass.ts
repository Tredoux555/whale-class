// lib/montree/photo-identification/two-pass.ts
//
// Reusable two-pass photo identification primitive (Haiku DESCRIBE → Haiku MATCH).
//
// This is the lean, side-effect-free core that the new background photo
// identification pipeline (Step 4) will call. It deliberately does NOT do:
//   - auth / rate limiting / route timeouts
//   - caching against montree_guru_interactions
//   - writes to montree_media or montree_visual_memory
//   - Sonnet fallback or "draft a new work" proposals
//   - status / progress updates
//
// Those concerns belong to the calling route, not to the identification primitive.
//
// Pass 1: Haiku VISION call. The model describes ONLY what it sees (no curriculum
//         knowledge, no naming the work). Output: a 2-4 sentence visual description.
//
// Pass 2: Haiku TEXT call. Given the Pass 1 description (no image), match it to
//         a curriculum work using the visual ID guide + corrections + per-classroom
//         visual memory. Output: structured tag_photo tool_use.

import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
//
// The two-pass split was the key insight (March 2026): keeping the visual
// description and the curriculum matching separate dramatically reduced the rate
// at which Haiku "saw what it expected to see" based on shelf bias.

import type { Locale } from '@/lib/montree/i18n/locales';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { matchToCurriculumV2 } from '@/lib/montree/work-matching';
import type { CurriculumWork } from '@/lib/montree/curriculum-loader';
import { VISUAL_ID_GUIDE } from './visual-id-guide';
import {
  loadIdentificationContext,
  hasVisualMemoryFor,
  type IdentificationContext,
} from './context-loader';
import type { SupabaseClient } from '@supabase/supabase-js';

// ----- Constants -----

const PASS1_TIMEOUT_MS = 15_000;
const PASS2_TIMEOUT_MS = 15_000;
const PASS2B_TIMEOUT_MS = 15_000;
const PASS2B_CONFIDENCE_THRESHOLD = 0.85;
const PASS2B_NO_VM_THRESHOLD = 0.75;

// ----- Tool definition for Pass 2 (kept here so the lib is self-contained) -----

const TAG_PHOTO_TOOL = {
  name: 'tag_photo' as const,
  description: 'Tag a classroom photo with the Montessori work being done, the curriculum area, and the child\'s mastery level based on visual evidence.',
  input_schema: {
    type: 'object' as const,
    properties: {
      work_name: { type: 'string', description: 'The name of the Montessori work/activity matching the description.' },
      area: {
        type: 'string',
        enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'unknown'],
        description: 'The Montessori curriculum area this work belongs to.',
      },
      mastery_evidence: {
        type: 'string',
        enum: ['mastered', 'practicing', 'presented', 'unclear'],
        description: 'Evidence of mastery level visible in the description.',
      },
      confidence: { type: 'number', description: 'Confidence in the identification (0.0–1.0).' },
      observation: { type: 'string', description: 'Brief 1-sentence warm observation about the child\'s engagement.' },
      suggested_crop: {
        type: 'object',
        description: 'Suggested crop region in normalized 0-1 coordinates. Omit if not applicable.',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['x', 'y', 'width', 'height'],
      },
    },
    required: ['work_name', 'area', 'mastery_evidence', 'confidence', 'observation'],
  },
};

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'unknown'];
const VALID_MASTERY = ['mastered', 'practicing', 'presented', 'unclear'];

// Note: the legacy route's validateToolOutput also returned `work_verified` and
// `actual_work_name` fields. Those were used by the (now-deleted) CLIP enrichment
// path and are intentionally omitted here — the new pipeline does not need them.
function validateToolOutput(rawInput: Record<string, unknown>) {
  let suggested_crop: { x: number; y: number; width: number; height: number } | null = null;
  if (rawInput.suggested_crop && typeof rawInput.suggested_crop === 'object') {
    const c = rawInput.suggested_crop as Record<string, unknown>;
    const x = typeof c.x === 'number' ? Math.max(0, Math.min(1, c.x)) : null;
    const y = typeof c.y === 'number' ? Math.max(0, Math.min(1, c.y)) : null;
    const w = typeof c.width === 'number' ? Math.max(0.1, Math.min(1, c.width)) : null;
    const h = typeof c.height === 'number' ? Math.max(0.1, Math.min(1, c.height)) : null;
    if (x !== null && y !== null && w !== null && h !== null) {
      suggested_crop = { x: Math.min(x, 1 - w), y: Math.min(y, 1 - h), width: w, height: h };
    }
  }
  return {
    work_name: typeof rawInput.work_name === 'string' ? rawInput.work_name.trim().slice(0, 255) : '',
    area: typeof rawInput.area === 'string' && VALID_AREAS.includes(rawInput.area) ? rawInput.area : 'unknown',
    mastery_evidence: typeof rawInput.mastery_evidence === 'string' && VALID_MASTERY.includes(rawInput.mastery_evidence) ? rawInput.mastery_evidence : 'unclear',
    confidence: typeof rawInput.confidence === 'number' && !isNaN(rawInput.confidence) ? Math.max(0, Math.min(1, rawInput.confidence)) : 0,
    observation: typeof rawInput.observation === 'string' ? rawInput.observation.trim().slice(0, 500) : '',
    suggested_crop,
  };
}

// ----- Public types -----

export interface TwoPassInput {
  /** Public URL of the photo (Supabase or proxy) — must be fetchable by Anthropic */
  photoUrl: string;
  /** Child name/age for the prompt context (purely cosmetic — does NOT bias matching) */
  childName: string;
  childAge: number | string;
  /** Classroom for loading per-classroom corrections + visual memory */
  classroomId: string | null;
  /** Curriculum works (loaded once by caller and passed in for efficiency) */
  curriculum: CurriculumWork[];
  /** Controls observation language */
  locale: Locale;
  /** Pre-loaded identification context (corrections + visual memory). If omitted, will be loaded. */
  context?: IdentificationContext;
  /** Supabase client (only required if `context` is not provided) */
  supabase?: SupabaseClient;
  /** Optional abort signal for cancellation (e.g. parent route timeout) */
  abortSignal?: AbortSignal;
}

export interface TwoPassResult {
  /** True if Pass 2 produced a usable identification */
  success: boolean;
  /** Pass 1 visual description (always present, even on Pass 2 failure) */
  visualDescription: string;
  /** Structured Pass 2 result (null if Pass 2 failed) */
  identification: {
    /** The classroom-canonical work name (after matchToCurriculumV2) */
    workName: string;
    /** The raw work name Haiku produced (pre-fuzzy-match) */
    haikuWorkName: string;
    area: string | null;
    workKey: string | null;
    /** Haiku self-reported confidence 0.0–1.0 */
    confidence: number;
    /** matchToCurriculumV2 score 0.0–1.0 */
    matchScore: number;
    masteryEvidence: string;
    observation: string;
    suggestedCrop: { x: number; y: number; width: number; height: number } | null;
  } | null;
  /**
   * True if the FUZZY-MATCHED canonical work name (identification.workName,
   * NOT the raw haikuWorkName) has an entry in this classroom's visual memory.
   * The Step 4 background route uses this as part of the "trust Haiku" rule:
   * only auto-tag if confidence ≥ 0.75 AND hasVisualMemoryForMatch = true.
   * If false, the route should fall through to Sonnet draft — even on a
   * confident Haiku result — because the classroom hasn't yet bootstrapped
   * visual memory for that work and Haiku may be guessing from the guide alone.
   */
  hasVisualMemoryForMatch: boolean;
  /** True if Pass 2b (image re-examination) ran */
  pass2bFired: boolean;
  /** True if Pass 2b produced a higher-confidence result and was used */
  pass2bImproved: boolean;
  /** Model identifier used for all passes */
  modelUsed: string;
  /** Non-fatal errors collected during the run (for diagnostics / logging) */
  errors: string[];
  /** Loaded context, returned for caller reuse (e.g. Sonnet fallback) */
  context: IdentificationContext;
}

// ----- Pass 2b helper: Image re-examination with top candidates -----

/**
 * Build candidate list for Pass 2b re-examination.
 * Priority order:
 *   1. Haiku's Pass 2 guess (if it has visual memory)
 *   2. Same-area VM entries (area-aware — most confusions happen within the same area)
 *   3. Other-area VM entries as fillers up to 5 total
 *
 * All candidates include LOOKS LIKE + KEY MATERIALS + DISTINGUISH FROM so Haiku
 * can distinguish similar-looking works (e.g. Sandpaper Letters vs Blue Series).
 */
function buildPass2bCandidates(
  pass2Result: {
    identification: { workName: string; area: string | null } | null;
  },
  context: IdentificationContext,
): Array<{ name: string; area: string | null; looksLike: string }> {
  const seen = new Set<string>();
  const targetArea = pass2Result.identification?.area ?? null;

  // Priority 1: Haiku's Pass 2 guess (if it has visual memory)
  const priority1: Array<{ name: string; area: string | null; looksLike: string }> = [];
  if (pass2Result.identification && context.visualMemoryWorkNames.has(pass2Result.identification.workName.toLowerCase())) {
    const vmEntry = extractVisualMemoryEntry(context, pass2Result.identification.workName);
    if (vmEntry) {
      priority1.push({
        name: pass2Result.identification.workName,
        area: pass2Result.identification.area,
        looksLike: vmEntry,
      });
      seen.add(pass2Result.identification.workName.toLowerCase());
    }
  }

  // Parse all VM entries from context text, collecting full descriptions.
  // We capture LOOKS LIKE + KEY MATERIALS + DISTINGUISH FROM so Pass 2b has
  // enough detail to distinguish similar-looking works within the same area.
  type ParsedEntry = { name: string; area: string | null; looksLike: string; keyMaterials: string; distinguishFrom: string };
  const allParsed: ParsedEntry[] = [];
  const vmLines = context.visualMemoryContext.split('\n');
  let currentWork: ParsedEntry | null = null;

  const flushCurrentWork = () => {
    if (currentWork && currentWork.looksLike) allParsed.push({ ...currentWork });
  };

  for (const line of vmLines) {
    const headerMatch = line.match(/^- "([^"]+)" \(([^)]+)\):/);
    if (headerMatch) {
      flushCurrentWork();
      currentWork = { name: headerMatch[1], area: headerMatch[2] || null, looksLike: '', keyMaterials: '', distinguishFrom: '' };
      continue;
    }
    if (!currentWork) continue;
    const looksLikeMatch = line.match(/^\s+LOOKS LIKE:\s*(.+)/);
    if (looksLikeMatch && !currentWork.looksLike) { currentWork.looksLike = looksLikeMatch[1].trim(); continue; }
    const keyMatsMatch = line.match(/^\s+KEY MATERIALS:\s*(.+)/);
    if (keyMatsMatch && !currentWork.keyMaterials) { currentWork.keyMaterials = keyMatsMatch[1].trim(); continue; }
    const distinguishMatch = line.match(/^\s+DISTINGUISH FROM:\s*(.+)/);
    if (distinguishMatch && !currentWork.distinguishFrom) { currentWork.distinguishFrom = distinguishMatch[1].trim(); }
  }
  flushCurrentWork();

  const toCandidate = (e: ParsedEntry) => {
    const parts = [`LOOKS LIKE: ${e.looksLike}`];
    if (e.keyMaterials) parts.push(`KEY MATERIALS: ${e.keyMaterials}`);
    if (e.distinguishFrom) parts.push(`DISTINGUISH FROM: ${e.distinguishFrom}`);
    return { name: e.name, area: e.area, looksLike: parts.join(' | ') };
  };

  // Priority 2: same-area entries (most confusions are within-area)
  const sameArea = allParsed.filter(e => !seen.has(e.name.toLowerCase()) && e.area === targetArea);
  // Priority 3: other-area entries as fillers
  const otherArea = allParsed.filter(e => !seen.has(e.name.toLowerCase()) && e.area !== targetArea);

  const candidates = [...priority1];
  for (const e of [...sameArea, ...otherArea]) {
    if (candidates.length >= 5) break;
    if (seen.has(e.name.toLowerCase())) continue;
    candidates.push(toCandidate(e));
    seen.add(e.name.toLowerCase());
  }

  return candidates;
}

/**
 * Extract a visual memory entry's full distinguishing description from context.
 * Returns LOOKS LIKE + KEY MATERIALS + DISTINGUISH FROM so Pass 2b has enough
 * detail to tell similar-looking works apart (e.g. Sandpaper Letters vs Blue Series).
 */
function extractVisualMemoryEntry(context: IdentificationContext, workName: string): string {
  const escaped = workName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the block for this work: from the header line to the next header or end
  const pattern = new RegExp(`- "${escaped}"[^]*?LOOKS LIKE:\\s*([^\\n]+)(?:\\n\\s+KEY MATERIALS:\\s*([^\\n]+))?(?:\\n\\s+DISTINGUISH FROM:\\s*([^\\n]+))?`, 'i');
  const match = context.visualMemoryContext.match(pattern);
  if (!match) return '';
  const parts = [`LOOKS LIKE: ${match[1].trim()}`];
  if (match[2]) parts.push(`KEY MATERIALS: ${match[2].trim()}`);
  if (match[3]) parts.push(`DISTINGUISH FROM: ${match[3].trim()}`);
  return parts.join(' | ');
}

// ----- Main entry point -----

/**
 * Runs the two-pass (and optional Pass 2b) Haiku photo identification pipeline.
 *
 * Returns ALWAYS — never throws on identification failure. A "failed" run is
 * communicated via `success: false` and an `errors` array. Callers are expected
 * to inspect `success`, `confidence`, and `hasVisualMemoryForMatch` to decide
 * what to do next:
 *
 *   - success && confidence ≥ 0.75 && hasVisualMemoryForMatch
 *       → trust Haiku, write the work_id to montree_media
 *
 *   - everything else (low confidence, no visual memory, or pass failed)
 *       → fall through to Sonnet draft (a separate function in step 4)
 *
 * Side-effect-free: does NOT touch the database, the cache, or the visual
 * memory `times_used` counter. The caller (step 4 background route) is
 * responsible for ALL writes including firing `increment_visual_memory_used`
 * after a successful identification.
 *
 * Loaded `context` is returned in the result so the caller can reuse it for
 * a Sonnet fallback without re-querying the database.
 */
export async function runTwoPassIdentification(input: TwoPassInput): Promise<TwoPassResult> {
  const errors: string[] = [];
  const modelUsed = HAIKU_MODEL;

  if (!anthropic) {
    return {
      success: false,
      visualDescription: '',
      identification: null,
      hasVisualMemoryForMatch: false,
      modelUsed,
      errors: ['Anthropic client not configured (ANTHROPIC_API_KEY missing)'],
      context: input.context ?? {
        correctionsMap: new Map(),
        correctionsContext: '',
        visualMemoryContext: '',
        visualMemoryWorkNames: new Set(),
        visualMemoryInjectedCount: 0,
      },
    };
  }

  // ----- Load context if not pre-supplied -----
  let context = input.context;
  if (!context) {
    if (!input.supabase) {
      throw new Error('runTwoPassIdentification: either `context` or `supabase` must be provided');
    }
    context = await loadIdentificationContext(input.supabase, { classroomId: input.classroomId });
  }

  // ----- PASS 1: DESCRIBE -----
  let visualDescription = '';
  {
    const passAbort = new AbortController();
    const onParentAbort = () => passAbort.abort();
    if (input.abortSignal) input.abortSignal.addEventListener('abort', onParentAbort, { once: true });
    const timer = setTimeout(() => passAbort.abort(), PASS1_TIMEOUT_MS);

    try {
      const msg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 300,
        system: `You are observing a Montessori classroom photo. Describe ONLY what you physically see.

Start with what the child's hands are ACTIVELY touching or working with — this is the PRIMARY work. Then describe other materials nearby as secondary context.

Focus on:
1. HANDS & PRIMARY WORK: What is the child doing with their hands RIGHT NOW? (writing, tracing, stacking, sorting, pouring, threading, matching, etc.) What is the MAIN surface or tool their hands are on? Describe its material, color, and size.
2. MATERIAL COMPOSITION: What are the objects MADE OF? Be very specific: wood, metal, fabric/cloth, plastic, paper/cardboard, sandpaper, glass, ceramic? Are pieces RIGID (hard, stiff) or SOFT (foldable, flexible)?
3. SECONDARY OBJECTS: What other objects/tools are nearby on the table or mat but NOT being directly used? (these are accessories, not the main work)
4. SETUP: How are materials arranged? (in a frame, on a tray, in a box, on a mat, in pairs, in a sequence, etc.)
5. KEY DETAILS: Any closures (buttons, zippers, bows, laces, snaps)? Any colors/patterns? Any numbers/letters? If letters or words visible, specify: are they individual LETTERS on boards, or WORDS/SENTENCES on cards/strips? If colored pieces, specify: are they hard/rigid TABLETS or soft FABRIC swatches?

Be specific and factual. Do NOT guess the name of the activity. Do NOT say "Montessori work" or name any work.
Just describe the physical scene in 2-4 sentences. Lead with the PRIMARY work the hands are engaged with. ALWAYS state what the pieces are MADE OF.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: input.photoUrl } },
            { type: 'text', text: 'Describe the materials and what the child is doing.' },
          ],
        }],
      }, { signal: passAbort.signal });

      for (const block of msg.content) {
        if (block.type === 'text') {
          visualDescription = block.text.trim();
          break;
        }
      }
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
      errors.push(`Pass 1 ${isAbort ? 'timed out' : 'failed'}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
      if (input.abortSignal) input.abortSignal.removeEventListener('abort', onParentAbort);
    }
  }

  if (!visualDescription) {
    visualDescription = 'Unable to describe photo contents.';
  }

  // ----- PASS 2: MATCH -----
  const aiLangInstruction = getAILanguageInstruction(input.locale);
  const langInstruction = aiLangInstruction
    ? aiLangInstruction
    : 'Write the observation in English.';

  const pass2System = `You are a Montessori curriculum expert. A classroom photo was described by an observer. Match the description to the correct Montessori work name using the tag_photo tool.

${langInstruction}

CRITICAL RULES:
1. Match based on the MATERIALS DESCRIBED — the specific tool/material determines the work name
2. Use the VISUAL IDENTIFICATION GUIDE below as your primary matching reference
3. If CLASSROOM-VERIFIED WORKS are listed at the end, check if any match — they use classroom-specific names that may differ from the standard guide. Use classroom-specific names when the materials match closely.
4. If the description doesn't clearly match any work, set confidence LOW (below 0.5)
5. Keep the observation to ONE warm, specific sentence about the child's engagement
6. COMPOSITION: Suggest a crop if the description mentions a child and materials together. Use normalized 0-1 coordinates.

${VISUAL_ID_GUIDE}${context.correctionsContext}${context.visualMemoryContext}`;

  let identification: TwoPassResult['identification'] = null;
  let hasVisualMemoryForMatch = false;

  {
    const passAbort = new AbortController();
    const onParentAbort = () => passAbort.abort();
    if (input.abortSignal) input.abortSignal.addEventListener('abort', onParentAbort, { once: true });
    const timer = setTimeout(() => passAbort.abort(), PASS2_TIMEOUT_MS);

    try {
      const msg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 500,
        system: pass2System,
        tools: [TAG_PHOTO_TOOL],
        tool_choice: { type: 'tool', name: 'tag_photo' },
        messages: [{
          role: 'user',
          content: `PHOTO DESCRIPTION (from classroom observer):
"${visualDescription}"

Child: ${input.childName}, age ${input.childAge}

Match this description to the correct Montessori work. Use the visual identification guide in your instructions. Identify based ONLY on the physical materials described — do not guess based on the child's age or any other context.`,
        }],
      }, { signal: passAbort.signal });

      const toolBlock = msg.content.find(b => b.type === 'tool_use');
      if (toolBlock && toolBlock.type === 'tool_use') {
        const validated = validateToolOutput(toolBlock.input as Record<string, unknown>);
        const matchResult = matchToCurriculumV2(
          validated.work_name,
          validated.area !== 'unknown' ? validated.area : null,
          input.curriculum,
          context.correctionsMap,
          validated.observation,
        );

        const finalWorkName = matchResult.bestMatch?.name || validated.work_name;
        const finalArea = matchResult.bestMatch?.area_key || (validated.area !== 'unknown' ? validated.area : null);
        const finalWorkKey = matchResult.bestMatch?.work_key || null;

        identification = {
          workName: finalWorkName,
          haikuWorkName: validated.work_name,
          area: finalArea,
          workKey: finalWorkKey,
          confidence: validated.confidence,
          matchScore: matchResult.bestScore,
          masteryEvidence: validated.mastery_evidence,
          observation: validated.observation,
          suggestedCrop: validated.suggested_crop,
        };

        hasVisualMemoryForMatch = hasVisualMemoryFor(context, finalWorkName);
      } else {
        errors.push('Pass 2 returned no tool_use block');
      }
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
      errors.push(`Pass 2 ${isAbort ? 'timed out' : 'failed'}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
      if (input.abortSignal) input.abortSignal.removeEventListener('abort', onParentAbort);
    }
  }

  // ----- PASS 2B: Image re-examination (optional, triggered by low confidence or no visual memory) -----
  let pass2bFired = false;
  let pass2bImproved = false;

  if (identification && (identification.confidence < PASS2B_CONFIDENCE_THRESHOLD || !hasVisualMemoryForMatch)) {
    const pass2bCandidates = buildPass2bCandidates({ identification }, context);

    if (pass2bCandidates.length >= 2) {
      const passAbort = new AbortController();
      const onParentAbort = () => passAbort.abort();
      if (input.abortSignal) input.abortSignal.addEventListener('abort', onParentAbort, { once: true });
      const timer = setTimeout(() => passAbort.abort(), PASS2B_TIMEOUT_MS);

      try {
        pass2bFired = true;

        // Build candidate blocks for the prompt
        const candidateBlocks = pass2bCandidates
          .map((cand, idx) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, ...
            // looksLike may already contain "LOOKS LIKE: ... | KEY MATERIALS: ... | DISTINGUISH FROM: ..."
            // Format it clearly so Haiku can distinguish similar-looking works
            return `[${letter}] "${cand.name}" (${cand.area || 'unknown'}):
  ${cand.looksLike}`;
          })
          .join('\n\n');

        const aiLangInstruction2b = getAILanguageInstruction(input.locale);
        const pass2bMsg = await anthropic.messages.create({
          model: HAIKU_MODEL,
          max_tokens: 500,
          system: `You are observing a classroom photo. A preliminary analysis was made, but you now have a chance to re-examine the IMAGE alongside the top candidates.

${aiLangInstruction2b || 'Write your reasoning in English.'}

CRITICAL RULES:
1. Look at the PHOTO carefully. Compare the materials, colors, layout, and the child's hands to each candidate.
2. The candidates are listed with their classroom-specific visual descriptions.
3. Pick the MOST LIKELY candidate based on visual evidence, or suggest "none of these" with a new name and LOW confidence.
4. Use the tag_photo tool with your final choice.`,
          tools: [TAG_PHOTO_TOOL],
          tool_choice: { type: 'tool', name: 'tag_photo' },
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: input.photoUrl } },
              {
                type: 'text',
                text: `Look at this photo and compare it to these classroom candidates:

${candidateBlocks}

Which work is most likely based on the visual evidence? If none match well, you may suggest a different work with LOW confidence.`,
              },
            ],
          }],
        }, { signal: passAbort.signal });

        const toolBlock = pass2bMsg.content.find(b => b.type === 'tool_use');
        if (toolBlock && toolBlock.type === 'tool_use') {
          const validated = validateToolOutput(toolBlock.input as Record<string, unknown>);
          const matchResult = matchToCurriculumV2(
            validated.work_name,
            validated.area !== 'unknown' ? validated.area : null,
            input.curriculum,
            context.correctionsMap,
            validated.observation,
          );

          // Use Pass 2b result only if it's meaningfully MORE confident than Pass 2
          // (requires +0.05 margin to prevent marginal overrides — e.g. 0.83 > 0.82
          // was enough to swap Sandpaper Letters → Blue Series in Apr 28 incident)
          if (validated.confidence >= identification.confidence + 0.05) {
            const newWorkName = matchResult.bestMatch?.name || validated.work_name;
            const newArea = matchResult.bestMatch?.area_key || (validated.area !== 'unknown' ? validated.area : null);
            const newWorkKey = matchResult.bestMatch?.work_key || null;

            identification = {
              workName: newWorkName,
              haikuWorkName: validated.work_name,
              area: newArea,
              workKey: newWorkKey,
              confidence: validated.confidence,
              matchScore: matchResult.bestScore,
              masteryEvidence: validated.mastery_evidence,
              observation: validated.observation,
              suggestedCrop: validated.suggested_crop,
            };

            hasVisualMemoryForMatch = hasVisualMemoryFor(context, newWorkName);
            pass2bImproved = true;

            console.log(`[PhotoIdentification] Pass 2b improved: "${identification.haikuWorkName}" (${identification.confidence.toFixed(2)}) → "${newWorkName}" (${validated.confidence.toFixed(2)})`);
          }
        }
      } catch (err) {
        const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
        errors.push(`Pass 2b ${isAbort ? 'timed out' : 'failed'}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        clearTimeout(timer);
        if (input.abortSignal) input.abortSignal.removeEventListener('abort', onParentAbort);
      }
    }
  }

  return {
    success: identification !== null,
    visualDescription,
    identification,
    hasVisualMemoryForMatch,
    pass2bFired,
    pass2bImproved,
    modelUsed,
    errors,
    context,
  };
}
