// lib/montree/tracy/tools/detect_pattern.ts
//
// Pattern detection across a child's observation record.
//
// CONTEXT:
//   The Yo-yo dossier identified that sleep events, food refusal, and the
//   hitting-incident response were the same mechanism. Twenty keyword matches
//   reduced to nine true positives via phrase-list discipline. That filter
//   logic belongs in this tool.
//
//   This is NOT a generic full-text search. It is a thematic-cluster
//   detector that returns:
//     - exact event count and dated list
//     - day-of-week distribution
//     - hour-of-day distribution (when timestamps are usable)
//     - representative quotes (teacher captions, notes, observation
//       descriptions) up to 8
//     - clustered days (days with more than one event — strong signal)
//
// PROMPT-INJECTION:
//   No AI call in this module. Input phrases come from Sonnet upstream
//   (Astra's tool call) — they're treated as literal substring patterns.
//   We use case-insensitive substring matching on text columns; no SQL
//   injection vector because everything is parameterised via Supabase.
//
// FALSE-POSITIVE DISCIPLINE:
//   The Yo-yo lesson: "resting hands" is NOT a rest event; "in his hands a
//   ribbon" matches "hands" in a sleep-keyword search but is not a sleep
//   event. To dodge false positives we:
//     1. Accept a `strict_phrases` list — exact multi-word phrases that
//        MUST appear verbatim. Higher precision than single keywords.
//     2. Accept a `negative_phrases` list — text that disqualifies a match
//        even if a positive phrase fires.
//     3. Default to AND logic on the positive list (every phrase in the
//        positive list must appear) when `match` is 'all'. Sonnet selects
//        the mode.
//
// CROSS-POLLINATION:
//   child_id must belong to schoolId. Re-verified here.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface DetectPatternInput {
  childId: string;
  schoolId: string;
  /** Substring phrases (case-insensitive). Default match = 'any'. */
  themePhrases: string[];
  /** When 'all', every phrase must appear in a record. When 'any', one is enough. */
  match?: 'any' | 'all';
  /** Phrases that disqualify a match even if a positive phrase fires. */
  negativePhrases?: string[];
  /** How many days back to scan. Default 90, cap 365. */
  daysBack?: number;
  /** Cap on representative quotes returned. Default 8. */
  maxQuotes?: number;
}

interface RawEvent {
  source:
    | 'media'
    | 'behavioral_observation'
    | 'teacher_note'
    | 'work_session_note';
  captured_at_iso: string;
  text: string;
  /** Optional work name / area for context. */
  work_name?: string | null;
  area?: string | null;
  /** Optional record id for debugging. */
  record_id?: string;
}

export interface PatternEvent {
  source: RawEvent['source'];
  captured_at_iso: string;
  date: string; // YYYY-MM-DD
  hour: number | null; // 0-23 or null
  weekday: string; // 'Mon' .. 'Sun'
  text: string;
  work_name: string | null;
  area: string | null;
}

