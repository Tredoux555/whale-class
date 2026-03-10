// lib/montree/voice-notes/extraction.ts
// Core AI extraction for teacher voice notes
// Uses Haiku tool_use to extract structured observation data from transcribed voice notes

import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { matchStudentName, loadAliases } from '@/lib/montree/voice/student-matcher';
import { fuzzyScore } from '@/lib/montree/work-matching';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { getSupabase } from '@/lib/supabase-client';

// ---- Types ----

interface Child {
  id: string;
  name: string;
}

export interface VoiceNoteExtraction {
  child_name_spoken: string;
  child_id: string | null;
  child_match_confidence: number;
  work_name: string | null;
  work_key: string | null;
  area: string | null;
  work_match_confidence: number;
  proposed_status: 'presented' | 'practicing' | 'mastered' | null;
  status_confidence: number;
  behavioral_notes: string | null;
  next_steps: string | null;
}

interface HaikuExtractionInput {
  child_name: string;
  work_name?: string;
  area?: string;
  proposed_status?: string;
  status_confidence?: number;
  behavioral_notes?: string;
  next_steps?: string;
  observation_summary?: string;
}

// ---- Tool Definition ----

function getVoiceNoteToolDefinition() {
  return {
    name: 'extract_voice_note',
    description: 'Extract structured observation data from a teacher voice note about a student.',
    input_schema: {
      type: 'object' as const,
      properties: {
        child_name: {
          type: 'string',
          description: 'The student name mentioned in the voice note. Use the name as spoken.',
        },
        work_name: {
          type: 'string',
          description: 'The Montessori work/activity being discussed. Use the curriculum name if identifiable.',
        },
        area: {
          type: 'string',
          enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
          description: 'The Montessori area this work belongs to.',
        },
        proposed_status: {
          type: 'string',
          enum: ['presented', 'practicing', 'mastered'],
          description: 'The proposed progress status. "presented" = first introduction. "practicing" = working on it. "mastered" = demonstrates consistent competence.',
        },
        status_confidence: {
          type: 'number',
          description: 'Confidence in the proposed status (0.0 to 1.0). Use 0.9+ only when evidence is clear.',
        },
        behavioral_notes: {
          type: 'string',
          description: 'Key behavioral observations: concentration, challenges, self-correction, emotional state.',
        },
        next_steps: {
          type: 'string',
          description: 'What the teacher plans to do next with this student for this work.',
        },
        observation_summary: {
          type: 'string',
          description: 'A brief 1-2 sentence summary of the observation for the progress notes.',
        },
      },
      required: ['child_name'],
    },
  };
}

// ---- Prompt Builder ----

function buildExtractionPrompt(
  children: Child[],
  curriculum: CurriculumWork[],
  language: string
): string {
  const roster = children.map(c => `- ${c.name}`).join('\n');

  // Group curriculum by area for compact display
  const byArea: Record<string, string[]> = {};
  for (const w of curriculum) {
    if (!byArea[w.area_key]) byArea[w.area_key] = [];
    byArea[w.area_key].push(w.name);
  }

  const curriculumSection = Object.entries(byArea)
    .map(([area, works]) => `### ${area}\n${works.join(', ')}`)
    .join('\n\n');

  const langNote = language === 'zh'
    ? 'The teacher is speaking in Mandarin Chinese. Student names may be in Chinese or English.'
    : language === 'auto'
    ? 'The teacher may speak in English or Mandarin Chinese.'
    : 'The teacher is speaking in English.';

  return `You are a Montessori classroom assistant. A teacher has recorded a quick voice note about a student. Extract structured observation data.

STUDENT ROSTER:
${roster}

CURRICULUM WORKS (by area):
${curriculumSection}

LANGUAGE NOTE: ${langNote}

RULES:
1. Match the student name to the roster above. Use the spoken name exactly.
2. Match the work to the curriculum list. If the teacher uses a colloquial name, match to the closest curriculum work.
3. Be CONSERVATIVE with "mastered" — only propose it when the teacher explicitly says the child has mastered, completed, or is ready to move on.
4. "presented" = teacher showed the work for the first time.
5. "practicing" = child is working on it, improving, or repeating.
6. If no specific work is mentioned, leave work_name empty and focus on behavioral_notes.
7. Extract the observation_summary as a concise note suitable for progress records.
8. Always extract next_steps if the teacher mentions future plans.

Call the extract_voice_note tool with your findings.`;
}

// ---- Work Matching ----

