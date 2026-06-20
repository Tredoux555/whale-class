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
import { matchToCurriculumV2, isCrossAreaConfusable } from '@/lib/montree/work-matching';
import type { CurriculumWork } from '@/lib/montree/curriculum-loader';
import { VISUAL_ID_GUIDE } from './visual-id-guide';
import {
  loadIdentificationContext,
  hasVisualMemoryFor,
  type IdentificationContext,
} from './context-loader';
import type { SupabaseClient } from '@supabase/supabase-js';

// ----- Constants -----

// Pass 1 (vision) gets a longer budget — a transient fetch/connection lag here
// used to become a PERSISTED "failed" with no description. The route has a 120s
// ceiling, so 25s for Pass 1 + 15s each for Pass 2/2b leaves ample headroom and
// converts would-have-succeeded timeouts into real descriptions.
const PASS1_TIMEOUT_MS = 25_000;
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
      // 🚨 Session 113 V2 photo AI quality audit Q-1 — is_curriculum_work
      // escape hatch. Up to 20% of teacher captures aren\'t curriculum
      // works (snack time, group photos, child\'s face, classroom decor,
      // play moments). Forcing tool_choice on tag_photo meant Haiku
      // ALWAYS picked some work, producing false-positive haiku_drafted
      // entries. Now Haiku can signal a non-curriculum photo via
      // is_curriculum_work=false and the route routes to the "Save as
      // Other" path automatically.
      is_curriculum_work: {
        type: 'boolean',
        description:
          'Set to TRUE whenever recognisable Montessori curriculum materials are present — even if no child is actively manipulating them in the frame, and whether the setting is a classroom OR a home/homeschool. Set to FALSE only for genuine non-work photos: snack/meal, sleeping/rest, group photo or a face with no materials, free play with ordinary (non-Montessori) toys, decoration, transitions, or paperwork. When false, the work_name field MUST be set to "Other".',
      },
      work_name: { type: 'string', description: 'The name of the Montessori work/activity matching the description. When is_curriculum_work=false, set to "Other".' },
      area: {
        type: 'string',
        enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'unknown'],
        description: 'The Montessori curriculum area this work belongs to. When is_curriculum_work=false, set to "unknown".',
      },
      mastery_evidence: {
        type: 'string',
        enum: ['mastered', 'practicing', 'presented', 'unclear'],
        description: 'Evidence of mastery level visible in the description. When is_curriculum_work=false, set to "unclear".',
      },
      confidence: { type: 'number', description: 'Confidence in the identification (0.0–1.0).' },
      observation: { type: 'string', description: 'Brief 1-sentence warm observation about the child\'s engagement.' },
      best_curriculum_guess: {
        type: 'string',
        description: 'ALWAYS give your single best Montessori-work guess for this photo — the curriculum work it most resembles — EVEN IF is_curriculum_work is false. This powers a one-tap "looks like X?" suggestion so the teacher is never left with nothing to tap. Omit only if the photo truly contains no learning materials at all (a child\'s face, a meal, an empty room).',
      },
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
    required: ['is_curriculum_work', 'work_name', 'area', 'mastery_evidence', 'confidence', 'observation'],
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
  // 🚨 Session 113 V2 photo AI quality audit Q-1 — surface is_curriculum_work.
  // Default true to preserve backward-compat with cached responses minted
  // before the field was added. Pass 2 prompt explicitly teaches Haiku
  // to set it to false for non-curriculum photos.
  const isCurriculumWork =
    typeof rawInput.is_curriculum_work === 'boolean' ? rawInput.is_curriculum_work : true;
  return {
    is_curriculum_work: isCurriculumWork,
    work_name: typeof rawInput.work_name === 'string' ? rawInput.work_name.trim().slice(0, 255) : '',
    area: typeof rawInput.area === 'string' && VALID_AREAS.includes(rawInput.area) ? rawInput.area : 'unknown',
    mastery_evidence: typeof rawInput.mastery_evidence === 'string' && VALID_MASTERY.includes(rawInput.mastery_evidence) ? rawInput.mastery_evidence : 'unclear',
    confidence: typeof rawInput.confidence === 'number' && !isNaN(rawInput.confidence) ? Math.max(0, Math.min(1, rawInput.confidence)) : 0,
    observation: typeof rawInput.observation === 'string' ? rawInput.observation.trim().slice(0, 500) : '',
    best_curriculum_guess: typeof rawInput.best_curriculum_guess === 'string' ? rawInput.best_curriculum_guess.trim().slice(0, 255) : '',
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

// Sentinel — exported so the route can detect the placeholder-fallback case
// without duplicating the string. Bumped to a distinctive marker rather than
// a natural-sounding sentence so it can never accidentally match a real Haiku
// output. See F-7 fix below.
export const PASS1_FAILED_SENTINEL = '__PASS_1_UNAVAILABLE__';

export interface TwoPassResult {
  /** True if Pass 2 produced a usable identification */
  success: boolean;
  /** Pass 1 visual description (always present, even on Pass 2 failure) */
  visualDescription: string;
  /**
   * True if Pass 1 failed (no usable visual description was produced). When
   * true, Pass 2 was skipped entirely — there is nothing to match on. The
   * route MUST treat this as a terminal failure (status='failed') instead of
   * writing a haiku_drafted draft with garbage matches.
   *
   * AUDIT FIX (Session 113, F-7): previously, Pass 1 failure fell back to a
   * placeholder string and Pass 2 produced confidently-wrong matches against
   * the placeholder. Teachers saw drafts referencing curriculum works the
   * photo couldn't possibly contain.
   *
   * Optional (?) for back-compat with the pre-existing early-return paths
   * (no-anthropic-client + Pass 2 failed) — those still set success=false
   * but pass1Failed remains undefined since Pass 1 wasn't the proximate
   * cause. Treat `pass1Failed === true` as the only positive signal.
   */
  pass1Failed?: boolean;
  /** Structured Pass 2 result (null if Pass 2 failed) */
  identification: {
    /**
     * 🚨 Session 113 V2 photo AI quality audit Q-1 — non-curriculum
     * escape hatch. When false, the photo is NOT a curriculum work
     * (snack time, group photo, child's face only, free play, etc.).
     * The route routes such photos straight to the 'Other' bucket
     * instead of generating a false-positive haiku_drafted entry.
     */
    is_curriculum_work: boolean;
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
    /**
     * Top 3 fuzzy-match candidates from matchToCurriculumV2, ordered by score.
     * The audit UI renders these as quick-tap chips so the teacher can confirm
     * any of the top 3 without typing. The bestMatch (above) is always
     * candidates[0]. Includes the chosen one for symmetry.
     */
    topCandidates: Array<{
      workName: string;
      workKey: string | null;
      area: string | null;
      score: number;
    }>;
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

Start with what the child's hands are ACTIVELY touching or working with — this is the PRIMARY work. Then describe other materials on the SAME work surface as secondary context.

⚠️ CRITICAL: Describe ONLY materials on the child's immediate work surface (the table or mat directly in front of them). COMPLETELY IGNORE everything visible in the background — shelves, walls, other children's mats, posters, cards hanging or stored nearby. Background materials are irrelevant and will cause wrong identifications.

Focus on:
1. HANDS & PRIMARY WORK: What is the child doing with their hands RIGHT NOW? (writing, tracing, stacking, sorting, pouring, threading, matching, etc.) What is the MAIN surface or tool their hands are on? Describe its material, color, and size.
2. MATERIAL COMPOSITION: What are the objects MADE OF? Be very specific: wood, metal, fabric/cloth, plastic, paper/cardboard, sandpaper, glass, ceramic? Are pieces RIGID (hard, stiff) or SOFT (foldable, flexible)?
3. SECONDARY OBJECTS: What other objects/tools are on the SAME TABLE OR MAT but NOT being directly used? (accessories only — ignore anything not on the child's work surface)
4. SETUP: How are materials arranged? (in a frame, on a tray, in a box, on a mat, in pairs, in a sequence, etc.)
5. KEY DETAILS: Any closures (buttons, zippers, bows, laces, snaps)? Any colors/patterns? Any numbers/letters? If letters or words visible, specify: are they individual LETTERS on boards, or WORDS/SENTENCES on cards/strips? If colored pieces, specify: are they hard/rigid TABLETS or soft FABRIC swatches?

EXAMPLES — what GOOD vs BAD descriptions look like:

Example 1 — Pink Tower, overhead photo, busy classroom in background:
GOOD: "The child's hands are stacking small pink wooden cubes on a green mat. The cubes graduate in size from large to small, and several are already stacked into a vertical tower. A few unstacked cubes sit on the mat beside the tower. All pieces are rigid solid wood, painted pink."
BAD (leaks background): "The child is working with pink cubes. Behind them I can see red rods on a shelf and another child working with golden beads nearby. There are also colored cards on the wall."

Example 2 — Sandpaper Letter "m", angled photo:
GOOD: "The child's fingers are tracing a single lowercase letter 'm' made of red sandpaper, mounted on a pink rectangular wooden board. The board is resting flat on a small mat. No other letters or cards are on the mat."
BAD (over-interprets): "The child is doing a phonics activity, learning the letter m. They are practicing letter formation as part of pre-writing work."

Example 3 — child sitting on the rug, no materials in hand, looking at the camera:
GOOD: "The child is sitting on a green rug with empty hands resting in their lap. No materials are visible on the rug in front of them or in their hands."
BAD (invents materials): "The child appears to be taking a break from a sensorial work, with hands ready to begin another activity."

Be specific and factual. Do NOT guess the name of the activity. Do NOT say "Montessori work" or name any work.
Just describe the physical scene in 2-4 sentences. Lead with the PRIMARY work the hands are engaged with — or, if no child is in the frame, with the main materials laid out. ALWAYS state what the pieces are MADE OF, whether or not a child is touching them. If no child is present, note that briefly, but still describe the materials fully — do NOT editorialise about whether it counts as "work" (that judgement happens later).`,
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
      // AUDIT FIX (Apr 30, 2026): cap Pass 1 output at 600 chars before passing
      // to Pass 2. Defends against an unbounded Haiku ramble blowing the Pass 2
      // token budget or generally corrupting the prompt. 600 chars ≈ 4 sentences,
      // which matches the prompt instruction. Anything longer is signal that
      // Haiku misunderstood the task.
      if (visualDescription.length > 600) {
        visualDescription = visualDescription.slice(0, 600).trim() + '…';
      }
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
      errors.push(`Pass 1 ${isAbort ? 'timed out' : 'failed'}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
      if (input.abortSignal) input.abortSignal.removeEventListener('abort', onParentAbort);
    }
  }

  // 🚨 F-7 (Session 113 photo pipeline audit): if Pass 1 failed (Anthropic
  // couldn't fetch the photo, hit a 403/timeout, or returned an empty body),
  // there is NOTHING TO MATCH. Previously we fell back to a soft placeholder
  // and let Pass 2 produce garbage. Now: bail with a clear sentinel so the
  // route writes status='failed' and the teacher sees an honest red error
  // card instead of a confidently-wrong draft.
  if (!visualDescription) {
    return {
      success: false,
      visualDescription: PASS1_FAILED_SENTINEL,
      pass1Failed: true,
      identification: null,
      hasVisualMemoryForMatch: false,
      pass2bFired: false,
      pass2bImproved: false,
      modelUsed: HAIKU_MODEL,
      errors: errors.length > 0 ? errors : ['Pass 1 produced no description — photo may be unfetchable by Anthropic.'],
      context,
    };
  }

  // ----- PASS 2: MATCH -----
  const aiLangInstruction = getAILanguageInstruction(input.locale);
  const langInstruction = aiLangInstruction
    ? aiLangInstruction
    : 'Write the observation in English.';

  // 🚨 Session 113 V2 photo AI quality audit Q-4 — prompt caching for Pass 2.
  // The system prompt is split into a CACHED static prefix (boilerplate
  // instructions + VISUAL_ID_GUIDE ≈ 3-4K tokens, identical across all calls)
  // and a DYNAMIC suffix (per-locale langInstruction + per-classroom
  // correctionsContext + visualMemoryContext). Anthropic's prompt caching pays
  // the full cost on the first call and ~10% on subsequent prefix-matching
  // calls. At ~50 photos/day per school × 7 schools × ~$0.005/photo cached →
  // ~$5/day per active school in Haiku spend saved. Required prefix size for
  // caching to activate is ≥1024 tokens; VISUAL_ID_GUIDE alone is ~3K tokens
  // so this is comfortably above the threshold.
  //
  // STRUCTURE: cached block FIRST (largest invariant prefix), dynamic block
  // AFTER. langInstruction is per-locale (12 distinct values) so we keep it
  // dynamic — moving it before the cache breakpoint would invalidate the
  // cache on every locale switch.
  const PASS2_STATIC_INSTRUCTIONS = `You are a Montessori curriculum expert. A classroom photo was described by an observer. Match the description to the correct Montessori work name using the tag_photo tool.

🚨 IS THIS A MONTESSORI WORK?
Decide by the MATERIALS — not by what the child is doing, and not by the room:
- A work counts whether the child is actively using the materials, sitting beside them, OR the materials / finished work are shown on their own with NO child in the frame. A clear photo of the materials laid out is still a work photo.
- Home and homeschool settings (a carpet, a living room, a home shelf) count EXACTLY the same as a classroom. NEVER reject a photo for being taken at home or for the absence of a child in the frame.
- If the description names recognisable Montessori materials (e.g. number rods, red rods, brown stair / broad stair, pink tower, knobbed/knobless cylinders, sandpaper letters, spindle box, bead chains/frames, metal insets, etc.), it IS a curriculum work — set is_curriculum_work=true — even when the description says no child is touching them right now.

Only set is_curriculum_work=false when the photo is genuinely NOT about Montessori materials:
- Snack time / eating / a meal
- Sleeping / resting / nap
- Group photos / class pictures, or a child's face with no materials present
- Free play with ordinary toys that are NOT Montessori materials
- Decoration / empty-room setup / transitions / lining up
- Paperwork / certificates / artwork on a wall

When it is NOT a Montessori work, set:
- is_curriculum_work: false
- work_name: "Other"
- area: "unknown"
- mastery_evidence: "unclear"
- confidence: 0.9 (you're confident it's NOT a work)
- observation: A short warm sentence describing what you see anyway ("Eric enjoying snack with friends.").

When the photo IS a Montessori work, set is_curriculum_work=true and follow the rules below to identify it.

CRITICAL RULES (for curriculum work photos):
1. Match based on the MATERIALS DESCRIBED — the specific tool/material determines the work name
2. Use the VISUAL IDENTIFICATION GUIDE below as your primary matching reference
3. If CLASSROOM-VERIFIED WORKS are listed at the end, check if any match — they use classroom-specific names that may differ from the standard guide. Use classroom-specific names when the materials match closely.
4. If the description doesn't clearly match any work, set confidence LOW (below 0.5)
5. Keep the observation to ONE warm, specific sentence about the child's engagement
6. COMPOSITION: Suggest a crop if the description mentions a child and materials together. Use normalized 0-1 coordinates.

${VISUAL_ID_GUIDE}`;

  const pass2SystemDynamic = `${langInstruction}${context.correctionsContext}${context.visualMemoryContext}`;

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
        system: [
          // Cached prefix: boilerplate + VISUAL_ID_GUIDE. Identical across
          // every Pass 2 call platform-wide. cache_control marks the
          // breakpoint — everything UP TO AND INCLUDING this block is
          // cached as a single ephemeral prefix.
          { type: 'text', text: PASS2_STATIC_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
          // Dynamic suffix: per-locale + per-classroom. Always re-sent in full.
          { type: 'text', text: pass2SystemDynamic },
        ],
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

        // Extract top 3 candidates for the audit UI quick-tap chips.
        let topCandidates = (matchResult.candidates || []).slice(0, 3).map((c) => ({
          workName: c.work.name,
          workKey: c.work.work_key || null,
          area: c.work.area_key || null,
          score: c.score,
        }));

        // Gap 1 — ALWAYS-SUGGEST (never dead-end). When the primary match
        // produced no candidates (e.g. is_curriculum_work=false → work_name
        // "Other", or a name the matcher couldn't place), fall back to matching
        // the model's best_curriculum_guess so the audit card can ALWAYS offer a
        // one-tap "looks like X?" chip. The classification itself is unchanged —
        // this only enriches the suggestion list so nothing is ever a blank
        // "Untagged" wall.
        if (topCandidates.length === 0 && validated.best_curriculum_guess) {
          const fb = matchToCurriculumV2(
            validated.best_curriculum_guess,
            null,
            input.curriculum,
            context.correctionsMap,
            validated.observation,
          );
          topCandidates = (fb.candidates || []).slice(0, 3).map((c) => ({
            workName: c.work.name,
            workKey: c.work.work_key || null,
            area: c.work.area_key || null,
            score: c.score,
          }));
        }

        identification = {
          is_curriculum_work: validated.is_curriculum_work,
          workName: finalWorkName,
          haikuWorkName: validated.work_name,
          area: finalArea,
          workKey: finalWorkKey,
          confidence: validated.confidence,
          matchScore: matchResult.bestScore,
          masteryEvidence: validated.mastery_evidence,
          observation: validated.observation,
          suggestedCrop: validated.suggested_crop,
          topCandidates,
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

  // ----- PASS 2B: Image re-examination (optional, triggered by low confidence, no visual memory, or cross-area confusion) -----
  let pass2bFired = false;
  let pass2bImproved = false;

  // 🚨 Session 113 V2 photo AI quality audit Q-11: when Pass 2's resolved work
  // is documented as cross-area-confusable (Red Rods ↔ Number Rods, Metal Insets
  // ↔ Geometric Cabinet, etc.) the area-constrained matcher may be hiding a
  // cross-area failure. The matcher trusts Pass 2's `area`; the only thing that
  // can disambiguate across areas is the photo itself. Force Pass 2b so the
  // image-re-examination pass gets a chance, regardless of Pass 2 confidence.
  const forcePass2bCrossArea = !!identification && isCrossAreaConfusable(
    identification.workName,
    identification.haikuWorkName,
  );

  if (
    identification &&
    (
      forcePass2bCrossArea ||
      identification.confidence < PASS2B_CONFIDENCE_THRESHOLD ||
      !hasVisualMemoryForMatch
    )
  ) {
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
          // was enough to swap Sandpaper Letters → Blue Series in Apr 28 incident).
          //
          // 🚨 Session 113 V2 photo AI quality audit Q-12 — symmetry: when Pass 2b
          // does NOT override but its confidence is meaningfully LOWER than Pass 2's,
          // we previously IGNORED Pass 2b entirely and kept Pass 2's high confidence.
          // That made the +0.05 ratchet a one-way trust gate ("Pass 2b can lift
          // confidence but never lower it") — Gate A would fire on Pass 2's stale
          // high confidence even when the second opinion explicitly disagreed.
          //
          // Fix: if Pass 2b ran cleanly, did not override, and its confidence is
          // ≥0.10 LOWER than Pass 2's, CAP the stored confidence at Pass 2b's value.
          // The work name + area stay with Pass 2 (Pass 2b doesn't propose an
          // override) but the confidence reflects the second opinion's caution.
          // This downgrades Gate A trust when the second look is less sure.
          // (Symmetric ratchet floor of 0.10 mirrors the +0.05 override margin
          // — slightly higher because lowering confidence is more conservative.)
          const PASS2B_DOWNGRADE_FLOOR = 0.10;
          if (validated.confidence >= identification.confidence + 0.05) {
            const newWorkName = matchResult.bestMatch?.name || validated.work_name;
            const newArea = matchResult.bestMatch?.area_key || (validated.area !== 'unknown' ? validated.area : null);
            const newWorkKey = matchResult.bestMatch?.work_key || null;

            const newTopCandidates = (matchResult.candidates || []).slice(0, 3).map((c) => ({
              workName: c.work.name,
              workKey: c.work.work_key || null,
              area: c.work.area_key || null,
              score: c.score,
            }));

            identification = {
              // Pass 2b is a curriculum-work discriminator (it picks
              // between A/B/C real works) — the Sonnet prompt doesn't
              // expose is_curriculum_work to it, so preserve the
              // previous Pass 2 value (which already said true; we'd
              // never have reached Pass 2b if Pass 2 said it wasn't a
              // curriculum work).
              is_curriculum_work: identification?.is_curriculum_work ?? true,
              workName: newWorkName,
              haikuWorkName: validated.work_name,
              area: newArea,
              workKey: newWorkKey,
              confidence: validated.confidence,
              matchScore: matchResult.bestScore,
              masteryEvidence: validated.mastery_evidence,
              observation: validated.observation,
              suggestedCrop: validated.suggested_crop,
              topCandidates: newTopCandidates,
            };

            hasVisualMemoryForMatch = hasVisualMemoryFor(context, newWorkName);
            pass2bImproved = true;

            console.log(`[PhotoIdentification] Pass 2b improved: "${identification.haikuWorkName}" (${identification.confidence.toFixed(2)}) → "${newWorkName}" (${validated.confidence.toFixed(2)})`);
          } else if (identification.confidence - validated.confidence >= PASS2B_DOWNGRADE_FLOOR) {
            // Q-12: Pass 2b did not override but signalled meaningfully LOWER
            // confidence. Treat as a confidence ceiling — cap the stored
            // confidence at Pass 2b's value so Gate A trust may not fire on
            // Pass 2's stale high confidence. Work name + area + match score
            // remain Pass 2's; only the confidence is downgraded.
            const cappedConfidence = validated.confidence;
            const priorConfidence = identification.confidence;
            identification = { ...identification, confidence: cappedConfidence };
            console.log(`[PhotoIdentification] Pass 2b downgraded confidence (no override): ${priorConfidence.toFixed(2)} → ${cappedConfidence.toFixed(2)} (work "${identification.workName}" unchanged)`);
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
