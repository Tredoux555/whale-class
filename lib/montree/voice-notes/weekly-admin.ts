// lib/montree/voice-notes/weekly-admin.ts
// Generate weekly narratives + plan tables from accumulated voice notes
// Uses Sonnet for high-quality Chinese/English output

import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

// ---- Types ----

interface ChildSummary {
  id: string;
  name: string;
  first_name?: string;
}

interface VoiceNote {
  child_id: string;
  work_name: string | null;
  area: string | null;
  proposed_status: string | null;
  behavioral_notes: string | null;
  next_steps: string | null;
  transcript: string;
  voice_date: string;
}

export interface WeeklyAdminResult {
  narratives: Record<string, string>; // child_id → narrative paragraph
  plans: Record<string, Record<string, string>>; // child_id → { area → work }
  narratives_text: string; // Copy-paste ready narratives
  plans_text: string; // Copy-paste ready plan table
  children_count: number;
  total_notes_count: number;
}

// ---- Area Labels ----

const AREA_LABELS: Record<string, Record<string, string>> = {
  en: {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    mathematics: 'Mathematics',
    language: 'Language',
    cultural: 'Science & Culture',
  },
  zh: {
    practical_life: '日常',
    sensorial: '感官区',
    mathematics: '数学',
    language: '语言',
    cultural: '科学文化',
  },
};

// ---- Prompt Builder ----

function buildWeeklyAdminPrompt(
  children: ChildSummary[],
  notesByChild: Record<string, VoiceNote[]>,
  locale: string,
  weekStart: string,
  weekEnd: string
): string {
  const isZh = locale === 'zh';

  // Build child notes section
  const childSections = children
    .map((child) => {
      const notes = notesByChild[child.id] || [];
      if (notes.length === 0) return null;

      const noteLines = notes
        .map((n) => {
          const parts = [];
          if (n.work_name) parts.push(`Work: ${n.work_name}`);
          if (n.area) parts.push(`Area: ${n.area}`);
          if (n.proposed_status) parts.push(`Status: ${n.proposed_status}`);
          if (n.behavioral_notes) parts.push(`Notes: ${n.behavioral_notes}`);
          if (n.next_steps) parts.push(`Next: ${n.next_steps}`);
          return `  - ${parts.join(' | ')}`;
        })
        .join('\n');

      return `### ${child.name} (${notes.length} notes)\n${noteLines}`;
    })
    .filter(Boolean)
    .join('\n\n');

  // Children with NO notes
  const childrenWithoutNotes = children.filter(
    (c) => !notesByChild[c.id] || notesByChild[c.id].length === 0
  );
  const noNotesSection =
    childrenWithoutNotes.length > 0
      ? `\n\nChildren with NO notes this week (still include in plan with continuation works):\n${childrenWithoutNotes.map((c) => `- ${c.name}`).join('\n')}`
      : '';

  const outputLang = isZh
    ? 'Write ALL narratives in Chinese (中文). The plan table area headers should be in Chinese.'
    : 'Write ALL narratives in English. The plan table area headers should be in English.';

  const areaHeaders = isZh
    ? '日常 | 感官区 | 数学 | 语言 | 科学文化'
    : 'Practical | Sensorial | Math | Language | Culture';

  return `You are a senior Montessori educator writing weekly administrative documents for a classroom.

WEEK: ${weekStart} to ${weekEnd}

VOICE NOTES THIS WEEK:
${childSections}
${noNotesSection}

YOUR TWO TASKS:

TASK 1 — NARRATIVE SUMMARIES
For EACH child (including those without notes), write a SHORT paragraph (3-5 sentences) in this structure:
- What they worked on this week across areas
- How they progressed (status changes, breakthroughs, challenges)
- What's coming next week
- For children without notes, write a brief "continued practice" summary

${outputLang}

Format: One paragraph per child. Start each with the child's name followed by a colon.

TASK 2 — WEEKLY PLAN TABLE
Create a plan table for NEXT week. For each child, suggest one work per area based on this week's progress.
- If a child mastered something → suggest the next logical work in that area
- If practicing → continue the same work
- If presented → continue with guided practice
- If no data for an area → suggest an age-appropriate starter work

Format as a text table:
Name | ${areaHeaders} | Notes

IMPORTANT:
- Be specific — use actual work names from the Montessori curriculum
- Keep narratives concise (3-5 sentences max per child)
- The plan table should be copy-paste ready for a document

OUTPUT FORMAT:
---NARRATIVES---
[child narratives here, one paragraph per child]

---PLANS---
[table here]
---END---`;
}