export interface DetectPatternResult {
  ok: boolean;
  error?: string;
  data?: {
    child_id: string;
    days_scanned: number;
    /** Total events across all sources, after phrase filtering. */
    event_count: number;
    /** Dated event list, newest first, capped to maxQuotes. */
    events: PatternEvent[];
    /** Days with >1 event — strong cluster signal. */
    cluster_days: Array<{ date: string; count: number }>;
    /** Histogram: weekday → count. */
    weekday_distribution: Record<string, number>;
    /** Histogram: hour-of-day → count. NULL hours collapse into 'unknown'. */
    hour_distribution: Record<string, number>;
    /** Was AND-mode used? Useful when Sonnet relays. */
    match_mode: 'any' | 'all';
    /** Echo of the phrases used, for transparency in the dossier sources. */
    theme_phrases: string[];
    negative_phrases: string[];
  };
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function detectPattern(
  input: DetectPatternInput,
  supabase: SupabaseClient
): Promise<DetectPatternResult> {
  const {
    childId,
    schoolId,
    themePhrases,
    match = 'any',
    negativePhrases = [],
    daysBack = 90,
    maxQuotes = 8,
  } = input;

  if (!childId) return { ok: false, error: 'childId is required' };
  if (!schoolId) return { ok: false, error: 'schoolId is required' };
  if (!themePhrases || themePhrases.length === 0) {
    return { ok: false, error: 'themePhrases is required and non-empty' };
  }

  const cappedDays = Math.max(1, Math.min(365, Math.floor(daysBack)));
  const cappedQuotes = Math.max(1, Math.min(40, Math.floor(maxQuotes)));

  const windowStart = new Date(
    Date.now() - cappedDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // Belt-and-braces school check (same pattern as consult_guru).
  const { data: child, error: childErr } = await supabase
    .from('montree_children')
    .select('id, classroom_id')
    .eq('id', childId)
    .maybeSingle();
  if (childErr) {
    return { ok: false, error: `child lookup failed: ${childErr.message}` };
  }
  if (!child) return { ok: false, error: 'child not found' };
  if (child.classroom_id) {
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', child.classroom_id)
      .maybeSingle();
    if (!classroom || classroom.school_id !== schoolId) {
      return { ok: false, error: 'child does not belong to this school' };
    }
  }

  // Fetch from four sources in parallel — same shape as child-focus.
  const [mediaRes, obsRes, notesRes, sessionsRes] = await Promise.all([
    // Session 133 — montree_media has work_id only (no work_name / area
    // columns). Pattern matching runs against caption + visual_description;
    // work context is nice-to-have but null is acceptable.
    supabase
      .from('montree_media')
      .select('id, captured_at, caption, sonnet_draft, work_id')
      .eq('child_id', childId)
      .gte('captured_at', windowStart)
      .order('captured_at', { ascending: false })
      .limit(500),
    // montree_behavioral_observations may not be linked back to school via FK
    // directly; we filter by child_id which is school-scoped via the resolved
    // child above.
    supabase
      .from('montree_behavioral_observations')
      .select(
        'id, observed_at, behavior_description, antecedent, consequence, time_of_day, activity_during, environmental_notes'
      )
      .eq('child_id', childId)
      .gte('observed_at', windowStart)
      .order('observed_at', { ascending: false })
      .limit(200),
    supabase
      .from('montree_teacher_notes')
      .select('id, created_at, content, transcription')
      .eq('child_id', childId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('montree_work_sessions')
      .select('id, observed_at, work_name, area, notes')
      .eq('child_id', childId)
      .gte('observed_at', windowStart)
      .not('notes', 'is', null)
      .order('observed_at', { ascending: false })
      .limit(200),
  ]);

  const raw: RawEvent[] = [];

  for (const m of mediaRes.data || []) {
    const draft = m.sonnet_draft as Record<string, unknown> | null;
    const aiText =
      (draft && typeof draft === 'object' && typeof draft.visual_description === 'string'
        ? draft.visual_description
        : null) || '';
    const caption = (m as { caption?: string | null }).caption || '';
    const text = [caption, aiText].join(' ').trim();
    if (!text) continue;
    raw.push({
      source: 'media',
      captured_at_iso: m.captured_at,
      text,
      // work_name + area not on montree_media; left null. A future
      // enhancement could JOIN onto montree_classroom_curriculum_works to
      // surface the work label for the dossier — kept null for now to
      // keep the query a single round-trip.
      work_name: null,
      area: null,
      record_id: m.id,
    });
  }

  for (const o of obsRes.data || []) {
    const parts = [
      o.behavior_description,
      o.antecedent,
      o.consequence,
      o.activity_during,
      o.environmental_notes,
    ].filter((p): p is string => typeof p === 'string' && p.length > 0);
    const text = parts.join(' | ').trim();
    if (!text) continue;
    raw.push({
      source: 'behavioral_observation',
      captured_at_iso: o.observed_at,
      text,
      work_name: null,
      area: typeof o.time_of_day === 'string' ? o.time_of_day : null,
      record_id: o.id,
    });
  }

  for (const n of notesRes.data || []) {
    const text = (n.transcription || n.content || '').trim();
    if (!text) continue;
    raw.push({
      source: 'teacher_note',
      captured_at_iso: n.created_at,
      text,
      work_name: null,
      area: null,
      record_id: n.id,
    });
  }

  for (const s of sessionsRes.data || []) {
    const text = (s.notes || '').trim();
    if (!text) continue;
    raw.push({
      source: 'work_session_note',
      captured_at_iso: s.observed_at,
      text,
      work_name: s.work_name ?? null,
      area: s.area ?? null,
      record_id: s.id,
    });
  }

  // Phrase filter.
  const positives = themePhrases
    .map((p) => p.toLowerCase().trim())
    .filter((p) => p.length > 0);
  const negatives = negativePhrases
    .map((p) => p.toLowerCase().trim())
    .filter((p) => p.length > 0);
  // 🚨 Session 133 audit fix: if every theme phrase was whitespace-only,
  // `positives` is now [] after the trim. JS `Array#every` on an empty
  // array returns TRUE, so under match='all' EVERY record would match
  // and the dossier would fill with noise. Refuse the input plainly.
  if (positives.length === 0) {
    return {
      ok: false,
      error:
        'theme_phrases reduced to empty after trim — provide at least one non-whitespace phrase',
    };
  }

  const filtered = raw.filter((r) => {
    const lower = r.text.toLowerCase();
    const positiveMatch =
      match === 'all'
        ? positives.every((p) => lower.includes(p))
        : positives.some((p) => lower.includes(p));
    if (!positiveMatch) return false;
    if (negatives.length > 0 && negatives.some((n) => lower.includes(n))) {
      return false;
    }
    return true;
  });

  // Bucket by day, weekday, hour.
  const weekdayCount: Record<string, number> = {};
  const hourCount: Record<string, number> = {};
  const dayCount: Record<string, number> = {};

  const events: PatternEvent[] = filtered.map((r) => {
    const d = new Date(r.captured_at_iso);
    const ymd =
      Number.isNaN(d.getTime())
        ? 'unknown'
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const weekday = Number.isNaN(d.getTime()) ? 'unknown' : WEEKDAY_SHORT[d.getUTCDay()];
    const hour = Number.isNaN(d.getTime()) ? null : d.getUTCHours();
    const hourKey = hour === null ? 'unknown' : String(hour);

    weekdayCount[weekday] = (weekdayCount[weekday] || 0) + 1;
    hourCount[hourKey] = (hourCount[hourKey] || 0) + 1;
    dayCount[ymd] = (dayCount[ymd] || 0) + 1;

    return {
      source: r.source,
      captured_at_iso: r.captured_at_iso,
      date: ymd,
      hour,
      weekday,
      text: r.text.length > 280 ? r.text.slice(0, 277) + '…' : r.text,
      work_name: r.work_name ?? null,
      area: r.area ?? null,
    };
  });

  const clusterDays = Object.entries(dayCount)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([date, count]) => ({ date, count }));

  // Keep events newest-first, capped to maxQuotes.
  events.sort(
    (a, b) =>
      new Date(b.captured_at_iso).getTime() -
      new Date(a.captured_at_iso).getTime()
  );
  const cappedEvents = events.slice(0, cappedQuotes);

  return {
    ok: true,
    data: {
      child_id: childId,
      days_scanned: cappedDays,
      event_count: filtered.length,
      events: cappedEvents,
      cluster_days: clusterDays,
      weekday_distribution: weekdayCount,
      hour_distribution: hourCount,
      match_mode: match,
      theme_phrases: positives,
      negative_phrases: negatives,
    },
  };
}