function matchWorkToCurriculum(
  spokenWorkName: string,
  curriculum: CurriculumWork[]
): { work: CurriculumWork | null; confidence: number } {
  if (!spokenWorkName) return { work: null, confidence: 0 };

  let bestWork: CurriculumWork | null = null;
  let bestScore = 0;

  for (const w of curriculum) {
    const score = fuzzyScore(spokenWorkName, w.name);
    if (score > bestScore) {
      bestScore = score;
      bestWork = w;
    }
    // Also try Chinese name
    if (w.chineseName) {
      const cnScore = fuzzyScore(spokenWorkName, w.chineseName);
      if (cnScore > bestScore) {
        bestScore = cnScore;
        bestWork = w;
      }
    }
  }

  return { work: bestWork, confidence: bestScore };
}

// ---- Main Extraction Function ----

/**
 * Extract structured observation data from a teacher's voice note transcript.
 *
 * @param transcript - The Whisper-transcribed text
 * @param classroomId - Classroom ID for loading roster + aliases
 * @param schoolId - School ID for security scoping
 * @param language - Detected language ('en', 'zh', 'auto')
 * @returns Extraction result with matched child, work, status, and notes
 */
export async function extractFromVoiceNote(
  transcript: string,
  classroomId: string,
  schoolId: string,
  language: string = 'en'
): Promise<VoiceNoteExtraction | null> {
  if (!anthropic) {
    console.error('[voice-notes] Anthropic client not available');
    throw new Error('AI extraction service not available');
  }

  if (!transcript || transcript.trim().length < 5) {
    console.warn('[voice-notes] Transcript too short or empty');
    return null;
  }

  const supabase = getSupabase();

  // Load classroom context in parallel
  const [childrenResult, aliases, curriculum] = await Promise.all([
    supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .order('name'),
    loadAliases(classroomId),
    Promise.resolve(loadAllCurriculumWorks()),
  ]);

  const children: Child[] = childrenResult.data || [];
  if (children.length === 0) {
    console.error('[voice-notes] No children found for classroom:', classroomId);
    return null;
  }

  // Build system prompt
  const systemPrompt = buildExtractionPrompt(children, curriculum, language);

  // Call Haiku with tool_use for fast, cheap extraction
  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [getVoiceNoteToolDefinition()],
      messages: [
        {
          role: 'user',
          content: `Teacher's voice note:\n\n"${transcript}"`,
        },
      ],
    });

    // Extract tool_use block
    let extraction: HaikuExtractionInput | null = null;
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'extract_voice_note') {
        extraction = block.input as HaikuExtractionInput;
        break;
      }
    }

    if (!extraction) {
      // Haiku didn't call the tool — no extractable data
      return {
        child_name_spoken: '',
        child_id: null,
        child_match_confidence: 0,
        work_name: null,
        work_key: null,
        area: null,
        work_match_confidence: 0,
        proposed_status: null,
        status_confidence: 0,
        behavioral_notes: transcript,
        next_steps: null,
      };
    }

    // Match student name against roster
    const childMatch = matchStudentName(extraction.child_name || '', children, aliases);

    // Match work name against curriculum
    const workMatch = extraction.work_name
      ? matchWorkToCurriculum(extraction.work_name, curriculum)
      : { work: null, confidence: 0 };

    // Validate proposed_status
    const validStatuses = ['presented', 'practicing', 'mastered'];
    const proposedStatus = validStatuses.includes(extraction.proposed_status || '')
      ? (extraction.proposed_status as 'presented' | 'practicing' | 'mastered')
      : null;

    // Build behavioral notes from observation_summary + behavioral_notes
    const noteParts = [
      extraction.observation_summary,
      extraction.behavioral_notes,
    ].filter(Boolean);
    const combinedNotes = noteParts.join(' ') || null;

    return {
      child_name_spoken: extraction.child_name || '',
      child_id: childMatch.childId,
      child_match_confidence: childMatch.confidence,
      work_name: workMatch.work?.name || extraction.work_name || null,
      work_key: workMatch.work?.work_key || null,
      area: workMatch.work?.area_key || extraction.area || null,
      work_match_confidence: workMatch.confidence,
      proposed_status: proposedStatus,
      status_confidence: extraction.status_confidence || 0,
      behavioral_notes: combinedNotes,
      next_steps: extraction.next_steps || null,
    };
  } catch (err) {
    console.error('[voice-notes] Haiku extraction error:', err);
    throw new Error(`Voice note analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Helper: get the Monday of the current week for a given date
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
