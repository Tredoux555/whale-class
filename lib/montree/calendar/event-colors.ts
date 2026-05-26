// lib/montree/calendar/event-colors.ts
// Canonical color palette for calendar events. Session 129 follow-up — the
// month grid + detail panel now render glowing colored dots instead of emoji
// icons. This file is the SINGLE SOURCE OF TRUTH for which color each event
// kind gets. Adding a new source = add ONE entry here.
//
// Palette is tuned for the dark forest theme:
//   bg #0a1a0f, emerald accent #34d399, gold accent #E8C96A, Lora serif headings.
//
// Each color comes with a glow recipe — outer halo at ~33% alpha + 1px inset
// ring at full opacity. The dot component reads `getEventColor(event)` and
// renders the dot from that.
//
// 🚨 ARCHITECTURAL RULE: adapters set their own `accent` color (for
// back-compat with anywhere else that reads it), but the CALENDAR PAGE
// renders go through this resolver. Adapters are not authoritative for the
// calendar dot — this file is.

import type { CalendarEvent, CalendarSource } from './types';

export interface CalendarColor {
  /** Hex color for the dot fill. */
  color: string;
  /** Human label for the legend / aria-label. */
  label: string;
}

// ─── Palette ─────────────────────────────────────────────────────────
// One color per *event flavor* (not per source — appointments split by
// host role into two flavors).

export const CALENDAR_COLORS = {
  schoolEvent:       { color: '#60a5fa', label: 'School event' },        // blue
  appointmentTeacher:{ color: '#34d399', label: 'Parent ↔ teacher appointment' }, // emerald
  appointmentPrincipal:{ color: '#f87171', label: 'Parent ↔ principal appointment' }, // red
  meetingNote:       { color: '#fb923c', label: 'Meeting note' },        // orange
  conferenceNote:    { color: '#38bdf8', label: 'Parent–teacher conference' }, // sky blue
  term:              { color: '#a78bfa', label: 'Term boundary' },       // violet
  // Fallback for any source not explicitly mapped (future sources, or
  // disabled adapters that get re-enabled without a palette entry).
  unknown:           { color: '#9bd5b0', label: 'Other' },                // soft sage
} as const;

// ─── Resolver ─────────────────────────────────────────────────────────

/**
 * Map a CalendarEvent to its canonical dot color.
 * Appointments differentiate by host_role (principal=red, teacher=green).
 * Anything else maps purely from `source`.
 */
export function getEventColor(event: CalendarEvent): CalendarColor {
  switch (event.source) {
    case 'school_event':
      return CALENDAR_COLORS.schoolEvent;
    case 'appointment':
      return event.host_role === 'principal'
        ? CALENDAR_COLORS.appointmentPrincipal
        : CALENDAR_COLORS.appointmentTeacher;
    case 'meeting_note':
      return CALENDAR_COLORS.meetingNote;
    case 'conference_note':
      return CALENDAR_COLORS.conferenceNote;
    case 'term':
      return CALENDAR_COLORS.term;
    default:
      return CALENDAR_COLORS.unknown;
  }
}

/**
 * CSS box-shadow recipe for the glow effect — 1px inset ring at full color
 * plus a 10px halo at ~33% alpha. Tuned to read clearly on the dark forest
 * backdrop without bleeding into adjacent cells.
 */
export function getDotGlow(color: string): string {
  // Inset ring at full color + outer halo at low alpha
  return `0 0 0 1px ${color}, 0 0 10px ${color}55`;
}

/**
 * Same recipe, more intense — used on selected/hovered states and on the
 * larger detail-panel dots where we want a clearer presence.
 */
export function getDotGlowStrong(color: string): string {
  return `0 0 0 1px ${color}, 0 0 14px ${color}88`;
}

/**
 * Dedupe a list of events to one color per dot — used in day-cell rendering
 * where 3 parent-teacher appointments should show as ONE green dot, not three.
 * Preserves the order they first appear so the "primary" event of the day
 * (usually earliest) drives the placement.
 *
 * Returns up to `max` distinct colors plus an overflow count.
 */
export function dedupeDayDots(
  events: CalendarEvent[],
  max = 5,
): { dots: CalendarColor[]; overflow: number } {
  const seen = new Set<string>();
  const dots: CalendarColor[] = [];
  for (const ev of events) {
    const c = getEventColor(ev);
    if (seen.has(c.color)) continue;
    seen.add(c.color);
    dots.push(c);
    if (dots.length >= max) break;
  }
  // Overflow is computed over the DISTINCT-color total, not raw event count —
  // matches what the dot row visually represents.
  const allDistinct = new Set(events.map(e => getEventColor(e).color));
  const overflow = Math.max(0, allDistinct.size - dots.length);
  return { dots, overflow };
}

/**
 * Convenience for source labels (legend, accessibility tooltips).
 */
export function colorForSource(source: CalendarSource): CalendarColor {
  switch (source) {
    case 'school_event': return CALENDAR_COLORS.schoolEvent;
    case 'appointment': return CALENDAR_COLORS.appointmentTeacher; // default flavor
    case 'meeting_note': return CALENDAR_COLORS.meetingNote;
    case 'conference_note': return CALENDAR_COLORS.conferenceNote;
    case 'term': return CALENDAR_COLORS.term;
    default: return CALENDAR_COLORS.unknown;
  }
}
