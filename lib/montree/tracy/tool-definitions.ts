// lib/montree/tracy/tool-definitions.ts
//
// Tracy's tool surface. Read-only by design (v1).
//
// Tools fall into two tiers:
//
//   FRAMEWORK tools (the thinking is baked in, server-side):
//     - child_focus      — answers any question about a specific child end-to-end
//     - unpack_teacher   — "How is X doing?" returns activity + coverage + quality + pattern + verdict
//
//   PRIMITIVE tools (small, composable lookups):
//     - find_children_by_name        — explicit name search
//     - get_child_briefing           — deep child snapshot (the full file)
//     - list_classrooms_with_summary — school-wide classroom view
//     - list_teachers_with_summary   — school-wide teacher view
//
// Tracy's PRIMARY path for any question naming a specific child is
// child_focus — single tool, single failure surface, end-to-end answer
// (Haiku parses the question, direct DB resolves the child + fetches context,
// Sonnet composes a grounded answer). The chained-tool path
// (find_children_by_name → answer_about_child) was deprecated as the primary
// flow because it had multiple HTTP hops, multiple auth re-verifications, and
// chained Sonnet rounds — too fragile for the canonical use case.
//
// Future: synthesize_parent_answer (parent-conversation framing layer over
// child_focus), family_context, school_pulse, recent_conversations,
// consult_guru (Tracy → Guru bridge). Build them as Tracy proves out — only
// after we see them in real principal questions (montree_principal_agent_log).

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const TRACY_TOOLS: Tool[] = [
  // ── FRAMEWORK TOOLS ──────────────────────────────────────────────────
  {
    name: 'child_focus',
    description:
      "PRIMARY tool for any question about a specific child. Use this whenever the principal asks something that names a child or asks about a child indirectly — \"how is Austin?\", \"tell me about Austin's English progress\", \"what should I tell Emily's mum about her math\", \"is Lucky ready for the moveable alphabet?\", \"how has Stella been this week?\". Pass the principal's question text VERBATIM as the `question` parameter — server-side it parses the question (extracting child name, area, focus), resolves the child, fetches all relevant context (progress, observations, notes, profile), and composes a grounded answer. Returns either: a `found` resolution with a `child` object and an `answer.text` ready to relay, OR a `not_found` resolution if no child by that name exists, OR an `ambiguous` resolution with `candidates` if multiple children match. ALWAYS prefer this tool over chaining find_children_by_name + get_child_briefing for child-specific questions — it's one tool, one failure surface, end-to-end.",
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description:
            "The principal's question, passed verbatim (or as close to verbatim as possible). E.g., \"how is Austin doing?\", \"tell me about Austin's English progress\", \"what should I tell Emily's mum about her math?\". Don't paraphrase or summarise — the parser handles the intent extraction.",
        },
      },
      required: ['question'],
    },
  },
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
      "SECONDARY tool — use ONLY when the principal explicitly wants a list of children matching a name (\"who are all the Austins in the school?\"), NOT when she's asking about a specific child's progress or wellbeing (use child_focus for that instead). Returns up to 10 matches with id, name, age, classroom_id, classroom_name, photo_url.",
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
      'SECONDARY tool — use only when the principal wants an EXTENSIVE deep-dive briefing on a specific child (the full file: profile, all areas of progress, all recent observations, watch-list items). For a single targeted question or a normal "how is X doing" — use child_focus instead, it\'s much faster and more focused. Requires child_id.',
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
      },
      required: ['child_id'],
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

  // ── ACTION TOOL: draft_teacher_welcome_messages ──────────────────────
  // The chief-of-staff pattern: principal accepts an offer, Tracy executes
  // and produces a copy-paste-ready deliverable. v1 only does welcome
  // messages; future actions (parent announcements, teacher check-ins,
  // family briefings) follow the same shape.
  {
    name: 'draft_teacher_welcome_messages',
    description:
      'Draft copy-paste-ready welcome messages the principal can send to her teachers with their login codes. Use this whenever the principal accepts an offer to draft welcome messages, or explicitly asks to "draft messages for my teachers", "create welcome messages", "send teachers their codes", etc. Each draft is personalised with the teacher\'s first name, the school name, the teacher\'s login code, and (if known) the classroom they\'re in. Default scope is "all" — every active teacher in the school. Pass scope="classroom" with classroom_id for a single classroom, or scope="teacher" with teacher_id for one specific teacher. Returns an array of drafts; format them inline in your reply with each teacher\'s name as a header and the message text underneath.',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['all', 'classroom', 'teacher'],
          description:
            'Which teachers to draft for. Default "all" — every active teacher in the school. Use "classroom" with classroom_id when the principal asks for a specific classroom\'s teachers; "teacher" with teacher_id for a single teacher.',
        },
        classroom_id: {
          type: 'string',
          description: 'Required if scope="classroom".',
        },
        teacher_id: {
          type: 'string',
          description: 'Required if scope="teacher".',
        },
      },
    },
  },
];
