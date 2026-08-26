// lib/lens/reports/action-items.ts
// Recommendations become follow-ups.
//
// 🚨 WHY SEEDING HAPPENS ON FINALISE AND NOT ON DRAFT.
// A draft's recommendations change on every regenerate. If action items were
// seeded from a draft, the follow-up list would churn under her, and an item she
// had already assigned an owner and a due date to would be destroyed by a
// re-draft of the paragraph above it. Finalising is the moment the report stops
// moving, which is the only moment its recommendations are worth tracking.
//
// 🚨 AND WHY IT IS IDEMPOTENT. Finalise can be pressed twice — a lost response,
// a double tap, a version bump. Seeding matches on the item TEXT within the same
// report, so a second finalise adds nothing and, critically, does not resurrect
// an item she has since marked done.
//
// Pure: rows in, rows out. The route does the writing.

import type { ActionItemStatus, LensActionItem } from '../types';
import type { ReportListItem } from './schema';

export interface SeedableActionItem {
  report_id: string;
  classroom_id: string | null;
  text: string;
  owner: string | null;
  due_date: string | null;
  status: ActionItemStatus;
  sort_order: number;
  carried_from_id: string | null;
}

/** Loose normalisation for the "have I already seeded this?" comparison. */
function fingerprint(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.。;；,，]+$/, '');
}

export interface SeedOptions {
  reportId: string;
  classroomId: string | null;
  /** The finalised report's recommendations, in report order. */
  recommendations: ReportListItem[];
  /**
   * Required actions also become follow-ups, ahead of recommendations — a
   * compliance item that was not tracked is the one that gets missed.
   */
  requiredActions?: ReportListItem[];
  /** Items already on this report. Anything matching is skipped. */
  existing: Pick<LensActionItem, 'text' | 'sort_order'>[];
  /**
   * Items the observer chose to carry forward from the previous visit. They are
   * seeded FIRST and keep a pointer back to the item they came from, so "we
   * asked for this last time and again this time" is visible in the data rather
   * than only in her memory.
   */
  carried?: { id: string; text: string; owner: string | null; due_date: string | null }[];
}

/**
 * Work out what to INSERT. Returns only new rows — never updates, never
 * deletes. An item she edited by hand is hers and this function will not touch
 * it, which is why the comparison is on text rather than on position.
 */
export function seedActionItems(options: SeedOptions): SeedableActionItem[] {
  const { reportId, classroomId, recommendations, requiredActions = [], existing, carried = [] } =
    options;

  const seen = new Set(existing.map((e) => fingerprint(e.text)));
  const out: SeedableActionItem[] = [];
  // Continue the existing numbering rather than restarting at 0, so a
  // second finalise after she added an item by hand does not interleave.
  let order = existing.reduce((max, e) => Math.max(max, e.sort_order), -1) + 1;

  const push = (
    text: string,
    owner: string | null,
    due: string | null,
    carriedFrom: string | null,
  ) => {
    const clean = text.trim();
    if (!clean) return;
    const fp = fingerprint(clean);
    if (seen.has(fp)) return;
    seen.add(fp);
    out.push({
      report_id: reportId,
      classroom_id: classroomId,
      text: clean,
      owner,
      due_date: due,
      status: 'open',
      sort_order: order++,
      carried_from_id: carriedFrom,
    });
  };

  for (const c of carried) {
    push(c.text, c.owner, c.due_date, c.id);
  }
  for (const item of sortByPriority(requiredActions)) {
    push(item.text_en, item.owner ?? null, normaliseDue(item.due), null);
  }
  for (const item of sortByPriority(recommendations)) {
    push(item.text_en, item.owner ?? null, normaliseDue(item.due), null);
  }

  return out;
}

/**
 * Priority 1 is highest. Items with no priority keep their report order and sit
 * AFTER the prioritised ones — an unprioritised recommendation is not urgent,
 * it is unlabelled, and putting it first would invent an urgency the observer
 * did not assign.
 */
export function sortByPriority(items: ReportListItem[]): ReportListItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = a.item.priority ?? Number.POSITIVE_INFINITY;
      const pb = b.item.priority ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.index - b.index;
    })
    .map((w) => w.item);
}

/**
 * The model is asked for an ISO date and sometimes offers "end of term" or
 * "within 30 days". A date column cannot hold that, and inventing 2026-11-30
 * from "end of term" would put a deadline in a school's file that nobody
 * agreed to — so anything that is not a clean YYYY-MM-DD becomes NULL and she
 * sets the date herself.
 */
export function normaliseDue(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Round-trip check catches 2026-02-31, which Date happily rolls into March.
  return d.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}
