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

  // ── COMMUNICATION TOOLS ──────────────────────────────────────────────
  // Session 97 — Tracy scans parent threads and drafts principal replies.
  // The principal always pulls the trigger; these tools READ + DRAFT only.
  // Sending a drafted reply is done by the principal in the thread UI
  // (with the ai_drafted indicator). Tracy never sends autonomously.
  {
    name: 'list_recent_threads',
    description:
      "List the most recent message threads in the school. Use when the principal asks vague things like \"what's going on in messages?\", \"any parent threads I should look at?\", \"who's been talking to whom?\". Returns up to 20 threads with subject, type, last sender, last snippet, and unread count. Optional filters: thread_type ('parent_teacher' | 'parent_principal' | 'internal' | 'broadcast' | 'group'), classroom_id, unread_only.",
    input_schema: {
      type: 'object',
      properties: {
        thread_type: {
          type: 'string',
          enum: ['parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group'],
        },
        classroom_id: { type: 'string' },
        unread_only: { type: 'boolean' },
      },
    },
  },
  {
    name: 'scan_parent_thread',
    description:
      "Read a parent-teacher (or parent-principal) thread end-to-end and produce a chief-of-staff briefing for the principal. Returns sentiment, recurring concerns, whether the teacher is handling it well or needs principal support, and one concrete recommended next move. Use when the principal asks \"how is this conversation going?\", \"what's happening in [parent's] thread?\", \"should I jump in on [child's parent]?\" — and you already have the thread_id. Keep your relayed answer 60-100 words.",
    input_schema: {
      type: 'object',
      properties: {
        thread_id: { type: 'string' },
      },
      required: ['thread_id'],
    },
  },
  {
    name: 'draft_parent_response',
    description:
      "Draft a reply to a parent on the principal's behalf, voice-matched from her recent messages. Returns a single text body the principal can send (or edit and send). Use when she asks \"draft my reply\", \"write a response to [parent]\", or accepts your offer to draft. Optional `guidance` parameter passes specific direction (e.g. \"keep it warm but firm about the policy\"). The principal always pulls the trigger — your job ends at returning the draft text. Present it inline with a brief one-line lead-in like \"Here's a draft you can send:\".",
    input_schema: {
      type: 'object',
      properties: {
        thread_id: { type: 'string' },
        guidance: {
          type: 'string',
          description:
            "Optional direction for tone or content. E.g., \"keep it warm but firm about the late pickup policy\".",
        },
      },
      required: ['thread_id'],
    },
  },

  // ── MEMORY TOOLS (Session 99 — migration 195) ────────────────────────
  // Tracy's persistent relational memory. The active set (top-30 most recent)
  // is loaded into the system prompt header on every turn. These tools let
  // her WRITE new memories and DEEPER-recall when the header isn't enough.
  {
    name: 'remember_this',
    description:
      'Save a semantic memory about the principal for future conversations. CALL THIS whenever you learn something durable — a preference (e.g. "principal prefers messages under 3 sentences"), a concern (e.g. "principal has been worried about Austin\'s reading for several weeks"), a voice sample (a quoted message the principal wrote that you can match in future drafts), a parent priority, a teacher-specific note, or general context (e.g. "school is opening a new classroom in fall"). Do NOT save episodic facts ("principal asked about Austin on May 10") — only durable semantic knowledge that informs future interactions. Do NOT save private/sensitive personal facts unless the principal explicitly asked you to remember them. content is the memory itself in plain English, max 1000 chars. memory_type is one of: preference, concern, voice_sample, parent_priority, teacher_note, context, fact. supersedes_id is the id of a prior memory that this one updates/replaces (use when correcting outdated info — the id is shown in brackets next to each memory in the system-prompt header). related_child_id, related_teacher_id, related_parent_id are optional UUIDs that scope the memory to a specific person.',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: [
            'preference',
            'concern',
            'voice_sample',
            'parent_priority',
            'teacher_note',
            'context',
            'fact',
          ],
        },
        content: {
          type: 'string',
          description: 'Plain-English memory, max 1000 chars.',
        },
        source: {
          type: 'string',
          description:
            'Optional brief source description, e.g. "noted from May 10 chat".',
        },
        supersedes_id: {
          type: 'string',
          description:
            'UUID of a prior memory this updates. Use when correcting outdated info.',
        },
        related_child_id: { type: 'string' },
        related_teacher_id: { type: 'string' },
        related_parent_id: { type: 'string' },
      },
      required: ['memory_type', 'content'],
    },
  },
  {
    name: 'recall_memory',
    description:
      'Retrieve relevant memories from past conversations. Use when answering a question where past context would help — "what did we discuss about Austin?", "what was that thing the principal cared about?", or any time a child/teacher/parent name appears that might have prior context. The active memories are already in your system prompt header; use this tool when you need DEEPER recall (more memories than the system prompt shows, or filtering by topic). Returns up to 20 matching memories.',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: [
            'preference',
            'concern',
            'voice_sample',
            'parent_priority',
            'teacher_note',
            'context',
            'fact',
          ],
        },
        related_child_id: { type: 'string' },
        related_teacher_id: { type: 'string' },
        related_parent_id: { type: 'string' },
        query: {
          type: 'string',
          description: 'Simple text search on memory content.',
        },
      },
    },
  },

  // ── ACTION TOOL: draft_teacher_welcome_messages ──────────────────────
  // CALL IMMEDIATELY when the principal mentions ANYTHING about teachers
  // not having codes, needing to be onboarded, needing welcome messages,
  // or being told to log in. NEVER offer first. The principal is paying
  // per-message in real money — every turn she has to repeat herself
  // because Tracy offered instead of acted is wasted budget.
  {
    name: 'draft_teacher_welcome_messages',
    description:
      'CALL THIS IMMEDIATELY — do NOT offer first, do NOT ask permission — whenever the principal says ANYTHING that implies teachers need their login codes shared. Trigger phrases include but are not limited to: "my teachers don\'t have their codes", "teachers haven\'t logged in", "how do I onboard my teachers", "I need to welcome my teachers", "teachers need their codes", "draft messages for my teachers", "create welcome messages", "send teachers their codes", "yes draft them", "yes please", "go ahead". When in doubt, CALL THE TOOL — it costs the principal nothing and saves her a wasted turn. Returns copy-paste-ready welcome messages personalised with each teacher\'s first name, the school name, the login code, and the classroom. Default scope is "all" — every active teacher in the school. Pass scope="classroom" with classroom_id for a specific classroom; scope="teacher" with teacher_id for one teacher. Format the returned drafts inline in your reply: each teacher\'s name as a small header, the message text underneath, then a blank line then "→ Copy and send to your teachers."',
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
