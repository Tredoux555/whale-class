// lib/montree/calendar/summary.ts
// Calendar Plan §8 — AI summarisation.
//
// Takes a CalendarWindow + CalendarScope + the events the adapters produced,
// and asks Anthropic for a human narrative. Voice + level vary by role:
//   - parent: warm "here's your child's week" tone
//   - teacher: workmanlike "here's what's on your plate" tone
//   - principal: chief-of-staff tone — what to nudge, what to celebrate
//
// Tier-gated: free schools get a deterministic fallback (no AI call).

import { anthropic } from '@/lib/ai/anthropic';
import type { ResolvedReportModel } from '@/lib/montree/reports/resolve-model';
import type { CalendarEvent, CalendarScope, CalendarWindow } from './types';

interface SummaryArgs {
  events: CalendarEvent[];
  window: CalendarWindow;
  scope: CalendarScope;
  resolved: ResolvedReportModel;
}

export interface CalendarSummary {
  /** Plain-prose summary suitable for display. */
  text: string;
  /** Which model produced it (or 'fallback' for the template path). */
  model: string | 'fallback';
  /** Token cost in USD-cents, when available. Best-effort. */
  cost_usd?: number;
}

/**
 * Group + count events per source for a tidy bullet block in the prompt.
 */
function eventsToPromptBlock(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return '(no events in this window)';
  }
  const lines: string[] = [];
  // Order chronologically.
  const sorted = [...events].sort((a, b) => (a.start < b.start ? -1 : 1));
  for (const ev of sorted) {
    const dayLabel = ev.start.slice(0, 10);
    const timeLabel = ev.all_day
      ? 'all-day'
      : new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const status = ev.status === 'done' ? '✓ ' : ev.status === 'cancelled' ? '✕ ' : '';
    const detail = ev.detail ? ` — ${ev.detail.slice(0, 80)}` : '';
    lines.push(`  • ${dayLabel} ${timeLabel} [${ev.source}] ${status}${ev.title}${detail}`);
  }
  return lines.join('\n');
}

function buildSystemPrompt(scope: CalendarScope): string {
  if (scope.role === 'parent') {
    return [
      'You are summarising a calendar window for a parent who wants to know',
      "what's coming up for their child and what just happened. Voice: warm,",
      'short, no jargon. Lead with the most parent-relevant items (reports',
      'sent, school events, appointments their child is involved in).',
      'Do not invent events — only narrate what is in the data.',
      'Do not list events as bullets — write 1–3 short paragraphs of prose.',
      'If the window is empty, say so plainly.',
    ].join(' ');
  }
  if (scope.role === 'teacher') {
    return [
      "You are summarising a teacher's calendar window. Voice: practical,",
      'no fluff, like a chief-of-staff briefing a busy classroom lead.',
      "Highlight: what's planned vs. done; anything that looks like a gap",
      '(e.g. no English schedule this week, parent meeting unconfirmed);',
      'cancelled or missed items to address. 1–3 paragraphs of prose.',
      'Do not invent events — only narrate what is in the data.',
    ].join(' ');
  }
  // principal / super_admin
  return [
    "You are summarising a principal's calendar window. Voice: chief-of-staff —",
    'decisive, pattern-aware, surfaces what needs the principal\'s attention.',
    'Look across classrooms: confirmations missing, meeting notes outstanding,',
    'observations clustering or thinning. End with one concrete suggestion if',
    'appropriate. 2–4 paragraphs of prose. Do not invent events.',
  ].join(' ');
}

function buildUserPrompt(events: CalendarEvent[], window: CalendarWindow, scope: CalendarScope): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Window: ${window.from} → ${window.to} (school timezone ${window.tz}).`,
    `Today is ${today}.`,
    `Role: ${scope.role}.`,
    '',
    'Events in this window:',
    eventsToPromptBlock(events),
  ].join('\n');
}

function buildFallback(events: CalendarEvent[], window: CalendarWindow): string {
  const upcoming = events.filter((e) => e.start.slice(0, 10) >= new Date().toISOString().slice(0, 10));
  const past = events.filter((e) => e.start.slice(0, 10) < new Date().toISOString().slice(0, 10));
  const lines: string[] = [];
  lines.push(`Calendar window: ${window.from} → ${window.to}.`);
  lines.push(`${events.length} event${events.length === 1 ? '' : 's'} total.`);
  if (upcoming.length) lines.push(`${upcoming.length} upcoming, ${past.length} already happened.`);
  // Per-source tally.
  const bySource = new Map<string, number>();
  for (const e of events) {
    bySource.set(e.source, (bySource.get(e.source) || 0) + 1);
  }
  if (bySource.size) {
    const tally = Array.from(bySource.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${n} ${s.replace(/_/g, ' ')}`)
      .join(', ');
    lines.push(`Breakdown: ${tally}.`);
  }
  return lines.join(' ');
}

export async function summariseCalendar(args: SummaryArgs): Promise<CalendarSummary> {
  const { events, window, scope, resolved } = args;

  // Free tier or no client: deterministic fallback.
  if (resolved.tier === 'free' || !resolved.model || !anthropic) {
    return { text: buildFallback(events, window), model: 'fallback' };
  }

  const system = buildSystemPrompt(scope);
  const user = buildUserPrompt(events, window, scope);

  try {
    const response = await anthropic.messages.create({
      model: resolved.model,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    });

    // Concatenate any text blocks.
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();

    if (!text) {
      return { text: buildFallback(events, window), model: 'fallback' };
    }

    return { text, model: resolved.model };
  } catch (err) {
    console.error('[summariseCalendar] AI call failed', err);
    return { text: buildFallback(events, window), model: 'fallback' };
  }
}
