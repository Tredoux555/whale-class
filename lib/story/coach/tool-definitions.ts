// lib/story/coach/tool-definitions.ts
//
// The Coach's tool surface (read + a few writes). Kept deliberately small and
// non-overlapping so Sonnet picks the right tool reliably. set_priority and
// archive_project are folded into update_project (documented in its schema).

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { WISDOM_TOPICS } from './knowledge-loader';

export const COACH_TOOLS: Tool[] = [
  {
    name: 'read_diary',
    description:
      "Read Tredoux's recent diary entries (decrypted). Use when reflecting on his week, mood, " +
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
      'Save a durable, SEMANTIC fact about Tredoux (a value, ambition, health goal, something he said ' +
      "he'd drop, a recurring pattern, a preference). Do NOT save one-off conversation details. To " +
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
];
