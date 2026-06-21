// lib/story/coach/tool-executor.ts
//
// Dispatch for the Coach's tools. Single user (Story admin) — no scoping.
// Reads decrypt at rest; writes encrypt at rest.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { encryptDiaryField, encryptDiaryFieldOrNull } from '@/lib/story/diary-crypto';
import {
  readDiaryForCoach,
  readProjectsForCoach,
  computeLoad,
  wellbeingSignal,
} from './personal-data';
import { getWisdom, type WisdomTopic, WISDOM_TOPICS } from './knowledge-loader';
import {
  recallCoachMemories,
  writeCoachMemory,
  type CoachMemoryType,
} from './memory';
import { emitFamilySignal, SIGNAL_TYPES, SIGNAL_DOMAINS, type SignalType, type SignalDomain } from './family-brain';

export interface CoachToolDeps {
  supabase: SupabaseClient;
  /** The caller's sanctuary space — every read/write is scoped to it. */
  space: string;
  /** The caller's family role (drives the family-signal source_role). */
  role?: 'adult' | 'parent' | 'child';
  /** The caller's IANA timezone, so "today" matches their local day. */
  tz?: string;
}

export interface CoachToolResult {
  success: boolean;
  result_summary: string;
  data?: unknown;
  error?: string;
}

