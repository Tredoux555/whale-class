// lib/montree/guru/brain.ts
// Self-Improving Guru Brain
//
// The Guru has a living brain that gets smarter after every conversation.
// It stores accumulated wisdom — what works, what doesn't, developmental
// insights, therapeutic techniques that land — and feeds this back into
// future conversations.
//
// Architecture:
//   1. BRAIN STORAGE — A JSONB document in montree_guru_brain table
//      containing categorized wisdom sections
//   2. LEARNING EXTRACTION — After each conversation, extract key learnings
//      (what advice was given, what worked, what the parent responded to)
//   3. BRAIN CONSOLIDATION — Periodically, use Claude itself to compress
//      and synthesize raw learnings into polished wisdom
//   4. BRAIN RETRIEVAL — Before each conversation, pull relevant brain
//      sections based on child age, area, and parent concerns
//
// The brain is NOT per-child. It's the Guru's global wisdom that grows
// from ALL conversations across ALL families.

import { getSupabase } from '@/lib/supabase-client';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';

// =========================================================================
// Types
// =========================================================================

interface BrainSection {
  id: string;
  category: BrainCategory;
  content: string;           // The actual wisdom
  source_count: number;      // How many conversations contributed
  confidence: number;        // 0.0 - 1.0
  last_updated: string;      // ISO timestamp
  tags: string[];            // For retrieval matching
}

type BrainCategory =
  | 'developmental_wisdom'    // What works at different ages/stages
  | 'therapeutic_techniques'  // What calms/supports parents effectively
  | 'montessori_insights'    // Curriculum-specific discoveries
  | 'behavioral_patterns'    // Recurring behavior → cause → solution chains
  | 'parent_psychology'      // What parents need emotionally at different stages
  | 'failure_modes'          // What DOESN'T work — avoid these approaches
  | 'breakthrough_moments';  // Specific advice that led to breakthroughs

const VALID_CATEGORIES = new Set<string>([
  'developmental_wisdom', 'therapeutic_techniques', 'montessori_insights',
  'behavioral_patterns', 'parent_psychology', 'failure_modes', 'breakthrough_moments',
]);

interface RawLearning {
  conversation_id?: string;
  child_age_months: number;
  areas: string[];           // Montessori areas discussed
  learning_type: 'success' | 'failure' | 'insight' | 'technique';
  description: string;       // What was learned
  context: string;           // What was happening
  outcome?: string;          // What happened after (if known)
  tags: string[];
  recorded_at: string;
}

interface BrainState {
  version: number;
  last_consolidated: string | null;
  total_conversations: number;
  total_learnings: number;
  sections: BrainSection[];
}

// =========================================================================
// Validation helpers
// =========================================================================

/** Validate that a parsed object is actually a BrainState */
function isValidBrainState(obj: unknown): obj is BrainState {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.version === 'number' &&
    Array.isArray(o.sections) &&
    o.sections.every((s: unknown) => {
      if (!s || typeof s !== 'object') return false;
      const sec = s as Record<string, unknown>;
      return typeof sec.id === 'string' && typeof sec.content === 'string' && typeof sec.confidence === 'number';
    })
  );
}

/** Safe date parsing — returns null if invalid */
function safeParseDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// =========================================================================
// Brain Storage
// =========================================================================

const BRAIN_TABLE = 'montree_guru_brain';

/**
 * Get the current brain state. Creates initial brain if none exists.
 */
export async function getBrain(): Promise<BrainState> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from(BRAIN_TABLE)
      .select('brain_data')
      .eq('id', 'global')
      .single();

    // Validate the stored brain state before returning (Issue #1)
    if (!error && data?.brain_data && isValidBrainState(data.brain_data)) {
      return data.brain_data;
    }

    if (error) {
      console.warn('[Brain] Table read issue (may not exist yet):', error.message);
    } else if (data?.brain_data) {
      console.warn('[Brain] Stored brain state is malformed, reinitializing');
    }

    // Initialize brain with seed wisdom
    const initialBrain = createInitialBrain();
    const { error: upsertError } = await supabase
      .from(BRAIN_TABLE)
      .upsert({
        id: 'global',
        brain_data: initialBrain,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[Brain] Failed to initialize brain table:', upsertError.message);
    }

    return initialBrain;
  } catch (err) {
    console.error('[Brain] getBrain error:', err instanceof Error ? err.message : String(err));
    return createInitialBrain(); // Return in-memory brain as fallback
  }
}

