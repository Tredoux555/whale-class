// lib/montree/feedback/statuses.ts
//
// The status machine. Pure data + pure functions — no DB, no env, no React.
//
// Two rules the rest of the module leans on:
//   1. A status belongs to a TYPE. 'shipped' on a Problem is not a typo to be
//      tolerated, it is a bug: the board's promise is that a Problem ends
//      Fixed or Won't fix and an Idea ends Shipped or Declined.
//   2. A status change is a TRANSITION, not an assignment. The table below is
//      what an admin's dropdown offers and what the PATCH route enforces, so
//      a hand-crafted request cannot park a post somewhere the UI never shows.

import type { Lang, PostStatus, PostType } from './types';

/** Statuses each type may hold, in pipeline order (this is the dropdown order). */
export const STATUSES_BY_TYPE: Record<PostType, readonly PostStatus[]> = {
  problem: ['open', 'confirmed', 'in_progress', 'fixed', 'wont_fix'],
  idea: ['open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined'],
  question: ['open', 'answered'],
  // Discussion has no status. It still stores 'open' so the column is never
  // null, but nothing renders it and nothing may change it.
  discussion: ['open'],
};

/**
 * Allowed moves. Forward along the pipeline, plus the honest reversals a real
 * team needs (a "Fixed" that came back, a "Declined" someone reconsidered).
 * A move to the SAME status is not a transition and is rejected — it would
 * write a meaningless history row and email every subscriber for nothing.
 */
export const TRANSITIONS: Record<PostType, Partial<Record<PostStatus, readonly PostStatus[]>>> = {
  problem: {
    open: ['confirmed', 'in_progress', 'fixed', 'wont_fix'],
    confirmed: ['in_progress', 'fixed', 'wont_fix', 'open'],
    in_progress: ['fixed', 'wont_fix', 'confirmed'],
    fixed: ['in_progress', 'open'],
    wont_fix: ['open', 'confirmed'],
  },
  idea: {
    open: ['under_review', 'planned', 'in_progress', 'declined'],
    under_review: ['planned', 'in_progress', 'declined', 'open'],
    planned: ['in_progress', 'shipped', 'declined', 'under_review'],
    in_progress: ['shipped', 'planned', 'declined'],
    shipped: ['in_progress'],
    declined: ['open', 'under_review', 'planned'],
  },
  question: {
    open: ['answered'],
    answered: ['open'],
  },
  discussion: {},
};

/** Types whose posts carry a vote pill. Questions and Discussions do not. */
export function typeSupportsVoting(type: PostType): boolean {
  return type === 'problem' || type === 'idea';
}

/** Types that show a status chip at all. */
export function typeSupportsStatus(type: PostType): boolean {
  return type !== 'discussion';
}

/** Where a new post of this type starts: the head of its own pipeline. */
export function defaultStatusFor(type: PostType): PostStatus {
  return STATUSES_BY_TYPE[type]?.[0] ?? 'open';
}

export function statusesForType(type: PostType): readonly PostStatus[] {
  return STATUSES_BY_TYPE[type] ?? ['open'];
}

export function isStatusValidForType(type: PostType, status: PostStatus): boolean {
  return statusesForType(type).includes(status);
}

/** The one gate the PATCH route calls. Same answer the dropdown was built from. */
export function canTransition(type: PostType, from: PostStatus, to: PostStatus): boolean {
  if (from === to) return false;
  if (!isStatusValidForType(type, to)) return false;
  const allowed = TRANSITIONS[type]?.[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** What the dropdown offers for a post currently at `from`. */
export function allowedTransitions(type: PostType, from: PostStatus): readonly PostStatus[] {
  return TRANSITIONS[type]?.[from] ?? [];
}

/** Statuses that earn a line in "You asked, we built". */
export const CHANGELOG_STATUSES: readonly PostStatus[] = ['fixed', 'shipped'] as const;
export function isChangelogStatus(status: PostStatus): boolean {
  return CHANGELOG_STATUSES.includes(status);
}

/** A status that closes the loop — subscribers hear about these loudest. */
export function isTerminalStatus(status: PostStatus): boolean {
  return status === 'fixed' || status === 'shipped' || status === 'wont_fix' || status === 'declined';
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<PostStatus, Record<Lang, string>> = {
  open: { en: 'Open', zh: '待处理' },
  confirmed: { en: 'Confirmed', zh: '已确认' },
  under_review: { en: 'Under review', zh: '评估中' },
  planned: { en: 'Planned', zh: '已排期' },
  in_progress: { en: 'In progress', zh: '处理中' },
  fixed: { en: 'Fixed', zh: '已修复' },
  shipped: { en: 'Shipped', zh: '已上线' },
  wont_fix: { en: "Won't fix", zh: '不修复' },
  declined: { en: 'Declined', zh: '不做' },
  answered: { en: 'Answered', zh: '已回答' },
};

export const TYPE_LABELS: Record<PostType, Record<Lang, string>> = {
  problem: { en: 'Problem', zh: '问题' },
  idea: { en: 'Idea', zh: '建议' },
  question: { en: 'Question', zh: '提问' },
  discussion: { en: 'Discussion', zh: '讨论' },
};

export function statusLabel(status: PostStatus, lang: Lang): string {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

export function typeLabel(type: PostType, lang: Lang): string {
  return TYPE_LABELS[type]?.[lang] ?? type;
}

/**
 * Chip tone. The names map to CSS custom properties defined under `.fb-root`
 * (see components/montree/feedback/feedback.css) so the same status reads the
 * same in any product that mounts the board.
 */
export type StatusTone = 'neutral' | 'amber' | 'blue' | 'purple' | 'green' | 'muted';

export const STATUS_TONES: Record<PostStatus, StatusTone> = {
  open: 'neutral',
  confirmed: 'amber',
  under_review: 'amber',
  planned: 'blue',
  in_progress: 'purple',
  fixed: 'green',
  shipped: 'green',
  answered: 'green',
  wont_fix: 'muted',
  declined: 'muted',
};

export function statusTone(status: PostStatus): StatusTone {
  return STATUS_TONES[status] ?? 'neutral';
}

/** Declined / Won't fix render struck through, as on the canvas. */
export function statusIsStruck(status: PostStatus): boolean {
  return status === 'declined' || status === 'wont_fix';
}
