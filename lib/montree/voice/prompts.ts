// lib/montree/voice/prompts.ts
// System prompt for Claude Haiku observation extraction

interface Child {
  id: string;
  name: string;
  first_name?: string;
}

interface CurriculumWork {
  name: string;
  work_key: string;
  area_key: string;
  category?: string;
}

interface Alias {
  child_id: string;
  alias: string;
}

/**
 * Build the system prompt for observation extraction
 */
export function buildObservationExtractionPrompt(
  children: Child[],
  curriculum: CurriculumWork[],
  customWorks: CurriculumWork[],
  aliases: Alias[],
  language: string
): string {
  // Build student roster section
  const rosterLines = children.map(c => {
    const childAliases = aliases.filter(a => a.child_id === c.id);
    const aliasStr = childAliases.length > 0
      ? ` (also called: ${childAliases.map(a => a.alias).join(', ')})`
      : '';
    return `- ${c.name}${aliasStr}`;
  });

  // Build curriculum section grouped by area
  const areas: Record<string, string[]> = {
    practical_life: [],
    sensorial: [],
    mathematics: [],
    language: [],
    cultural: []
  };

  for (const work of curriculum) {
    const area = work.area_key;
    if (areas[area]) {
      areas[area].push(work.name);
    }
  }

  // Add custom works
  for (const work of customWorks) {
    const area = work.area_key || 'custom';
    if (!areas[area]) areas[area] = [];
    areas[area].push(`${work.name} [custom]`);
  }

  const curriculumSection = Object.entries(areas)
    .filter(([, works]) => works.length > 0)
    .map(([area, works]) => {
      const areaName = area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `### ${areaName}\n${works.map(w => `- ${w}`).join('\n')}`;
    })
    .join('\n\n');

  const langNote = language === 'zh'
    ? '\nThe teacher is speaking in Chinese (Mandarin). Student names may be in Chinese or English. Work names may be spoken in Chinese or English.'
    : language === 'auto'
    ? '\nThe teacher may speak in English or Chinese. Adapt to the language detected.'
    : '';

  return `You are an expert Montessori classroom observer. You are analyzing a transcript of a teacher's voice recording during a Montessori work cycle.

Your job is to identify every observation about individual students and their work. Extract structured data about what each student was doing.

## CLASSROOM ROSTER (${children.length} students)
${rosterLines.join('\n')}

## CURRICULUM WORKS (${curriculum.length + customWorks.length} total)
${curriculumSection}

## INSTRUCTIONS
${langNote}

For EACH observation you find in the transcript, call the extract_observation tool with:

1. **child_name**: The name spoken by the teacher. Match to the roster above. Use the closest match.
2. **work_name**: The Montessori work being discussed. Match to the curriculum above. Use the exact curriculum name if possible.
3. **area**: Which area the work belongs to (practical_life, sensorial, mathematics, language, cultural).
4. **observation_text**: A concise summary of what the student was doing (1-2 sentences).
5. **proposed_status**: Your assessment:
   - "presented" = teacher showed/introduced the work to the student
   - "practicing" = student is working on it independently but hasn't mastered it
   - "mastered" = student demonstrates clear competency, confidence, and can do it independently
6. **event_type**: What kind of observation this is:
   - "mastery" = student demonstrated mastery or significant progress
   - "presentation" = teacher presented/introduced a new work
   - "practice" = student was practicing/working independently
   - "behavioral" = developmental observation (social, emotional, physical)
   - "other" = mentioned in passing, cleanup, transition, or unclear context
7. **evidence**: Brief explanation of WHY you chose this status (what in the transcript indicates this).
8. **behavioral_notes**: Any developmental observations (optional — social skills, concentration, independence, etc.)
9. **approximate_minute**: Roughly where in the transcript this observation appears (estimated minute mark).

## IMPORTANT RULES
- Only extract observations about NAMED students from the roster.
- If you hear a name that doesn't match any student, still extract it — use the name as spoken.
- "Put X away" or "clean up X" is event_type "other", NOT mastery.
- Be conservative with "mastered" — only use it when the evidence is clear.
- If the same student+work is mentioned multiple times, extract the MOST significant observation.
- If a student is mentioned without a specific work (e.g., "Joey was very focused today"), use event_type "behavioral".
- Extract ALL observations, even brief mentions. The teacher will review and approve/reject each one.`;
}

/**
 * Build the tool definition for Claude's tool_use
 */
export function getExtractionToolDefinition() {
  return {
    name: 'extract_observation',
    description: 'Extract a single observation about a student from the transcript. Call this once per observation found.',
    input_schema: {
      type: 'object' as const,
      properties: {
        child_name: {
          type: 'string',
          description: 'The student name as spoken by the teacher'
        },
        work_name: {
          type: 'string',
          description: 'The Montessori work name (matched to curriculum if possible)'
        },
        area: {
          type: 'string',
          enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
          description: 'Which Montessori area this work belongs to'
        },
        observation_text: {
          type: 'string',
          description: 'Concise summary of what the student was doing (1-2 sentences)'
        },
        proposed_status: {
          type: 'string',
          enum: ['presented', 'practicing', 'mastered'],
          description: 'Assessment of student progress on this work'
        },
        event_type: {
          type: 'string',
          enum: ['mastery', 'presentation', 'practice', 'behavioral', 'other'],
          description: 'What kind of observation this is'
        },
        evidence: {
          type: 'string',
          description: 'Brief explanation of why this status was chosen'
        },
        behavioral_notes: {
          type: 'string',
          description: 'Optional developmental observations (social, emotional, physical)'
        },
        approximate_minute: {
          type: 'number',
          description: 'Estimated minute mark in the recording where this observation appears'
        }
      },
      required: ['child_name', 'observation_text', 'event_type']
    }
  };
}
