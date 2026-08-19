/**
 * Dark Phonics Live — "Online Classes" portal shared module.
 *
 * Types, Asia/Shanghai formatters and the (ordinary Montree, NOT Midnight
 * Studio) visual tokens used by the two portal surfaces:
 *   app/montree/dashboard/online-classes/page.tsx  (teacher)
 *   app/montree/parent/online-classes/page.tsx     (parent)
 *
 * The Midnight Studio skin (styles/dark-phonics-live-tokens.css) is scoped to
 * the live classroom + the recap card only — the portal pages live inside the
 * normal Montree UI and use the dark-forest palette every other page uses.
 *
 * Every shape below is transcribed VERBATIM from the Phase 2 API contract.
 * If the backend slice ships something different, fix it there or flag it —
 * do not quietly widen these types.
 */

import type { CSSProperties } from 'react';

/** Every class time in this product is Beijing wall-clock. */
export const CLASS_TZ = 'Asia/Shanghai';
export const CLASS_TZ_LABEL = 'Beijing time 北京时间';
/** Locked product decision: one class = 25 minutes. */
export const CLASS_DURATION_MINUTES = 25;
/** Parents can enter the classroom this many minutes before the start. */
export const JOIN_WINDOW_MINUTES = 10;

/* -------------------------------------------------------------------------- */
/* Contract shapes                                                            */
/* -------------------------------------------------------------------------- */

/** GET /api/montree/dark-phonics-live/classes → upcoming[] element. */
export interface DplAppointment {
  id: string;
  childId: string;
  childName: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  status: string;
}

/** …past[] element. */
export interface DplPastAppointment extends DplAppointment {
  hasRecap: boolean;
}

export interface DplClassesResponse {
  upcoming: DplAppointment[];
  past: DplPastAppointment[];
}

/** GET /api/montree/dark-phonics-live/credits?childId=… */
export interface CreditLedgerEntry {
  delta: number;
  reason: string;
  note: string | null;
  createdAt: string;
}

export interface CreditsResponse {
  balance: number;
  ledger: CreditLedgerEntry[];
}

/** GET /api/montree/dark-phonics-live/credits/admin */
export interface CreditAdminRow {
  childId: string;
  childName: string;
  parentName: string;
  balance: number;
}

export interface CreditsAdminResponse {
  children: CreditAdminRow[];
}

/** GET /api/montree/parent/children (existing Montree endpoint, reused). */
export interface ParentChild {
  id: string;
  name: string;
  nickname: string | null;
}

/**
 * One load state for every fetch on these pages. `flagOff` is the 404 the
 * routes return when `dark_phonics_live` is off for the school.
 */
export type LoadState = 'loading' | 'ready' | 'flagOff' | 'unauthorized' | 'error';

export interface JsonResult<T> {
  status: number;
  data: T | null;
}

/** Thin fetch wrapper — same-origin cookies, never cached. */
export async function getJson<T>(url: string): Promise<JsonResult<T>> {
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

export async function postJson<T>(url: string, body: unknown): Promise<JsonResult<T>> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/** Map an HTTP status onto the shared load state. 404 === feature flag off. */
export function stateForStatus(status: number): LoadState {
  if (status === 404) return 'flagOff';
  if (status === 401 || status === 403) return 'unauthorized';
  return status >= 200 && status < 300 ? 'ready' : 'error';
}

/* -------------------------------------------------------------------------- */
/* Asia/Shanghai formatting — every date a human sees on these pages           */
/* -------------------------------------------------------------------------- */

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLASS_TZ, ...opts }).format(d);
}

