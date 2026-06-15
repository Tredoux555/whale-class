// lib/story/coach/personal-data.ts
//
// Server-side read helpers the Coach's tools use to pull Tredoux's diary,
// projects, and a wellbeing signal. All decrypt at rest via diary-crypto.
// Single user — no scoping. Bodies are length-capped to bound prompt tokens.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { readDiaryField } from '@/lib/story/diary-crypto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY_TO_COACH = 3000;

export interface CoachDiaryEntry {
  id: string;
  entry_date: string;
  mood: string | null;
  title: string | null;
  body: string;
}

/**
 * Recent diary entries for the Coach. Optional date window + free-text query
 * (applied after decrypt). Newest first.
 */
export async function readDiaryForCoach(
  supabase: SupabaseClient,
  space: string,
  opts: { from?: string; to?: string; limit?: number; query?: string } = {},
): Promise<CoachDiaryEntry[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 14, 60));
  let q = supabase
    .from('story_diary_entries')
    .select('id, entry_date, mood, title_enc, body_enc, cipher_version')
    .eq('space', space)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(opts.query ? 120 : limit); // over-fetch when filtering by text
  if (opts.from && DATE_RE.test(opts.from)) q = q.gte('entry_date', opts.from);
  if (opts.to && DATE_RE.test(opts.to)) q = q.lte('entry_date', opts.to);

  const { data, error } = await q;
  if (error) {
    console.warn('[coach/data] readDiary error:', error.message);
    return [];
  }
  let rows = (data || []).map((r) => {
    const body = readDiaryField(r.body_enc, r.cipher_version);
    return {
      id: r.id as string,
      entry_date: r.entry_date as string,
      mood: (r.mood as string | null) || null,
      title: readDiaryField(r.title_enc, r.cipher_version) || null,
      body: body.length > MAX_BODY_TO_COACH ? body.slice(0, MAX_BODY_TO_COACH) + '…' : body,
    };
  });
  if (opts.query && opts.query.trim()) {
    const needle = opts.query.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.body.toLowerCase().includes(needle) || (r.title || '').toLowerCase().includes(needle),
    );
  }
  return rows.slice(0, limit);
}

export interface CoachProject {
  id: string;
  title: string;
  why: string | null;
  next_action: string | null;
  status: string;
  priority: number | null;
  is_active: boolean;
}

/** All projects, decrypted. active=true first, then by priority, then newest. */
export async function readProjectsForCoach(supabase: SupabaseClient, space: string): Promise<CoachProject[]> {
  const { data, error } = await supabase
    .from('story_projects')
    .select('id, title_enc, why_enc, next_action_enc, status, priority, is_active, cipher_version, created_at')
    .eq('space', space)
    .order('is_active', { ascending: false })
    .order('priority', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.warn('[coach/data] readProjects error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id as string,
    title: readDiaryField(r.title_enc, r.cipher_version),
    why: readDiaryField(r.why_enc, r.cipher_version) || null,
    next_action: readDiaryField(r.next_action_enc, r.cipher_version) || null,
    status: r.status as string,
    priority: (r.priority as number | null) ?? null,
    is_active: !!r.is_active,
  }));
}

// A sane WIP ceiling for active work. Above this, the Coach should push back
// on taking anything new on (Essentialism / The ONE Thing).
export const WIP_LIMIT = 3;

export interface LoadReport {
  active_count: number;
  paused_count: number;
  wip_limit: number;
  over_limit: boolean;
  active_projects: { id: string; title: string; priority: number | null; next_action: string | null }[];
  paused_projects: { id: string; title: string }[];
}

/** Compute current work-in-progress load vs the WIP ceiling. */
export async function computeLoad(supabase: SupabaseClient, space: string): Promise<LoadReport> {
  const all = await readProjectsForCoach(supabase, space);
  const active = all.filter((p) => p.status === 'active');
  const paused = all.filter((p) => p.status === 'paused');
  return {
    active_count: active.length,
    paused_count: paused.length,
    wip_limit: WIP_LIMIT,
    over_limit: active.length > WIP_LIMIT,
    active_projects: active.map((p) => ({ id: p.id, title: p.title, priority: p.priority, next_action: p.next_action })),
    paused_projects: paused.map((p) => ({ id: p.id, title: p.title })),
  };
}

export interface WellbeingSignal {
  recent_moods: { entry_date: string; mood: string | null }[];
  days_since_last_entry: number | null;
  entries_in_window: number;
}

/** Recent mood signal from the diary, last `days` days. */
export async function wellbeingSignal(supabase: SupabaseClient, space: string, days = 14): Promise<WellbeingSignal> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(days, 90)));
  const sinceISO = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('story_diary_entries')
    .select('entry_date, mood')
    .eq('space', space)
    .gte('entry_date', sinceISO)
    .order('entry_date', { ascending: false })
    .limit(60);
  if (error) {
    console.warn('[coach/data] wellbeing error:', error.message);
    return { recent_moods: [], days_since_last_entry: null, entries_in_window: 0 };
  }
  const rows = (data || []).map((r) => ({ entry_date: r.entry_date as string, mood: (r.mood as string | null) || null }));
  let daysSince: number | null = null;
  if (rows.length) {
    const last = new Date(rows[0].entry_date + 'T00:00:00').getTime();
    daysSince = Math.round((Date.now() - last) / 86400000);
  }
  return { recent_moods: rows, days_since_last_entry: daysSince, entries_in_window: rows.length };
}
