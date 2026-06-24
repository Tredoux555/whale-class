// lib/story/coach/tool-definitions.ts
//
// The Coach's tool surface (read + a few writes). Kept deliberately small and
// non-overlapping so Sonnet picks the right tool reliably. set_priority and
// archive_project are folded into update_project (documented in its schema).

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { WISDOM_TOPICS } from './knowledge-loader';
import { SIGNAL_TYPES, SIGNAL_DOMAINS } from './family-brain';

export const COACH_TOOLS: Tool[] = [
  {
    name: 'read_diary',
    description:
      "Read this person's recent diary entries (decrypted). Use when reflecting on their week, mood, " +
      'or anything emotional/personal. Returns date, mood, title, and body. Optionally filter by ' +
      'date window or a free-text query to find entries on a theme.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD (optional).' },
        to: { type: 'string', description: 'End date YYYY-MM-DD (optional).' },
        limit: { type: 'number', description: 'Max entries (default 14, max 60).' },
        query: { type: 'string', description: 'Free-text theme to search for (optional).' },
      },
    },
  },
  {
    name: 'read_projects',
    description:
      'Read all of his projects & ambitions (decrypted) — title, why, next action, status, priority. ' +
      'Use for anything about what he is working on or should focus on.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'check_load',
    description:
      'Compute his current work-in-progress load vs a sane WIP ceiling. Call this BEFORE he takes on ' +
      'anything new, and whenever priorities come up. Returns active/paused counts, whether he is over ' +
      'the limit, and the active list with priorities.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'plan_day',
    description:
      "Gather everything needed to plan TODAY: active projects by priority, his recent wellbeing/mood " +
      'signal, and relevant memories. After calling this, compose the plan yourself — THE one thing ' +
      '(with the why), a short list, and built-in rest.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'plan_week',
    description:
      'Gather everything needed to plan the WEEK: active projects by priority, this week’s diary ' +
      'themes/moods, and relevant memories. Then compose a focused week — the few things that matter, ' +
      'with reasons, and rest protected.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'wellbeing_check',
    description:
      'Pull his recent mood signal from the diary (last N days) so you can ask grounded questions about ' +
      'sleep, rest, and exercise. Returns recent moods, days since his last entry, and entry count.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Lookback window in days (default 14, max 90).' } },
    },
  },
  {
    name: 'consult_wisdom',
    description:
      'Pull the FULL text of one framework from your knowledge base so you can quote it accurately ' +
      "instead of improvising self-help. Use when you're grounding advice in a specific framework.",
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: WISDOM_TOPICS,
          description: 'Which framework to load in full.',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'recall',
    description:
      'Search his persistent memory beyond what is already in your context — by type and/or free-text query.',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: ['value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact'],
        },
        query: { type: 'string', description: 'Free-text to match in memory content.' },
      },
    },
  },
  {
    name: 'remember',
    description:
      'Save a durable, SEMANTIC fact about this person (a value, ambition, health goal, something they ' +
      "said they'd drop, a recurring pattern, a preference). Do NOT save one-off conversation details. To " +
      'update/correct an existing memory, pass supersedes_id = the old memory id.',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: ['value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact'],
        },
        content: { type: 'string', description: 'The memory, one or two sentences.' },
        supersedes_id: { type: 'string', description: 'UUID of a memory this replaces (optional).' },
      },
      required: ['memory_type', 'content'],
    },
  },
  {
    name: 'add_event',
    description:
      "Put something on this person's planner — a meeting, appointment, call, deadline. Use this " +
      'whenever they mention a thing happening at a time. Date is required; include a time when ' +
      'they give one.',
    input_schema: {
      type: 'object',
      properties: {
        event_date: { type: 'string', description: 'Date YYYY-MM-DD.' },
        start_time: { type: 'string', description: 'Time HH:MM (24h), optional.' },
        title: { type: 'string', description: 'Short title, e.g. "Meeting with the principal".' },
        notes: { type: 'string', description: 'Any detail/context, optional.' },
      },
      required: ['event_date', 'title'],
    },
  },
  {
    name: 'add_diary_entry',
    description:
      "Log something to this person's private diary (their psychological record) — a worry, a win, a " +
      'reflection, how a day went. Write it in their voice. Use this whenever they share something ' +
      'worth keeping or processing, so it lives in their journal.',
    input_schema: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'The entry text (markdown ok).' },
        mood: { type: 'string', description: "Short mood tag, e.g. 'nervous', 'good', 'tired' (optional)." },
        title: { type: 'string', description: 'Optional short title.' },
        entry_date: { type: 'string', description: 'Date YYYY-MM-DD (optional; defaults today).' },
      },
      required: ['body'],
    },
  },
  {
    name: 'update_project',
    description:
      'Create or modify a project. To change priority, pause, mark done, or drop a project, use this with ' +
      "status ('active'|'paused'|'done'|'dropped') and/or priority. Marking done/dropped archives it.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project UUID to update (omit to CREATE a new project).' },
        title: { type: 'string' },
        why: { type: 'string' },
        next_action: { type: 'string' },
        status: { type: 'string', enum: ['active', 'paused', 'done', 'dropped'] },
        priority: { type: 'number', description: '1 = highest, up to 9. null to clear.' },
      },
    },
  },
  {
    name: 'save_build_state',
    description:
      'Save a recoverable BUILD/SESSION HANDOFF so the NEXT session resumes without re-explaining context. ' +
      'Call this whenever they signal the end of a build/work session or ask to save where things are — e.g. ' +
      '"save our build state", "save the session", "remember where we are/left off", "pick this up tomorrow", ' +
      '"I\'m done for today", "wrap up", "end session". Offer it proactively when a build session is clearly ' +
      'winding down. Capture the FULL ordered build list with a status per item, exactly where we stopped, what ' +
      'is confirmed working, the single exact next action, and any blockers. Saving again for the same project ' +
      'REPLACES its previous state. After it saves, read the captured handoff back and ask them to confirm.',
    input_schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'The feature/project name this build belongs to.' },
        build_list: {
          type: 'array',
          description: 'The ordered build list — every item, in order.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The build item.' },
              status: { type: 'string', enum: ['done', 'in_progress', 'not_started'] },
            },
            required: ['text', 'status'],
          },
        },
        current_step: { type: 'string', description: 'Exactly where we stopped, e.g. "Step 3: wiring the route — in progress".' },
        confirmed: { type: 'array', items: { type: 'string' }, description: 'What was tested and passed (optional).' },
        next_action: { type: 'string', description: 'The single exact next action to take.' },
        blockers: { type: 'array', items: { type: 'string' }, description: 'Blockers, open questions, pending decisions (optional).' },
      },
      required: ['project', 'build_list', 'current_step', 'next_action'],
    },
  },
  {
    name: 'read_build_state',
    description:
      'Read back the saved build/session handoff (the recoverable state from last time). Use when they ask ' +
      '"where were we?", "what\'s next?", or want to resume a build. Optionally pass a project name to pick a ' +
      'specific one; otherwise returns the most recently saved state.',
    input_schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Which build to read (optional; defaults to the most recent).' },
      },
    },
  },
  {
    name: 'save_document',
    description:
      'Save a DOCUMENT to durable storage so it persists and can be read back in future sessions — a design ' +
      'doc, brief, spec, or export (e.g. brand tokens, a UI spec, a finished plan). Use when they ask to ' +
      '"save this as a document / save this doc / keep this", or when you produce a substantial artifact worth ' +
      'keeping. Documents accumulate (a new save does NOT overwrite earlier ones) — title them clearly and tag ' +
      'them so they\'re findable later. This is for artifacts, not fleeting facts (use remember for those) or ' +
      'session handoffs (use save_build_state for those).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A clear, specific title.' },
        content: { type: 'string', description: 'The full document text or HTML.' },
        doc_type: { type: 'string', description: "Kind of document, e.g. 'design', 'brief', 'spec', 'export'." },
        tags: { type: 'array', items: { type: 'string' }, description: "Lowercase tags for retrieval, e.g. ['lyfcoach','brand','tokens']." },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'read_document',
    description:
      'Find and read back saved documents. Use when they reference an earlier doc ("the brand tokens", "that ' +
      'spec we saved") or you need the content of something stored before. Search by a title query and/or by ' +
      'tags (a document matches if it carries ANY of the given tags). Returns the most recent matches, newest ' +
      'first, with their full content.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text matched against the title (optional).' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Match documents carrying ANY of these tags (optional).' },
        limit: { type: 'number', description: 'Max documents to return (default 10, max 25).' },
      },
    },
  },
  {
    name: 'emit_family_signal',
    description:
      'Send ONE abstracted, WORDLESS flag to the family helper (the Family Brain) — a feeling-type only, ' +
      'NEVER any words or detail of what was said. Use ONLY with the person’s clear consent (for a child, ' +
      'only after they have explicitly agreed). NEVER use this for a safeguarding moment (self-harm, abuse, ' +
      'someone hurting them) — that stays sealed in the room. Default to NOT sending; this is rare. The flag ' +
      'helps the family gently notice converging stress; it never reveals anyone.',
    input_schema: {
      type: 'object',
      properties: {
        signal_type: { type: 'string', enum: SIGNAL_TYPES as unknown as string[], description: 'The feeling/state flag.' },
        intensity: { type: 'number', description: '1 (mild) to 3 (strong). Default 1.' },
        domain: { type: 'string', enum: SIGNAL_DOMAINS as unknown as string[], description: 'Optional area this is about.' },
        consented: { type: 'boolean', description: 'MUST be true — the person agreed to send this wordless flag.' },
      },
      required: ['signal_type', 'consented'],
    },
  },
];

// The CHILD coach gets a trimmed toolset — none of the adult productivity tools
// (projects / load / planning). Their coach keeps a journal, remembers, can
// consult the safeguarding playbook, put something on their planner, and (only
// with the child's consent) send a wordless family flag.
const CHILD_TOOL_NAMES = new Set([
  'read_diary', 'add_diary_entry', 'add_event', 'consult_wisdom', 'recall', 'remember', 'emit_family_signal',
]);
export const CHILD_COACH_TOOLS: Tool[] = COACH_TOOLS.filter((t) => CHILD_TOOL_NAMES.has(t.name));
