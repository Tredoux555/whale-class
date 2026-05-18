// lib/montree/photo-identification/context-loader.ts
//
// Loads per-classroom identification context (corrections map + visual memory)
// for use in the two-pass photo identification pipeline.
//
// Extracted from app/api/montree/guru/photo-insight/route.ts so the new
// background photo-identification pipeline can reuse the same logic without
// duplicating the database queries or the prompt-formatting rules.
//
// Returns:
//   - correctionsMap: lowercase original work name → corrected work name
//                     (used by matchToCurriculumV2 to nudge fuzzy matches)
//   - correctionsContext: prompt-ready string ("- You said X but teacher corrected to Y")
//   - visualMemoryContext: prompt-ready CLASSROOM-VERIFIED WORKS block
//   - visualMemoryWorkNames: list of work names that have visual memory entries
//                            (used by the new pipeline's "Haiku trust" rule:
//                            only trust Haiku ≥0.75 if the matched work has
//                            an entry in visual memory)

import type { SupabaseClient } from '@supabase/supabase-js';

// ----- Prompt sanitization -----
// Strips control characters that could be used for prompt injection via
// malicious work names stored in the DB (e.g. a teacher correction with
// "Ignore all instructions..." as the name).
function sanitizeForPrompt(input: string, maxLen: number = 200): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\n\r\t`<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// ----- Public types -----

export interface IdentificationContext {
  /** lowercase original_work_name → corrected_work_name (for matchToCurriculumV2) */
  correctionsMap: Map<string, string>;
  /** Prompt-ready "TEACHER CORRECTIONS" block, or empty string */
  correctionsContext: string;
  /** Prompt-ready "CLASSROOM-VERIFIED WORKS" block, or empty string */
  visualMemoryContext: string;
  /** Lowercased work names that have a visual memory entry in this classroom */
  visualMemoryWorkNames: Set<string>;
  /** Number of visual memory entries actually injected into the prompt */
  visualMemoryInjectedCount: number;
}

const EMPTY_CONTEXT: IdentificationContext = {
  correctionsMap: new Map(),
  correctionsContext: '',
  visualMemoryContext: '',
  visualMemoryWorkNames: new Set(),
  visualMemoryInjectedCount: 0,
};

// ----- Loader -----

/**
 * Loads corrections + visual memory for a classroom and assembles them into
 * prompt-ready strings.
 *
 * No-op (returns empty context) when classroomId is null.
 *
 * Visual memory inclusion rule (matches the legacy route's logic, Apr 5 2026):
 *   - is_custom = true                    → always inject (custom works)
 *   - source = 'teacher_setup', conf ≥0.9 → inject (teacher taught the AI)
 *   - source = 'correction',    conf ≥0.9 → inject (teacher corrected a misID)
 *   - everything else                     → SKIP (auto-generated, biased)
 */
export async function loadIdentificationContext(
  supabase: SupabaseClient,
  opts: { classroomId: string | null; useV2?: boolean }
): Promise<IdentificationContext> {
  const { classroomId, useV2 = false } = opts;
  if (!classroomId) return EMPTY_CONTEXT;

  const [correctionsResult, visualMemoryResult] = await Promise.allSettled([
    supabase
      .from('montree_guru_corrections')
      .select('original_work_name, corrected_work_name')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('montree_visual_memory')
      .select('work_name, area, visual_description, is_custom, key_materials, negative_descriptions, source, description_confidence, updated_at')
      .eq('classroom_id', classroomId)
      .order('description_confidence', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200), // raised from 100 (Apr 30 audit) so the adaptive char budget below has headroom
  ]);

  // ----- Corrections -----
  const correctionsMap = new Map<string, string>();
  let correctionsContext = '';

  if (correctionsResult.status === 'fulfilled') {
    const corrections = correctionsResult.value?.data;
    if (corrections && corrections.length > 0) {
      const promptEntries: string[] = [];
      for (const c of corrections) {
        const orig = typeof c.original_work_name === 'string' ? c.original_work_name.trim() : '';
        const corr = typeof c.corrected_work_name === 'string' ? c.corrected_work_name.trim() : '';
        if (!orig || !corr) continue;
        const key = orig.toLowerCase();
        if (!correctionsMap.has(key)) correctionsMap.set(key, corr);
        if (promptEntries.length < 10) {
          promptEntries.push(
            `- You said "${sanitizeForPrompt(orig, 100)}" but teacher corrected to "${sanitizeForPrompt(corr, 100)}"`
          );
        }
      }
      if (promptEntries.length > 0) {
        correctionsContext = `\n\nTEACHER CORRECTIONS (learn from these — you got these wrong before):\n${promptEntries.join('\n')}`;
      }
    }
  }

  // ----- Visual memory -----
  let visualMemoryContext = '';
  const visualMemoryWorkNames = new Set<string>();
  let visualMemoryInjectedCount = 0;

  if (visualMemoryResult.status === 'fulfilled') {
    const memories = visualMemoryResult.value?.data;
    if (memories && memories.length > 0) {
      // V2 (Session 117+): age-decay re-sort BEFORE filter+format so the most
      // durable signal wins the budget instead of the most-recently-touched.
      // weighted_score = description_confidence * exp(-days_since_update / 90)
      // A 30d-old high-confidence entry beats a 1d-old medium-confidence one,
      // killing the "recently-corrected work biases all future matches" pattern.
      type VisualMemRow = {
        work_name: string;
        area: string | null;
        visual_description: string;
        is_custom: boolean;
        key_materials: string[] | null;
        negative_descriptions: string[] | null;
        source: string;
        description_confidence: number | null;
        updated_at: string | null;
      };
      const ranked: VisualMemRow[] = (memories as VisualMemRow[]).slice();
      if (useV2) {
        const now = Date.now();
        const scoreOf = (m: VisualMemRow): number => {
          const conf = m.description_confidence || 0;
          if (!m.updated_at) return conf; // null updated_at = treat as no decay
          const ts = Date.parse(m.updated_at);
          if (Number.isNaN(ts)) return conf;
          const daysOld = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
          return conf * Math.exp(-daysOld / 90);
        };
        ranked.sort((a, b) => scoreOf(b) - scoreOf(a));
      }

      const verifiedEntries: string[] = [];

      for (const m of ranked) {
        // Relaxed filter (Apr 8): accept teacher_enrichment as a valid source
        // (classroom-setup writes this), drop confidence bar from 0.9 → 0.75.
        // Previously the strict filter was starving the Gate A trust check —
        // Whale Class has 53 described works but only 30 made the cap, and
        // teacher_enrichment rows were excluded entirely.
        const VALID_SOURCES = ['teacher_setup', 'correction', 'teacher_enrichment', 'teacher_new_work'];
        const isTeacherValidated =
          VALID_SOURCES.includes(m.source) &&
          (m.description_confidence || 0) >= 0.75;
        if (!m.is_custom && !isTeacherValidated) continue;

        const name = sanitizeForPrompt(m.work_name, 100);
        const desc = sanitizeForPrompt(m.visual_description, 300);
        if (!name || !desc) continue;

        const keyMats = Array.isArray(m.key_materials) && m.key_materials.length > 0
          ? m.key_materials.map((k: string) => sanitizeForPrompt(k, 60)).join(', ')
          : null;
        const negatives = Array.isArray(m.negative_descriptions) && m.negative_descriptions.length > 0
          ? m.negative_descriptions.map((n: string) => sanitizeForPrompt(n, 80)).join('; ')
          : null;

        let entry = `- "${name}" (${sanitizeForPrompt(m.area || 'unknown', 30)}):\n  LOOKS LIKE: ${desc}`;
        if (keyMats) entry += `\n  KEY MATERIALS: ${keyMats}`;
        if (negatives) entry += `\n  DISTINGUISH FROM: ${negatives}`;

        verifiedEntries.push(entry);
      }

      if (verifiedEntries.length > 0) {
        // V2 (Session 117+): reduced budget from 50KB/100 → 20KB/40 because the
        // Apr 30 expansion drowned Haiku's attention and the user reported a
        // regression ("recently-corrected work biases all future matches" +
        // worksheet-overmatch). V1 budget retained as the fallback.
        //
        // V1 (Apr 30, 2026): adaptive cap.
        // Old: hard slice at 50 entries. Whale Class has 65+ eligible entries
        // and 15 high-quality ones were silently dropped every Pass 2 call.
        // New: pack as many entries as fit in a 50KB char budget (~12K tokens),
        // up to a 100-entry sanity ceiling. Entries are already sorted by
        // (description_confidence DESC, updated_at DESC) by the SELECT, so
        // we naturally fill the budget with the highest-quality recent entries.
        const VM_CHAR_BUDGET = useV2 ? 20_000 : 50_000; // ~5K vs ~12.5K tokens
        const VM_HARD_CEILING = useV2 ? 40 : 100;
        const VM_MIN_FLOOR = useV2 ? 15 : 30; // budget can only stop AFTER N entries packed
        const capped: string[] = [];
        let runningChars = 0;
        for (const entry of verifiedEntries) {
          if (capped.length >= VM_HARD_CEILING) break;
          if (runningChars + entry.length > VM_CHAR_BUDGET && capped.length >= VM_MIN_FLOOR) break;
          capped.push(entry);
          runningChars += entry.length;
        }
        visualMemoryInjectedCount = capped.length;
        visualMemoryContext = `\n\nCLASSROOM-VERIFIED WORKS (teacher has confirmed these — match to these when the description fits):\n\n${capped.join('\n\n')}\n\nThese are teacher-confirmed descriptions of materials in THIS classroom. When the photo description closely matches a verified work's KEY MATERIALS, prefer that match over the generic guide. Pay attention to DISTINGUISH FROM entries to avoid common confusions.`;

        // Register only the works that are actually in the prompt — Gate A should only
        // trust identifications where Haiku had the visual description available.
        for (const entry of capped) {
          const nameMatch = entry.match(/^- "([^"]+)"/);
          if (nameMatch) visualMemoryWorkNames.add(nameMatch[1].trim().toLowerCase());
        }
      }
    }
  }

  return {
    correctionsMap,
    correctionsContext,
    visualMemoryContext,
    visualMemoryWorkNames,
    visualMemoryInjectedCount,
  };
}

/**
 * Convenience: returns true if `workName` has an entry in the loaded visual
 * memory set (case-insensitive). Used by the new pipeline's "Haiku trust" rule.
 */
export function hasVisualMemoryFor(ctx: IdentificationContext, workName: string): boolean {
  if (!workName) return false;
  return ctx.visualMemoryWorkNames.has(workName.trim().toLowerCase());
}