/**
 * Save updated brain state.
 */
async function saveBrain(brain: BrainState): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(BRAIN_TABLE)
    .upsert({
      id: 'global',
      brain_data: brain,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error('[Brain] saveBrain failed:', error.message);
    return false;
  }
  return true;
}

// =========================================================================
// Learning Extraction
// =========================================================================

/**
 * Record a raw learning from a conversation. Called after each guru conversation.
 * Learnings accumulate and get consolidated into brain wisdom periodically.
 */
export async function recordLearning(learning: Omit<RawLearning, 'recorded_at'>): Promise<void> {
  const supabase = getSupabase();

  try {
    const fullLearning: RawLearning = {
      ...learning,
      recorded_at: new Date().toISOString(),
    };

    // Try atomic append via RPC first (prevents race conditions)
    const { error: rpcError } = await supabase.rpc('append_guru_learning', {
      learning_json: JSON.stringify(fullLearning),
      max_learnings: 200,
    });

    if (rpcError) {
      // Issue #19/#27: RPC not available — try INSERT for bootstrap only (first-ever row).
      // NEVER upsert here — an upsert on an existing row would wipe brain_data + raw_learnings.
      console.warn('[Brain] RPC append_guru_learning not available:', rpcError.message);
      const { error: insertError } = await supabase
        .from(BRAIN_TABLE)
        .insert({
          id: 'global',
          brain_data: createInitialBrain(),
          raw_learnings: [fullLearning],
          updated_at: new Date().toISOString(),
        });
      // Insert will fail with conflict if row already exists — that's expected and safe
      if (insertError && !insertError.message?.includes('duplicate') && !insertError.code?.includes('23505')) {
        console.warn('[Brain] Bootstrap insert also failed, learning dropped:', insertError.message);
      }
    }

    // Check if consolidation is needed
    const { data: brainRow } = await supabase
      .from(BRAIN_TABLE)
      .select('raw_learnings, brain_data')
      .eq('id', 'global')
      .single();

    if (!brainRow) return;

    const currentLearnings = Array.isArray((brainRow as Record<string, unknown>)?.raw_learnings)
      ? ((brainRow as Record<string, unknown>).raw_learnings as RawLearning[])
      : [];
    const brainData = isValidBrainState((brainRow as Record<string, unknown>)?.brain_data)
      ? ((brainRow as Record<string, unknown>).brain_data as BrainState)
      : createInitialBrain();

    // Auto-consolidate every 20 learnings
    if (currentLearnings.length >= 20 && shouldConsolidate(brainData)) {
      // Fire and forget — don't block the response
      consolidateBrain().catch(err =>
        console.error('[Brain] Consolidation error:', err instanceof Error ? err.message : String(err))
      );
    }
  } catch (error) {
    console.error('[Brain] Record learning error:', error instanceof Error ? error.message : String(error));
  }
}

/** Issue #8: Safe date check with NaN protection
 *  Issue HC#7: Consolidation frequency tuning
 *  Currently 6 hours — at scale (100+ families), consider increasing to 12-24 hours
 *  to reduce Haiku API costs. Each consolidation costs ~$0.005-$0.01.
 *  At 6hr intervals with active usage: ~4 consolidations/day = ~$0.04/day = ~$1.20/month.
 */
const MIN_CONSOLIDATION_HOURS = 6;
function shouldConsolidate(brain: BrainState): boolean {
  if (!brain.last_consolidated) return true;
  const consolidated = safeParseDate(brain.last_consolidated);
  if (!consolidated) return true; // Invalid timestamp → allow consolidation
  const hoursSinceConsolidation = (Date.now() - consolidated.getTime()) / (1000 * 60 * 60);
  return hoursSinceConsolidation >= MIN_CONSOLIDATION_HOURS;
}

// =========================================================================
// Brain Consolidation — Claude updates its own brain
// =========================================================================

