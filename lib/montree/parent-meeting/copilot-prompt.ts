// lib/montree/parent-meeting/copilot-prompt.ts
//
// Live meeting co-pilot (Astra) — the REAL-TIME companion to the post-hoc
// analyse pipeline. While a parent conversation is happening, the principal's
// rolling transcript is sent here and Haiku returns a pre-drafted next-best
// response + talking points, so the principal never has to stall on
// "what do I say?". This is a SUGGESTION surface only — the human always
// decides and speaks. Nothing here is persisted; the audio/transcript live
// in-memory on the client and are dropped (see transcribe.ts).

export interface CopilotPromptInput {
  parentName: string;
  childName: string | null;
  meetingType: string;
  locale: string;
  hasExistingProfile: boolean;
  existingProfileSummary: string;
}

// Structured output so the UI can render a clean side panel. Uses the same
// `as const` literal pattern as PARENT_MEETING_ANALYSIS_TOOL so it satisfies
// the Anthropic SDK tool type without an explicit annotation.
export const COPILOT_SUGGESTION_TOOL = {
  name: 'suggest_next_response',
  description:
    'Return a concise, ready-to-say next response plus supporting talking ' +
    'points for the principal to use in the live parent conversation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      next_response: {
        type: 'string' as const,
        description:
          'One warm, natural thing the principal could say next, in the ' +
          "meeting's language. 1-3 sentences. Ready to speak verbatim.",
      },
      talking_points: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '2-4 short bullet points the principal can lean on.',
      },
      watch_out: {
        type: 'string' as const,
        description:
          'Optional one-line caution about tone or a sensitive thread. ' +
          'Empty string if nothing to flag.',
      },
      tone: {
        type: 'string' as const,
        enum: ['warm', 'calm', 'reassure', 'firm', 'clarify'],
        description: 'The emotional register the principal should aim for now.',
      },
    },
    required: ['next_response', 'talking_points', 'tone'],
  },
};

export function buildCopilotSystemPrompt(input: CopilotPromptInput): string {
  const {
    parentName,
    childName,
    meetingType,
    locale,
    hasExistingProfile,
    existingProfileSummary,
  } = input;

  const childLine = childName
    ? `The child being discussed is ${childName}.`
    : 'No specific child is linked to this meeting.';

  const profileBlock = hasExistingProfile
    ? `\n\nWhat we already know about ${parentName} (use it, don't recite it):\n${existingProfileSummary}`
    : '';

  return [
    'You are Astra, a live co-pilot whispering to a Montessori school',
    `principal during a real, ongoing conversation with ${parentName}`,
    `(${meetingType}). ${childLine}`,
    '',
    'You hear the rolling transcript so far. Your job: prepare the next',
    'thing the principal could say — BEFORE they have to ask. Be the calm,',
    'warm voice in their ear.',
    '',
    'Rules:',
    '- You SUGGEST; the principal decides and speaks. Never assume it was said.',
    '- Be concise. A principal glances at this mid-conversation.',
    `- Write the next_response in the meeting's language (locale: ${locale}).`,
    '- Never invent facts about the child, fees, or school policy. If a fact',
    '  is needed and unknown, suggest a clarifying question instead.',
    '- Stay warm, respectful, and parent-centred. De-escalate tension.',
    '- If the parent seems upset, prioritise acknowledgement before solutions.',
    profileBlock,
  ].join('\n');
}
