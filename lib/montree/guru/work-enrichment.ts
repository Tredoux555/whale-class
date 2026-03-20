// lib/montree/guru/work-enrichment.ts
// Auto-generate Sonnet descriptions for custom Montessori works
// Fire-and-forget: called after custom work creation, updates DB asynchronously

import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
// import { logApiUsage } from '@/lib/montree/api-usage'; // DEFERRED: metering not yet deployed

export interface WorkEnrichmentResult {
  description: string;
  quick_guide: string;
  parent_description: string;
  why_it_matters: string;
  direct_aims: string[];
  indirect_aims: string[];
  materials: string[];
}

const AREA_CONTEXT: Record<string, string> = {
  practical_life: 'practical everyday activities like pouring, dressing, cleaning, caring for self and environment',
  sensorial: 'sensory exploration activities that refine perception and concentration through touch, sight, sound, smell, and taste',
  mathematics: 'concrete mathematical activities developing number sense, arithmetic operations, geometry, and measurement',
  language: 'literacy foundation activities including phonetics, letter recognition, early reading, and writing',
  cultural: 'science, geography, history, botany, zoology, and cultural awareness activities',
  special_events: 'special school events, celebrations, cultural days, and community activities',
};

/**
 * Generate enrichment fields for a custom Montessori work via Sonnet.
 * Returns structured content: description, quick_guide, parent_description, etc.
 * Retries up to 3 times with exponential backoff.
 */
export async function generateWorkEnrichment(
  workName: string,
  areaKey: string,
  schoolIdOrOptions?: string | { retries?: number; timeoutMs?: number },
  options: { retries?: number; timeoutMs?: number } = {}
): Promise<WorkEnrichmentResult> {
  // Handle overloaded signature: schoolId (string) or options (object)
  let schoolId: string | undefined;
  if (typeof schoolIdOrOptions === 'string') {
    schoolId = schoolIdOrOptions;
  } else if (schoolIdOrOptions) {
    options = schoolIdOrOptions;
  }
  if (!anthropic) {
    throw new Error('Anthropic API not configured');
  }

  // Input validation
  if (!workName || workName.length > 255) {
    throw new Error('Work name must be 1-255 characters');
  }
  if (areaKey && !AREA_CONTEXT[areaKey]) {
    throw new Error(`Invalid area key: ${areaKey}`);
  }

  const { retries = 3, timeoutMs = 30_000 } = options;

  const areaContext = AREA_CONTEXT[areaKey] || 'Montessori educational activity';

  const systemPrompt = `You are an expert AMI Montessori educator creating enrichment content for a custom work that a teacher has added to their classroom curriculum.

Guidelines:
- Description: 1-2 sentences, concrete, what the child physically does
- Quick guide: 2-3 sentence teacher summary they can scan in 10 seconds before presenting
- Parent description: Warm, encouraging explanation for parents who may not know Montessori
- Why it matters: Connect to child development (ages 3-6 unless work name suggests otherwise)
- Direct aims: 2-4 specific skills the child directly practices
- Indirect aims: 1-3 secondary developmental benefits
- Materials: Practical list of what's needed

Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.`;

  const userPrompt = `Generate enrichment content for this custom Montessori work:

Work Name: ${workName}
Area: ${areaKey} (${areaContext})

JSON structure required:
{
  "description": "string",
  "quick_guide": "string",
  "parent_description": "string",
  "why_it_matters": "string",
  "direct_aims": ["string"],
  "indirect_aims": ["string"],
  "materials": ["string"]
}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }, { signal: controller.signal });

        // logApiUsage deferred — metering system not yet deployed

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Sonnet');
        }

        // Strip any markdown code block wrapper if present
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const enrichment = JSON.parse(jsonText) as WorkEnrichmentResult;

        // Validate required fields
        if (
          !enrichment.description ||
          !enrichment.quick_guide ||
          !enrichment.parent_description ||
          !enrichment.why_it_matters ||
          !Array.isArray(enrichment.direct_aims) ||
          !Array.isArray(enrichment.indirect_aims) ||
          !Array.isArray(enrichment.materials)
        ) {
          throw new Error('Missing required fields in enrichment response');
        }

        return enrichment;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (intentional cancellation)
      if (lastError.name === 'AbortError') break;

      if (attempt < retries - 1) {
        // Exponential backoff: 200ms, 400ms, 800ms
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(
    `Failed to generate work enrichment after ${retries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Fire-and-forget: generate enrichment and update the work record in DB.
 * Called after a custom work is created — never blocks the POST response.
 * All errors are caught and logged (silent failure is acceptable).
 */
export async function enrichCustomWorkInBackground(
  workId: string,
  workName: string,
  areaKey: string,
  schoolId?: string,
): Promise<void> {
  try {
    const enrichment = await generateWorkEnrichment(workName, areaKey, schoolId);

    const supabase = getSupabase();
    const { error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update({
        description: enrichment.description,
        quick_guide: enrichment.quick_guide,
        parent_description: enrichment.parent_description,
        why_it_matters: enrichment.why_it_matters,
        direct_aims: enrichment.direct_aims,
        indirect_aims: enrichment.indirect_aims,
        materials: enrichment.materials,
        source: 'teacher_manual',
      })
      .eq('id', workId);

    if (error) {
      console.error(`[WORK_ENRICHMENT] DB update failed for "${workName}":`, error.message);
      return;
    }

    console.log(`[WORK_ENRICHMENT] ✅ Custom work "${workName}" enriched successfully`);
  } catch (error) {
    console.error(`[WORK_ENRICHMENT] ❌ Failed to enrich "${workName}":`, error instanceof Error ? error.message : error);
    // Silent failure — work is still usable without enrichment fields
  }
}
