// lib/montree/voice-agent/voice-tools.ts
//
// The voice agent reuses Astra's PRODUCTION tools (TRACY_TOOLS + executeTracyTool)
// so it can do everything text Astra can — look up children, schedule
// appointments, send messages — with the same school-scoping and tested logic.
//
// The one addition for voice: every real-world MUTATION tool gets a required
// `confirmed` flag. The shim hard-gates execution on it, so Astra must describe
// the action aloud and hear "yes" before anything is actually booked or sent.
// (Read-only tools pass straight through.)

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { TRACY_TOOLS } from '@/lib/montree/tracy/tool-definitions';

// Tools that change the real world (book, message, record). Everything else
// (lookups, drafts, memory recall) runs without a confirmation gate.
export const VOICE_MUTATION_TOOLS = new Set<string>([
  'send_parent_message',
  'send_teacher_message',
  'schedule_appointment',
  'create_parent_meeting_record',
  'update_parent_meeting',
  'set_parent_recording_consent',
]);

const CONFIRMED_PROP = {
  type: 'boolean',
  description:
    'Set true ONLY after you have described this exact action aloud and the ' +
    'principal has clearly said yes. If not yet confirmed, omit it — the ' +
    'action will NOT run and you will be reminded to confirm first.',
};

// Voice tool set = production Tracy tools, with `confirmed` bolted onto every
// mutation tool's schema.
export const VOICE_TOOLS: Tool[] = TRACY_TOOLS.map((tool) => {
  if (!VOICE_MUTATION_TOOLS.has(tool.name)) return tool;
  const schema = tool.input_schema as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return {
    ...tool,
    input_schema: {
      ...schema,
      properties: { ...(schema.properties ?? {}), confirmed: CONFIRMED_PROP },
      required: Array.from(new Set([...(schema.required ?? []), 'confirmed'])),
    },
  } as Tool;
});

/** A mutation tool was requested without an explicit confirmed:true. */
export function needsConfirmation(
  name: string,
  input: Record<string, unknown>
): boolean {
  return VOICE_MUTATION_TOOLS.has(name) && input.confirmed !== true;
}

/** Drop the voice-only `confirmed` flag before handing input to the executor. */
export function stripConfirmed(
  input: Record<string, unknown>
): Record<string, unknown> {
  if (!('confirmed' in input)) return input;
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k !== 'confirmed') rest[k] = v;
  }
  return rest;
}
