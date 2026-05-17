// lib/montree/appointments/transcription/summarize.ts
//
// THE KILLER-FEATURE SUMMARIZER.
//
// Take a transcript + appointment context + (optional) prior-meeting summaries
// and produce a structured "what's worth knowing about this meeting" briefing
// in the staff member's voice. The briefing is what the NEXT staff member
// walks into via the PriorConversationCard.
//
// VOICE: chief-of-staff (matches Tracy's voice from Session 96/97). Warm,
// professional, action-oriented. Always ends with one concrete next move
// (the "→ " action-line marker is load-bearing — see Tracy system prompt).
//
// STRUCTURED OUTPUT (Sonnet tool_use):
//   - topics: the 2-5 themes that came up (e.g. "Eli's reading progress",
//     "snack-time difficulties", "summer break plans")
//   - parent_concerns: things the parent flagged as worrying / wanting more
//     of (verbatim where possible — these are load-bearing for trust)
//   - commitments_made: things the staff member promised the parent
//   - follow_ups: what the next meeting should address
//   - sentiment: 'warm' | 'neutral' | 'tense' | 'mixed' — the parent's
//     felt experience by the end. Helps staff calibrate next interaction.
//   - briefing: 80-120 word prose summary — the human-readable bit that
//     surfaces on the next meeting's PriorConversationCard. ENDS with "→ "
//
// CONTEXT INJECTION:
//   We pass up to 3 prior summaries (most recent first) so Sonnet can
//   reference continuity ("last meeting Mary also raised this..."). This
//   is what makes the briefing feel like institutional memory rather than
//   isolated meeting recaps.
//
// COST: Sonnet 4.6, ~$3/$15 per MTok in/out. Typical 30-min transcript ≈
// 3,000 input tokens + 400 output tokens = $0.015/meeting. Negligible.

import { anthropic } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAILanguageInstruction } from '@/lib/montree/i18n';

export interface SummarizeInput {
  /** The Whisper transcript text. */
  transcript: string;
  /** Locale of the transcript — Sonnet writes the summary in this language. */
  transcriptLocale: string;
  /** Context fields surfaced in the prompt. */
  context: {
    parentName: string | null;
    childName: string | null;
    staffName: string | null;
    staffRole: 'teacher' | 'principal';
    meetingDate: string; // ISO date
    intakeSubject: string | null;
    intakeBody: string | null;
  };
  /** Up to 3 prior-meeting summaries for continuity, newest first. */
  priorSummaries?: Array<{
    date: string; // ISO date
    summary: string;
    staffName: string | null;
  }>;
}

export interface SummarizeResult {
  ok: boolean;
  data?: {
    briefing: string;
    topics: string[];
    parentConcerns: string[];
    commitmentsMade: string[];
    followUps: string[];
    sentiment: 'warm' | 'neutral' | 'tense' | 'mixed';
    model: string;
  };
  error?: string;
}

const SUMMARY_TOOL = {
  name: 'compose_meeting_briefing',
  description:
    'Compose a structured briefing of the parent meeting that just took place. The briefing is what the next staff member will see when they open this parent\'s file before the next meeting. Be specific, warm, and decisive.',
  input_schema: {
    type: 'object' as const,
    required: ['briefing', 'topics', 'parent_concerns', 'commitments_made', 'follow_ups', 'sentiment'],
    properties: {
      briefing: {
        type: 'string',
        description:
          '80-120 word prose summary in the staff member\'s voice. Reads like a chief-of-staff briefing — what was discussed, where the parent landed, and what to do next. MUST end with a single action line starting with "→ " (arrow + space). Examples: "→ Bring up reading progress at the next pickup." / "→ Schedule a follow-up in two weeks." Be concrete.',
      },
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: '2-5 short topic labels (3-6 words each). What was discussed.',
      },
      parent_concerns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Things the parent flagged as worrying or wanting more of. Quote close to verbatim where possible. Empty array if no concerns.',
      },
      commitments_made: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Things the staff member promised the parent (e.g. "send weekly photos", "set up reading evaluation"). Empty array if none.',
      },
      follow_ups: {
        type: 'array',
        items: { type: 'string' },
        description:
          'What the NEXT meeting or interaction should cover. Empty array if nothing specific.',
      },
      sentiment: {
        type: 'string',
        enum: ['warm', 'neutral', 'tense', 'mixed'],
        description:
          'How the parent\'s mood landed by the end of the call. Helps the next staff member calibrate their approach.',
      },
    },
  },
};

/**
 * Run Sonnet on the transcript. Caller is responsible for tier-gating
 * (we check here as belt-and-braces, but the route should also check).
 */
