// lib/story/coach/reminders.ts
//
// The Coach's REMINDERS — it can schedule a nudge for the user and (via the
// send-reminders cron) push it to their phone at the right local time.
//
// Everything is space-scoped (the caller's sanctuary) and the message is
// encrypted at rest with the same diary-crypto key as the diary/projects/log.
// All timezone math is done with Intl only (no date libs): a "wall-clock" local
// datetime string is resolved to a precise UTC instant in the user's IANA tz,
// and recurrences advance the LOCAL wall-clock time (stable across DST) then
// re-resolve to UTC.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { encryptDiaryField, readDiaryField } from '@/lib/story/diary-crypto';

export type Recurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly';
const RECURRENCES = new Set<Recurrence>(['daily', 'weekdays', 'weekly', 'monthly']);

const PAST_GRACE_MS = 2 * 60 * 1000; // reject times more than 2 min in the past

// ── timezone helpers (Intl only) ─────────────────────────────────────────────

/** Offset (ms) that the tz's wall clock is AHEAD of UTC at a given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let hour = g('hour');
  if (hour === 24) hour = 0; // some engines render midnight as 24
  const asIfUtc = Date.UTC(g('year'), g('month') - 1, g('day'), hour, g('minute'), g('second'));
  return asIfUtc - utcMs;
}

/**
 * Resolve a LOCAL wall-clock datetime ("YYYY-MM-DDTHH:MM" or with seconds) in tz
 * to the true UTC instant. Refined once so it is correct across DST boundaries.
 * Returns null on a malformed string. If tz is absent, the wall time is treated
 * as UTC.
 */
function zonedWallTimeToUtc(local: string, tz?: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const h = Number(m[4]), mi = Number(m[5]), s = Number(m[6] || '0');
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!tz) return new Date(asUtc);
  try {
    const off1 = tzOffsetMs(asUtc, tz);
    let utc = asUtc - off1;
    const off2 = tzOffsetMs(utc, tz);
    if (off2 !== off1) utc = asUtc - off2;
    return new Date(utc);
  } catch {
    return new Date(asUtc);
  }
}

