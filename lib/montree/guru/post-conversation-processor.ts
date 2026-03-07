// lib/montree/guru/post-conversation-processor.ts
// Post-conversation processor: after a teacher asks the Guru about a child,
// a cheap Haiku call extracts weekly admin items (this_week, next_week, one_liner,
// advice, summary) + work recommendations. Saved to child settings; work changes applied automatically.
// This runs fire-and-forget — never blocks the main Guru response.

import { getSupabase } from '@/lib/supabase-client';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from './settings-helper';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

// Valid work names for validation
const VALID_WORK_NAMES: Set<string> = new Set();
try {
  const allWorks = loadAllCurriculumWorks();
  for (const work of allWorks) {
    VALID_WORK_NAMES.add(work.name.toLowerCase());
  }
} catch {
  console.warn('[PostProcessor] Could not load curriculum for validation');
}

interface WorkChange {
  action: 'add' | 'remove';
  area: string;
  work_name?: string;
}

interface ExtractionResult {
  summary: string;
  this_week: string;
  next_week: string;
  one_liner: string;
  advice: string;
  work_changes: WorkChange[];
  // Optional per-area fields (Haiku may or may not produce these)
  plan_row?: Record<string, string>;
  area_details?: Record<string, { work: string; this_week: string; next_week: string }>;
  full_summary?: string;
}

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

/**
 * Process a teacher's Guru conversation: extract summary + apply work changes.
 * Runs async — caller should .catch() and not await.
 */