/**
 * Use Claude (Haiku — cheap) to consolidate raw learnings into brain wisdom.
 * This is the self-improvement step: Claude reads its past learnings and
 * synthesizes them into refined, actionable wisdom.
 */
export async function consolidateBrain(): Promise<void> {
  const supabase = getSupabase();

  const { data: current } = await supabase
    .from(BRAIN_TABLE)
    .select('raw_learnings, brain_data')
    .eq('id', 'global')
    .single();

  if (!current) return;

  // Issue #2: Array.isArray guards on both fields
  const rawLearnings = Array.isArray((current as Record<string, unknown>)?.raw_learnings)
    ? ((current as Record<string, unknown>).raw_learnings as RawLearning[])
    : [];
  const brain = isValidBrainState((current as Record<string, unknown>)?.brain_data)
    ? ((current as Record<string, unknown>).brain_data as BrainState)
    : createInitialBrain();

  if (rawLearnings.length < 5) return; // Need minimum data to consolidate

  // Guard: if learnings are absurdly large (corrupted data), skip consolidation
  const learningsJsonSize = JSON.stringify(rawLearnings).length;
  if (learningsJsonSize > 500_000) { // 500KB — way too large for a single prompt
    console.warn(`[Brain] Raw learnings too large (${learningsJsonSize} bytes), skipping consolidation`);
    return;
  }

  // Format current brain sections for context
  const currentWisdom = Array.isArray(brain.sections)
    ? brain.sections
        .map(s => `[${s.category}] (confidence: ${s.confidence}, sources: ${s.source_count})\n${s.content}`)
        .join('\n\n')
    : '';

  // Format raw learnings (safely handle missing fields)
  const learningsSummary = rawLearnings
    .slice(-50) // Last 50 learnings for consolidation
    .map(l => {
      const areas = Array.isArray(l.areas) ? l.areas.join(',') : 'unknown';
      return `[${l.learning_type || 'insight'}] Age ${l.child_age_months || 0}mo, areas: ${areas}. ${l.description || '(no description)'}${l.outcome ? ` → Outcome: ${l.outcome}` : ''}`;
    })
    .join('\n');

  if (!anthropic) {
    console.error('[Brain] Anthropic client not available for consolidation');
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 4096,
      system: `You are the memory consolidation system for a Montessori parenting AI advisor.
Your job: Read new learnings from recent conversations and update the advisor's accumulated wisdom.

RULES:
1. Synthesize raw learnings into polished, actionable wisdom statements
2. If new learnings confirm existing wisdom, INCREASE its confidence (max 1.0)
3. If new learnings contradict existing wisdom, DECREASE confidence or revise
4. If a learning reveals something genuinely new, add it as a new wisdom entry
5. Remove low-confidence wisdom that keeps getting contradicted
6. Keep each wisdom entry concise (1-3 sentences max)
7. Tag entries with relevant keywords for retrieval
8. CRITICAL: Failure modes (what doesn't work) are just as valuable as successes
9. Be specific — "encourage autonomy" is too vague. "Let 3-year-olds pour their own water even if it spills — the cleanup IS the learning" is useful.
10. For NEW entries, set id to "new-1", "new-2", etc. (the system will assign real IDs)
11. For EXISTING entries you're updating, keep their original id exactly

Categories:
- developmental_wisdom: Age-specific insights about what children can/should do
- therapeutic_techniques: Ways to support struggling parents emotionally
- montessori_insights: Curriculum and material-specific discoveries
- behavioral_patterns: Behavior → cause → solution chains that work
- parent_psychology: What parents need at different stages of their journey
- failure_modes: Approaches that backfire or don't work
- breakthrough_moments: Specific combinations that lead to breakthroughs

Output ONLY valid JSON matching this schema:
{
  "updated_sections": [
    {
      "id": "existing-id-or-new-N",
      "category": "category_name",
      "content": "The wisdom statement",
      "source_count": 5,
      "confidence": 0.85,
      "tags": ["age_3", "sensorial", "patience"]
    }
  ],
  "removed_section_ids": ["id-to-remove"],
  "summary": "Brief description of what changed in this consolidation"
}`,
      messages: [{
        role: 'user',
        content: `CURRENT BRAIN WISDOM:\n${currentWisdom || '(empty — first consolidation)'}\n\nNEW LEARNINGS TO PROCESS:\n${learningsSummary}\n\nConsolidate these learnings into updated wisdom. Merge, revise, or add entries as needed.`
      }],
    });

    // Parse response
    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.type === 'text' ? b.text : '')
      .join('');

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Brain] Consolidation produced non-JSON response:', responseText.slice(0, 200));
      return;
    }

    // Issue #3: Safe JSON.parse with try-catch
    let result: {
      updated_sections?: Array<{
        id?: string;
        category?: string;
        content?: string;
        source_count?: number;
        confidence?: number;
        tags?: string[];
      }>;
      removed_section_ids?: string[];
      summary?: string;
    };

    try {
      const extracted = jsonMatch[0].trim();
      result = JSON.parse(extracted);
    } catch (parseErr) {
      console.error('[Brain] Failed to parse consolidation JSON:', parseErr instanceof Error ? parseErr.message : String(parseErr));
      return;
    }

    // Validate the parsed result has the expected shape
    if (!result || typeof result !== 'object') {
      console.error('[Brain] Consolidation result is not an object');
      return;
    }

    // Apply updates
    const now = new Date().toISOString();

    // Remove sections marked for deletion
    const removeIds = Array.isArray(result.removed_section_ids) ? result.removed_section_ids : [];
    const removeSet = new Set(removeIds.filter(id => typeof id === 'string'));
    brain.sections = brain.sections.filter(s => !removeSet.has(s.id));

    // Update or add sections
    const updatedSections = Array.isArray(result.updated_sections) ? result.updated_sections : [];
    for (const updated of updatedSections) {
      // Validate each section has required fields
      if (!updated.content || typeof updated.content !== 'string') continue;
      if (updated.content.length < 10) continue; // Skip trivially short wisdom

      // Validate category
      const category = VALID_CATEGORIES.has(updated.category || '')
        ? (updated.category as BrainCategory)
        : 'developmental_wisdom';

      const existingIdx = updated.id ? brain.sections.findIndex(s => s.id === updated.id) : -1;

      // Issue #4: For new entries, always generate a fresh UUID
      const sectionId = existingIdx >= 0
        ? updated.id!
        : crypto.randomUUID();

      const section: BrainSection = {
        id: sectionId,
        category,
        content: updated.content.slice(0, 1000), // Cap content length
        source_count: Math.max(0, Math.min(10000, updated.source_count || 1)),
        confidence: Math.min(1.0, Math.max(0.0, updated.confidence || 0.5)),
        last_updated: now,
        tags: Array.isArray(updated.tags) ? updated.tags.filter((t): t is string => typeof t === 'string').slice(0, 20) : [],
      };

      if (existingIdx >= 0) {
        brain.sections[existingIdx] = section;
      } else {
        brain.sections.push(section);
      }
    }

    // Issue #9: Cap at 100 sections without destroying sort order
    // Remove lowest-confidence entries one at a time to preserve semantic ordering
    while (brain.sections.length > 100) {
      let minIdx = 0;
      for (let i = 1; i < brain.sections.length; i++) {
        if (brain.sections[i].confidence < brain.sections[minIdx].confidence) {
          minIdx = i;
        }
      }
      brain.sections.splice(minIdx, 1);
    }

    brain.version = (brain.version || 0) + 1;
    brain.last_consolidated = now;
    brain.total_learnings = (brain.total_learnings || 0) + rawLearnings.length;
    brain.total_conversations = (brain.total_conversations || 0) + rawLearnings.length;

    // Issue #30: Save brain first, THEN clear learnings — two-phase to prevent data loss
    // Phase 1: Save updated brain_data only
    const { error: brainSaveError } = await supabase
      .from(BRAIN_TABLE)
      .update({
        brain_data: brain,
        updated_at: now,
      })
      .eq('id', 'global');

    if (brainSaveError) {
      console.error('[Brain] Failed to save consolidated brain — raw learnings preserved:', brainSaveError.message);
      return; // Don't clear learnings if brain save failed
    }

    // Phase 2: Clear processed learnings (keep most recent 10 for continuity)
    const remainingLearnings = rawLearnings.slice(-10);
    const { error: clearError } = await supabase
      .from(BRAIN_TABLE)
      .update({
        raw_learnings: remainingLearnings,
        updated_at: now,
      })
      .eq('id', 'global');

    if (clearError) {
      console.warn('[Brain] Brain saved but failed to clear learnings (will re-consolidate):', clearError.message);
    }

    console.log(`[Brain] Consolidated v${brain.version}: ${result.summary || 'no summary'}`);
  } catch (error) {
    // Issue HC#9: Include stack trace for debugging consolidation failures
    console.error('[Brain] Consolidation failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[Brain] Stack:', error.stack);
    }
  }
}