/** The local wall-clock fields of a UTC instant, as seen in tz. */
function localFields(utcMs: number, tz?: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let h = g('hour');
  if (h === 24) h = 0;
  return { y: g('year'), mo: g('month'), d: g('day'), h, mi: g('minute') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Pure calendar arithmetic on a civil (y,mo,d) date — no timezone involved. */
function addDaysCivil(y: number, mo: number, d: number, n: number): { y: number; mo: number; d: number } {
  const t = Date.UTC(y, mo - 1, d) + n * 86400000;
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
function civilDayOfWeek(y: number, mo: number, d: number): number {
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0 = Sun … 6 = Sat
}
function addMonthCivil(y: number, mo: number, d: number): { y: number; mo: number; d: number } {
  let ny = y, nmo = mo + 1;
  if (nmo > 12) { nmo = 1; ny += 1; }
  const daysInMonth = new Date(Date.UTC(ny, nmo, 0)).getUTCDate(); // day 0 of nmo+1 = last day of nmo
  return { y: ny, mo: nmo, d: Math.min(d, daysInMonth) };
}

/**
 * The NEXT occurrence of a recurring reminder AFTER `fromUtc`, advancing the
 * local wall-clock time in tz. Returns null for a one-off (no recurrence).
 */
function nextOccurrenceOnce(fromUtc: Date, recurrence: Recurrence, tz?: string): Date | null {
  const f = localFields(fromUtc.getTime(), tz);
  let civ: { y: number; mo: number; d: number };
  if (recurrence === 'daily') {
    civ = addDaysCivil(f.y, f.mo, f.d, 1);
  } else if (recurrence === 'weekly') {
    civ = addDaysCivil(f.y, f.mo, f.d, 7);
  } else if (recurrence === 'monthly') {
    civ = addMonthCivil(f.y, f.mo, f.d);
  } else {
    // weekdays: next Mon–Fri
    civ = addDaysCivil(f.y, f.mo, f.d, 1);
    let guard = 0;
    while (guard < 8) {
      const dow = civilDayOfWeek(civ.y, civ.mo, civ.d);
      if (dow >= 1 && dow <= 5) break;
      civ = addDaysCivil(civ.y, civ.mo, civ.d, 1);
      guard += 1;
    }
  }
  const wall = `${civ.y}-${pad(civ.mo)}-${pad(civ.d)}T${pad(f.h)}:${pad(f.mi)}`;
  return zonedWallTimeToUtc(wall, tz);
}

/**
 * The next occurrence strictly in the FUTURE (relative to `after`). Advances
 * repeatedly if the cron was down and several occurrences already passed, so a
 * daily reminder never floods — it fires once and reschedules ahead. Bounded.
 */
export function nextFutureOccurrence(
  fromUtc: Date,
  recurrence: Recurrence,
  tz: string | undefined,
  after: Date = new Date(),
): Date | null {
  let cur: Date | null = fromUtc;
  let guard = 0;
  do {
    const next = nextOccurrenceOnce(cur, recurrence, tz);
    if (!next) return null;
    cur = next;
    guard += 1;
  } while (cur.getTime() <= after.getTime() + PAST_GRACE_MS && guard < 800);
  return cur;
}

// ── formatting ────────────────────────────────────────────────────────────────

/** "Mon 14 Jul, 21:40" (in tz when given, else UTC-labelled). */
export function formatLocalWhen(utcIso: string, tz?: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23',
      ...(tz ? { timeZone: tz } : { timeZone: 'UTC' }),
    }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const base = `${g('weekday')} ${g('day')} ${g('month')}, ${g('hour')}:${g('minute')}`;
    return tz ? base : `${base} UTC`;
  } catch {
    return d.toISOString();
  }
}

// ── DB shape ──────────────────────────────────────────────────────────────────

interface ReminderRow {
  id: string;
  remind_at: string;
  tz: string | null;
  message_enc: string;
  recurrence: string | null;
  status: string;
  cipher_version: number | null;
  sent_at: string | null;
}

/** The user's stored timezone (fallback when the client didn't send one). */
async function storedTz(supabase: SupabaseClient, space: string): Promise<string | undefined> {
  try {
    const { data } = await supabase
      .from('story_admin_users')
      .select('timezone')
      .eq('space', space)
      .maybeSingle();
    const tz = data?.timezone;
    return typeof tz === 'string' && tz ? tz : undefined;
  } catch {
    return undefined;
  }
}

// ── operations ────────────────────────────────────────────────────────────────

export interface SetReminderInput {
  message: string;
  /** ISO local datetime "YYYY-MM-DDTHH:MM", or a full ISO with an explicit zone. */
  when: string;
  recurrence?: string;
  /** The caller's tz (from the request); falls back to the stored tz, then UTC. */
  tz?: string;
}

export interface SetReminderResult {
  ok: boolean;
  id?: string;
  remind_at?: string;
  local_when?: string;
  recurrence?: Recurrence | null;
  error?: string;
}

const HAS_ZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/;

export async function setReminder(
  supabase: SupabaseClient,
  space: string,
  input: SetReminderInput,
): Promise<SetReminderResult> {
  const message = (input.message || '').trim();
  if (!message) return { ok: false, error: 'What should the reminder say?' };
  if (message.length > 1000) return { ok: false, error: 'Keep the reminder short (under 1000 characters).' };

  const rawWhen = (input.when || '').trim();
  if (!rawWhen) return { ok: false, error: 'When should it fire? Give me a date and time.' };

  const recurrenceRaw = (input.recurrence || '').trim().toLowerCase();
  const recurrence: Recurrence | null =
    recurrenceRaw && RECURRENCES.has(recurrenceRaw as Recurrence) ? (recurrenceRaw as Recurrence) : null;

  const tz = input.tz || (await storedTz(supabase, space));

  // Resolve `when` → a precise UTC instant.
  let remindAt: Date | null;
  if (HAS_ZONE_RE.test(rawWhen)) {
    const d = new Date(rawWhen); // already an absolute instant
    remindAt = Number.isNaN(d.getTime()) ? null : d;
  } else {
    remindAt = zonedWallTimeToUtc(rawWhen, tz);
  }
  if (!remindAt) return { ok: false, error: 'I could not read that time — give me a date and a time (e.g. 2026-07-16 18:00).' };

  if (remindAt.getTime() < Date.now() - PAST_GRACE_MS) {
    return { ok: false, error: `That time (${formatLocalWhen(remindAt.toISOString(), tz)}) is already in the past — pick a future time.` };
  }

  const { data, error } = await supabase
    .from('story_coach_reminders')
    .insert({
      space,
      remind_at: remindAt.toISOString(),
      tz: tz || null,
      message_enc: encryptDiaryField(message),
      recurrence,
      status: 'pending',
      cipher_version: 1,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message || 'Could not save the reminder.' };

  return {
    ok: true,
    id: data.id as string,
    remind_at: remindAt.toISOString(),
    local_when: formatLocalWhen(remindAt.toISOString(), tz),
    recurrence,
  };
}

export interface ListedReminder {
  id: string;
  message: string;
  when: string;         // local formatted
  remind_at: string;    // ISO UTC
  recurrence: Recurrence | null;
  status: string;
}

/** Pending reminders (soonest first) + the last 5 already-sent, decrypted. */
export async function listReminders(
  supabase: SupabaseClient,
  space: string,
  tz?: string,
): Promise<{ pending: ListedReminder[]; recent_sent: ListedReminder[] }> {
  const effTz = tz || (await storedTz(supabase, space));
  const decode = (r: ReminderRow): ListedReminder => ({
    id: r.id,
    message: readDiaryField(r.message_enc, r.cipher_version) || '',
    when: formatLocalWhen(r.remind_at, r.tz || effTz),
    remind_at: r.remind_at,
    recurrence: (r.recurrence && RECURRENCES.has(r.recurrence as Recurrence) ? r.recurrence : null) as Recurrence | null,
    status: r.status,
  });

  const [{ data: pend }, { data: sent }] = await Promise.all([
    supabase
      .from('story_coach_reminders')
      .select('id, remind_at, tz, message_enc, recurrence, status, cipher_version, sent_at')
      .eq('space', space)
      .eq('status', 'pending')
      .order('remind_at', { ascending: true })
      .limit(30),
    supabase
      .from('story_coach_reminders')
      .select('id, remind_at, tz, message_enc, recurrence, status, cipher_version, sent_at')
      .eq('space', space)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(5),
  ]);

  return {
    pending: (pend as ReminderRow[] | null ?? []).map(decode),
    recent_sent: (sent as ReminderRow[] | null ?? []).map(decode),
  };
}

export async function cancelReminder(
  supabase: SupabaseClient,
  space: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) return { ok: false, error: 'That is not a valid reminder id.' };
  const { data, error } = await supabase
    .from('story_coach_reminders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('space', space)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No pending reminder with that id — it may already have fired or been cancelled.' };
  return { ok: true };
}

// ── schedule-awareness block for the system prompt ───────────────────────────

/**
 * Load the UPCOMING block: next-7-day plan events (≤10) + pending reminders
 * (≤10), rendered with local datetimes. Fail-soft — returns '' on any error so
 * the coach never breaks over a missing table / bad row.
 */
export async function loadUpcomingSection(
  supabase: SupabaseClient,
  space: string,
  tz?: string,
): Promise<string> {
  try {
    const effTz = tz || (await storedTz(supabase, space));
    const todayCivil = localFields(Date.now(), effTz);
    const todayStr = `${todayCivil.y}-${pad(todayCivil.mo)}-${pad(todayCivil.d)}`;
    const in7 = addDaysCivil(todayCivil.y, todayCivil.mo, todayCivil.d, 7);
    const in7Str = `${in7.y}-${pad(in7.mo)}-${pad(in7.d)}`;
    const nowIso = new Date().toISOString();

    type EventRow = { event_date: string; start_time: string | null; title_enc: string; cipher_version: number | null };
    type UpcomingReminderRow = { remind_at: string; tz: string | null; message_enc: string; recurrence: string | null; cipher_version: number | null };

    const [eventsData, remindersData] = await Promise.all([
      supabase
        .from('story_plan_events')
        .select('event_date, start_time, title_enc, cipher_version')
        .eq('space', space)
        .gte('event_date', todayStr)
        .lte('event_date', in7Str)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true, nullsFirst: true })
        .limit(10)
        .then((r) => (Array.isArray(r.data) ? (r.data as EventRow[]) : []), () => [] as EventRow[]),
      supabase
        .from('story_coach_reminders')
        .select('remind_at, tz, message_enc, recurrence, cipher_version')
        .eq('space', space)
        .eq('status', 'pending')
        .gte('remind_at', nowIso)
        .order('remind_at', { ascending: true })
        .limit(10)
        .then((r) => (Array.isArray(r.data) ? (r.data as UpcomingReminderRow[]) : []), () => [] as UpcomingReminderRow[]),
    ]);

    const eventLines: string[] = [];
    for (const e of eventsData) {
      const title = readDiaryField(e.title_enc, e.cipher_version) || '(untitled)';
      const when = e.start_time ? `${e.event_date} ${e.start_time}` : e.event_date;
      eventLines.push(`  • ${when} — ${title}`);
    }

    const reminderLines: string[] = [];
    for (const r of remindersData) {
      const msg = readDiaryField(r.message_enc, r.cipher_version) || '';
      const rec = r.recurrence && RECURRENCES.has(r.recurrence as Recurrence) ? ` (${r.recurrence})` : '';
      reminderLines.push(`  • ${formatLocalWhen(r.remind_at, r.tz || effTz)}${rec} — ${msg}`);
    }

    if (!eventLines.length && !reminderLines.length) return '';

    let out = '# UPCOMING (their schedule)\n';
    if (eventLines.length) out += 'Planner (next 7 days):\n' + eventLines.join('\n') + '\n';
    if (reminderLines.length) out += 'Reminders you set for them:\n' + reminderLines.join('\n') + '\n';
    out += 'Use this to help them manage their time — flag clashes, prep them for what’s coming, and set new reminders when it helps.';
    return out;
  } catch {
    return '';
  }
}