export async function processTeacherConversation(params: {
  childId: string;
  childName: string;
  question: string;
  response: string;
  currentWorks: Array<{ area: string; work_name: string; status: string }>;
  interactionId?: string;
}): Promise<void> {
  const { childId, childName, question, response, currentWorks, interactionId } = params;

  if (!anthropic) {
    console.warn('[PostProcessor] AI not available, skipping');
    return;
  }

  try {
    // Build context about current works
    const worksContext = currentWorks.length > 0
      ? currentWorks.map(w => `• ${w.area}: ${w.work_name} (${w.status})`).join('\n')
      : 'No focus works currently assigned.';

    const extractionPrompt = `You are analyzing a teacher-Guru conversation about a Montessori student named ${childName}.

TEACHER'S QUESTION:
${question.slice(0, 500)}

GURU'S RESPONSE:
${response.slice(0, 1500)}

CHILD'S CURRENT FOCUS WORKS:
${worksContext}

VALID MONTESSORI AREAS: practical_life, sensorial, mathematics, language, cultural

Extract these items for the teacher's weekly admin report (all in third person about the child):

1. THIS WEEK: 1-2 sentences — what the child worked on this week and how they did. Specific work names and progress. Example: "Joey practiced Sandpaper Letters (s, m, a, t) and completed pouring exercises with increasing control."

2. NEXT WEEK: 1-2 sentences — what the child will focus on next week based on the Guru's recommendations. Example: "Next week Joey will begin Moveable Alphabet word-building and continue Sandpaper Letters with new letter group."

3. ONE LINER: Purely factual, max 15 words. Format: "${childName} did [X] this week, next week [they] will do [Y]". NO opinions, NO observations, NO assessments — just facts. Example: "Joey did Sandpaper Letters (s,m,a,t) this week, next week he will start Moveable Alphabet."

4. ADVICE: 1-2 paragraphs of deep developmental advice from the Guru's response. Extract the expert analysis — AMI progression insights, sensitive period observations, developmental psychology, WHY certain works are recommended, what to watch for. This is the Guru's unique value. If the response doesn't contain deep advice, write it based on the child's current works and progress. Max 500 words.

5. SUMMARY: Combine this_week + next_week into a single 30-word paragraph for the weekly plan print view.

6. WORK CHANGES: If the Guru explicitly recommended adding or changing specific works, list them. Only include changes the Guru clearly recommended — do NOT invent changes. Use exact work names from the Montessori curriculum.

Respond in JSON only:
{
  "this_week": "...",
  "next_week": "...",
  "one_liner": "${childName} did ... this week, next week ... will ...",
  "advice": "...(1-2 paragraphs of deep developmental advice)...",
  "summary": "...(~30 words combined)...",
  "work_changes": [
    { "action": "add", "area": "language", "work_name": "Sandpaper Letters" }
  ]
}

If no work changes were recommended, use an empty array for work_changes.

7. PLAN ROW (optional — include if you have enough info): For each of the 5 areas (practical_life, sensorial, mathematics, language, cultural), suggest one work name for next week. Include a "notes" field.
   "plan_row": { "practical_life": "...", "sensorial": "...", "mathematics": "...", "language": "...", "cultural": "...", "notes": "..." }

8. AREA DETAILS (optional — include if the conversation covered multiple areas): Per-area breakdown.
   "area_details": { "practical_life": { "work": "...", "this_week": "...", "next_week": "..." }, ... }

9. FULL SUMMARY (optional): Area-prefixed narrative covering all areas discussed.
   "full_summary": "Practical Life: ... Sensorial: ... Mathematics: ..."

Items 7-9 are optional — only include them if the conversation provides enough information.
JSON:`;

    const msg = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const text = msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let extraction: ExtractionResult;
    try {
      extraction = JSON.parse(jsonStr);
    } catch {
      console.error('[PostProcessor] Failed to parse extraction JSON:', jsonStr.slice(0, 200));
      return;
    }

    // Validate extraction
    if (!extraction.summary || typeof extraction.summary !== 'string') {
      console.error('[PostProcessor] Missing summary in extraction');
      return;
    }

    const supabase = getSupabase();

    // 1. Save weekly admin items to child settings
    const settingsUpdate: Record<string, unknown> = {
      guru_weekly_summary: extraction.summary.slice(0, 300), // Safety cap
      guru_weekly_this_week: (extraction.this_week || '').slice(0, 300),
      guru_weekly_next_week: (extraction.next_week || '').slice(0, 300),
      guru_weekly_one_liner: (extraction.one_liner || '').slice(0, 150),
      guru_weekly_advice: (extraction.advice || '').slice(0, 2000),
      guru_weekly_summary_updated_at: new Date().toISOString(),
      guru_weekly_summary_interaction_id: interactionId || null,
    };

    // Optional per-area fields (only save if Haiku produced them)
    if (extraction.plan_row && typeof extraction.plan_row === 'object') {
      settingsUpdate.guru_weekly_plan_row = extraction.plan_row;
    }
    if (extraction.area_details && typeof extraction.area_details === 'object') {
      settingsUpdate.guru_weekly_area_details = extraction.area_details;
    }
    if (extraction.full_summary && typeof extraction.full_summary === 'string') {
      settingsUpdate.guru_weekly_full_summary = extraction.full_summary.slice(0, 5000);
    }

    await updateChildSettings(childId, settingsUpdate);

    // 2. Apply work changes (if any)
    const changes = Array.isArray(extraction.work_changes) ? extraction.work_changes : [];
    for (const change of changes.slice(0, 5)) { // Max 5 changes per conversation
      if (!change.area || !VALID_AREAS.includes(change.area)) continue;

      if (change.action === 'add' && change.work_name) {
        // Validate work name
        const workNameLower = change.work_name.toLowerCase();
        if (VALID_WORK_NAMES.size > 0 && !VALID_WORK_NAMES.has(workNameLower)) {
          // Check DB for custom works
          const { data: customWork } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('id')
            .ilike('name', change.work_name)
            .limit(1)
            .maybeSingle();
          if (!customWork) continue; // Skip invalid work names
        }

        await supabase
          .from('montree_child_focus_works')
          .upsert({
            child_id: childId,
            area: change.area,
            work_name: change.work_name,
            set_at: new Date().toISOString(),
            set_by: 'guru',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'child_id,area' });

      } else if (change.action === 'remove') {
        await supabase
          .from('montree_child_focus_works')
          .delete()
          .eq('child_id', childId)
          .eq('area', change.area);
      }
    }

    console.log(`[PostProcessor] Processed for ${childName}: summary saved, ${changes.length} work changes applied`);

  } catch (error) {
    console.error('[PostProcessor] Error:', error instanceof Error ? error.message : String(error));
  }
}
