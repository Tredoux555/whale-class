// lib/montree/guru/pattern-learner.ts
// Self-learning system: aggregates insights across ALL families into shared patterns
// Uses montree_child_patterns table (already exists, never populated until now)
//
// FLOW:
// 1. After each guru conversation with tool use, call learnFromConversation()
// 2. It extracts new insights from the child's settings JSONB
// 3. Matches against existing patterns (by age, area, behavior type)
// 4. Creates new patterns or reinforces existing ones (confidence goes up)
// 5. Before each guru conversation, call getRelevantPatterns() to inject cross-family learnings

import { getSupabase } from '@/lib/supabase-client';

// Pattern types we track across families
type PatternType = 'focus' | 'social' | 'emotional' | 'learning' | 'behavioral' | 'developmental';

interface LearnedPattern {
  id: string;
  pattern_type: PatternType;
  pattern_description: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  age_range_min?: number; // months
  age_range_max?: number; // months
  area?: string; // montessori area
  families_count: number; // how many families observed this
  success_rate?: number; // 0-1, based on guidance outcomes
  still_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChildProfile {
  age_months: number;
  areas_active: string[];
  recent_concerns: string[];
}

/**
 * After a guru conversation, extract learnings and feed into the pattern system.
 * Called from the guru route after successful tool execution.
 */
export async function learnFromConversation(
  childId: string,
  childAgeMonths: number,
): Promise<void> {
  const supabase = getSupabase();

  try {
    // 1. Fetch child's current insights and outcomes
    const { data: child } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .single();

    if (!child?.settings) return;
    const settings = child.settings as Record<string, unknown>;

    const insights = Array.isArray(settings.guru_developmental_insights)
      ? (settings.guru_developmental_insights as Array<Record<string, unknown>>)
      : [];
    const outcomes = Array.isArray(settings.guru_guidance_outcomes)
      ? (settings.guru_guidance_outcomes as Array<Record<string, unknown>>)
      : [];

    // 2. Process high-confidence insights into shared patterns
    const confidentInsights = insights.filter(
      i => i.confidence === 'confident' || i.confidence === 'likely'
    );

    for (const insight of confidentInsights.slice(-5)) { // Last 5 confident insights
      await upsertPattern(supabase, {
        insight,
        childId,
        childAgeMonths,
      });
    }

    // 3. Update success rates based on guidance outcomes
    const recentOutcomes = outcomes.slice(-10);
    for (const outcome of recentOutcomes) {
      await updatePatternSuccessRate(supabase, outcome);
    }
  } catch (error) {
    // Learning failures should never block the conversation
    console.error('[Pattern Learner] Error:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Upsert a pattern from an insight. If a similar pattern exists, reinforce it.
 * If not, create a new one.
 *
 * Issue #31: This uses read-modify-write on `notes` JSON which isn't safe for
 * concurrent writes. Acceptable because: (1) pattern learning is fire-and-forget
 * background work, (2) worst case is a missed reinforcement count, (3) adding
 * PostgreSQL advisory locks would add complexity for minimal benefit.
 * If contention becomes an issue, migrate to an RPC function like append_guru_learning.
 */
async function upsertPattern(
  supabase: ReturnType<typeof getSupabase>,
  params: {
    insight: Record<string, unknown>;
    childId: string;
    childAgeMonths: number;
  }
): Promise<void> {
  const { insight, childId, childAgeMonths } = params;
  const description = insight.description as string;
  if (!description || description.length < 10) return;

  // Map insight_type to pattern_type
  const typeMap: Record<string, PatternType> = {
    correlation: 'behavioral',
    milestone: 'developmental',
    prediction: 'learning',
    concern: 'emotional',
  };
  const patternType = typeMap[insight.insight_type as string] || 'developmental';

  // Extract area from related_works if available
  const relatedWorks = Array.isArray(insight.related_works) ? insight.related_works as string[] : [];
  const area = relatedWorks.length > 0 ? await inferAreaFromWork(supabase, relatedWorks[0] as string) : null;

  // Check for similar existing patterns (same type + overlapping age range + similar description keywords)
  const ageMin = Math.max(0, childAgeMonths - 6);
  const ageMax = childAgeMonths + 6;

  const { data: existing } = await supabase
    .from('montree_child_patterns')
    .select('id, pattern_description, evidence, confidence, notes')
    .eq('pattern_type', patternType)
    .eq('still_active', true)
    .limit(20);

  // Simple keyword overlap check for similarity
  const descWords = new Set(description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  let bestMatch: { id: string; overlap: number } | null = null;

  for (const pattern of (existing || [])) {
    // Issue HC#5: Guard against null pattern_description
    const patDesc = (pattern.pattern_description as string) || '';
    const patternWords = new Set(patDesc.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
    let overlap = 0;
    for (const word of descWords) {
      if (patternWords.has(word)) overlap++;
    }
    const overlapRatio = overlap / Math.max(descWords.size, 1);
    if (overlapRatio > 0.4 && (!bestMatch || overlap > bestMatch.overlap)) {
      bestMatch = { id: pattern.id as string, overlap };
    }
  }

  if (bestMatch) {
    // Reinforce existing pattern — increase confidence + update evidence
    const { data: current } = await supabase
      .from('montree_child_patterns')
      .select('confidence, notes')
      .eq('id', bestMatch.id)
      .single();

    if (current) {
      const meta = safeParseJSON(current.notes as string);
      // Issue #5: Validate families is actually an array before creating Set
      const families = Array.isArray(meta.families) ? meta.families : [];
      const familySet = new Set(families);
      familySet.add(childId);

      // Confidence escalation: low → medium after 3 families, medium → high after 5
      let newConfidence = current.confidence as string;
      if (familySet.size >= 5) newConfidence = 'high';
      else if (familySet.size >= 3) newConfidence = 'medium';

      await supabase
        .from('montree_child_patterns')
        .update({
          confidence: newConfidence,
          evidence: `Observed across ${familySet.size} families. Latest: ${description.slice(0, 200)}`,
          notes: JSON.stringify({
            ...meta,
            families: Array.from(familySet),
            last_reinforced: new Date().toISOString(),
            reinforcement_count: (meta.reinforcement_count || 0) + 1,
            age_range: { min: Math.min(meta.age_range?.min || childAgeMonths, childAgeMonths), max: Math.max(meta.age_range?.max || childAgeMonths, childAgeMonths) },
            area: area || meta.area,
          }),
        })
        .eq('id', bestMatch.id);
    }
  } else {
    // Create new pattern — starts with low confidence (needs reinforcement from other families)
    await supabase
      .from('montree_child_patterns')
      .insert({
        child_id: childId, // Required FK but we use notes.families for cross-family tracking
        pattern_type: patternType,
        pattern_description: description.slice(0, 500),
        evidence: `First observed in 1 family at ${childAgeMonths} months. ${(insight.recommendation as string || '').slice(0, 200)}`,
        confidence: 'low',
        first_observed: new Date().toISOString().split('T')[0],
        still_active: true,
        notes: JSON.stringify({
          families: [childId],
          age_range: { min: ageMin, max: ageMax },
          area,
          success_rate: null,
          reinforcement_count: 0,
          outcomes_tracked: 0,
        }),
      });
  }
}

/**
 * Update pattern success rates based on guidance outcomes.
 * If a parent reports "worked_well", we boost the related pattern's success rate.
 */
async function updatePatternSuccessRate(
  supabase: ReturnType<typeof getSupabase>,
  outcome: Record<string, unknown>,
): Promise<void> {
  const guidance = outcome.guidance_given as string;
  if (!guidance) return;

  // Find patterns whose description keywords overlap with the guidance
  // Issue DA#2: Added pattern_description to select — was missing, causing overlap check
  // to always get undefined → '' → 0 overlap → success rates never updated
  const { data: patterns } = await supabase
    .from('montree_child_patterns')
    .select('id, notes, pattern_description')
    .eq('still_active', true)
    .limit(50);

  if (!patterns) return;

  const guidanceWords = new Set(guidance.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  for (const pattern of patterns) {
    // Issue #6: Skip patterns without metadata
    const desc = (pattern as Record<string, unknown>).notes as string;
    if (!desc) continue;
    const meta = safeParseJSON(desc);

    // Check if this outcome is related to this pattern
    // Issue HC#5: Guard against null pattern_description
    const patDescStr = ((pattern as Record<string, unknown>).pattern_description as string) || '';
    const patternWords = new Set(patDescStr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
    let overlap = 0;
    for (const word of guidanceWords) {
      if (patternWords.has(word)) overlap++;
    }

    if (overlap < 2) continue; // Not related enough

    // Update success rate with exponential moving average
    const outcomeValue = outcome.outcome === 'worked_well' ? 1.0
      : outcome.outcome === 'partially_worked' ? 0.5
      : outcome.outcome === 'didnt_work' ? 0.0
      : null; // 'not_tried' doesn't update

    if (outcomeValue === null) continue;

    const currentRate = typeof meta.success_rate === 'number' ? meta.success_rate : null;
    const trackedCount = typeof meta.outcomes_tracked === 'number' ? meta.outcomes_tracked : 0;
    // Issue HC#8: EMA with alpha=0.2 (was 0.3 — too aggressive for patterns that take weeks to validate)
    // 0.2 gives recent outcomes 20% weight, making success rates more stable over time
    const newRate = currentRate !== null
      ? 0.2 * outcomeValue + 0.8 * currentRate
      : outcomeValue;

    await supabase
      .from('montree_child_patterns')
      .update({
        notes: JSON.stringify({
          ...meta,
          success_rate: Math.round(newRate * 100) / 100,
          outcomes_tracked: trackedCount + 1,
          last_outcome: outcome.outcome,
          last_outcome_at: new Date().toISOString(),
        }),
      })
      .eq('id', (pattern as Record<string, unknown>).id);
  }
}

/**
 * Get relevant patterns for a child profile. Called before each guru conversation.
 * Returns anonymized cross-family learnings relevant to this child's age, areas, and concerns.
 */
export async function getRelevantPatterns(
  profile: ChildProfile,
): Promise<string> {
  const supabase = getSupabase();

  try {
    // Fetch active patterns with medium+ confidence
    const { data: patterns } = await supabase
      .from('montree_child_patterns')
      .select('pattern_type, pattern_description, evidence, confidence, notes')
      .eq('still_active', true)
      .in('confidence', ['medium', 'high'])
      .limit(100);

    if (!patterns || patterns.length === 0) return '';

    // Filter by age range and area relevance
    const relevant: Array<{ pattern: Record<string, unknown>; score: number }> = [];

    for (const p of patterns) {
      const meta = safeParseJSON(p.notes as string);
      let score = 0;

      // Issue #32: Validate metadata fields before using
      // Age match (within range = +3, close = +1)
      const ageRange = meta.age_range as Record<string, unknown> | undefined;
      if (ageRange && typeof ageRange.min === 'number' && typeof ageRange.max === 'number') {
        if (profile.age_months >= ageRange.min && profile.age_months <= ageRange.max) {
          score += 3;
        } else if (Math.abs(profile.age_months - (ageRange.min + ageRange.max) / 2) < 12) {
          score += 1;
        }
      }

      // Area match (+2 per matching area)
      const area = typeof meta.area === 'string' ? meta.area : null;
      if (area && profile.areas_active.includes(area)) {
        score += 2;
      }

      // Confidence boost (high = +2, medium = +1)
      if (p.confidence === 'high') score += 2;
      else if (p.confidence === 'medium') score += 1;

      // Family count boost (more families = more reliable)
      const familyCount = (Array.isArray(meta.families) ? meta.families : []).length;
      if (familyCount >= 5) score += 2;
      else if (familyCount >= 3) score += 1;

      // Success rate boost (validate it's actually a number)
      const successRate = typeof meta.success_rate === 'number' ? meta.success_rate : null;
      if (successRate !== null && successRate > 0.7) score += 2;
      else if (successRate !== null && successRate < 0.3) score -= 1; // Penalize poor success

      if (score >= 3) {
        relevant.push({ pattern: p as Record<string, unknown>, score });
      }
    }

    // Sort by score, take top 8
    relevant.sort((a, b) => b.score - a.score);
    const top = relevant.slice(0, 8);

    if (top.length === 0) return '';

    // Format as context for the guru prompt
    let output = 'INSIGHTS FROM OTHER FAMILIES (anonymized, use subtly — never say "other families report"):\n';
    for (const { pattern } of top) {
      const meta = safeParseJSON(pattern.notes as string);
      const familyCount = (Array.isArray(meta.families) ? meta.families : []).length;
      const successRate = typeof meta.success_rate === 'number' ? meta.success_rate : null;
      const successStr = successRate !== null ? ` (${Math.round(successRate * 100)}% success rate)` : '';

      output += `- [${pattern.confidence}] ${pattern.pattern_description}`;
      if (familyCount > 1) output += ` (seen in ${familyCount} families)`;
      output += `${successStr}\n`;
    }

    output += '\nUse these patterns to enrich your advice. NEVER reference "other families" directly — present insights as your own knowledge. If a pattern has low success rate, avoid recommending that approach.\n';

    return output;
  } catch (error) {
    console.error('[Pattern Learner] Error fetching patterns:', error instanceof Error ? error.message : String(error));
    return '';
  }
}

/**
 * Infer Montessori area from a work name by checking the curriculum.
 */
async function inferAreaFromWork(
  supabase: ReturnType<typeof getSupabase>,
  workName: string,
): Promise<string | null> {
  if (!workName) return null;

  // Issue #18: Escape LIKE metacharacters to prevent unintended matches
  const escaped = workName.slice(0, 50).replace(/[%_\\]/g, '\\$&');
  const { data } = await supabase
    .from('montree_works')
    .select('area')
    .ilike('name', `%${escaped}%`)
    .limit(1)
    .single();

  return (data?.area as string) || null;
}

function safeParseJSON(str: string | null | undefined): Record<string, unknown> {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
