// lib/montree/tracy/tool-definitions.ts
//
// Tracy's tool surface. Read-only by design (v1).
//
// Tools fall into two tiers:
//
//   FRAMEWORK tools (the thinking is baked in, server-side):
//     - unpack_teacher       — "How is X doing?" returns activity + coverage + quality + pattern + verdict
//
//   PRIMITIVE tools (small, composable lookups):
//     - find_children_by_name
//     - get_child_briefing
//     - answer_about_child
//     - list_classrooms_with_summary
//     - list_teachers_with_summary
//
// Future: synthesize_parent_answer, family_context, school_pulse,
// recent_conversations, consult_guru (Tracy → Guru bridge). Build them as
// Tracy proves out — only after we see them in real principal questions
// (montree_principal_agent_log).

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const TRACY_TOOLS: Tool[] = [
  // ── FRAMEWORK TOOLS ──────────────────────────────────────────────────
  {
    name: 'unpack_teacher',
    description:
      "Use this for any question about how a teacher is doing in the classroom — \"How is Susan?\", \"Is Mr. Liu carrying his weight?\", \"What's Anna been like this week?\". Returns a structured assessment: activity (logins, photos, notes written), coverage (which of her children she's observed vs neglected), quality (note substance scoring), pattern (children progressing, stalled, regressed under her), and a verdict line. The principal often asks vague questions like \"How is Susan doing?\" — this tool unpacks that into evidence. Window defaults to 7 days. Requires teacher_id — if you only have a name, call list_teachers_with_summary first and pick the matching teacher's id from the response.",
    input_schema: {
      type: 'object',
      properties: {
        teacher_id: {
          type: 'string',
          description: 'The exact teacher id (UUID).',
        },
        window_days: {
          type: 'number',
          description:
            'How many days back to analyse. Defaults to 7. Use 14 or 30 for "this month" style questions.',
        },
      },
      required: ['teacher_id'],
    },
  },

  // ── PRIMITIVE TOOLS ──────────────────────────────────────────────────
  {
    name: 'find_children_by_name',
    description:
      "Search the principal's school for children whose name matches a query. Use this when the principal mentions a child by name (full or partial). Returns up to 10 matches with id, name, classroom, and age.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            "The name (or partial name) to search for. Case-insensitive substring match against the child's name.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_child_briefing',
    description:
      'Get a 30-second AI-synthesised briefing on one child — who they are right now, what they\'re working on, recent observations, what to watch for. Use when the principal wants a general "how is X doing" answer about a child. Requires child_id (use find_children_by_name first if you only have a name).',
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
      },
      required: ['child_id'],
    },
  },
  {
    name: 'answer_about_child',
    description:
      "Get a focused answer to a SPECIFIC question about ONE child, drawing on every observation in the system. Use when the principal is relaying a parent's question (e.g., 'Has she been calmer this week?', 'Did she finish the moveable alphabet?') or asking a pointed question about a single child. Returns a short, factually-grounded answer. Requires child_id and the question text.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
        question: {
          type: 'string',
          description:
            "The specific question being asked, in plain English. If you're rephrasing a parent's question, keep the parent's phrasing.",
        },
      },
      required: ['child_id', 'question'],
    },
  },
  {
    name: 'list_classrooms_with_summary',
    description:
      "List every classroom in the principal's school with: classroom name, child count, lead teacher name, and how many of those children have been observed this week. Use this when the principal asks broad school-level questions like 'how is the school doing this week', 'which classrooms are quiet', 'who's been observing'.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_teachers_with_summary',
    description:
      "List every active teacher in the school with: id, name, classroom, last login date, and a 7-day activity count (photos confirmed). Use when the principal asks broadly about teachers — who's active, who hasn't logged in, who's been observing the most. Also useful when you need a teacher_id to feed into unpack_teacher.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];
