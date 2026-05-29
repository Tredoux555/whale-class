// lib/montree/tracy/tool-definitions.ts
//
// Astra's tool surface. Read-only by design (v1).
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
// Astra's PRIMARY path for any question naming a specific child is
// child_focus — single tool, single failure surface, end-to-end answer
// (Haiku parses the question, direct DB resolves the child + fetches context,
// Sonnet composes a grounded answer). The chained-tool path
// (find_children_by_name → answer_about_child) was deprecated as the primary
// flow because it had multiple HTTP hops, multiple auth re-verifications, and
// chained Sonnet rounds — too fragile for the canonical use case.
//
// Future: synthesize_parent_answer (parent-conversation framing layer over
// child_focus), family_context, school_pulse, recent_conversations,
// consult_guru (Astra → Guru bridge). Build them as Astra proves out — only
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
  // Session 97 — Astra scans parent threads and drafts principal replies.
  // The principal always pulls the trigger; these tools READ + DRAFT only.
  // Sending a drafted reply is done by the principal in the thread UI
  // (with the ai_drafted indicator). Astra never sends autonomously.
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

  // ── DOSSIER PREP TOOLS (Session 133 — Yo-yo workflow native) ─────────
  // These three tools are the building blocks of the parent-meeting dossier
  // workflow. They can be called in chat directly when the principal asks a
  // specific question that maps to one of them — but their primary use is
  // as sub-calls inside `prepare_parent_meeting`.
  {
    name: 'consult_guru',
    description:
      "Retrieve pedagogical and developmental analyses Guru has already produced for a specific child. Call this whenever the principal is preparing for a difficult parent conversation, when she asks 'what has Guru said about X?', 'what's the developmental read on Y?', or when you need the substantive pedagogical reasoning behind a recommendation. Each analysis returned includes Guru's insight, root cause, action plan, parent talking point, and outcome tracking. Filters out per-photo identification queries. Pass `topic_keywords` to narrow to relevant chats (e.g. ['sleep', 'rest', 'regulation']). Requires child_id — call child_focus or find_children_by_name first if you only have a name.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
        topic_keywords: {
          type: 'array',
          items: { type: 'string' },
          description:
            "Optional keywords to narrow recall. Each entry is matched as a case-insensitive substring against the question + insight + root cause + parent talking point. E.g. ['sleep','rest','regulation']. If omitted, returns the most recent analyses.",
        },
        limit: {
          type: 'number',
          description: 'Max analyses to return. Default 8, cap 30.',
        },
      },
      required: ['child_id'],
    },
  },
  {
    name: 'detect_pattern',
    description:
      "Scan a child's recent observations (photos + behavioural observations + teacher notes + work-session notes) for thematic patterns. Use when the principal asks 'is this happening often?', 'is there a pattern?', 'how often does X happen?', or before a parent meeting to identify the strongest signal in the record. STRICT-PHRASE MATCHING — pass multi-word phrases that must appear verbatim (e.g. ['lying down', 'lay down', 'asleep']) rather than single keywords ('sleep'). Pass `negative_phrases` to disqualify obvious false positives (e.g. ['resting hands','resting place']). Returns: event count, weekday distribution, hour distribution, cluster days (days with >1 event), and up to 8 representative quotes with dates.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
        theme_phrases: {
          type: 'array',
          items: { type: 'string' },
          description:
            "Strict positive phrases. Each entry is a case-insensitive substring that signals the pattern you're looking for. Prefer multi-word phrases over single keywords to avoid false positives. Examples: ['lying down','lay down','went still','head on the mat'].",
        },
        match: {
          type: 'string',
          enum: ['any', 'all'],
          description:
            "How the positive phrases combine. 'any' (default) = a single match is enough. 'all' = every phrase must appear in the record.",
        },
        negative_phrases: {
          type: 'array',
          items: { type: 'string' },
          description:
            "Optional disqualifiers. Records containing any of these are dropped EVEN IF a positive phrase fires. The Yo-yo lesson: 'resting hands' is not a rest event, so include 'resting hands' here.",
        },
        days_back: {
          type: 'number',
          description: 'How many days back to scan. Default 90, cap 365.',
        },
        max_quotes: {
          type: 'number',
          description: 'Cap on representative quotes returned. Default 8, cap 40.',
        },
      },
      required: ['child_id', 'theme_phrases'],
    },
  },
  {
    name: 'prepare_parent_meeting',
    description:
      "Produce a complete pre-meeting dossier for a parent conversation. CALL ONLY when the principal has explicitly asked for help preparing for a SPECIFIC parent meeting — phrases like 'help me prepare for Yo-yo's mum tomorrow', 'pull together a dossier on X', 'I'm meeting [parent] about [child]'. Calls child_focus + consult_guru + detect_pattern internally — DO NOT call those separately first; this tool orchestrates them. Output is a structured Markdown dossier the principal reads once the night before and walks into the meeting prepared (Astra's note, child profile, what we're observing, working interpretation, parent context, conversation script, what NOT to say, pushback handlers, follow-up plan, sources). Result is cached for 24h so the principal can re-open without re-spending Sonnet tokens. Cost ~$0.05 per dossier — high-stakes deliberate call, never Haiku.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: { type: 'string' },
        meeting_purpose: {
          type: 'string',
          description:
            "Short free-text describing what the meeting is about, in the principal's words. E.g. 'concerns about sleeping pattern', 'mother is unhappy about reading progress', 'introducing the developmental observation we've made'.",
        },
        parent_context: {
          type: 'string',
          description:
            "Optional free-text override / nuance about the parent. Anything the principal knows that should inform tone — e.g. 'very expectation-driven, will fight any deficit framing', 'first-time parent, anxious', 'fluent in English but prefers Mandarin for emotional conversations'. The tool will ALSO auto-read `guru_parent_states` from the child's settings JSONB for inferred state; parent_context (when provided) wins on tone calibration.",
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'html', 'json'],
          description:
            "Output container. Default 'markdown' (renders as a copy-card on the principal's screen). 'html' for direct PDF rendering. 'json' for structured display in custom UI.",
        },
      },
      required: ['child_id', 'meeting_purpose'],
    },
  },

  // ── MEMORY TOOLS (Session 99 — migration 195) ────────────────────────
  // Astra's persistent relational memory. The active set (top-30 most recent)
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

  // ── KNOWLEDGE TOOL: consult_tracy_knowledge ──────────────────────────
  // Session 136 — Astra's psychological knowledge base, loaded from disk
  // (lib/montree/tracy/knowledge/*.md). The compact summary is in the
  // system prompt every turn; this tool pulls the FULL content of one
  // specific topic when chat needs depth. Read-only. No school-scoping
  // needed — knowledge is universal.
  {
    name: 'consult_tracy_knowledge',
    description:
      'Pull the FULL content of one psychological knowledge file when chat needs depth beyond the system-prompt summary. CALL THIS when the principal asks a chat question that benefits from theoretical grounding ("how do I handle a defended parent?", "what does Erin Meyer say about Chinese parents?", "talk me through the three-layer model on this thread"). Choose the topic by intent: foundation = Montessori developmental frame; frameworks = Stone/Patton/Heen + Crucial Conversations (the three-layer model, intent vs impact, AND-stance, safety); nvc = Marshall Rosenberg OFNR + four ways to receive criticism + validation-before-reframing; patterns = the five parent archetypes (expectation-driven, anxiety-projecting, hands-off, comparison-trapped, defended); cultural = Erin Meyer\'s Culture Map applied to international Montessori populations; montessori_anxieties = the recurring "is this rigorous enough?", "K-readiness", "play vs work" questions; de_escalation = Motivational Interviewing OARS + validation loops + the three-second pause + reset moves; index = the map of all topics. After fetching, synthesize a chat reply IN TRACY\'S VOICE that applies the framework to the principal\'s specific question — never dump the file content back at her.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: [
            'index',
            'foundation',
            'frameworks',
            'nvc',
            'patterns',
            'cultural',
            'montessori_anxieties',
            'de_escalation',
          ],
          description: 'Which knowledge file to fetch in full.',
        },
      },
      required: ['topic'],
    },
  },

  // ── PARENT TOOLS (Ultimate Astra Phase A — migration 238) ────────────
  // Parents become first-class entities with structured psychological
  // profiles. Astra can answer "tell me about Mrs Chen" with substance
  // — archetypes, cultural register, triggers to avoid, moves that land.
  {
    name: 'get_parent_profile',
    description:
      "Retrieve the structured profile for a specific parent. Use whenever the principal asks about a parent by name or mentions an upcoming meeting/conversation with a parent. Returns: archetypes (expectation_driven, anxiety_projecting, hands_off, comparison_trapped, defended), cultural_register (8 dimensions from Erin Meyer's Culture Map), preferred_language, known_triggers (things to AVOID), effective_moves (things that work), relationship_temperature, family_context, priorities_for_child, history_notes, meeting_count, last_meeting_date. Requires parent_id — if you have a name only, call list_parents_for_school first.",
    input_schema: {
      type: 'object',
      properties: {
        parent_id: {
          type: 'string',
          description: 'The exact parent id (UUID).',
        },
      },
      required: ['parent_id'],
    },
  },
  {
    name: 'list_parents_for_school',
    description:
      "List parents in the principal's school with name + linked child names + archetype tags + relationship temperature + last meeting date. Use when you need to resolve a parent name to an id, or when the principal asks 'who are my parents?', 'which parents haven't I met recently?', 'which parents do I know nothing about yet?'. Optional classroom_id narrows to one classroom.",
    input_schema: {
      type: 'object',
      properties: {
        classroom_id: {
          type: 'string',
          description: 'Optional — narrow to parents with children in one classroom.',
        },
      },
    },
  },

  // ── CORPUS TOOL (Ultimate Astra Phase C — migration 242) ─────────────
  // Astra's self-improving brain. Every analysed meeting feeds school-
  // specific insights into the corpus; semantic retrieval surfaces them
  // when relevant.
  {
    name: 'search_corpus',
    description:
      "Retrieve school-specific insights Astra has learned over time from analysed parent meetings. Use BEFORE drafting any parent response, preparing for a meeting, or answering 'what's worked with [parent] before?' / 'what should I avoid with [archetype] parents at our school?' / 'have we had this kind of meeting before?'. Returns up to 8 entries above similarity threshold, each with insight_text + insight_type + source_meeting_id + confidence + similarity. Optional archetype filter narrows to one archetype.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Plain-English query — what you want to learn from past meetings.',
        },
        archetype: {
          type: 'string',
          enum: [
            'expectation_driven',
            'anxiety_projecting',
            'hands_off',
            'comparison_trapped',
            'defended',
          ],
          description: 'Optional — narrow to insights tagged with one archetype.',
        },
      },
      required: ['query'],
    },
  },

  // ── ACTION TOOLS: principal's agent (Ultimate Astra v2) ──────────────
  // The principal's VOICE COMMAND is the trigger pull. When she explicitly
  // asks Astra to send / schedule / update something, Astra acts. Each tool
  // is school-scoped + principal-only and goes through the inner endpoint's
  // own auth + validation (defense in depth). Locale flows through so
  // messages land in the right language.
  {
    name: 'send_parent_message',
    description:
      "Send a message to a parent on the principal's behalf. CALL when she says ANYTHING like 'send Mrs Chen a message saying...', 'tell [parent] that...', 'message [parent] about [topic]', 'let [parent] know...'. The message is sent AS the principal with 'Astra drafted' indicator. Auto-creates a parent_teacher thread (with the child's lead teacher) if none exists, otherwise replies in the most recent thread. Voice + locale matched: if the principal speaks in Mandarin, the body lands in Mandarin. Requires parent_id (call list_parents_for_school first if you only have a name) and body. Optional child_id narrows the thread; otherwise picks the parent's first linked child.",
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string', description: 'Parent UUID.' },
        child_id: { type: 'string', description: 'Optional child UUID — narrows thread context.' },
        body: { type: 'string', description: 'The message content, ≤2000 chars, in the principal\'s UI locale.' },
        subject: { type: 'string', description: 'Optional subject line for new threads. Ignored for replies.' },
      },
      required: ['parent_id', 'body'],
    },
  },
  {
    name: 'send_teacher_message',
    description:
      "Send a message to a teacher on the principal's behalf. CALL when she says 'message [teacher]', 'tell [teacher] that...', 'check in with [teacher]', 'thank [teacher] for...'. Uses internal thread_type. Requires teacher_id (call list_teachers_with_summary first if you only have a name) and body.",
    input_schema: {
      type: 'object',
      properties: {
        teacher_id: { type: 'string', description: 'Teacher UUID.' },
        body: { type: 'string', description: 'The message content, ≤2000 chars.' },
        subject: { type: 'string', description: 'Optional subject for new threads.' },
      },
      required: ['teacher_id', 'body'],
    },
  },
  {
    name: 'schedule_appointment',
    description:
      "Schedule a parent appointment on the principal's calendar. CALL when she says 'set up a meeting with [parent]', 'book [parent] for [date/time]', 'schedule a call with [parent]'. Requires parent_id, child_id, scheduled_start (ISO 8601). Optional: kind (parent_meeting|video_call, default parent_meeting), duration_minutes (5-240, default 30), subject, note. Auto-attaches the principal as primary host and auto-posts the invite card into the parent's thread.",
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string' },
        child_id: { type: 'string' },
        scheduled_start: { type: 'string', description: 'ISO 8601 UTC, MUST be in the future. E.g. 2026-06-15T14:00:00Z.' },
        kind: { type: 'string', enum: ['parent_meeting', 'video_call'] },
        duration_minutes: { type: 'number', description: '5-240. Default 30.' },
        subject: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['parent_id', 'child_id', 'scheduled_start'],
    },
  },
  {
    name: 'create_parent_meeting_record',
    description:
      "Create a parent_meeting row (the Phase B meeting entity, distinct from the calendar appointment). CALL when the principal says 'log the meeting I just had with [parent]', 'mark the meeting with [parent] as held', 'I just finished with [parent]'. Use this when the meeting already happened and she wants to capture it. For SCHEDULING a future meeting, use schedule_appointment instead. Optional fields default sensibly (status='held' when held_at provided, otherwise 'planned'; meeting_type='parent_teacher_conference').",
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string' },
        child_id: { type: 'string' },
        meeting_type: { type: 'string', enum: ['parent_teacher_conference','intro','escalation','exit','behavioural','progress','other'] },
        status: { type: 'string', enum: ['planned','held','cancelled','needs_follow_up','closed'] },
        held_at: { type: 'string', description: 'ISO 8601 when it actually happened.' },
        scheduled_at: { type: 'string', description: 'ISO 8601 when it is scheduled.' },
        duration_minutes: { type: 'number' },
      },
      required: ['parent_id'],
    },
  },
  {
    name: 'update_parent_meeting',
    description:
      "Update an existing parent_meeting row — mark it held / closed / add outcome notes. CALL when she says 'add my note to the meeting with [parent]: ...', 'close the meeting with [parent]', 'mark [parent]'s meeting as needing follow-up'. Requires meeting_id (call list_parent_meetings first if you don't have it).",
    input_schema: {
      type: 'object',
      properties: {
        meeting_id: { type: 'string' },
        status: { type: 'string', enum: ['planned','held','cancelled','needs_follow_up','closed'] },
        outcome_notes: { type: 'string', description: 'One-line "how did it land" outcome.' },
        held_at: { type: 'string', description: 'ISO 8601.' },
        duration_minutes: { type: 'number' },
      },
      required: ['meeting_id'],
    },
  },
  {
    name: 'set_parent_recording_consent',
    description:
      "Toggle a parent's durable on-file recording consent. CALL when the principal says '[parent] said it's okay to record', 'mark [parent]'s consent on file', 'I have consent from [parent]' OR the inverse ('[parent] doesn't want to be recorded', 'revoke recording consent for [parent]'). Persistent flag — affects all FUTURE meetings with that parent. The per-meeting consent gate (Phase B) still fires for every recording — this just removes the need to acknowledge per meeting.",
    input_schema: {
      type: 'object',
      properties: {
        parent_id: { type: 'string' },
        recording_consent_on_file: { type: 'boolean' },
      },
      required: ['parent_id', 'recording_consent_on_file'],
    },
  },

  // ── ACTION TOOL: draft_teacher_welcome_messages ──────────────────────
  // CALL IMMEDIATELY when the principal mentions ANYTHING about teachers
  // not having codes, needing to be onboarded, needing welcome messages,
  // or being told to log in. NEVER offer first. The principal is paying
  // per-message in real money — every turn she has to repeat herself
  // because Astra offered instead of acted is wasted budget.
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
  // ── PHOTO TOOL: get_child_photos ─────────────────────────────────────
  // Pulls a child's confirmed observation photos straight from the DB so
  // the principal can show them in a meeting. School-scoped via
  // verifyChildBelongsToSchool. Returns proxied (safe) image URLs + caption
  // + date + work label. Astra presents them as markdown images so they
  // render inline in chat.
  {
    name: 'get_child_photos',
    description:
      "Pull a child's actual observation photos from the database — use this when the principal asks to SEE or SHOW photos, or wants images to bring into a parent meeting (\"give me the photos\", \"show me Yo-yo's photos\", \"the rest-event pictures from May 25\", \"photos to show his mother\"). Returns the real images (proxied URLs) with caption, date, and the work each shows. After calling, present them inline as markdown images — `![caption — date](url)` — one per line, newest first, so they render in the chat. If the principal named specific dates (e.g. cluster days from a dossier), pass date_from/date_to to filter to those. Only returns teacher-confirmed photos that belong to this school's child.",
    input_schema: {
      type: 'object',
      properties: {
        child_id: {
          type: 'string',
          description: "The child's id (from find_children_by_name / child_focus / a dossier). Required.",
        },
        limit: {
          type: 'number',
          description: 'Max photos to return (default 12, capped at 30). Newest first.',
        },
        date_from: {
          type: 'string',
          description: 'Optional ISO date (YYYY-MM-DD). Only photos captured on/after this date.',
        },
        date_to: {
          type: 'string',
          description: 'Optional ISO date (YYYY-MM-DD). Only photos captured on/before this date.',
        },
      },
      required: ['child_id'],
    },
  },
];