// =========================================================================
// Brain Retrieval — Get relevant wisdom for a conversation
// =========================================================================

/**
 * Get brain wisdom relevant to the current conversation context.
 * Returns formatted text ready to inject into the system prompt.
 */
export async function getRelevantBrainWisdom(params: {
  childAgeMonths: number;
  areas: string[];
  concerns: string[];
  parentConfidence?: string;
}): Promise<string> {
  try {
    const brain = await getBrain();
    if (!brain.sections || brain.sections.length === 0) return '';

    const { childAgeMonths, areas, concerns, parentConfidence } = params;
    // Ensure arrays are actually arrays
    const safeAreas = Array.isArray(areas) ? areas : [];
    const safeConcerns = Array.isArray(concerns) ? concerns : [];

    // Score each section by relevance
    const scored = brain.sections
      .filter(s => s.confidence >= 0.4 && Array.isArray(s.tags)) // Skip low-confidence + validate tags
      .map(section => {
        let score = section.confidence * 2; // Base: confidence matters

        // Issue #10: Safe age matching via tags (use parseFloat for fractional ages)
        const ageTags = section.tags.filter(t => typeof t === 'string' && t.startsWith('age_'));
        for (const tag of ageTags) {
          const ageNum = parseFloat(tag.replace('age_', ''));
          if (!isNaN(ageNum) && ageNum >= 0) {
            const ageMonths = Math.round(ageNum * 12);
            if (Math.abs(childAgeMonths - ageMonths) < 12) score += 3;
            else if (Math.abs(childAgeMonths - ageMonths) < 24) score += 1;
          }
        }

        // Area matching
        for (const area of safeAreas) {
          if (!area) continue;
          const areaShort = area.replace('practical_life', 'practical')
            .replace('cultural', 'culture');
          if (section.tags.some(t => t.includes(area) || t.includes(areaShort))) {
            score += 2;
          }
        }

        // Concern matching
        for (const concern of safeConcerns) {
          if (!concern || typeof concern !== 'string') continue;
          const words = concern.toLowerCase().split(/[\s_-]+/);
          for (const word of words) {
            if (word.length > 3 && section.tags.some(t => t.includes(word))) {
              score += 1.5;
            }
            if (word.length > 3 && section.content.toLowerCase().includes(word)) {
              score += 0.5;
            }
          }
        }

        // Parent psychology boost when confidence is low
        if (parentConfidence === 'low' || parentConfidence === 'very_low') {
          if (section.category === 'therapeutic_techniques' || section.category === 'parent_psychology') {
            score += 3;
          }
        }

        // Failure modes are always useful (learn from mistakes)
        if (section.category === 'failure_modes') {
          score += 1;
        }

        // Source count = battle-tested wisdom
        if (section.source_count >= 10) score += 1;
        if (section.source_count >= 20) score += 1;

        return { section, score };
      })
      .filter(s => s.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 most relevant

    if (scored.length === 0) return '';

    // Format for prompt injection
    let output = 'YOUR ACCUMULATED WISDOM (learned from experience — present as your own knowledge):\n';

    // Group by category for cleaner reading
    const grouped = new Map<string, typeof scored>();
    for (const item of scored) {
      const cat = item.section.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    const categoryLabels: Record<string, string> = {
      developmental_wisdom: '🧒 Developmental',
      therapeutic_techniques: '💚 Therapeutic',
      montessori_insights: '🏫 Montessori',
      behavioral_patterns: '🔍 Behavioral',
      parent_psychology: '🧠 Parent Support',
      failure_modes: '⚠️ Avoid',
      breakthrough_moments: '✨ Breakthroughs',
    };

    for (const [category, items] of grouped) {
      output += `\n${categoryLabels[category] || category}:\n`;
      for (const { section } of items) {
        output += `- ${section.content}\n`;
      }
    }

    output += '\nThis wisdom is yours — use it naturally. Never say "I learned that..." — just apply it.\n';

    return output;
  } catch (error) {
    console.error('[Brain] Retrieval error:', error instanceof Error ? error.message : String(error));
    return '';
  }
}

// =========================================================================
// Initial Brain — Seed wisdom to start with
// =========================================================================

function createInitialBrain(): BrainState {
  return {
    version: 1,
    last_consolidated: null, // Issue #24: null instead of empty string
    total_conversations: 0,
    total_learnings: 0,
    sections: [
      {
        id: 'seed-1',
        category: 'developmental_wisdom',
        content: 'Children aged 2-3 in the autonomy stage need to do things themselves — even badly. Pouring water and spilling it IS the work. The cleanup is part of the learning cycle.',
        source_count: 0,
        confidence: 0.9,
        last_updated: new Date().toISOString(),
        tags: ['age_2', 'age_3', 'autonomy', 'practical_life', 'independence'],
      },
      {
        id: 'seed-2',
        category: 'therapeutic_techniques',
        content: 'When a parent expresses guilt or self-doubt, validate FIRST ("That sounds really hard") before any practical advice. Parents who feel heard become more receptive. Rushing to solutions feels dismissive.',
        source_count: 0,
        confidence: 0.9,
        last_updated: new Date().toISOString(),
        tags: ['guilt', 'validation', 'emotional_support', 'therapeutic'],
      },
      {
        id: 'seed-3',
        category: 'montessori_insights',
        content: 'The Pink Tower isn\'t just stacking blocks — it builds visual discrimination of dimension, hand-eye coordination, and the mathematical concept of the cube (1cm³ to 10cm³). When parents say "it\'s just blocks," connect them to what\'s actually developing.',
        source_count: 0,
        confidence: 0.95,
        last_updated: new Date().toISOString(),
        tags: ['sensorial', 'pink_tower', 'mathematics', 'parent_education'],
      },
      {
        id: 'seed-4',
        category: 'behavioral_patterns',
        content: 'A child who suddenly refuses a previously enjoyed work often needs more challenge, not less. Check if they\'ve outgrown the current difficulty level. Regression in one area often signals readiness to leap in another.',
        source_count: 0,
        confidence: 0.8,
        last_updated: new Date().toISOString(),
        tags: ['refusal', 'regression', 'challenge', 'readiness'],
      },
      {
        id: 'seed-5',
        category: 'parent_psychology',
        content: 'New homeschool parents in their first month need MORE encouragement and LESS curriculum advice. They\'re in identity transition — from "parent" to "parent-teacher." Acknowledge this shift explicitly.',
        source_count: 0,
        confidence: 0.85,
        last_updated: new Date().toISOString(),
        tags: ['new_parent', 'onboarding', 'identity', 'encouragement', 'first_month'],
      },
      {
        id: 'seed-6',
        category: 'failure_modes',
        content: 'Suggesting a rigid daily schedule to an overwhelmed parent backfires. Start with ONE anchor activity ("Just do one work before lunch") and build from there. Structure should grow organically, not be imposed.',
        source_count: 0,
        confidence: 0.85,
        last_updated: new Date().toISOString(),
        tags: ['scheduling', 'overwhelm', 'structure', 'practical_life'],
      },
      {
        id: 'seed-7',
        category: 'breakthrough_moments',
        content: 'When a child independently chooses to repeat a mastered work, that\'s normalization happening. Point this out to parents — it\'s the biggest sign that Montessori is working. Parents often miss this because they expect novelty-seeking.',
        source_count: 0,
        confidence: 0.9,
        last_updated: new Date().toISOString(),
        tags: ['normalization', 'repetition', 'mastery', 'milestone'],
      },
    ],
  };
}
