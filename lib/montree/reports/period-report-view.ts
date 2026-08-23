// lib/montree/reports/period-report-view.ts
// PURE helpers shared by the period report API route and the dashboard page
// (/montree/dashboard/period-report). No React, no Supabase, no Date.now() —
// everything here is a deterministic function of its arguments so it can be
// unit-tested (tests/period-report-view.test.ts) and reused by the docx/pptx
// derivations later.
//
// Plan: docs/handoffs/PLAN_ALL_AREAS_REPORTS_AUG22.md (visual report page).

import {
  AREA_ORDER,
  type AreaKey,
  type ChildAggregate,
  type PeriodAggregate,
  type PeriodType,
  type WorkTouch,
} from './period-types';

// ───────────────────────── colours ─────────────────────────
// Verbatim from SHEET_AREA_META (lib/montree/paper-scan/sheet-template.ts) and
// the Work Rhythm page — one classroom, one colour language. Duplicated rather
// than imported so this module stays free of the sheet-template's HTML helpers.
export const AREA_COLORS: Record<AreaKey, string> = {
  practical_life: '#22c55e',
  sensorial: '#f97316',
  mathematics: '#3b82f6',
  language: '#ec4899',
  cultural: '#8b5cf6',
};

export const AREA_ABBR: Record<AreaKey, string> = {
  practical_life: 'PL',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

// ───────────────────────── dates ─────────────────────────

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isYMD(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseYMD(s).getTime());
}

/** Today's YYYY-MM-DD in a fixed UTC offset (hours east). */
export function todayInOffset(utcOffsetHours: number, now: Date = new Date()): string {
  return toYMD(new Date(now.getTime() + utcOffsetHours * 3_600_000));
}

/**
 * Hours east of UTC for an IANA timezone at `at`. Returns null for an unknown
 * zone so the caller can fall back to its own default (Whale Class: +8).
 */
export function tzOffsetHours(timezone: string | null | undefined, at: Date = new Date()): number | null {
  if (!timezone) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts: Record<string, number> = {};
    for (const p of fmt.formatToParts(at)) {
      if (p.type !== 'literal') parts[p.type] = Number(p.value);
    }
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
    const whole = new Date(at.getTime());
    whole.setUTCMilliseconds(0);
    return Math.round(((asUtc - whole.getTime()) / 3_600_000) * 4) / 4;
  } catch {
    return null;
  }
}

/**
 * Start date of the period `delta` steps away (−1 = previous, +1 = next).
 * `start` must already be a period start (Monday / 1st); the result is too.
 */
export function shiftPeriodStart(periodType: PeriodType, start: string, delta: number): string {
  const d = parseYMD(start);
  if (periodType === 'month') {
    return toYMD(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)));
  }
  return toYMD(new Date(d.getTime() + delta * 7 * 86_400_000));
}