// ---- Parse Response ----

function parseWeeklyAdminResponse(
  responseText: string,
  children: ChildSummary[]
): { narratives: Record<string, string>; plans: Record<string, Record<string, string>>; narratives_text: string; plans_text: string } {
  const narratives: Record<string, string> = {};
  const plans: Record<string, Record<string, string>> = {};

  // Split by markers
  const narrativeMatch = responseText.match(/---NARRATIVES---\s*([\s\S]*?)\s*---PLANS---/);
  const plansMatch = responseText.match(/---PLANS---\s*([\s\S]*?)\s*(?:---END---|$)/);

  const narrativesText = narrativeMatch?.[1]?.trim() || responseText;
  const plansText = plansMatch?.[1]?.trim() || '';

  // Parse narratives — try to match by child name
  for (const child of children) {
    const firstName = child.first_name || child.name.split(' ')[0];
    // Look for "ChildName:" or "ChildName：" pattern
    const namePatterns = [child.name, firstName];
    for (const name of namePatterns) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedName}[：:]\\s*([^]*?)(?=\\n\\n|\\n[A-Z\\u4e00-\\u9fff]|$)`, 'i');
      const match = narrativesText.match(regex);
      if (match) {
        narratives[child.id] = `${name}: ${match[1].trim()}`;
        break;
      }
    }
    // Fallback: if we couldn't parse individually, they'll get the full text
  }

  // Parse plan table lines — basic parsing
  if (plansText) {
    const lines = plansText.split('\n').filter((l) => l.trim() && !l.match(/^[\-|]+$/));
    const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

    for (const line of lines) {
      const cells = line.split('|').map((c) => c.trim());
      if (cells.length < 3) continue;

      // Find which child this line belongs to
      const childName = cells[0];
      const child = children.find(
        (c) =>
          c.name.toLowerCase().includes(childName.toLowerCase()) ||
          childName.toLowerCase().includes((c.first_name || c.name.split(' ')[0]).toLowerCase())
      );

      if (child) {
        plans[child.id] = {};
        for (let i = 0; i < areas.length && i + 1 < cells.length; i++) {
          plans[child.id][areas[i]] = cells[i + 1] || '';
        }
      }
    }
  }

  return { narratives, plans, narratives_text: narrativesText, plans_text: plansText };
}

// ---- Main Generation Function ----

/**
 * Generate weekly admin package (narratives + plan tables) for a classroom
 */
export async function generateWeeklyAdmin(
  classroomId: string,
  schoolId: string,
  weekStart: string,
  locale: string = 'en'
): Promise<WeeklyAdminResult | null> {
  if (!anthropic) {
    console.error('[weekly-admin] Anthropic client not available');
    return null;
  }

  const supabase = getSupabase();

  // Calculate week end (Friday)
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 4);
  const weekEnd = weekEndDate.toISOString().split('T')[0];

  // Fetch all children in classroom
  const { data: childrenData } = await supabase
    .from('montree_children')
    .select('id, name, first_name')
    .eq('classroom_id', classroomId)
    .order('name');

  const children: ChildSummary[] = childrenData || [];
  if (children.length === 0) {
    return null;
  }

  // Fetch all voice notes for this classroom this week
  const { data: notesData } = await supabase
    .from('montree_voice_notes')
    .select('child_id, work_name, area, proposed_status, behavioral_notes, next_steps, transcript, voice_date')
    .eq('classroom_id', classroomId)
    .eq('voice_week_start', weekStart)
    .eq('extraction_status', 'success')
    .order('created_at', { ascending: true });

  const notes: VoiceNote[] = notesData || [];

  // Group notes by child
  const notesByChild: Record<string, VoiceNote[]> = {};
  for (const note of notes) {
    if (!notesByChild[note.child_id]) notesByChild[note.child_id] = [];
    notesByChild[note.child_id].push(note);
  }

  // Build prompt
  const prompt = buildWeeklyAdminPrompt(children, notesByChild, locale, weekStart, weekEnd);

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text response
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    if (!responseText) {
      console.error('[weekly-admin] Empty response from Sonnet');
      return null;
    }

    // Parse the response
    const parsed = parseWeeklyAdminResponse(responseText, children);

    return {
      narratives: parsed.narratives,
      plans: parsed.plans,
      narratives_text: parsed.narratives_text,
      plans_text: parsed.plans_text,
      children_count: children.length,
      total_notes_count: notes.length,
    };
  } catch (err) {
    console.error('[weekly-admin] Sonnet generation error:', err);
    return null;
  }
}
