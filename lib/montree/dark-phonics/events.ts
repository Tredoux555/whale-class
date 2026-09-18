// lib/montree/dark-phonics/events.ts
//
// The Dark Phonics hub's own measurement vocabulary.
//
// 🚨 AN ALLOW-LIST, NOT A SCHEMA-LESS PIPE. `POST /api/dark-phonics/event` is
// open to the world (it has to be — the whole point is that nobody signs in),
// so the only thing standing between it and a junk table is this list. An
// unknown `event` is a 400, never a row.
//
// PURE MODULE: no next/*, no database, no process.env. The route validates with
// validateEvent() and then writes; the browser fires with navigator.sendBeacon.

export const DP_EVENTS = [
  'hub_view',
  'tab_view',
  'lesson_open',
  'stage_done',
  'lesson_done',
  'share_open',
  'share_done',
  'lead_submit',
  'print_click',
  'community_view',
  'paywall_view',
  'checkout_start',
  'subscribe_done',
] as const;

export type DpEvent = (typeof DP_EVENTS)[number];

export function isDpEvent(v: unknown): v is DpEvent {
  return typeof v === 'string' && (DP_EVENTS as readonly string[]).includes(v);
}

/** Lessons on the shelf are the curriculum's DISPLAY numbers, 1–49. */
export const DP_LESSON_MIN = 1;
export const DP_LESSON_MAX = 49;

/** Props are a small bag of short scalars — a place for `book`, `item`, `tab`. */
export const DP_PROPS_MAX_KEYS = 8;
export const DP_PROP_MAX_LEN = 80;
export const DP_STAGE_MAX_LEN = 40;

export interface DpEventInput {
  event: DpEvent;
  lesson: number | null;
  stage: string | null;
  props: Record<string, string | number | boolean> | null;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/[\x00-\x1f]/g, '').slice(0, max);
  return s || null;
}

/**
 * Validate one beacon body.
 *
 * Deliberately forgiving about EXTRA junk (an unknown top-level key is dropped,
 * not rejected) and strict about the two things that matter: the event name and
 * the lesson number. A beacon has no way to see a 400, so rejecting a whole
 * payload over a stray key would lose real data for no gain.
 */
export function validateEvent(body: unknown): ValidationResult<DpEventInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be an object.' };
  }
  const o = body as Record<string, unknown>;

  if (!isDpEvent(o.event)) return { ok: false, error: 'Unknown event.' };

  let lesson: number | null = null;
  if (o.lesson !== undefined && o.lesson !== null && o.lesson !== '') {
    const n = Number(o.lesson);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < DP_LESSON_MIN || n > DP_LESSON_MAX) {
      return { ok: false, error: 'lesson must be an integer 1–49.' };
    }
    lesson = n;
  }

  const stage = cleanString(o.stage, DP_STAGE_MAX_LEN);

  let props: Record<string, string | number | boolean> | null = null;
  if (o.props && typeof o.props === 'object' && !Array.isArray(o.props)) {
    const out: Record<string, string | number | boolean> = {};
    let n = 0;
    for (const [k, v] of Object.entries(o.props as Record<string, unknown>)) {
      if (n >= DP_PROPS_MAX_KEYS) break;
      const key = cleanString(k, 40);
      if (!key) continue;
      if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
      else if (typeof v === 'boolean') out[key] = v;
      else {
        const s = cleanString(v, DP_PROP_MAX_LEN);
        if (s === null) continue;
        out[key] = s;
      }
      n++;
    }
    if (n > 0) props = out;
  }

  return { ok: true, value: { event: o.event, lesson, stage, props } };
}