/** Snap any date to its period start (Monday for week, 1st for month). */
export function snapPeriodStart(periodType: PeriodType, anchor: string): string {
  const d = parseYMD(anchor);
  if (periodType === 'month') return toYMD(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const back = (d.getUTCDay() + 6) % 7; // Monday = 0
  return toYMD(new Date(d.getTime() - back * 86_400_000));
}

/**
 * Short, locale-aware label for the period header.
 * week  → "18–24 Aug 2026" (or "30 Aug – 5 Sep 2026" across months)
 * month → "August 2026"
 */
export function formatPeriodLabel(periodType: PeriodType, start: string, end: string, locale = 'en'): string {
  const s = parseYMD(start);
  const e = parseYMD(end);
  const tz = { timeZone: 'UTC' } as const;
  if (periodType === 'month') {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', ...tz }).format(s);
  }
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', ...tz });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...tz });
  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', ...tz });
  return sameMonth ? `${day.format(s)}–${full.format(e)}` : `${dayMonth.format(s)} – ${full.format(e)}`;
}

// ───────────────────────── heatmap ─────────────────────────

/**
 * Cell intensity in [0, 1]. Square-root scaling so a child with 2 sessions is
 * visibly different from 0 even when the class max is 20 — a linear scale
 * washes out the low end, which is exactly where "barely touched" lives.
 * Any value > 0 gets at least MIN_VISIBLE so it never reads as empty.
 */
export const MIN_VISIBLE_INTENSITY = 0.18;

export function heatIntensity(value: number, max: number): number {
  if (!(value > 0) || !(max > 0)) return 0;
  const t = Math.sqrt(Math.min(value, max) / max);
  return Math.max(MIN_VISIBLE_INTENSITY, Math.min(1, t));
}

/** Largest cell value in the heatmap (0 when empty). */
export function heatmapMax(heatmap: number[][]): number {
  let max = 0;
  for (const row of heatmap) for (const v of row) if (v > max) max = v;
  return max;
}

/** `#rrggbb` + alpha → `rgba(...)` string for inline styles. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

/** Dark text on light tints, light text once the tint gets strong. */
export function heatTextColor(intensity: number, onDark: boolean): string {
  if (intensity === 0) return onDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  if (onDark) return intensity >= 0.55 ? '#ffffff' : 'rgba(255,255,255,0.85)';
  return intensity >= 0.7 ? '#ffffff' : '#111827';
}

// ───────────────────────── child cards ─────────────────────────

export interface MovementChip {
  work_name: string;
  area: AreaKey | null;
  to: 'presented' | 'practicing' | 'mastered';
}

/** Status movements for a card, mastered first, de-duplicated by work+status. */
export function movementChips(child: ChildAggregate, limit = 4): MovementChip[] {
  const rank = { mastered: 0, practicing: 1, presented: 2 } as const;
  const seen = new Set<string>();
  const out: MovementChip[] = [];
  const sorted = [...child.transitions].sort((a, b) => rank[a.to] - rank[b.to] || b.at.localeCompare(a.at));
  for (const tr of sorted) {
    const key = `${tr.work_name.toLowerCase()}|${tr.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ work_name: tr.work_name, area: tr.area, to: tr.to });
    if (out.length >= limit) break;
  }
  return out;
}

export interface TopWork extends WorkTouch {
  area: AreaKey;
}

/** Top N works across all areas by sessions, then estimated minutes. */
export function topWorks(child: ChildAggregate, n = 3): TopWork[] {
  const all: TopWork[] = [];
  for (const area of AREA_ORDER) {
    for (const w of child.by_area[area]?.works ?? []) all.push({ ...w, area });
  }
  all.sort((a, b) => b.sessions - a.sessions || b.minutes_est - a.minutes_est || a.work_name.localeCompare(b.work_name));
  return all.slice(0, n);
}

/** Per-area estimated minutes as a share of the child's total (0..1 each). */
export function areaShares(child: ChildAggregate): Record<AreaKey, number> {
  const total = child.total_minutes_est;
  const out = {} as Record<AreaKey, number>;
  for (const area of AREA_ORDER) {
    const m = child.by_area[area]?.minutes_est ?? 0;
    out[area] = total > 0 ? m / total : 0;
  }
  return out;
}

/** Concentration tally (wd / wc / dc) for a child, summed over areas. */
export function concentrationTotals(child: ChildAggregate): { wd: number; wc: number; dc: number } {
  const t = { wd: 0, wc: 0, dc: 0 };
  for (const area of AREA_ORDER) {
    const c = child.by_area[area]?.concentration;
    if (!c) continue;
    t.wd += c.wd; t.wc += c.wc; t.dc += c.dc;
  }
  return t;
}

// ───────────────────────── class summary ─────────────────────────

export interface ZeroAreaFlag {
  child_id: string;
  name: string;
  /** Areas with zero sessions this period, in AREA_ORDER. */
  areas: AreaKey[];
}

/**
 * Children who had zero sessions in at least one area. Children with no
 * sessions anywhere are listed with all five areas — the page shows them
 * separately as "nowhere this period".
 */
export function zeroAreaChildren(agg: Pick<PeriodAggregate, 'children'>): ZeroAreaFlag[] {
  const out: ZeroAreaFlag[] = [];
  for (const c of agg.children) {
    const areas = AREA_ORDER.filter((a) => (c.by_area[a]?.sessions ?? 0) === 0);
    if (areas.length > 0) out.push({ child_id: c.child_id, name: c.name, areas });
  }
  return out;
}

export interface ClassSummary {
  total_sessions: number;
  total_minutes_est: number;
  mastered_count: number;
  children_active: number;
  children_silent: number;
  /** Children active somewhere but with ≥1 untouched area. */
  gaps: ZeroAreaFlag[];
}

export function classSummary(agg: PeriodAggregate): ClassSummary {
  let total_sessions = 0, total_minutes_est = 0;
  for (const area of AREA_ORDER) {
    total_sessions += agg.class_totals[area]?.sessions ?? 0;
    total_minutes_est += agg.class_totals[area]?.minutes_est ?? 0;
  }
  const silent = agg.children.filter((c) => c.total_sessions === 0).length;
  const gaps = zeroAreaChildren(agg).filter((g) => g.areas.length < AREA_ORDER.length);
  return {
    total_sessions,
    total_minutes_est,
    mastered_count: agg.class_mastered.length,
    children_active: agg.children.length - silent,
    children_silent: silent,
    gaps,
  };
}

/** Does this aggregate carry any signal at all (sessions or transitions)? */
export function hasAnySignal(agg: PeriodAggregate): boolean {
  return agg.children.some((c) => c.total_sessions > 0 || c.transitions.length > 0);
}
