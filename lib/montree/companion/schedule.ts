// lib/montree/companion/schedule.ts
//
// The family's rhythm — Ivy's family-manager + life-coach planning surface.
// Deliberately simple: concrete dated things live in montree_home_events
// (parent-owned, no host/RSVP machinery), recurring routines live in
// montree_children.settings.companion.routines (per-child, JSONB, no table).
//
// Every function degrades gracefully (try/catch → empty/ok-false) so the code
// ships safely before migration 264 is run.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

const MISSING_TABLE = '42P01'; // Postgres "relation does not exist"

export type HomeEventKind = 'appointment' | 'activity' | 'reminder' | 'routine' | 'wellbeing';
export type HomeEventAudience = 'child' | 'parent' | 'family';

export interface HomeEvent {
  id: string;
  child_id: string | null;
  title: string;
  detail: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  kind: HomeEventKind;
  audience: HomeEventAudience;
  created_by: 'ivy' | 'parent';
  status: 'planned' | 'done' | 'cancelled';
}

export interface Routine {
  id: string;
  title: string;
  time_of_day: string | null; // "HH:MM" 24h, or null for "sometime"
  days_of_week: number[];     // 0=Sun .. 6=Sat; [] = every day
  audience: HomeEventAudience;
  active: boolean;
}