/** "Tue 19 Aug 2026" */
export function formatClassDate(iso: string): string {
  return fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "16:30" */
export function formatClassTime(iso: string): string {
  return fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "Tue 19 Aug 2026 · 16:30" */
export function formatClassDateTime(iso: string): string {
  const date = formatClassDate(iso);
  const time = formatClassTime(iso);
  return date && time ? `${date} · ${time}` : date || time;
}

/** "19 Aug 2026" — ledger small print. */
export function formatShortDate(iso: string): string {
  return fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "YYYY-MM-DD" in Beijing — seeds the booking form's <input type="date">. */
export function shanghaiDateInputValue(when: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLASS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when);
  return parts; // en-CA renders ISO-style YYYY-MM-DD
}

/**
 * Native <input type="date"> + <input type="time"> give wall-clock strings with
 * no zone. Parents pick Beijing time, so we pin the offset explicitly.
 * China has observed a single, DST-free UTC+08:00 since 1991 — safe to hardcode,
 * and far safer than trusting the browser's own zone (parents travel).
 */
export function shanghaiLocalToIso(dateStr: string, timeStr: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{2}):(\d{2})/.exec(timeStr);
  if (!dm || !tm) return null;
  const utcMs =
    Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2])) -
    8 * 60 * 60 * 1000;
  const d = new Date(utcMs);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * ParentRecapCard formats its own date with the RENDER environment's timezone
 * (see its formatCardDate TODO). We can't pass a pre-formatted string — it
 * parses what it's given — so hand it a Date pinned to midday UTC on the same
 * Beijing calendar day. Midday keeps the calendar date stable for every viewer
 * from UTC-11 to UTC+12.
 */
export function shanghaiCalendarDate(iso: string): Date {
  const src = new Date(iso);
  if (Number.isNaN(src.getTime())) return src;
  const ymd = shanghaiDateInputValue(src).split('-').map(Number);
  return new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2], 12, 0, 0));
}

/** Milliseconds until `iso`; negative once it has passed. */
export function msUntil(iso: string, now: number): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t - now;
}

/** True once we are inside the 10-minute join window (and not long past). */
export function isJoinable(iso: string, now: number, durationMinutes: number): boolean {
  const ms = msUntil(iso, now);
  const endedMs = ms + durationMinutes * 60_000;
  return ms <= JOIN_WINDOW_MINUTES * 60_000 && endedMs > -15 * 60_000;
}

/** "in 2 days", "in 3 h 10 m", "in 4 min" — countdown before the join window. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} h ${mins % 60} min`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'in 1 day' : `in ${days} days`;
}

/** Ledger reason → parent-readable label. Union from lib/montree/credits/ledger.ts. */
export const REASON_LABEL: Record<string, string> = {
  manual_grant: 'Credits added',
  class_booked: 'Class booked',
  class_no_show: 'Missed class',
  class_cancelled_late: 'Late cancellation',
  refund: 'Refunded',
};

export function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ');
}

/** Appointment statuses that still deserve a way into the classroom. */
export function isLiveEligible(status: string): boolean {
  return status === 'pending' || status === 'confirmed';
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
};

/* -------------------------------------------------------------------------- */
/* Visual tokens — the ordinary Montree dark-forest palette                    */
/* (lifted from app/montree/parent/dashboard/page.tsx so these pages sit       */
/*  inside the product, not inside the classroom skin)                         */
/* -------------------------------------------------------------------------- */

export const PT = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  radius: 16,
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.15)',
  red: '#fca5a5',
  redSoft: 'rgba(239,68,68,0.14)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  textFaint: 'rgba(255,255,255,0.28)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

export const cardStyle: CSSProperties = {
  background: PT.card,
  border: PT.cardBorder,
  borderRadius: PT.radius,
  padding: '18px 18px',
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: PT.inputBg,
  border: PT.inputBorder,
  color: PT.textPrimary,
  fontSize: 14.5,
  fontFamily: PT.sans,
  outline: 'none',
};

export const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '11px 20px',
  borderRadius: 999,
  background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
  border: '1px solid rgba(130,217,174,0.18)',
  color: '#fff',
  fontSize: 14.5,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
};

export const ghostButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: PT.textSecondary,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
};

export const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: PT.gold,
  fontWeight: 500,
};