const STATUSES = new Set(['active', 'paused', 'done', 'dropped']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEMORY_TYPES = new Set<CoachMemoryType>([
  'value', 'ambition', 'health_goal', 'dropped', 'pattern', 'preference', 'fact',
]);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
/** "Today" in the caller's IANA timezone (YYYY-MM-DD). Falls back to UTC. */
function todayInTz(tz?: string): string {
  if (!tz) return todayISO();
  try {
    // en-CA renders as YYYY-MM-DD; timeZone gives the caller's local calendar day.
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return todayISO();
  }
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export async function executeCoachTool(
  name: string,
  input: Record<string, unknown>,
  deps: CoachToolDeps,
): Promise<CoachToolResult> {
  const { supabase, space, role, tz } = deps;
  try {
    switch (name) {
      case 'read_diary': {
        const entries = await readDiaryForCoach(supabase, space, {
          from: str(input.from),
          to: str(input.to),
          limit: num(input.limit),
          query: str(input.query),
        });
        return { success: true, result_summary: `${entries.length} diary entr${entries.length === 1 ? 'y' : 'ies'}`, data: { entries } };
      }

      case 'read_projects': {
        const projects = await readProjectsForCoach(supabase, space);
        return { success: true, result_summary: `${projects.length} projects`, data: { projects } };
      }

      case 'check_load': {
        const load = await computeLoad(supabase, space);
        return {
          success: true,
          result_summary: `active ${load.active_count}/${load.wip_limit}${load.over_limit ? ' (over limit)' : ''}`,
          data: load,
        };
      }

      case 'plan_day': {
        const [load, recent, well] = await Promise.all([
          computeLoad(supabase, space),
          readDiaryForCoach(supabase, space, { limit: 4 }),
          wellbeingSignal(supabase, space, 10),
        ]);
        const memories = await recallCoachMemories(supabase, space, {}, 50);
        return {
          success: true,
          result_summary: 'gathered day-plan context',
          data: {
            today: todayInTz(tz),
            load,
            recent_diary: recent,
            wellbeing: well,
            health_goals: memories.filter((m) => m.memory_type === 'health_goal').map((m) => m.content),
            dropped: memories.filter((m) => m.memory_type === 'dropped').map((m) => m.content),
          },
        };
      }

      case 'plan_week': {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const [load, week, well] = await Promise.all([
          computeLoad(supabase, space),
          readDiaryForCoach(supabase, space, { from: since.toISOString().slice(0, 10), limit: 20 }),
          wellbeingSignal(supabase, space, 14),
        ]);
        const memories = await recallCoachMemories(supabase, space, {}, 50);
        return {
          success: true,
          result_summary: 'gathered week-plan context',
          data: {
            today: todayInTz(tz),
            load,
            week_diary: week,
            wellbeing: well,
            ambitions: memories.filter((m) => m.memory_type === 'ambition').map((m) => m.content),
            health_goals: memories.filter((m) => m.memory_type === 'health_goal').map((m) => m.content),
          },
        };
      }

      case 'wellbeing_check': {
        const well = await wellbeingSignal(supabase, space, num(input.days) ?? 14);
        const memories = await recallCoachMemories(supabase, space, { memory_type: 'health_goal' }, 20);
        return {
          success: true,
          result_summary: `${well.entries_in_window} entries in window`,
          data: { ...well, health_goals: memories.map((m) => m.content) },
        };
      }

      case 'consult_wisdom': {
        const topic = str(input.topic) as WisdomTopic | undefined;
        if (!topic || !WISDOM_TOPICS.includes(topic)) {
          return { success: false, result_summary: 'unknown topic', error: `topic must be one of: ${WISDOM_TOPICS.join(', ')}` };
        }
        const text = await getWisdom(topic);
        return { success: true, result_summary: `loaded ${topic}`, data: { topic, text } };
      }

      case 'recall': {
        const memType = str(input.memory_type) as CoachMemoryType | undefined;
        const memories = await recallCoachMemories(
          supabase,
          space,
          { memory_type: memType && MEMORY_TYPES.has(memType) ? memType : undefined, query: str(input.query) },
          25,
        );
        return { success: true, result_summary: `${memories.length} memories`, data: { memories } };
      }

      case 'remember': {
        const memType = str(input.memory_type) as CoachMemoryType | undefined;
        const content = str(input.content) || '';
        if (!memType || !MEMORY_TYPES.has(memType)) {
          return { success: false, result_summary: 'bad memory_type', error: 'memory_type invalid' };
        }
        const res = await writeCoachMemory(supabase, space, {
          memory_type: memType,
          content,
          supersedes_id: str(input.supersedes_id) || null,
        });
        if (!res.ok) return { success: false, result_summary: 'save failed', error: res.error };
        return { success: true, result_summary: 'saved', data: { id: res.id } };
      }

      case 'update_project': {
        const id = str(input.id);
        // CREATE path
        if (!id) {
          const title = (str(input.title) || '').trim();
          if (!title) return { success: false, result_summary: 'title required', error: 'title required to create a project' };
          const { data, error } = await supabase
            .from('story_projects')
            .insert({
              space,
              title_enc: encryptDiaryField(title),
              why_enc: encryptDiaryFieldOrNull(str(input.why) ?? null),
              next_action_enc: encryptDiaryFieldOrNull(str(input.next_action) ?? null),
              status: 'active',
              priority: clampPriority(input.priority),
              is_active: true,
              cipher_version: 1,
            })
            .select('id')
            .single();
          if (error || !data) return { success: false, result_summary: 'create failed', error: error?.message };
          return { success: true, result_summary: 'project created', data: { id: data.id } };
        }
        // UPDATE path
        if (!UUID_RE.test(id)) return { success: false, result_summary: 'bad id', error: 'id must be a UUID' };
        const patch: Record<string, unknown> = {};
        if (str(input.title) !== undefined) {
          const t = (str(input.title) || '').trim();
          if (!t) return { success: false, result_summary: 'empty title', error: 'title cannot be empty' };
          patch.title_enc = encryptDiaryField(t);
          patch.cipher_version = 1;
        }
        if ('why' in input) { patch.why_enc = encryptDiaryFieldOrNull(str(input.why) ?? null); patch.cipher_version = 1; }
        if ('next_action' in input) { patch.next_action_enc = encryptDiaryFieldOrNull(str(input.next_action) ?? null); patch.cipher_version = 1; }
        const status = str(input.status);
        if (status && STATUSES.has(status)) {
          patch.status = status;
          patch.is_active = status === 'active' || status === 'paused';
        }
        if ('priority' in input) patch.priority = clampPriority(input.priority);
        if (Object.keys(patch).length === 0) {
          return { success: false, result_summary: 'nothing to update', error: 'no fields provided' };
        }
        const { data, error } = await supabase
          .from('story_projects')
          .update(patch)
          .eq('id', id)
          .eq('space', space)
          .select('id, status')
          .maybeSingle();
        if (error) return { success: false, result_summary: 'update failed', error: error.message };
        if (!data) return { success: false, result_summary: 'not found', error: 'project not found' };
        return { success: true, result_summary: 'project updated', data: { id: data.id, status: data.status } };
      }

      case 'add_event': {
        const date = str(input.event_date);
        const title = (str(input.title) || '').trim();
        if (!date || !DATE_RE.test(date)) return { success: false, result_summary: 'bad date', error: 'event_date must be YYYY-MM-DD' };
        if (!title) return { success: false, result_summary: 'title required', error: 'title required' };
        const rawTime = str(input.start_time);
        const startTime = rawTime && TIME_RE.test(rawTime) ? rawTime : null;
        const { data, error } = await supabase
          .from('story_plan_events')
          .insert({
            space,
            event_date: date,
            start_time: startTime,
            title_enc: encryptDiaryField(title.slice(0, 300)),
            notes_enc: encryptDiaryFieldOrNull((str(input.notes) ?? '').slice(0, 2000) || null),
            cipher_version: 1,
          })
          .select('id')
          .single();
        if (error || !data) return { success: false, result_summary: 'create failed', error: error?.message };
        return {
          success: true,
          result_summary: `event added ${date}${startTime ? ' ' + startTime : ''}`,
          data: { id: data.id, event_date: date, start_time: startTime, title },
        };
      }

      case 'add_diary_entry': {
        const body = (str(input.body) || '').trim();
        if (!body) return { success: false, result_summary: 'body required', error: 'body required' };
        const rawDate = str(input.entry_date);
        const entryDate = rawDate && DATE_RE.test(rawDate) ? rawDate : todayInTz(tz);
        const mood = str(input.mood)?.trim().slice(0, 40) || null;
        const title = str(input.title)?.slice(0, 300) ?? null;
        const { data, error } = await supabase
          .from('story_diary_entries')
          .insert({
            space,
            entry_date: entryDate,
            mood,
            title_enc: encryptDiaryFieldOrNull(title),
            body_enc: encryptDiaryField(body.slice(0, 100000)),
            cipher_version: 1,
          })
          .select('id')
          .single();
        if (error || !data) return { success: false, result_summary: 'log failed', error: error?.message };
        return { success: true, result_summary: `diary entry logged ${entryDate}`, data: { id: data.id, entry_date: entryDate } };
      }

      case 'emit_family_signal': {
        const signalType = str(input.signal_type) as SignalType | undefined;
        if (!signalType || !SIGNAL_TYPES.includes(signalType)) {
          return { success: false, result_summary: 'bad signal_type', error: `signal_type must be one of: ${SIGNAL_TYPES.join(', ')}` };
        }
        // The seal: a child flag is refused unless the child consented. emitFamilySignal
        // enforces this too — belt and braces here for a clear message.
        const consented = input.consented === true;
        const sourceRole: 'adult' | 'parent' | 'child' = role === 'child' ? 'child' : role === 'parent' ? 'parent' : 'adult';
        if (sourceRole === 'child' && !consented) {
          return { success: false, result_summary: 'consent required', error: 'a child flag needs the child’s clear yes first' };
        }
        const rawDomain = str(input.domain) as SignalDomain | undefined;
        const res = await emitFamilySignal(supabase, {
          source_space: space,
          source_role: sourceRole,
          signal_type: signalType,
          intensity: num(input.intensity),
          domain: rawDomain && SIGNAL_DOMAINS.includes(rawDomain) ? rawDomain : null,
          consented,
        });
        if (!res.ok) return { success: false, result_summary: 'signal not sent', error: res.error };
        return { success: true, result_summary: 'family flag sent', data: { id: res.id } };
      }

      default:
        return { success: false, result_summary: 'unknown tool', error: `unknown tool: ${name}` };
    }
  } catch (e) {
    console.error(`[coach/tool] ${name} threw:`, e);
    return { success: false, result_summary: 'tool error', error: e instanceof Error ? e.message : 'unknown' };
  }
}

function clampPriority(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(1, Math.min(9, Math.round(v)));
}