const KINDS: ReadonlySet<string> = new Set<HomeEventKind>(['appointment', 'activity', 'reminder', 'routine', 'wellbeing']);
const AUDIENCES: ReadonlySet<string> = new Set<HomeEventAudience>(['child', 'parent', 'family']);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(): string {
  return (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Parse a date + optional time into an ISO timestamp. Accepts a full ISO string too. */
function toStartIso(input: { start?: string; date?: string; time?: string; all_day?: boolean }): string | null {
  // Full datetime string wins.
  if (input.start && input.start.trim()) {
    const d = new Date(input.start.trim());
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())) {
    const time = !input.all_day && input.time && /^\d{1,2}:\d{2}$/.test(input.time.trim())
      ? input.time.trim().padStart(5, '0')
      : '00:00';
    const d = new Date(`${input.date.trim()}T${time}:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calendar events (montree_home_events)
// ---------------------------------------------------------------------------

export interface AddEventArgs {
  schoolId: string;
  parentId: string;
  childId?: string | null;
  title: string;
  detail?: string | null;
  /** Either `start` (ISO) OR `date` (YYYY-MM-DD) + optional `time` (HH:MM). */
  start?: string;
  date?: string;
  time?: string;
  end?: string | null;
  all_day?: boolean;
  kind?: HomeEventKind;
  audience?: HomeEventAudience;
  created_by?: 'ivy' | 'parent';
}

export type AddEventResult = { ok: true; id: string; when: string } | { ok: false; error: string };

export async function addHomeEvent(supabase: SupabaseClient, args: AddEventArgs): Promise<AddEventResult> {
  const title = (args.title || '').trim();
  if (!title) return { ok: false, error: 'A title is needed.' };
  if (title.length > 200) return { ok: false, error: 'Title too long.' };

  const startIso = toStartIso({ start: args.start, date: args.date, time: args.time, all_day: args.all_day });
  if (!startIso) return { ok: false, error: 'A valid date (and optional time) is needed.' };

  const endIso = args.end ? (() => { const d = new Date(args.end!); return Number.isNaN(d.getTime()) ? null : d.toISOString(); })() : null;
  const kind: HomeEventKind = args.kind && KINDS.has(args.kind) ? args.kind : 'activity';
  const audience: HomeEventAudience = args.audience && AUDIENCES.has(args.audience) ? args.audience : 'family';
  // child-scoped events keep child_id; parent/family events null it out.
  const childId = audience === 'child' ? (args.childId || null) : null;

  const row = {
    school_id: args.schoolId,
    parent_id: args.parentId,
    child_id: childId,
    title,
    detail: (args.detail || '').trim().slice(0, 1000) || null,
    start_at: startIso,
    end_at: endIso,
    all_day: !!args.all_day,
    kind,
    audience,
    created_by: args.created_by === 'parent' ? 'parent' : 'ivy',
    status: 'planned' as const,
  };

  const { data, error } = await supabase.from('montree_home_events').insert(row).select('id').maybeSingle();
  if (error) {
    if (error.code === MISSING_TABLE) return { ok: false, error: 'The calendar isn\'t set up yet (migration 264 pending).' };
    console.warn('[companion/schedule] addHomeEvent error:', error.message);
    return { ok: false, error: 'Could not save to the calendar.' };
  }
  const when = formatWhen(startIso, !!args.all_day);
  return { ok: true, id: (data?.id as string) || '', when };
}

export async function cancelHomeEvent(
  supabase: SupabaseClient,
  args: { eventId: string; parentId: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(args.eventId)) return { ok: false, error: 'Invalid event id.' };
  const { error } = await supabase
    .from('montree_home_events')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', args.eventId)
    .eq('parent_id', args.parentId); // scope: only the owning parent can cancel
  if (error) {
    if (error.code === MISSING_TABLE) return { ok: false, error: 'calendar not set up' };
    return { ok: false, error: 'Could not cancel that.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Routines (montree_children.settings.companion.routines)
// ---------------------------------------------------------------------------

function readRoutines(settings: Record<string, unknown>): Routine[] {
  const companion = (settings.companion as Record<string, unknown>) || {};
  const raw = companion.routines;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      id: String(r.id || ''),
      title: String(r.title || ''),
      time_of_day: typeof r.time_of_day === 'string' ? r.time_of_day : null,
      days_of_week: Array.isArray(r.days_of_week) ? (r.days_of_week as unknown[]).map(Number).filter((n) => n >= 0 && n <= 6) : [],
      audience: AUDIENCES.has(r.audience as string) ? (r.audience as HomeEventAudience) : 'child',
      active: r.active !== false,
    }))
    .filter((r) => r.id && r.title);
}

export interface SetRoutineArgs {
  childId: string;
  title: string;
  time_of_day?: string | null;
  days_of_week?: number[];
  audience?: HomeEventAudience;
}

export async function setRoutine(supabase: SupabaseClient, args: SetRoutineArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const title = (args.title || '').trim();
  if (!title) return { ok: false, error: 'A routine needs a name.' };
  if (title.length > 160) return { ok: false, error: 'Routine name too long.' };
  const time = args.time_of_day && /^\d{1,2}:\d{2}$/.test(args.time_of_day) ? args.time_of_day.padStart(5, '0') : null;
  const days = Array.isArray(args.days_of_week) ? args.days_of_week.map(Number).filter((n) => n >= 0 && n <= 6) : [];

  const { data, error } = await supabase.from('montree_children').select('settings').eq('id', args.childId).maybeSingle();
  if (error || !data) return { ok: false, error: 'child not found' };
  const settings = ((data.settings as Record<string, unknown>) || {});
  const companion = ((settings.companion as Record<string, unknown>) || {});
  const routines = readRoutines(settings);

  const id = uuid();
  routines.push({
    id,
    title,
    time_of_day: time,
    days_of_week: days,
    audience: args.audience && AUDIENCES.has(args.audience) ? args.audience : 'child',
    active: true,
  });
  // Keep it small — a home has a handful of routines, not dozens.
  const trimmed = routines.slice(-40);

  const merged = { ...settings, companion: { ...companion, routines: trimmed } };
  const { error: upErr } = await supabase.from('montree_children').update({ settings: merged }).eq('id', args.childId);
  if (upErr) return { ok: false, error: 'Could not save the routine.' };
  return { ok: true, id };
}

export async function removeRoutine(supabase: SupabaseClient, childId: string, routineId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.from('montree_children').select('settings').eq('id', childId).maybeSingle();
  if (error || !data) return { ok: false, error: 'child not found' };
  const settings = ((data.settings as Record<string, unknown>) || {});
  const companion = ((settings.companion as Record<string, unknown>) || {});
  const routines = readRoutines(settings).filter((r) => r.id !== routineId);
  const merged = { ...settings, companion: { ...companion, routines } };
  const { error: upErr } = await supabase.from('montree_children').update({ settings: merged }).eq('id', childId);
  if (upErr) return { ok: false, error: 'Could not update routines.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reading the schedule (events in range + routines)
// ---------------------------------------------------------------------------

export interface ScheduleArgs {
  schoolId: string;
  parentId: string;
  childId?: string | null;
  fromIso: string;
  toIso: string;
}

export interface ScheduleResult {
  events: HomeEvent[];
  routines: Routine[];
}

export async function listSchedule(supabase: SupabaseClient, args: ScheduleArgs): Promise<ScheduleResult> {
  let events: HomeEvent[] = [];
  try {
    let q = supabase
      .from('montree_home_events')
      .select('id, child_id, title, detail, start_at, end_at, all_day, kind, audience, created_by, status')
      .eq('parent_id', args.parentId)
      .neq('status', 'cancelled')
      .gte('start_at', args.fromIso)
      .lte('start_at', args.toIso)
      .order('start_at', { ascending: true })
      .limit(200);
    // child filter: show this child's events + family/parent events (child_id null)
    if (args.childId) q = q.or(`child_id.eq.${args.childId},child_id.is.null`);
    const { data, error } = await q;
    if (error) {
      if (error.code !== MISSING_TABLE) console.warn('[companion/schedule] listSchedule events error:', error.message);
    } else {
      events = (data || []) as HomeEvent[];
    }
  } catch (e) {
    console.warn('[companion/schedule] listSchedule threw:', e instanceof Error ? e.message : 'unknown');
  }

  let routines: Routine[] = [];
  if (args.childId) {
    try {
      const { data } = await supabase.from('montree_children').select('settings').eq('id', args.childId).maybeSingle();
      if (data) routines = readRoutines((data.settings as Record<string, unknown>) || {}).filter((r) => r.active);
    } catch { /* optional */ }
  }

  return { events, routines };
}

// ---------------------------------------------------------------------------
// Formatting helpers (for tool result text)
// ---------------------------------------------------------------------------

export function formatWhen(iso: string, allDay: boolean): string {
  try {
    const d = new Date(iso);
    if (allDay) return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso.slice(0, 16);
  }
}

export function formatRoutine(r: Routine): string {
  const when = r.days_of_week.length && r.days_of_week.length < 7
    ? r.days_of_week.map((d) => DAY_NAMES[d]).join('/')
    : 'every day';
  return `${r.title}${r.time_of_day ? ` at ${r.time_of_day}` : ''} (${when})`;
}

/** Compact schedule summary for a tool result. */
export function summariseSchedule(result: ScheduleResult): string {
  const lines: string[] = [];
  if (result.events.length) {
    lines.push('Upcoming:');
    for (const e of result.events.slice(0, 20)) {
      lines.push(`- [${e.id}] ${e.title} — ${formatWhen(e.start_at, e.all_day)}${e.audience === 'parent' ? ' (for you)' : ''}`);
    }
  }
  if (result.routines.length) {
    lines.push('Routines:');
    for (const r of result.routines.slice(0, 20)) lines.push(`- ${formatRoutine(r)}`);
  }
  return lines.length ? lines.join('\n') : 'Nothing on the calendar yet.';
}