export async function summarizeTranscript(
  supabase: SupabaseClient,
  schoolId: string,
  input: SummarizeInput
): Promise<SummarizeResult> {
  if (!anthropic) {
    return { ok: false, error: 'anthropic_not_configured' };
  }

  const aiTier = await resolveReportModel(supabase, schoolId);
  if (aiTier.tier === 'free' || !aiTier.model) {
    return { ok: false, error: 'ai_tier_free' };
  }

  const trimmed = input.transcript.trim();
  if (trimmed.length < 50) {
    return { ok: false, error: 'transcript_too_short' };
  }

  // Cap transcript at ~50k chars to keep Sonnet well under context limit
  // and bound cost. A 30-min meeting at ~150 wpm = ~4500 words = ~22k chars,
  // so this cap only triggers on unusually long sessions.
  const transcriptClipped = trimmed.length > 50_000
    ? trimmed.slice(0, 50_000) + '\n\n[transcript truncated]'
    : trimmed;

  const priorSummariesBlock = (input.priorSummaries && input.priorSummaries.length > 0)
    ? input.priorSummaries
        .slice(0, 3)
        .map(
          (p) =>
            `[${p.date}${p.staffName ? ` · with ${p.staffName}` : ''}]\n${p.summary}`
        )
        .join('\n\n---\n\n')
    : '(no prior meetings on file)';

  const langInstruction = getAILanguageInstruction(input.transcriptLocale);

  const systemPrompt = [
    'You are a chief-of-staff for a Montessori school principal/teacher.',
    'A parent meeting has just ended. You are writing the briefing that the NEXT staff member will read before their next interaction with this parent.',
    '',
    'Your output is consumed by busy people who need to walk into the next meeting prepared. Be specific. Quote concerns close to verbatim. Be decisive about what to do next.',
    '',
    'TONE:',
    '- Warm but professional. Like a trusted colleague briefing a peer.',
    '- Concrete, not vague. "Eli\'s been resisting tray-cleanup" beats "some behaviour challenges".',
    '- Always end the briefing with a single action line starting with "→ " (arrow + space).',
    '- Never invent details not in the transcript.',
    '- The briefing is for staff use — don\'t address the parent directly.',
    '',
    'CONTINUITY:',
    '- Prior meeting summaries (if any) are provided so you can reference patterns.',
    '- If a concern recurs across meetings, flag it: "This is the second meeting where..."',
    '- If a commitment from a prior meeting was discussed, note progress.',
    '',
    langInstruction ? `\n${langInstruction}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userMessage = [
    `MEETING CONTEXT`,
    `Date: ${input.context.meetingDate}`,
    `Parent: ${input.context.parentName || '(unnamed)'}`,
    input.context.childName ? `Child: ${input.context.childName}` : null,
    `Staff: ${input.context.staffName || '(unnamed)'} (${input.context.staffRole})`,
    input.context.intakeSubject ? `\nParent's pre-meeting note (subject): ${input.context.intakeSubject}` : null,
    input.context.intakeBody ? `Parent's pre-meeting note (body): ${input.context.intakeBody}` : null,
    '',
    `PRIOR MEETINGS ON FILE`,
    priorSummariesBlock,
    '',
    `TRANSCRIPT`,
    transcriptClipped,
    '',
    'Use the compose_meeting_briefing tool. Be specific, warm, decisive.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: aiTier.model,
      max_tokens: 1200,
      system: systemPrompt,
      tools: [SUMMARY_TOOL],
      tool_choice: { type: 'tool', name: 'compose_meeting_briefing' },
      messages: [{ role: 'user', content: userMessage }],
    });

    // Find the tool_use block.
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { ok: false, error: 'no_tool_use' };
    }

    const i = toolUse.input as {
      briefing?: string;
      topics?: string[];
      parent_concerns?: string[];
      commitments_made?: string[];
      follow_ups?: string[];
      sentiment?: 'warm' | 'neutral' | 'tense' | 'mixed';
    };

    if (!i.briefing || typeof i.briefing !== 'string') {
      return { ok: false, error: 'no_briefing' };
    }

    return {
      ok: true,
      data: {
        briefing: i.briefing.trim().slice(0, 8000),
        topics: Array.isArray(i.topics) ? i.topics.slice(0, 8) : [],
        parentConcerns: Array.isArray(i.parent_concerns) ? i.parent_concerns.slice(0, 10) : [],
        commitmentsMade: Array.isArray(i.commitments_made) ? i.commitments_made.slice(0, 10) : [],
        followUps: Array.isArray(i.follow_ups) ? i.follow_ups.slice(0, 10) : [],
        sentiment: i.sentiment || 'neutral',
        model: aiTier.model,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `sonnet_failed: ${(err as Error).message.slice(0, 300)}`,
    };
  }
}
